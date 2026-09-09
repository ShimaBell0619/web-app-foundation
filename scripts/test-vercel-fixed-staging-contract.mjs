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

test('deploy workflow keeps privileged execution on trusted main automation', () => {
  const workflow = readWorkflow('templates/vercel/fixed-staging/deploy-staging.yml');

  assert.ok(workflow.on?.workflow_dispatch?.inputs?.pr_number);
  assert.equal(workflow.on.workflow_dispatch.inputs.pr_number.required, true);
  assert.deepEqual(workflow.permissions, {
    actions: 'read',
    contents: 'write',
    issues: 'write',
    'pull-requests': 'read',
  });

  assert.equal(workflow.concurrency.group, 'fixed-staging-deploy-slot');
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
  assert.deepEqual(
    Object.keys(workflow.concurrency).sort(),
    ['cancel-in-progress', 'group'],
    'do not rely on unsupported concurrency keys',
  );

  assert.equal(workflow.jobs.deploy.if, "${{ github.ref == 'refs/heads/main' }}");
  assert.equal(workflow.jobs.deploy.env.STAGING_URL, '${{ vars.FIXED_STAGING_URL }}');
  assert.equal(workflow.jobs.deploy.env.STAGING_WORKFLOW_FILE, 'deploy-staging.yml');

  const checkout = findStep(workflow, 'Checkout trusted main automation');
  assertPinnedAction(checkout.uses);
  assert.equal(checkout.with.ref, 'main');
  assert.equal(checkout.with['persist-credentials'], true);

  const setupNode = findStep(workflow, 'Set up Node.js');
  assertPinnedAction(setupNode.uses);
  assert.equal(setupNode.with['node-version-file'], '.node-version');

  const move = findStep(workflow, 'Move fixed Staging slot to PR HEAD');
  assert.equal(move.run, 'node scripts/staging-slot.mjs deploy');
});

test('cleanup workflow is limited to same-repository main PR close events', () => {
  const workflow = readWorkflow('templates/vercel/fixed-staging/cleanup-staging.yml');

  assert.deepEqual(workflow.on?.pull_request?.types, ['closed']);
  assert.deepEqual(workflow.permissions, { contents: 'write' });
  assert.equal(
    workflow.jobs.cleanup.if,
    "${{ github.event.pull_request.head.repo.full_name == github.repository && github.event.pull_request.base.ref == 'main' }}",
  );

  const checkout = findStep(workflow, 'Checkout trusted main automation');
  assertPinnedAction(checkout.uses);
  assert.equal(checkout.with.ref, 'main');
  assert.equal(checkout.with['persist-credentials'], true);

  const setupNode = findStep(workflow, 'Set up Node.js');
  assertPinnedAction(setupNode.uses);

  const cleanup = findStep(workflow, 'Reset Staging only when it still points to the closed PR');
  assert.equal(cleanup.run, 'node scripts/staging-slot.mjs cleanup');
});

test('PR number and deployable PR validation reject ambiguous or untrusted targets', () => {
  assert.equal(parsePrNumber('42'), 42);
  assert.throws(() => parsePrNumber('0'));
  assert.throws(() => parsePrNumber('42x'));

  assert.equal(validateDeployablePullRequest(makePr(), REPOSITORY), SHA_B);
  assert.throws(() =>
    validateDeployablePullRequest(makePr({ state: 'closed' }), REPOSITORY),
  );
  assert.throws(() =>
    validateDeployablePullRequest(makePr({ baseRef: 'develop' }), REPOSITORY),
  );
  assert.throws(() =>
    validateDeployablePullRequest(makePr({ headRepo: 'someone/fork' }), REPOSITORY),
  );
});

test('newer manual run detection makes an older explicit request yield', () => {
  assert.equal(
    newerManualRunExists('100', [
      { id: 99, event: 'workflow_dispatch' },
      { id: 101, event: 'push' },
    ]),
    false,
  );
  assert.equal(
    newerManualRunExists('100', [{ id: 101, event: 'workflow_dispatch' }]),
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
    workflowFile: 'deploy-staging.yml',
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

  assert.deepEqual(result, {
    status: 'deployed',
    targetSha: SHA_B,
    alreadyCurrent: false,
  });
  assert.equal(state.getStaging(), SHA_B);
  assert.equal(gitCalls.some((args) => args[0] === 'checkout'), false);
});

test('superseded deploy never fetches or mutates Staging', async () => {
  const state = makeClient({
    manualRuns: [{ id: 101, event: 'workflow_dispatch' }],
  });
  let gitCalled = false;

  const result = await deployToStaging({
    client: state.client,
    repository: REPOSITORY,
    prNumber: 42,
    workflowFile: 'deploy-staging.yml',
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
      workflowFile: 'deploy-staging.yml',
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

test('cleanup uses compare-and-swap semantics before resetting to main', async () => {
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
