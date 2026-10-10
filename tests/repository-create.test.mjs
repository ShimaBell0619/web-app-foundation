import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { createPrivateRepo, validateRepositoryRequest } from "../kits/github/repository-create/create-private-repo.mjs";

const owner = "ShimaBell0619";
const user = { login: owner, id: 112917105 };
const repo = `${owner}/web-app-foundation-ops`;
const event = {
  action: "created",
  repository: { full_name: repo, default_branch: "main", owner: { ...user, type: "User" } },
  issue: { number: 1, state: "open", title: "repo-create: chat-agent-test", user },
  comment: { id: 12, body: "/create-private-repo", author_association: "OWNER", user,
    issue_url: `https://api.github.com/repos/${repo}/issues/1` },
};
const target = { id: 999, owner: user, name: "chat-agent-test", private: true,
  html_url: `https://github.com/${owner}/chat-agent-test`, default_branch: "main" };
const reply = (status, data = {}) => ({ status, data });
const liveRequest = () => [reply(200, event.issue), reply(200, event.comment)];
const success = () => [...liveRequest(), reply(200, user), reply(404), reply(201, target), reply(200, target)];
function api(replies) {
  const requests = [];
  return { requests, fetchImpl: async (url, opts) => {
    requests.push({ url, ...opts, body: opts.body && JSON.parse(opts.body) });
    const next = replies.shift();
    assert.ok(next, `unexpected request: ${opts.method} ${url}`);
    if (next instanceof Error) throw next;
    return { status: next.status, json: async () => next.data };
  }};
}
async function run(replies, request = event) {
  const mock = api(replies);
  const result = await createPrivateRepo(request, { token: "creation-placeholder", requestToken: "read-placeholder", fetchImpl: mock.fetchImpl });
  return { result, requests: mock.requests };
}

test("invalid or non-owner requests fail before any API call", async () => {
  assert.deepEqual(validateRepositoryRequest(event), { owner, name: target.name });
  const invalid = [
    { ...event, action: "edited" },
    { ...event, comment: { ...event.comment, body: "/create-private-repo public" } },
    { ...event, comment: { ...event.comment, body: "/create-private-repo\n" } },
    { ...event, comment: { ...event.comment, author_association: "COLLABORATOR" } },
    { ...event, comment: { ...event.comment, user: { login: "attacker", id: user.id } } },
    { ...event, comment: { ...event.comment, user: { ...user, id: 1 } } },
    { ...event, comment: { ...event.comment, id: 0 } },
    { ...event, issue: { ...event.issue, user: { login: "attacker", id: 1 } } },
    { ...event, issue: { ...event.issue, state: "closed" } },
    { ...event, issue: { ...event.issue, pull_request: {} } },
    { ...event, issue: { ...event.issue, number: 0 } },
    { ...event, repository: { ...event.repository, owner: { ...user, type: "Organization" } } },
    { ...event, repository: { ...event.repository, full_name: "attacker/ops" } },
    ...["x; rm -rf", "PUBLIC", "main", "preview", "github", "git", "ab", "a".repeat(41), "safe-name\n", "../safe-name"].map(name =>
      ({ ...event, issue: { ...event.issue, title: `repo-create: ${name}` } })),
  ];
  for (const request of invalid) {
    let calls = 0;
    await assert.rejects(createPrivateRepo(request, { token: "placeholder", requestToken: "placeholder", fetchImpl: async () => { calls++; } }));
    assert.equal(calls, 0);
  }
});

test("requires both explicitly configured tokens before API calls", async () => {
  await assert.rejects(createPrivateRepo(event), /REPO_CREATION_TOKEN/);
  await assert.rejects(createPrivateRepo(event, { token: "placeholder" }), /REQUEST_READ_TOKEN/);
});

test("revalidates live request, creates private once, then independently verifies metadata", async () => {
  const { result, requests } = await run(success());
  assert.deepEqual(result, { url: target.html_url, name: target.name, owner, defaultBranch: "main" });
  assert.deepEqual(requests.map(x => [x.method, x.url]), [
    ["GET", `https://api.github.com/repos/${repo}/issues/1`],
    ["GET", `https://api.github.com/repos/${repo}/issues/comments/12`],
    ["GET", "https://api.github.com/user"],
    ["GET", `https://api.github.com/repos/${owner}/${target.name}`],
    ["POST", "https://api.github.com/user/repos"],
    ["GET", `https://api.github.com/repos/${owner}/${target.name}`],
  ]);
  assert.equal(requests[4].body.private, true);
  assert.equal(requests[4].body.auto_init, true);
  assert.ok(requests.slice(0, 2).every(r => r.headers.authorization === "Bearer read-placeholder"));
  assert.ok(requests.slice(2).every(r => r.headers.authorization === "Bearer creation-placeholder"));
  assert.ok(requests.every(r => r.redirect === "error"));
});

test("edited/deleted/closed or reassociated live requests never reach POST", async () => {
  const variants = [
    [reply(404), reply(200, event.comment)],
    [reply(200, event.issue), reply(404)],
    [reply(200, { ...event.issue, title: "repo-create: different-name" }), reply(200, event.comment)],
    [reply(200, { ...event.issue, state: "closed" }), reply(200, event.comment)],
    [reply(200, { ...event.issue, user: { login: "attacker", id: 1 } }), reply(200, event.comment)],
    [reply(200, event.issue), reply(200, { ...event.comment, body: "cancel" })],
    [reply(200, event.issue), reply(200, { ...event.comment, issue_url: "https://api.github.com/repos/attacker/ops/issues/1" })],
    [reply(200, event.issue), reply(200, { ...event.comment, user: { login: "attacker", id: 1 } })],
  ];
  for (const replies of variants) {
    const mock = api(replies);
    await assert.rejects(createPrivateRepo(event, { token: "placeholder", requestToken: "placeholder", fetchImpl: mock.fetchImpl }));
    assert.ok(mock.requests.every(r => r.method !== "POST"));
  }
});

test("wrong identity, existing repositories and ambiguous absence never reach POST", async () => {
  for (const replies of [
    [...liveRequest(), reply(200, { login: "another-user", id: user.id })],
    [...liveRequest(), reply(200, { ...user, id: 1 })],
    [...liveRequest(), reply(401)],
    [...liveRequest(), reply(200, user), reply(200, target)],
    [...liveRequest(), reply(200, user), reply(403)],
    [...liveRequest(), reply(200, user), reply(500)],
  ]) {
    const mock = api(replies);
    await assert.rejects(createPrivateRepo(event, { token: "placeholder", requestToken: "placeholder", fetchImpl: mock.fetchImpl }));
    assert.ok(mock.requests.every(r => r.method !== "POST"));
  }
});

test("public/mismatched/failed POST responses never report success or retry", async () => {
  for (const response of [reply(403), reply(422), reply(201, { ...target, private: false }), reply(201, { ...target, owner: { login: "attacker", id: 1 } }), reply(201, { ...target, name: "different" }), reply(201, { ...target, html_url: "https://example.com" })]) {
    const mock = api([...liveRequest(), reply(200, user), reply(404), response]);
    await assert.rejects(createPrivateRepo(event, { token: "placeholder", requestToken: "placeholder", fetchImpl: mock.fetchImpl }));
    assert.equal(mock.requests.filter(r => r.method === "POST").length, 1);
  }
});

test("post-GET mismatch, invisibility or empty default branch fail without another POST", async () => {
  for (const response of [reply(404), reply(200, { ...target, private: false }), reply(200, { ...target, id: 1000 }), reply(200, { ...target, owner: { login: "attacker", id: 1 } }), reply(200, { ...target, default_branch: "" }), reply(200, { ...target, name: "different" })]) {
    const mock = api([...success().slice(0, -1), response]);
    await assert.rejects(createPrivateRepo(event, { token: "placeholder", requestToken: "placeholder", fetchImpl: mock.fetchImpl }), /post-verification/);
    assert.equal(mock.requests.filter(r => r.method === "POST").length, 1);
  }
});

test("lost POST response fails safely and does not expose transport errors", async () => {
  const mock = api([...liveRequest(), reply(200, user), reply(404), new Error("sensitive-placeholder")]);
  await assert.rejects(createPrivateRepo(event, { token: "placeholder", requestToken: "placeholder", fetchImpl: mock.fetchImpl }), error =>
    /check GitHub state/.test(error.message) && !error.message.includes("sensitive-placeholder"));
  assert.equal(mock.requests.filter(r => r.method === "POST").length, 1);
});

test("copied kit binds Environment, trusted event SHA and least-privilege tokens", () => {
  const workflow = parseYaml(readFileSync("kits/github/repository-create/workflow.yml", "utf8"));
  assert.deepEqual(workflow.on, { issue_comment: { types: ["created"] } });
  const job = workflow.jobs.create;
  assert.equal(job.environment, "repository-creation");
  assert.deepEqual(job.permissions, { contents: "read", issues: "read" });
  assert.match(job.if, /issue.user.login == github.repository_owner/);
  assert.equal(job.concurrency.group, "private-repository-creation");
  assert.equal(job.concurrency["cancel-in-progress"], false);
  assert.equal(job.steps[0].with.ref, "${{ github.sha }}");
  assert.equal(job.steps[0].with["persist-credentials"], false);
  assert.equal(job.steps.at(-1).run, "node scripts/create-private-repo.mjs");
  assert.deepEqual(job.steps.at(-1).env, { REPO_CREATION_TOKEN: "${{ secrets.REPO_CREATION_TOKEN }}", REQUEST_READ_TOKEN: "${{ github.token }}" });
  for (const step of job.steps.filter(s => s.uses)) assert.match(step.uses, /@[a-f0-9]{40}$/);
  const readme = readFileSync("kits/github/repository-create/README.md", "utf8");
  assert.ok(readme.includes("scripts/create-private-repo.mjs"));
  assert.ok(readme.includes("repository-creation"));
});
