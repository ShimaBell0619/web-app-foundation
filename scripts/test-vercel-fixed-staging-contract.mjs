import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import {
  buildStagingPushArgs,
  cleanupStaging,
  deployToStaging,
  newerManualRunExists,
  parsePrNumber,
  parseStagingRequest,
  shouldCleanupStaging,
  validateDeployablePullRequest,
} from '../templates/vercel/fixed-staging/staging-slot.mjs';

const REPOSITORY = 'example/app';
const SHA_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SHA_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const SHA_C = 'cccccccccccccccccccccccccccccccccccccccc';
const SHA_MAIN = 'dddddddddddddddddddddddddddddddddddddddd';

function readWorkflow(path) {
  return parseYaml(readFileSync(path, 'utf8'));
}

function findStep(workflow, name) {
  for (const job of Object.values(workflow.jobs ?? {})) {
    const step = job?.steps?.find((candidate) => candidate?.name === name);
    if (step) return step;
  }
  throw new Error(`Missing workflow step: ${name}`);
}

function assertPinnedAction(ref) {
  assert.match(ref, /^[^/\s]+\/[^@\s]+(?:\/[^@\s]+)*@[0-9a-f]{40}$/i);
}

function makePr({
  state = 'open',
  baseRepo = REPOSITORY,
  baseRef = 'main',
  headRepo = REPOSITORY,
  headSha = SHA_B,
} = {}) {
  return {
    state,
    base: { repo: { full_name: baseRepo }, ref: baseRef },
    head: { repo: { full_name: headRepo }, sha: headSha },
  };
}

function makeClient({
  pullRequests = [makePr()],
  stagingSha = SHA_A,
  mainSha = SHA_MAIN,
  manualRuns = [],
} = {}) {
  let prIndex = 0;
  let currentStaging = stagingSha;
  const client = {
    async getPullRequest() {
      const current = pullRequests[Math.min(prIndex, pullRequests.length - 1)];
      prIndex += 1;
      return current;
    },
    async getRef(branch) {
      if (branch === 'staging') return currentStaging;
      if (branch === 'main') return mainSha;
      throw new Error(`unexpected branch ${branch}`);
    },
    async listManualRuns() {
      return manualRuns;
    },
    async commentOnPullRequest() {},
  };
  return {
    client,
    getStaging: () => currentStaging,
    setStaging: (sha) => {
      currentStaging = sha;
    },
  };
}

test('manual request workflow is read-only and emits a bounded request artifact', () => {
  const workflow = readWorkflow('templates/vercel/fixed-staging/request-staging.yml');
  assert.ok(workflow.on?.workflow_dispatch?.inputs?.pr_number);
  assert.equal(workflow.on.workflow_dispatch.inputs.pr_number.required, true);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.equal(workflow.jobs.request.if, "${{ github.ref == 'refs/heads/main' }}");
  assert.equal(
    workflow.jobs.request.steps.some((step) => step?.uses?.startsWith('actions/checkout@')),
    false,
    'read-only request workflow must not need a source checkout',
  );
  const upload = findStep(workflow, 'Upload fixed Staging request');
  assertPinnedAction(upload.uses);
  assert.equal(upload.with.name, 'fixed-staging-request');
  assert.equal(upload.with['retention-days'], 1);
});

test('write-enabled publisher is workflow_run-only and trusts main request runs', () => {
  const workflow = readWorkflow('templates/vercel/fixed-staging/deploy-staging.yml');
  assert.deepEqual(workflow.on?.workflow_run?.workflows, ['Request PR for Fixed Staging']);
  assert.deepEqual(workflow.on.workflow_run.types, ['completed']);
  assert.deepEqual(workflow.permissions, {
    actions: 'read',
    contents: 'write',
    issues: 'write',
    'pull-requests': 'read',
  });
  assert.equal(workflow.concurrency.group, 'fixed-staging-deploy-slot');
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
  assert.equal(workflow.concurrency.queue, 'max');

  const condition = workflow.jobs.deploy.if;
  for (const marker of [
    "workflow_run.conclusion == 'success'",
    "workflow_run.event == 'workflow_dispatch'",
    "workflow_run.head_branch == 'main'",
    'workflow_run.head_repository.full_name == github.repository',
  ]) assert.ok(condition.includes(marker), `publisher condition missing ${marker}`);

  const checkout = findStep(workflow, 'Checkout trusted main automation');
  assertPinnedAction(checkout.uses);
  assert.equal(checkout.with.ref, 'main');
  assert.equal(checkout.with['persist-credentials'], true);

  const download = findStep(workflow, 'Download fixed Staging request');
  assertPinnedAction(download.uses);
  assert.equal(download.with.name, 'fixed-staging-request');
  assert.equal(download.with['run-id'], '${{ github.event.workflow_run.id }}');
  assert.equal(workflow.jobs.deploy.env.STAGING_REQUEST_WORKFLOW_FILE, 'request-staging.yml');

  const move = findStep(workflow, 'Move fixed Staging slot to PR HEAD');
  assert.equal(move.run, 'node scripts/staging-slot.mjs deploy');
});

test('cleanup uses trusted pull_request_target context and is not coupled to current base ref', () => {
  const workflow = readWorkflow('templates/vercel/fixed-staging/cleanup-staging.yml');
  assert.deepEqual(workflow.on?.pull_request_target?.types, ['closed']);
  assert.deepEqual(workflow.permissions, { contents: 'write' });
  assert.equal(
    workflow.jobs.cleanup.if,
    '${{ github.event.pull_request.head.repo.full_name == github.repository }}',
  );
  assert.equal(workflow.jobs.cleanup.if.includes('base.ref'), false);

  const checkout = findStep(workflow, 'Checkout trusted main automation');
  assertPinnedAction(checkout.uses);
  assert.equal(checkout.with.ref, 'main');
  assert.equal(checkout.with['persist-credentials'], true);
});

test('request artifact binds PR selection to the triggering main run', () => {
  const request = JSON.stringify({
    prNumber: 42,
    requestRunId: '100',
    repository: REPOSITORY,
    ref: 'refs/heads/main',
  });
  assert.equal(
    parseStagingRequest(request, { requestRunId: '100', repository: REPOSITORY }),
    42,
  );
  assert.throws(() => parseStagingRequest(request, { requestRunId: '101', repository: REPOSITORY }));
  assert.throws(() => parseStagingRequest(request, { requestRunId: '100', repository: 'other/app' }));
  assert.throws(() => parseStagingRequest(JSON.stringify({ ...JSON.parse(request), ref: 'refs/heads/feature' }), {
    requestRunId: '100',
    repository: REPOSITORY,
  }));
});

test('PR number and deployable PR validation reject ambiguous or untrusted targets', () => {
  assert.equal(parsePrNumber('42'), 42);
  assert.throws(() => parsePrNumber('0'));
  assert.throws(() => parsePrNumber('42x'));
  assert.equal(validateDeployablePullRequest(makePr(), REPOSITORY), SHA_B);
  assert.throws(() => validateDeployablePullRequest(makePr({ state: 'closed' }), REPOSITORY));
  assert.throws(() => validateDeployablePullRequest(makePr({ baseRef: 'develop' }), REPOSITORY));
  assert.throws(() => validateDeployablePullRequest(makePr({ headRepo: 'someone/fork' }), REPOSITORY));
});

test('only newer main-branch manual requests supersede an older request', () => {
  assert.equal(
    newerManualRunExists('100', [
      { id: 101, event: 'workflow_dispatch', head_branch: 'feature' },
      { id: 102, event: 'push', head_branch: 'main' },
    ]),
    false,
  );
  assert.equal(
    newerManualRunExists('100', [
      { id: 101, event: 'workflow_dispatch', head_branch: 'main' },
    ]),
    true,
  );
});

test('force-with-lease push is bound to the observed Staging SHA', () => {
  assert.deepEqual(buildStagingPushArgs(SHA_B, SHA_A), [
    'push',
    'origin',
    `${SHA_B}:refs/heads/staging`,
    `--force-with-lease=refs/heads/staging:${SHA_A}`,
  ]);
  assert.equal(shouldCleanupStaging(SHA_A, SHA_A), true);
  assert.equal(shouldCleanupStaging(SHA_B, SHA_A), false);
});

test('deploy updates only the staging ref to the validated PR HEAD', async () => {
  const state = makeClient();
  const gitCalls = [];
  const result = await deployToStaging({
    client: state.client,
    repository: REPOSITORY,
    prNumber: 42,
    workflowFile: 'request-staging.yml',
    runId: '100',
    githubRef: 'refs/heads/main',
    runGit(args) {
      gitCalls.push(args);
      if (args[0] === 'fetch') return true;
      if (args[0] === 'push') {
        assert.deepEqual(args, buildStagingPushArgs(SHA_B, SHA_A));
        state.setStaging(SHA_B);
        return true;
      }
      return false;
    },
  });
  assert.deepEqual(result, { status: 'deployed', targetSha: SHA_B, alreadyCurrent: false });
  assert.equal(state.getStaging(), SHA_B);
  assert.equal(gitCalls.some((args) => args[0] === 'checkout'), false);
});

test('superseded deploy never fetches or mutates Staging', async () => {
  const state = makeClient({
    manualRuns: [{ id: 101, event: 'workflow_dispatch', head_branch: 'main' }],
  });
  let gitCalled = false;
  const result = await deployToStaging({
    client: state.client,
    repository: REPOSITORY,
    prNumber: 42,
    workflowFile: 'request-staging.yml',
    runId: '100',
    githubRef: 'refs/heads/main',
    runGit() {
      gitCalled = true;
      return true;
    },
  });
  assert.equal(result.status, 'superseded');
  assert.equal(gitCalled, false);
  assert.equal(state.getStaging(), SHA_A);
});

test('deploy aborts when PR HEAD changes after target resolution', async () => {
  const state = makeClient({
    pullRequests: [makePr({ headSha: SHA_B }), makePr({ headSha: SHA_C })],
  });
  await assert.rejects(
    deployToStaging({
      client: state.client,
      repository: REPOSITORY,
      prNumber: 42,
      workflowFile: 'request-staging.yml',
      runId: '100',
      githubRef: 'refs/heads/main',
      runGit(args) {
        if (args[0] === 'fetch') return true;
        throw new Error('push must not occur after PR HEAD changes');
      },
    }),
    /PR HEAD changed/,
  );
  assert.equal(state.getStaging(), SHA_A);
});

test('cleanup does not overwrite a newer Staging occupant', async () => {
  const state = makeClient({ stagingSha: SHA_B });
  let gitCalled = false;
  const result = await cleanupStaging({
    client: state.client,
    repository: REPOSITORY,
    closedPrNumber: 41,
    closedPrHeadRepo: REPOSITORY,
    closedPrHeadSha: SHA_A,
    runGit() {
      gitCalled = true;
      return true;
    },
  });
  assert.equal(result.status, 'skipped-newer-staging');
  assert.equal(gitCalled, false);
  assert.equal(state.getStaging(), SHA_B);
});

test('cleanup resets matching Staging after a retargeted PR closes', async () => {
  const state = makeClient({ stagingSha: SHA_A, mainSha: SHA_MAIN });
  const result = await cleanupStaging({
    client: state.client,
    repository: REPOSITORY,
    closedPrNumber: 41,
    closedPrHeadRepo: REPOSITORY,
    closedPrHeadSha: SHA_A,
    runGit(args) {
      if (args[0] === 'fetch') return true;
      if (args[0] === 'push') {
        assert.deepEqual(args, buildStagingPushArgs(SHA_MAIN, SHA_A));
        state.setStaging(SHA_MAIN);
        return true;
      }
      return false;
    },
  });
  assert.deepEqual(result, { status: 'cleaned', mainSha: SHA_MAIN });
  assert.equal(state.getStaging(), SHA_MAIN);
});

test('cleanup treats a failed lease caused by a newer occupant as a safe skip', async () => {
  const state = makeClient({ stagingSha: SHA_A, mainSha: SHA_MAIN });
  const result = await cleanupStaging({
    client: state.client,
    repository: REPOSITORY,
    closedPrNumber: 41,
    closedPrHeadRepo: REPOSITORY,
    closedPrHeadSha: SHA_A,
    runGit(args) {
      if (args[0] === 'fetch') return true;
      if (args[0] === 'push') {
        state.setStaging(SHA_C);
        return false;
      }
      return false;
    },
  });
  assert.equal(result.status, 'skipped-race');
  assert.equal(state.getStaging(), SHA_C);
});
