import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

const workflowPath = 'templates/vercel/on-demand-preview/preview.yml';
const helperPath = 'templates/vercel/on-demand-preview/on-demand-preview.mjs';
const workflow = parseYaml(readFileSync(workflowPath, 'utf8'));
const helper = readFileSync(helperPath, 'utf8');

assert.deepEqual(workflow.permissions, {}, 'workflow-wide permissions must remain empty');
assert.ok(workflow.on?.issue_comment?.types?.includes('created'), 'must accept trusted issue_comment requests');
assert.ok(workflow.on?.repository_dispatch?.types?.includes('vercel.deployment.success'), 'must receive Vercel success events');
assert.ok(workflow.on?.pull_request_target?.types?.includes('closed'), 'must clean Preview branches on PR close');
assert.equal(workflow.concurrency?.['cancel-in-progress'], false, 'Preview mutations must not cancel in-progress work');
assert.equal(workflow.concurrency?.queue, 'max', 'Preview mutations must retain queued requests');

const authorize = workflow.jobs?.authorize;
const validateSource = workflow.jobs?.['validate-source'];
const publish = workflow.jobs?.publish;
const notify = workflow.jobs?.['notify-ready'];
const cleanup = workflow.jobs?.cleanup;

assert.ok(authorize && validateSource && publish && notify && cleanup, 'all Preview trust-boundary jobs are required');
assert.equal(authorize.permissions?.contents, 'read');
assert.equal(authorize.permissions?.['pull-requests'], 'read');
assert.equal(authorize.permissions?.['id-token'], undefined, 'authorization must not receive OIDC');
assert.equal(validateSource.permissions?.contents, 'read');
assert.match(String(validateSource.uses), /web-ci\.yml@<FULL_FOUNDATION_COMMIT_SHA>$/);
assert.equal(validateSource.with?.checkout_ref, '${{ needs.authorize.outputs.source_sha }}');
assert.equal(validateSource.secrets, undefined, 'exact-source validation must not inherit caller secrets');
assert.equal(publish.permissions?.contents, 'write');
assert.equal(publish.permissions?.['id-token'], undefined, 'publisher must not receive OIDC');
assert.equal(notify.permissions?.contents, 'read');
assert.equal(notify.permissions?.issues, 'write');
assert.equal(notify.permissions?.['pull-requests'], 'write');
assert.equal(cleanup.permissions?.contents, 'write');
assert.equal(cleanup.permissions?.['id-token'], undefined, 'cleanup must not receive OIDC');

for (const job of [authorize, publish, notify, cleanup]) {
  for (const step of job.steps ?? []) {
    if (!step?.uses) continue;
    const ref = String(step.uses).split('@')[1] ?? '';
    assert.match(ref, /^[0-9a-f]{40}$/, `external action must be pinned by full SHA: ${step.uses}`);
  }
}

for (const marker of [
  "['write', 'maintain', 'admin']",
  "pr?.base?.ref === 'main'",
  "pr?.head?.repo?.full_name === repo",
  'git commit-tree',
  'Foundation-Preview-PR:',
  'Source-PR-HEAD:',
  '--force-with-lease=',
  "payload.environment !== 'preview'",
  "payload?.state?.type !== 'success'",
  'stale Vercel event for superseded Preview source',
  'synthetic Preview parent no longer matches current PR HEAD',
  'synthetic Preview tree no longer matches current PR HEAD tree',
  'payload?.url',
  '/issues/${prNumber}/comments',
]) {
  assert.ok(helper.includes(marker), `Preview helper must preserve contract marker: ${marker}`);
}

assert.ok(helper.includes("existingParent === sourceSha"), 'same-source Preview requests must be reusable');
assert.ok(helper.includes("setOutput('reused', 'true')"), 'same-source reuse must be exposed to the workflow');
assert.ok(helper.includes("Foundation-Preview-PR: ${prNumber}"), 'cleanup ownership must be PR based');
assert.ok(!helper.includes('VERCEL_TOKEN'), 'default Preview must not require a Vercel token');

console.log('On-demand Vercel Preview contract tests passed.');
