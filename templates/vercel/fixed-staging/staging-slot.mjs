import { appendFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const API_VERSION = '2022-11-28';
const MAIN_BRANCH = 'main';
const STAGING_BRANCH = 'staging';
const SHA_PATTERN = /^[0-9a-f]{40}$/;

function requireValue(value, name) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${name} is required.`);
  return normalized;
}

export function parsePrNumber(value) {
  const normalized = requireValue(value, 'PR number');
  if (!/^[1-9][0-9]*$/.test(normalized)) throw new Error(`Invalid PR number: ${normalized}`);
  return Number(normalized);
}

export function assertSha(value, name = 'SHA') {
  const normalized = requireValue(value, name).toLowerCase();
  if (!SHA_PATTERN.test(normalized)) throw new Error(`Invalid ${name}: ${normalized}`);
  return normalized;
}

export function parseStagingRequest(text, { requestRunId, repository }) {
  let payload;
  try {
    payload = JSON.parse(requireValue(text, 'Staging request'));
  } catch (error) {
    throw new Error(`Invalid Staging request JSON: ${error instanceof Error ? error.message : error}`);
  }

  const prNumber = parsePrNumber(payload?.prNumber);
  const expectedRunId = requireValue(requestRunId, 'STAGING_REQUEST_RUN_ID');
  if (String(payload?.requestRunId ?? '') !== expectedRunId) {
    throw new Error('Staging request run ID does not match the triggering workflow run.');
  }
  if (payload?.repository !== repository) {
    throw new Error('Staging request repository does not match GITHUB_REPOSITORY.');
  }
  if (payload?.ref !== 'refs/heads/main') {
    throw new Error('Staging request must originate from main.');
  }
  return prNumber;
}

export function validateDeployablePullRequest(pullRequest, repository) {
  if (pullRequest?.state !== 'open') throw new Error('The requested PR is not open.');
  if (pullRequest?.base?.repo?.full_name !== repository || pullRequest?.base?.ref !== MAIN_BRANCH) {
    throw new Error('The requested PR must target main in this repository.');
  }
  if (pullRequest?.head?.repo?.full_name !== repository) {
    throw new Error('Fork PRs cannot be deployed to the privileged fixed Staging slot.');
  }
  return assertSha(pullRequest?.head?.sha, 'PR HEAD SHA');
}

export function newerManualRunExists(currentRunId, workflowRuns) {
  const current = BigInt(requireValue(currentRunId, 'request run ID'));
  return workflowRuns.some((run) => {
    if (run?.event !== 'workflow_dispatch' || run?.head_branch !== MAIN_BRANCH || run?.id == null) {
      return false;
    }
    try {
      return BigInt(String(run.id)) > current;
    } catch {
      return false;
    }
  });
}

export function buildStagingPushArgs(targetSha, expectedSha) {
  const target = assertSha(targetSha, 'target SHA');
  const expected = assertSha(expectedSha, 'expected Staging SHA');
  return [
    'push',
    'origin',
    `${target}:refs/heads/${STAGING_BRANCH}`,
    `--force-with-lease=refs/heads/${STAGING_BRANCH}:${expected}`,
  ];
}

export function sourceMarkers(message, prNumber, sourceSha) {
  return (
    String(message ?? '').includes(`Foundation-Fixed-Staging-PR: ${prNumber}`) &&
    String(message ?? '').includes(`Source-PR-HEAD: ${sourceSha}`)
  );
}

export function stagingOwnershipMatches(message, prNumber) {
  return String(message ?? '').includes(`Foundation-Fixed-Staging-PR: ${parsePrNumber(prNumber)}`);
}

function setOutput(name, value) {
  appendFileSync(requireValue(process.env.GITHUB_OUTPUT, 'GITHUB_OUTPUT'), `${name}=${value}\n`);
}

function writeSummary(lines) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (path) appendFileSync(path, `${lines.join('\n')}\n`, 'utf8');
}

function git(args, { env = {}, input } = {}) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      env: { ...process.env, ...env },
      input,
      stdio: input === undefined ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr) : String(error);
    throw new Error(`git ${args.join(' ')} failed: ${stderr}`);
  }
}

export function createGitHubClient({
  token,
  repository,
  apiUrl = 'https://api.github.com',
  fetchFn = fetch,
}) {
  const authToken = requireValue(token, 'GH_TOKEN');
  const repo = requireValue(repository, 'GITHUB_REPOSITORY');
  const [owner, name] = repo.split('/');
  if (!owner || !name) throw new Error(`Invalid repository: ${repo}`);
  const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;

  async function request(path, init = {}) {
    const response = await fetchFn(`${apiUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${authToken}`,
        'X-GitHub-Api-Version': API_VERSION,
        ...(init.headers ?? {}),
      },
    });
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }
    if (!response.ok) {
      const detail = typeof payload === 'object' && payload?.message
        ? payload.message
        : String(payload ?? response.statusText);
      throw new Error(`GitHub API ${response.status}: ${detail}`);
    }
    return payload;
  }

  return {
    async getPullRequest(number) {
      return request(`${repoPath}/pulls/${number}`);
    },
    async getRef(branch) {
      const payload = await request(`${repoPath}/git/ref/heads/${encodeURIComponent(branch)}`);
      return assertSha(payload?.object?.sha, `${branch} SHA`);
    },
    async listManualRuns(workflowFile) {
      const payload = await request(
        `${repoPath}/actions/workflows/${encodeURIComponent(workflowFile)}/runs?event=workflow_dispatch&branch=${encodeURIComponent(MAIN_BRANCH)}&per_page=100`,
      );
      return Array.isArray(payload?.workflow_runs) ? payload.workflow_runs : [];
    },
    async commentOnPullRequest(number, body) {
      await request(`${repoPath}/issues/${number}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
    },
  };
}

async function resolveRequest(client, repository) {
  const requestRunId = requireValue(process.env.STAGING_REQUEST_RUN_ID, 'STAGING_REQUEST_RUN_ID');
  const requestFile = requireValue(process.env.STAGING_REQUEST_FILE, 'STAGING_REQUEST_FILE');
  const prNumber = parseStagingRequest(readFileSync(requestFile, 'utf8'), {
    requestRunId,
    repository,
  });
  const pr = await client.getPullRequest(prNumber);
  const sourceSha = validateDeployablePullRequest(pr, repository);
  setOutput('pr_number', prNumber);
  setOutput('source_sha', sourceSha);
}

async function isSuperseded(client, workflowFile, runId) {
  return newerManualRunExists(runId, await client.listManualRuns(workflowFile));
}

async function publishStaging(client, repository) {
  const prNumber = parsePrNumber(process.env.PR_NUMBER);
  const sourceSha = assertSha(process.env.SOURCE_SHA, 'SOURCE_SHA');
  const requestRunId = requireValue(process.env.STAGING_REQUEST_RUN_ID, 'STAGING_REQUEST_RUN_ID');
  const workflowFile = requireValue(process.env.STAGING_REQUEST_WORKFLOW_FILE, 'STAGING_REQUEST_WORKFLOW_FILE');
  const stagingUrl = requireValue(process.env.STAGING_URL, 'STAGING_URL');

  if (await isSuperseded(client, workflowFile, requestRunId)) {
    writeSummary([
      '## Fixed Staging',
      '',
      `Request run ${requestRunId} was superseded by a newer main-branch request.`,
      'No Staging ref change was made.',
    ]);
    return;
  }

  let pr = await client.getPullRequest(prNumber);
  if (validateDeployablePullRequest(pr, repository) !== sourceSha) {
    throw new Error('PR HEAD changed after exact-source validation; request Fixed Staging again.');
  }

  git(['fetch', '--no-tags', 'origin', sourceSha]);
  const sourceTree = git(['show', '-s', '--format=%T', sourceSha]);
  const sourceAuthorName = git(['show', '-s', '--format=%an', sourceSha]);
  const sourceAuthorEmail = git(['show', '-s', '--format=%ae', sourceSha]);
  const observed = await client.getRef(STAGING_BRANCH);
  git(['fetch', '--no-tags', 'origin', observed]);

  const existingParent = git(['show', '-s', '--format=%P', observed]);
  const existingTree = git(['show', '-s', '--format=%T', observed]);
  const existingMessage = git(['show', '-s', '--format=%B', observed]);

  let syntheticSha = observed;
  let reused = false;
  if (
    existingParent === sourceSha &&
    existingTree === sourceTree &&
    sourceMarkers(existingMessage, prNumber, sourceSha)
  ) {
    reused = true;
  } else {
    const message = [
      `Foundation Fixed Staging for PR #${prNumber}`,
      '',
      `Foundation-Fixed-Staging-PR: ${prNumber}`,
      `Source-PR-HEAD: ${sourceSha}`,
    ].join('\n');
    syntheticSha = git(['commit-tree', sourceTree, '-p', sourceSha], {
      input: `${message}\n`,
      env: {
        GIT_AUTHOR_NAME: sourceAuthorName,
        GIT_AUTHOR_EMAIL: sourceAuthorEmail,
        GIT_COMMITTER_NAME: 'github-actions[bot]',
        GIT_COMMITTER_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
      },
    });

    if (git(['show', '-s', '--format=%P', syntheticSha]) !== sourceSha) {
      throw new Error('Fixed Staging synthetic commit must have source A as its single parent.');
    }
    if (git(['show', '-s', '--format=%T', syntheticSha]) !== sourceTree) {
      throw new Error('Fixed Staging synthetic commit tree must equal source A tree.');
    }
    git(['diff', '--quiet', sourceSha, syntheticSha]);

    if (await isSuperseded(client, workflowFile, requestRunId)) {
      writeSummary([
        '## Fixed Staging',
        '',
        `Request run ${requestRunId} was superseded before mutation.`,
        'No Staging ref change was made.',
      ]);
      return;
    }

    pr = await client.getPullRequest(prNumber);
    if (validateDeployablePullRequest(pr, repository) !== sourceSha) {
      throw new Error('PR HEAD changed before Staging mutation; request Fixed Staging again.');
    }

    git(buildStagingPushArgs(syntheticSha, observed));
    const verified = await client.getRef(STAGING_BRANCH);
    if (verified !== syntheticSha) throw new Error('Fixed Staging ref verification failed.');
  }

  const comment = [
    reused ? 'Fixed Staging already matches this PR source.' : 'Fixed Staging updated.',
    '',
    `- URL: ${stagingUrl}`,
    `- PR: #${prNumber}`,
    `- Source: \`${sourceSha}\``,
    `- Deployment commit: \`${syntheticSha}\``,
    '',
    'The `staging` branch uses a content-identical synthetic child commit so ownership remains explicit while Vercel deploys the validated source tree.',
  ].join('\n');
  await client.commentOnPullRequest(prNumber, comment);

  writeSummary([
    '## Fixed Staging ready',
    '',
    `- PR: #${prNumber}`,
    `- Source A: \`${sourceSha}\``,
    `- Synthetic B: \`${syntheticSha}\``,
    `- URL: ${stagingUrl}`,
    `- Reused: ${reused}`,
  ]);
}

async function cleanupStaging(client, repository) {
  const prNumber = parsePrNumber(process.env.CLOSED_PR_NUMBER);
  const headRepo = requireValue(process.env.CLOSED_PR_HEAD_REPO, 'CLOSED_PR_HEAD_REPO');
  if (headRepo !== repository) return;

  const observed = await client.getRef(STAGING_BRANCH);
  git(['fetch', '--no-tags', 'origin', observed]);
  const message = git(['show', '-s', '--format=%B', observed]);
  if (!stagingOwnershipMatches(message, prNumber)) {
    writeSummary([
      '## Fixed Staging cleanup skipped',
      '',
      `Closed PR: #${prNumber}`,
      'Current Staging is owned by another source or is already reset.',
    ]);
    return;
  }

  const mainSha = await client.getRef(MAIN_BRANCH);
  git(['fetch', '--no-tags', 'origin', mainSha]);
  try {
    git(buildStagingPushArgs(mainSha, observed));
  } catch (error) {
    const current = await client.getRef(STAGING_BRANCH);
    if (current !== observed) {
      writeSummary([
        '## Fixed Staging cleanup skipped',
        '',
        `Closed PR: #${prNumber}`,
        `Staging changed concurrently to \`${current}\`; the newer occupant was preserved.`,
      ]);
      return;
    }
    throw error;
  }

  const verified = await client.getRef(STAGING_BRANCH);
  if (verified !== mainSha) throw new Error('Fixed Staging cleanup verification failed.');
  writeSummary([
    '## Fixed Staging cleaned up',
    '',
    `Closed PR: #${prNumber}`,
    `Staging reset to main SHA \`${mainSha}\`.`,
  ]);
}

async function main() {
  const command = process.argv[2];
  const repository = requireValue(process.env.GITHUB_REPOSITORY, 'GITHUB_REPOSITORY');
  const client = createGitHubClient({
    token: process.env.GH_TOKEN,
    repository,
    apiUrl: process.env.GITHUB_API_URL,
  });

  if (command === 'resolve') return resolveRequest(client, repository);
  if (command === 'deploy') return publishStaging(client, repository);
  if (command === 'cleanup') return cleanupStaging(client, repository);
  throw new Error(`Unknown staging-slot command: ${command ?? '<missing>'}`);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
