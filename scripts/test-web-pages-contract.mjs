import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';

const candidatePath = '.github/workflows/web-pages-candidate.yml';
const publisherPath = '.github/workflows/web-pages-publish.yml';
const captureTemplatePath = 'templates/github-pages/capture-pr-preview.mjs';

const candidate = parseYaml(readFileSync(candidatePath, 'utf8'));
const publisher = parseYaml(readFileSync(publisherPath, 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function deepClone(value) {
  return structuredClone(value);
}

function findStep(workflow, jobName, stepName) {
  const steps = workflow.jobs?.[jobName]?.steps;
  assert(Array.isArray(steps), `${jobName} must define steps`);
  const matches = steps.filter((step) => step?.name === stepName);
  assert(matches.length === 1, `${jobName} must contain exactly one step named "${stepName}"`);
  return matches[0];
}

function assertFullShaUses(workflow, label) {
  for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
    if (typeof job?.uses === 'string' && !job.uses.startsWith('./')) {
      assert(
        /^[^/\s]+\/[^@\s]+(?:\/[^@\s]+)*@[0-9a-f]{40}$/i.test(job.uses),
        `${label} job ${jobName} must pin external reusable workflows by full SHA`,
      );
    }
    for (const [index, step] of (job?.steps ?? []).entries()) {
      if (typeof step?.uses !== 'string' || step.uses.startsWith('./')) continue;
      assert(
        /^[^/\s]+\/[^@\s]+(?:\/[^@\s]+)*@[0-9a-f]{40}$/i.test(step.uses),
        `${label} job ${jobName} step ${index + 1} must pin external actions by full SHA`,
      );
    }
  }
}

function assertExactPermissions(actual, expected, label) {
  assert(actual && typeof actual === 'object' && !Array.isArray(actual), `${label} permissions must be a mapping`);
  const actualEntries = Object.entries(actual).sort(([a], [b]) => a.localeCompare(b));
  const expectedEntries = Object.entries(expected).sort(([a], [b]) => a.localeCompare(b));
  assert(
    JSON.stringify(actualEntries) === JSON.stringify(expectedEntries),
    `${label} permissions must be exactly ${JSON.stringify(expected)}`,
  );
}

function validateCandidate(workflow) {
  assert(workflow.on?.workflow_call, 'candidate must expose workflow_call');
  for (const input of [
    'working_directory',
    'node_version_file',
    'cache_dependency_path',
    'build_command',
    'output_directory',
    'enable_review_images',
    'browser_install_command',
    'capture_command',
    'artifact_retention_days',
  ]) {
    assert(Object.hasOwn(workflow.on.workflow_call.inputs ?? {}, input), `candidate missing input: ${input}`);
  }

  assertExactPermissions(workflow.permissions, { contents: 'read' }, 'candidate top-level');
  assertFullShaUses(workflow, 'candidate');

  for (const job of Object.values(workflow.jobs ?? {})) {
    for (const level of Object.values(job?.permissions ?? {})) {
      assert(level !== 'write', 'candidate jobs must remain unprivileged');
    }
  }

  const install = findStep(workflow, 'build', 'Install dependencies');
  assert(String(install.run).trim() === 'npm ci', 'candidate must install with npm ci');

  const build = findStep(workflow, 'build', 'Build Pages candidate');
  assert(build.env?.PAGES_BASE_PATH === '${{ steps.target.outputs.base }}', 'candidate build must receive PAGES_BASE_PATH');
  assert(build.run === '${{ inputs.build_command }}', 'candidate build must use the configured build command');

  const browser = findStep(workflow, 'build', 'Install browser for PR review images');
  assert(
    browser.if === "github.event_name == 'pull_request' && inputs.enable_review_images",
    'browser install must run only for enabled PR review images',
  );

  const capture = findStep(workflow, 'build', 'Capture PR review images');
  assert(
    capture.if === "github.event_name == 'pull_request' && inputs.enable_review_images",
    'capture must run only for enabled PR review images',
  );
  assert(capture.env?.PAGES_REVIEW_DIR === '${{ runner.temp }}/pages-review', 'capture must write to runner.temp');

  const assemble = String(findStep(workflow, 'build', 'Assemble candidate artifact').run ?? '');
  for (const marker of [
    'site/index.html',
    'mobile.png',
    'desktop.png',
    'metadata.json',
    'sourceSha',
    'reviewImages',
  ]) {
    assert(assemble.includes(marker), `candidate assembly missing marker: ${marker}`);
  }

  const upload = findStep(workflow, 'build', 'Upload Pages candidate');
  assert(upload.with?.name === 'web-pages-candidate', 'candidate artifact name must be stable');
  assert(upload.with?.path === '${{ runner.temp }}/web-pages-candidate', 'candidate artifact must come from runner.temp');

  const source = JSON.stringify(workflow);
  assert(!source.includes('test:e2e'), 'candidate must not duplicate the full E2E quality gate');
  assert(!source.includes('pull_request_target'), 'candidate must never use pull_request_target');
}

function validatePublisher(workflow) {
  assert(workflow.on?.workflow_call, 'publisher must expose workflow_call');
  for (const input of [
    'operation',
    'publish_target',
    'source_run_id',
    'source_sha',
    'pr_number',
    'production_branch',
    'validated_workflow_name',
    'expect_review_images',
  ]) {
    assert(Object.hasOwn(workflow.on.workflow_call.inputs ?? {}, input), `publisher missing input: ${input}`);
  }

  assertExactPermissions(workflow.permissions, { contents: 'read' }, 'publisher top-level');
  assert(workflow.concurrency?.['cancel-in-progress'] === false, 'publisher must serialize without cancelling in-progress publishes');
  assertFullShaUses(workflow, 'publisher');

  assertExactPermissions(
    workflow.jobs?.publish?.permissions,
    {
      actions: 'read',
      contents: 'write',
      issues: 'write',
      'pull-requests': 'write',
      pages: 'write',
      'id-token': 'write',
    },
    'publisher publish job',
  );
  assertExactPermissions(
    workflow.jobs?.cleanup?.permissions,
    {
      contents: 'write',
      issues: 'write',
      'pull-requests': 'write',
      pages: 'write',
      'id-token': 'write',
    },
    'publisher cleanup job',
  );

  const allUses = [];
  for (const job of Object.values(workflow.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      if (typeof step?.uses === 'string') allUses.push(step.uses);
    }
  }
  assert(!allUses.some((ref) => ref.startsWith('actions/checkout@')), 'privileged publisher must never checkout source code');

  const guard = String(findStep(workflow, 'publish', 'Validate trusted publish context').run ?? '');
  for (const marker of [
    "EVENT_NAME\" != 'workflow_run'",
    'WORKFLOW_RUN_NAME',
    'WORKFLOW_RUN_CONCLUSION',
    'WORKFLOW_RUN_ID',
    'WORKFLOW_RUN_SHA',
    'WORKFLOW_RUN_REPOSITORY',
    'WORKFLOW_RUN_EVENT',
    'WORKFLOW_RUN_BRANCH',
    'WORKFLOW_RUN_PR_NUMBER',
  ]) {
    assert(guard.includes(marker), `publish trust guard missing marker: ${marker}`);
  }

  const download = findStep(workflow, 'publish', 'Download validated Pages candidate');
  assert(download.with?.name === 'web-pages-candidate', 'publisher must download the stable candidate artifact');
  assert(download.with?.path === '${{ runner.temp }}/web-pages-candidate', 'publisher must extract candidate outside the workspace');
  assert(download.with?.['run-id'] === '${{ inputs.source_run_id }}', 'publisher must bind download to source_run_id');
  assert(download.with?.['github-token'] === '${{ github.token }}', 'cross-run artifact download must use github.token');

  const manifest = String(findStep(workflow, 'publish', 'Validate candidate manifest').run ?? '');
  for (const marker of [
    'candidate artifact must not contain symbolic links',
    'candidate metadata mismatch',
    'sourceSha',
    'basePath',
    'reviewImages',
  ]) {
    assert(manifest.includes(marker), `candidate manifest validation missing marker: ${marker}`);
  }

  const stage = String(findStep(workflow, 'publish', 'Stage persistent Pages content').run ?? '');
  for (const marker of [
    "staging_branch='pages-content'",
    "! -name 'pr-*'",
    '.preview-root-placeholder',
    'render_preview_index',
    'target_path="pr-${PR_NUMBER}"',
  ]) {
    assert(stage.includes(marker), `publisher staging missing marker: ${marker}`);
  }

  const comment = String(findStep(workflow, 'publish', 'Upsert PR preview comment').run ?? '');
  for (const marker of [
    '<!-- web-foundation-pages-preview -->',
    'review/mobile.png?v=${SOURCE_SHA}',
    'review/desktop.png?v=${SOURCE_SHA}',
    'gh api --paginate',
    '--method PATCH',
    '--method POST',
  ]) {
    assert(comment.includes(marker), `preview comment upsert missing marker: ${marker}`);
  }

  const cleanupGuard = String(findStep(workflow, 'cleanup', 'Validate trusted cleanup context').run ?? '');
  for (const marker of [
    "EVENT_NAME\" != 'pull_request_target'",
    "ACTION\" != 'closed'",
    'HEAD_REPOSITORY',
    'EVENT_PR_NUMBER',
  ]) {
    assert(cleanupGuard.includes(marker), `cleanup trust guard missing marker: ${marker}`);
  }

  const cleanup = String(findStep(workflow, 'cleanup', 'Remove preview from persistent Pages content').run ?? '');
  assert(cleanup.includes('rm -rf "$publish_dir/$target_path"'), 'cleanup must remove only the target PR preview');
  assert(cleanup.includes('.preview-root-placeholder'), 'cleanup must refresh the temporary root index when present');

  const source = JSON.stringify(workflow);
  assert(!source.includes('npm ci'), 'privileged publisher must not install application dependencies');
  assert(!source.includes('npm run'), 'privileged publisher must not execute application npm scripts');
}

function expectFailure(label, mutate) {
  const candidateCopy = deepClone(candidate);
  const publisherCopy = deepClone(publisher);
  mutate(candidateCopy, publisherCopy);
  let failed = false;
  try {
    validateCandidate(candidateCopy);
    validatePublisher(publisherCopy);
  } catch {
    failed = true;
  }
  assert(failed, `${label}: mutation should violate the Pages contract`);
}

validateCandidate(candidate);
validatePublisher(publisher);

expectFailure('candidate write permission regression', (candidateCopy) => {
  candidateCopy.jobs.build.permissions = { contents: 'write' };
});
expectFailure('mutable candidate action regression', (candidateCopy) => {
  findStep(candidateCopy, 'build', 'Upload Pages candidate').uses = 'actions/upload-artifact@v4';
});
expectFailure('publisher checkout regression', (_candidateCopy, publisherCopy) => {
  publisherCopy.jobs.publish.steps.unshift({
    name: 'Unsafe checkout',
    uses: 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
  });
});
expectFailure('publisher extra write permission regression', (_candidateCopy, publisherCopy) => {
  publisherCopy.jobs.publish.permissions.packages = 'write';
});
expectFailure('publisher trust guard regression', (_candidateCopy, publisherCopy) => {
  const guard = findStep(publisherCopy, 'publish', 'Validate trusted publish context');
  guard.run = guard.run.replaceAll('WORKFLOW_RUN_REPOSITORY', 'REMOVED_REPOSITORY_GUARD');
});

const syntax = spawnSync(process.execPath, ['--check', captureTemplatePath], { encoding: 'utf8' });
assert(
  syntax.status === 0,
  `capture template must parse as JavaScript\nstdout:\n${syntax.stdout}\nstderr:\n${syntax.stderr}`,
);

console.log('Reusable Web Pages candidate/publisher contract tests passed.');
