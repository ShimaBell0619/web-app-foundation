import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { appendFile } from 'node:fs/promises';
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
  if (!/^[1-9][0-9]*$/.test(normalized)) {
    throw new Error(`Invalid PR number: ${normalized}`);
  }
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
    if (
      run?.event !== 'workflow_dispatch' ||
      run?.head_branch !== MAIN_BRANCH ||
      run?.id == null
    ) return false;
    try {
      return BigInt(String(run.id)) > current;
    } catch {
      return false;
    }
  });
}

export function shouldCleanupStaging(currentStagingSha, closedPrHeadSha) {
  return assertSha(currentStagingSha, 'current Staging SHA') ===
    assertSha(closedPrHeadSha, 'closed PR HEAD SHA');
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
      const detail =
        typeof payload === 'object' && payload?.message
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

function defaultRunGit(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.status === 0;
}

async function writeSummary(lines, summaryPath = process.env.GITHUB_STEP_SUMMARY) {
  if (!summaryPath) return;
  await appendFile(summaryPath, `${lines.join('\n')}\n`, 'utf8');
}

async function fetchCommit(runGit, sha) {
  if (!runGit(['fetch', '--no-tags', 'origin', assertSha(sha)])) {
    throw new Error(`Failed to fetch target commit ${sha}.`);
  }
}

async function isSuperseded(client, workflowFile, runId) {
  const runs = await client.listManualRuns(workflowFile);
  return newerManualRunExists(runId, runs);
}

export async function deployToStaging({
  client,
  repository,
  prNumber,
  workflowFile,
  runId,
  githubRef,
  runGit = defaultRunGit,
}) {
  if (githubRef !== 'refs/heads/main') {
    throw new Error('Privileged Staging publisher must run from main.');
  }

  const initialPr = await client.getPullRequest(prNumber);
  const targetSha = validateDeployablePullRequest(initialPr, repository);

  if (await isSuperseded(client, workflowFile, runId)) {
    return { status: 'superseded', targetSha };
  }

  await fetchCommit(runGit, targetSha);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (await isSuperseded(client, workflowFile, runId)) {
      return { status: 'superseded', targetSha };
    }

    const latestPr = await client.getPullRequest(prNumber);
    const latestSha = validateDeployablePullRequest(latestPr, repository);
    if (latestSha !== targetSha) {
      throw new Error(
        `PR HEAD changed while preparing Staging: ${targetSha} -> ${latestSha}. Run the request again.`,
      );
    }

    const expectedStagingSha = await client.getRef(STAGING_BRANCH);
    if (expectedStagingSha === targetSha) {
      return { status: 'deployed', targetSha, alreadyCurrent: true };
    }

    if (runGit(buildStagingPushArgs(targetSha, expectedStagingSha))) {
      const verified = await client.getRef(STAGING_BRANCH);
      if (verified !== targetSha) {
        throw new Error(`Staging verification failed: expected ${targetSha}, found ${verified}.`);
      }
      return { status: 'deployed', targetSha, alreadyCurrent: false };
    }

    const afterFailure = await client.getRef(STAGING_BRANCH);
    if (afterFailure === targetSha) {
      return { status: 'deployed', targetSha, alreadyCurrent: true };
    }
    if (attempt === 3) {
      throw new Error(
        'Staging changed concurrently three times; no unsafe force update was attempted without a lease.',
      );
    }
  }

  throw new Error('Unexpected Staging deployment state.');
}

export async function cleanupStaging({
  client,
  repository,
  closedPrNumber,
  closedPrHeadRepo,
  closedPrHeadSha,
  runGit = defaultRunGit,
}) {
  if (closedPrHeadRepo !== repository) {
    return { status: 'skipped-fork' };
  }

  const prHeadSha = assertSha(closedPrHeadSha, 'closed PR HEAD SHA');
  const currentStagingSha = await client.getRef(STAGING_BRANCH);
  if (!shouldCleanupStaging(currentStagingSha, prHeadSha)) {
    return { status: 'skipped-newer-staging', currentStagingSha };
  }

  const mainSha = await client.getRef(MAIN_BRANCH);
  await fetchCommit(runGit, mainSha);

  if (!runGit(buildStagingPushArgs(mainSha, prHeadSha))) {
    const afterFailure = await client.getRef(STAGING_BRANCH);
    if (afterFailure !== prHeadSha) {
      return { status: 'skipped-race', currentStagingSha: afterFailure };
    }
    throw new Error(
      `Failed to reset Staging for closed PR #${closedPrNumber}; Staging still points to ${prHeadSha}.`,
    );
  }

  const verified = await client.getRef(STAGING_BRANCH);
  if (verified !== mainSha) {
    throw new Error(`Staging cleanup verification failed: expected ${mainSha}, found ${verified}.`);
  }
  return { status: 'cleaned', mainSha };
}

async function main() {
  const command = process.argv[2];
  const repository = requireValue(process.env.GITHUB_REPOSITORY, 'GITHUB_REPOSITORY');
  const client = createGitHubClient({
    token: process.env.GH_TOKEN,
    repository,
    apiUrl: process.env.GITHUB_API_URL,
  });

  if (command === 'deploy') {
    const requestRunId = requireValue(
      process.env.STAGING_REQUEST_RUN_ID,
      'STAGING_REQUEST_RUN_ID',
    );
    const requestFile = requireValue(
      process.env.STAGING_REQUEST_FILE,
      'STAGING_REQUEST_FILE',
    );
    const prNumber = parseStagingRequest(readFileSync(requestFile, 'utf8'), {
      requestRunId,
      repository,
    });
    const stagingUrl = requireValue(process.env.STAGING_URL, 'STAGING_URL');
    const workflowFile = requireValue(
      process.env.STAGING_REQUEST_WORKFLOW_FILE,
      'STAGING_REQUEST_WORKFLOW_FILE',
    );
    const result = await deployToStaging({
      client,
      repository,
      prNumber,
      workflowFile,
      runId: requestRunId,
      githubRef: process.env.GITHUB_REF,
    });

    if (result.status === 'superseded') {
      console.log(`A newer main-branch Staging request exists; request ${requestRunId} will not move Staging.`);
      await writeSummary([
        '## Fixed Staging',
        '',
        `Request run ${requestRunId} was superseded by a newer main-branch request.`,
        'No Staging ref change was made by this publisher run.',
      ]);
      return;
    }

    const runUrl = `${process.env.GITHUB_SERVER_URL}/${repository}/actions/runs/${requestRunId}`;
    const comment = [
      'Fixed Staging updated.',
      '',
      `- URL: ${stagingUrl}`,
      `- PR: #${prNumber}`,
      `- SHA: \`${result.targetSha}\``,
      `- Request workflow: ${runUrl}`,
      '',
      'This moves only the `staging` branch pointer. The hosting Git Integration performs the actual deployment.',
    ].join('\n');

    try {
      await client.commentOnPullRequest(prNumber, comment);
    } catch (error) {
      console.warn(
        `Staging was updated, but the PR comment could not be posted: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }

    await writeSummary([
      '## Fixed Staging deployed',
      '',
      `- PR: #${prNumber}`,
      `- SHA: \`${result.targetSha}\``,
      `- URL: ${stagingUrl}`,
      `- Request run: ${requestRunId}`,
    ]);
    console.log(`Staging now points to ${result.targetSha}.`);
    return;
  }

  if (command === 'cleanup') {
    const closedPrNumber = parsePrNumber(process.env.CLOSED_PR_NUMBER);
    const result = await cleanupStaging({
      client,
      repository,
      closedPrNumber,
      closedPrHeadRepo: requireValue(
        process.env.CLOSED_PR_HEAD_REPO,
        'CLOSED_PR_HEAD_REPO',
      ),
      closedPrHeadSha: process.env.CLOSED_PR_HEAD_SHA,
    });

    if (result.status === 'cleaned') {
      await writeSummary([
        '## Fixed Staging cleaned up',
        '',
        `Closed PR: #${closedPrNumber}`,
        `Staging reset to main SHA \`${result.mainSha}\`.`,
      ]);
      console.log(`Staging reset to main ${result.mainSha}.`);
    } else {
      await writeSummary([
        '## Fixed Staging cleanup skipped',
        '',
        `Closed PR: #${closedPrNumber}`,
        `Reason: ${result.status}.`,
        'No Staging ref change was made.',
      ]);
      console.log(`Cleanup skipped: ${result.status}.`);
    }
    return;
  }

  throw new Error(`Unknown staging-slot command: ${command ?? '<missing>'}`);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
