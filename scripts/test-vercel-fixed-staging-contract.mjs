import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import {
  buildStagingPushArgs,
  newerManualRunExists,
  parsePrNumber,
  parseStagingRequest,
  sourceMarkers,
  stagingOwnershipMatches,
  validateDeployablePullRequest,
} from '../templates/vercel/fixed-staging/staging-slot.mjs';

const REPOSITORY = 'example/app';
const SHA_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SHA_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function readWorkflow(path) {
  return parseYaml(readFileSync(path, 'utf8'));
}

function findStep(workflow, jobName, name) {
  const step = workflow.jobs?.[jobName]?.steps?.find((candidate) => candidate?.name === name);
  if (!step) throw new Error(`Missing workflow step ${jobName}: ${name}`);
  return step;
}

function assertPinnedAction(ref) {
  assert.match(ref, /^[^/\s]+\/[^@\s]+(?:\/[^@\s]+)*@[0-9a-f]{40}$/i);
}

function makePr({
  state = 'open',
  baseRepo = REPOSITORY,
  baseRef = 'main',
  headRepo = REPOSITORY,
  headSha = SHA_A,
} = {}) {
  return {
    state,
    base: { repo: { full_name: baseRepo }, ref: baseRef },
    head: { repo: { full_name: headRepo }, sha: headSha },
  };
}

test('manual request workflow remains a bounded read-only selector', () => {
  const workflow = readWorkflow('templates/vercel/fixed-staging/request-staging.yml');
  assert.ok(workflow.on?.workflow_dispatch?.inputs?.pr_number);
  assert.equal(workflow.on.workflow_dispatch.inputs.pr_number.required, true);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.equal(workflow.jobs.request.if, "${{ github.ref == 'refs/heads/main' }}");
  assert.equal(
    workflow.jobs.request.steps.some((step) => step?.uses?.startsWith('actions/checkout@')),
    false,
  );
  const upload = workflow.jobs.request.steps.find((step) => step?.name === 'Upload fixed Staging request');
  assertPinnedAction(upload.uses);
  assert.equal(upload.with.name, 'fixed-staging-request');
  assert.equal(upload.with['retention-days'], 1);
});

test('publisher resolves A read-only, validates exact A, then mutates Staging', () => {
  const workflow = readWorkflow('templates/vercel/fixed-staging/deploy-staging.yml');
  assert.deepEqual(workflow.on?.workflow_run?.workflows, ['Request PR for Fixed Staging']);
  assert.deepEqual(workflow.on.workflow_run.types, ['completed']);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.equal(workflow.concurrency.group, 'fixed-staging-deploy-slot');
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
  assert.equal(workflow.concurrency.queue, 'max');

  const resolve = workflow.jobs.resolve;
  assert.deepEqual(resolve.permissions, {
    actions: 'read',
    contents: 'read',
    'pull-requests': 'read',
  });
  for (const marker of [
    "workflow_run.conclusion == 'success'",
    "workflow_run.event == 'workflow_dispatch'",
    "workflow_run.head_branch == 'main'",
    'workflow_run.head_repository.full_name == github.repository',
  ]) assert.ok(resolve.if.includes(marker), `resolve condition missing ${marker}`);

  const resolveCheckout = findStep(workflow, 'resolve', 'Checkout trusted main automation');
  assertPinnedAction(resolveCheckout.uses);
  assert.equal(resolveCheckout.with.ref, 'main');
  assert.equal(resolveCheckout.with['persist-credentials'], false);
  const download = findStep(workflow, 'resolve', 'Download fixed Staging request');
  assertPinnedAction(download.uses);
  const source = findStep(workflow, 'resolve', 'Resolve exact Staging source');
  assert.equal(source.run, 'node scripts/staging-slot.mjs resolve');
  assert.equal(source.env.STAGING_REQUEST_FILE, '${{ runner.temp }}/fixed-staging-request/request.json');

  const validate = workflow.jobs['validate-source'];
  assert.equal(validate.needs, 'resolve');
  assert.equal(
    validate.uses,
    'ShimaBell0619/web-app-foundation/.github/workflows/web-ci.yml@<FULL_FOUNDATION_COMMIT_SHA>',
  );
  assert.equal(validate.with.checkout_ref, '${{ needs.resolve.outputs.source_sha }}');
  assert.equal(validate.secrets, undefined);
  assert.deepEqual(validate.permissions, { contents: 'read' });

  const deploy = workflow.jobs.deploy;
  assert.deepEqual(deploy.needs, ['resolve', 'validate-source']);
  assert.deepEqual(deploy.permissions, {
    actions: 'read',
    contents: 'write',
    issues: 'write',
    'pull-requests': 'read',
  });
  const deployCheckout = findStep(workflow, 'deploy', 'Checkout trusted main automation');
  assertPinnedAction(deployCheckout.uses);
  assert.equal(deployCheckout.with.ref, 'main');
  assert.equal(deployCheckout.with['persist-credentials'], true);
  assert.equal(
    findStep(workflow, 'deploy', 'Publish content-identical Fixed Staging source').run,
    'node scripts/staging-slot.mjs deploy',
  );
});

test('cleanup is serialized with publication and uses trusted close context', () => {
  const workflow = readWorkflow('templates/vercel/fixed-staging/cleanup-staging.yml');
  assert.deepEqual(workflow.on?.pull_request_target?.types, ['closed']);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.equal(workflow.concurrency.group, 'fixed-staging-deploy-slot');
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
  assert.equal(workflow.concurrency.queue, 'max');
  assert.deepEqual(workflow.jobs.cleanup.permissions, { contents: 'write' });
  assert.equal(
    workflow.jobs.cleanup.if,
    '${{ github.event.pull_request.head.repo.full_name == github.repository }}',
  );
  assert.equal(workflow.jobs.cleanup.env.CLOSED_PR_HEAD_SHA, undefined);
  const checkout = findStep(workflow, 'cleanup', 'Checkout trusted main automation');
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
  assert.equal(parseStagingRequest(request, { requestRunId: '100', repository: REPOSITORY }), 42);
  assert.throws(() => parseStagingRequest(request, { requestRunId: '101', repository: REPOSITORY }));
  assert.throws(() => parseStagingRequest(request, { requestRunId: '100', repository: 'other/app' }));
});

test('deployable PR validation rejects closed, retargeted, and fork sources', () => {
  assert.equal(parsePrNumber('42'), 42);
  assert.throws(() => parsePrNumber('0'));
  assert.equal(validateDeployablePullRequest(makePr(), REPOSITORY), SHA_A);
  assert.throws(() => validateDeployablePullRequest(makePr({ state: 'closed' }), REPOSITORY));
  assert.throws(() => validateDeployablePullRequest(makePr({ baseRef: 'develop' }), REPOSITORY));
  assert.throws(() => validateDeployablePullRequest(makePr({ headRepo: 'someone/fork' }), REPOSITORY));
});

test('only newer main workflow_dispatch requests supersede an older request', () => {
  assert.equal(newerManualRunExists('100', [
    { id: 101, event: 'workflow_dispatch', head_branch: 'feature' },
    { id: 102, event: 'push', head_branch: 'main' },
  ]), false);
  assert.equal(newerManualRunExists('100', [
    { id: 101, event: 'workflow_dispatch', head_branch: 'main' },
  ]), true);
});

test('Staging ref mutation is compare-and-swap', () => {
  assert.deepEqual(buildStagingPushArgs(SHA_B, SHA_A), [
    'push',
    'origin',
    `${SHA_B}:refs/heads/staging`,
    `--force-with-lease=refs/heads/staging:${SHA_A}`,
  ]);
});

test('synthetic Staging provenance gives cleanup explicit PR ownership', () => {
  const message = [
    'Foundation Fixed Staging for PR #42',
    '',
    'Foundation-Fixed-Staging-PR: 42',
    `Source-PR-HEAD: ${SHA_A}`,
  ].join('\n');
  assert.equal(sourceMarkers(message, 42, SHA_A), true);
  assert.equal(sourceMarkers(message, 42, SHA_B), false);
  assert.equal(stagingOwnershipMatches(message, 42), true);
  assert.equal(stagingOwnershipMatches(message, 41), false);
});

test('helper preserves exact-A revalidation and content-identical synthetic invariants', () => {
  const helper = readFileSync('templates/vercel/fixed-staging/staging-slot.mjs', 'utf8');
  for (const marker of [
    'PR HEAD changed after exact-source validation',
    'PR HEAD changed before Staging mutation',
    "['commit-tree', sourceTree, '-p', sourceSha]",
    "['diff', '--quiet', sourceSha, syntheticSha]",
    'Foundation-Fixed-Staging-PR:',
    'Source-PR-HEAD:',
    '--force-with-lease=',
    'stagingOwnershipMatches(message, prNumber)',
  ]) assert.ok(helper.includes(marker), `missing Fixed Staging invariant: ${marker}`);
});
