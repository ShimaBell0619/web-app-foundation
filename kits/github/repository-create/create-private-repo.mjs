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
  const response = await fetchImpl(`https://api.github.com${path}`, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "foundation-chat-repo-creator",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json().catch(() => ({})) };
}

export async function createPrivateRepo(event, { token, fetchImpl = fetch } = {}) {
  const { owner, name } = validateRepositoryRequest(event);
  if (!token) throw new Error("Missing REPO_CREATION_TOKEN; owner must configure the GitHub Actions secret");

  const identity = await github("/user", { token, fetchImpl });
  if (identity.status !== 200 || identity.data?.login?.toLowerCase() !== owner.toLowerCase()) {
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
    created.data?.owner?.login?.toLowerCase() !== owner.toLowerCase() ||
    created.data?.name !== name ||
    created.data?.private !== true ||
    created.data?.html_url !== `https://github.com/${owner}/${name}`
  ) {
    throw new Error("GitHub returned an unexpected creation response; check the new repository before further action");
  }
  return { url: created.data.html_url, name, owner };
}

export async function main() {
  const path = process.env.GITHUB_EVENT_PATH;
  if (!path || !process.env.GITHUB_REPOSITORY) {
    throw new Error("Missing trusted GitHub Actions event context");
  }
  const event = JSON.parse(readFileSync(path, "utf8"));
  if (event.repository?.full_name !== process.env.GITHUB_REPOSITORY) {
    throw new Error("Event repository mismatch");
  }

  const result = await createPrivateRepo(event, {
    token: process.env.REPO_CREATION_TOKEN,
  });
  console.log(`Created private repository: ${result.url}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Chat-created private repository\n${result.url}\n`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Repository creation denied/failed: ${error.message}`);
    process.exitCode = 1;
  });
}
