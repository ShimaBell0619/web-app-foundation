import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createPrivateRepo, validateRepositoryRequest } from "../kits/github/repository-create/create-private-repo.mjs";

const owner = "ShimaBell0619";
const event = {
  action: "created",
  repository: { full_name: owner + "/web-app-foundation", owner: { login: owner, type: "User" } },
  issue: { state: "open", title: "repo-create: chat-agent-test", user: { login: owner } },
  comment: { body: "/create-private-repo", author_association: "OWNER", user: { login: owner } },
};

test("accepts only private-repo owner requests, rejecting injected names and PR comments", () => {
  assert.deepEqual(validateRepositoryRequest(event), { owner, name: "chat-agent-test" });
  for (const e of [
    { ...event, comment: { ...event.comment, body: "/create-private-repo public" } },
    { ...event, comment: { ...event.comment, author_association: "COLLABORATOR" } },
    { ...event, issue: { ...event.issue, title: "repo-create: x; rm -rf" } },
    { ...event, issue: { ...event.issue, title: "repo-create: PUBLIC" } },
    { ...event, issue: { ...event.issue, title: "repo-create: main" } },
    { ...event, issue: { ...event.issue, user: { login: "attacker" } } },
    { ...event, issue: { ...event.issue, pull_request: {} } },
    { ...event, repository: { ...event.repository, owner: { login: owner, type: "Organization" } } },
  ]) assert.throws(() => validateRepositoryRequest(e));
});

test("fails before any API call without an explicitly configured token", async () => {
  await assert.rejects(createPrivateRepo(event), /REPO_CREATION_TOKEN/);
});

test("creates a private repository only after owner/token and absence checks", async () => {
  const requests = [];
  const replies = [
    { status: 200, data: { login: owner } },
    { status: 404, data: {} },
    { status: 201, data: { owner: { login: owner }, name: "chat-agent-test", private: true, html_url: "https://github.com/ShimaBell0619/chat-agent-test" } },
  ];
  const fakeFetch = async (url, opts) => {
    requests.push({ url, method: opts.method, body: opts.body && JSON.parse(opts.body) });
    const next = replies.shift();
    return { status: next.status, json: async () => next.data };
  };
  const created = await createPrivateRepo(event, { token: "placeholder", fetchImpl: fakeFetch });
  assert.equal(created.url, "https://github.com/ShimaBell0619/chat-agent-test");
  assert.deepEqual(requests.map(x => [x.method, x.url]), [
    ["GET", "https://api.github.com/user"],
    ["GET", "https://api.github.com/repos/ShimaBell0619/chat-agent-test"],
    ["POST", "https://api.github.com/user/repos"],
  ]);
  assert.equal(requests[2].body.private, true);
  assert.equal(requests[2].body.auto_init, true);
});

test("does not create when repo exists or credential belongs to another user", async () => {
  for (const replies of [
    [{ status: 200, data: { login: "another-user" } }],
    [{ status: 200, data: { login: owner } }, { status: 200, data: {} }],
  ]) {
    const requests = [];
    const fakeFetch = async (url, options) => {
      requests.push(options.method);
      const reply = replies.shift();
      return { status: reply.status, json: async () => reply.data };
    };
    await assert.rejects(createPrivateRepo(event, { token: "test-token", fetchImpl: fakeFetch }));
    assert.ok(requests.every(x => x !== "POST"));
  }
});

test("trusted workflow never grants its own token write permission", () => {
  const s = readFileSync("kits/github/repository-create/workflow.yml", "utf8");
  assert.ok(s.includes("author_association == 'OWNER'"));
  assert.ok(s.includes("secrets.REPO_CREATION_TOKEN"));
  assert.ok(s.includes("ref: main"));
  assert.ok(s.includes("persist-credentials: false"));
  assert.ok(!s.includes("contents: write"));
});
