import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TITLE = /^repo-create: ([a-z][a-z0-9-]{2,39})$/;

export function validateRepositoryRequest(event) {
  const owner = event?.repository?.owner;
  const commenter = event?.comment?.user?.login;
  const author = event?.issue?.user?.login;

  if (
    event?.action !== "created" ||
    event?.comment?.body !== "/create-private-repo" ||
    event?.comment?.author_association !== "OWNER" ||
    event?.issue?.pull_request ||
    event?.issue?.state !== "open" ||
    owner?.type !== "User" ||
    !owner?.login ||
    !Number.isSafeInteger(owner?.id) || owner.id <= 0 ||
    event?.issue?.user?.id !== owner.id ||
    event?.comment?.user?.id !== owner.id ||
    !Number.isSafeInteger(event?.issue?.number) || event.issue.number <= 0 ||
    !Number.isSafeInteger(event?.comment?.id) || event.comment.id <= 0 ||
    !commenter ||
    !author ||
    commenter.toLowerCase() !== owner.login.toLowerCase() ||
    author.toLowerCase() !== owner.login.toLowerCase() ||
    !event?.repository?.full_name?.startsWith(`${owner.login}/`)
  ) {
    throw new Error("Repository creation requires an exact owner request on an owner-created open issue");
  }

  const result = TITLE.exec(event.issue.title);
  if (!result) throw new Error("Expected issue title: repo-create: <safe-repository-name>");
  const name = result[1];
  if (name === "main" || name === "preview" || name === "github" || name === "git") {
    throw new Error("Reserved repository name");
  }
  return { owner: owner.login, name };
}

async function github(path, { method = "GET", body, token, fetchImpl = fetch } = {}) {
  let response;
  try {
    response = await fetchImpl(`https://api.github.com${path}`, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2026-03-10",
        "user-agent": "foundation-chat-repo-creator",
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    // Never echo fetch exceptions: they can include request credentials.
    throw new Error("GitHub request failed; check GitHub state before any retry");
  }
  return { status: response.status, data: await response.json().catch(() => ({})) };
}

export async function createPrivateRepo(event, { token, requestToken, fetchImpl = fetch } = {}) {
  const { owner, name } = validateRepositoryRequest(event);
  if (!token) throw new Error("Missing REPO_CREATION_TOKEN; owner must configure the GitHub Actions secret");
  if (!requestToken) throw new Error("Missing REQUEST_READ_TOKEN for current issue/comment verification");

  const repoPath = `/repos/${event.repository.full_name}`;
  const issue = await github(`${repoPath}/issues/${event.issue.number}`, { token: requestToken, fetchImpl });
  const comment = await github(`${repoPath}/issues/comments/${event.comment.id}`, { token: requestToken, fetchImpl });
  if (issue.status !== 200 || comment.status !== 200 ||
      issue.data?.number !== event.issue.number || comment.data?.id !== event.comment.id ||
      comment.data?.issue_url !== `https://api.github.com${repoPath}/issues/${event.issue.number}` ||
      issue.data?.title !== event.issue.title || comment.data?.body !== event.comment.body) {
    throw new Error("Owner request changed or cannot be verified; no repository created");
  }
  validateRepositoryRequest({ ...event, issue: issue.data, comment: comment.data });

  const identity = await github("/user", { token, fetchImpl });
  if (identity.status !== 200 || identity.data?.id !== event.repository.owner.id ||
      identity.data?.login?.toLowerCase() !== owner.toLowerCase()) {
    throw new Error("Repository creation token is not a user token for the repository owner");
  }

  const existing = await github(`/repos/${owner}/${name}`, { token, fetchImpl });
  if (existing.status === 200) throw new Error("Target repository already exists; no changes made");
  if (existing.status !== 404) throw new Error(`Cannot verify repository absence (HTTP ${existing.status})`);

  const created = await github("/user/repos", {
    token,
    fetchImpl,
    method: "POST",
    body: {
      name,
      private: true,
      auto_init: true,
      has_issues: true,
      has_wiki: false,
      has_projects: false,
      description: "Private repository created by owner-authorized Chat workflow",
    },
  });
  if (created.status !== 201) {
    throw new Error(`GitHub repository creation failed (HTTP ${created.status}); no retry without checking GitHub state`);
  }
  if (
    !Number.isSafeInteger(created.data?.id) || created.data.id <= 0 ||
    created.data?.owner?.login?.toLowerCase() !== owner.toLowerCase() ||
    created.data?.owner?.id !== event.repository.owner.id ||
    created.data?.name !== name ||
    created.data?.private !== true ||
    created.data?.html_url !== `https://github.com/${owner}/${name}`
  ) {
    throw new Error("GitHub returned an unexpected creation response; check the new repository before further action");
  }
  const verified = await github(`/repos/${owner}/${name}`, { token, fetchImpl });
  if (verified.status !== 200 || verified.data?.id !== created.data?.id ||
      verified.data?.owner?.id !== event.repository.owner.id ||
      verified.data?.owner?.login?.toLowerCase() !== owner.toLowerCase() ||
      verified.data?.name !== name || verified.data?.private !== true ||
      verified.data?.html_url !== `https://github.com/${owner}/${name}` ||
      typeof verified.data?.default_branch !== "string" || !verified.data.default_branch) {
    throw new Error("Created repository post-verification failed; inspect GitHub state, do not retry creation");
  }
  return { url: verified.data.html_url, name, owner, defaultBranch: verified.data.default_branch };
}

export async function main() {
  const path = process.env.GITHUB_EVENT_PATH;
  if (!path || !process.env.GITHUB_REPOSITORY ||
      process.env.GITHUB_EVENT_NAME !== "issue_comment" ||
      process.env.GITHUB_REF !== "refs/heads/main") {
    throw new Error("Missing trusted GitHub Actions event context");
  }
  const event = JSON.parse(readFileSync(path, "utf8"));
  if (event.repository?.full_name !== process.env.GITHUB_REPOSITORY ||
      event.repository?.default_branch !== "main") {
    throw new Error("Event repository mismatch");
  }

  const result = await createPrivateRepo(event, {
    token: process.env.REPO_CREATION_TOKEN,
    requestToken: process.env.REQUEST_READ_TOKEN,
  });
  console.log(`Verified private repository: ${result.url}; default branch: ${result.defaultBranch}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Chat-created private repository\n${result.url}\nOwner: ${result.owner}; private: true; default branch: ${result.defaultBranch}\n`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Repository creation denied/failed: ${error.message}`);
    process.exitCode = 1;
  });
}
