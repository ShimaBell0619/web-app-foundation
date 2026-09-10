import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

const path = 'templates/release/release.yml';
const workflow = parseYaml(readFileSync(path, 'utf8'));
const job = workflow.jobs?.release;
assert.ok(job, 'release job must exist');
assert.deepEqual(workflow.on?.workflow_run?.workflows, ['CI']);
assert.deepEqual(workflow.on?.workflow_run?.types, ['completed']);
assert.deepEqual(workflow.permissions, { contents: 'write' });

for (const marker of [
  "workflow_run.conclusion == 'success'",
  "workflow_run.event == 'push'",
  "workflow_run.head_branch == 'main'",
  'workflow_run.head_repository.full_name == github.repository',
]) assert.ok(String(job.if).includes(marker), `missing trusted trigger marker: ${marker}`);

function step(name) {
  const found = job.steps?.find((candidate) => candidate?.name === name);
  assert.ok(found, `missing step: ${name}`);
  return found;
}
function assertPinned(ref) {
  assert.match(ref, /^[^/\s]+\/[^@\s]+(?:\/[^@\s]+)*@[0-9a-f]{40}$/i);
}

const checkout = step('Checkout validated main commit');
assertPinned(checkout.uses);
assert.equal(checkout.with?.ref, '${{ env.VALIDATED_SHA }}');
assert.equal(checkout.with?.['fetch-depth'], 2);
assert.equal(checkout.with?.['persist-credentials'], false);

const detect = String(step('Detect explicit version change').run ?? '');
for (const marker of ["require('./package.json').version", 'git show HEAD^:package.json', 'PRERELEASE', 'true|false']) {
  assert.ok(detect.includes(marker), `version detection missing ${marker}`);
}

const verify = String(step('Verify release target').run ?? '');
for (const marker of ['resolve_tag_commit', 'git/ref/tags/$TAG', 'git/tags/$sha', 'isDraft', 'VALIDATED_SHA']) {
  assert.ok(verify.includes(marker), `target verification missing ${marker}`);
}
assert.equal(verify.includes('git ls-remote'), false);

const publish = String(step('Publish GitHub Release').run ?? '');
for (const marker of ['gh release create "$TAG"', '--target "$VALIDATED_SHA"', '--generate-notes', 'A concurrent publisher created $TAG']) {
  assert.ok(publish.includes(marker), `publish step missing ${marker}`);
}

const finalVerify = String(step('Verify published release').run ?? '');
for (const marker of ['resolve_tag_commit', 'isDraft', 'isPrerelease', 'resolved_sha', 'VALIDATED_SHA', 'PRERELEASE']) {
  assert.ok(finalVerify.includes(marker), `final verification missing ${marker}`);
}

for (const candidate of job.steps ?? []) {
  if (candidate?.uses) assertPinned(candidate.uses);
  assert.notEqual(candidate?.['continue-on-error'], true, `${candidate?.name ?? '<unnamed>'} must not ignore failure`);
}
console.log('Application Release workflow contract tests passed.');
