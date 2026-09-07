import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

const requiredFiles = [
  'README.md',
  'PRODUCT.base.md',
  'DESIGN.base.md',
  'AGENTS.md',
  'CHANGELOG.md',
  'package.json',
  'package-lock.json',
  '.changeset/config.json',
  '.github/workflows/web-ci.yml',
  '.github/workflows/foundation-ci.yml',
  '.github/ISSUE_TEMPLATE/work-item.yml',
  '.github/pull_request_template.md',
  'docs/adoption.md',
  'docs/ci-performance.md',
  'docs/versioning.md',
  'scripts/test-foundation-validator.mjs',
  'scripts/sync-foundation-version.mjs',
  'scripts/validate-release-state.mjs',
  'scripts/test-web-ci-contract.mjs',
  'scripts/test-release-cycle.mjs',
  'fixtures/consumer/package.json',
  'fixtures/consumer/package-lock.json',
  'fixtures/consumer/scripts/verify.mjs',
  'fixtures/install-proof/package.json',
  'fixtures/install-proof/index.cjs',
];

const failures = [];
const fail = (message) => failures.push(message);
const read = (path) => readFileSync(path, 'utf8');
const readJson = (path) => JSON.parse(read(path));
const semver = /^\d+\.\d+\.\d+$/;

for (const path of requiredFiles) {
  if (!existsSync(path)) fail(`missing required file: ${path}`);
}

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
if (!semver.test(pkg.version ?? '')) fail('package.json version must be SemVer X.Y.Z');
const version = pkg.version;

if (lock.version !== version) fail('package-lock.json top-level version must match package.json');
if (lock.packages?.['']?.version !== version) fail('package-lock.json root package version must match package.json');
if (lock.packages?.['']?.name !== pkg.name) fail('package-lock.json root package name must match package.json');

function extractSingleVersion(text, pattern, label) {
  const matches = [...text.matchAll(pattern)];
  if (matches.length !== 1) {
    fail(`${label} must contain exactly one Foundation version declaration`);
    return null;
  }
  return matches[0][1];
}

const readme = read('README.md');
const readmeVersion = extractSingleVersion(
  readme,
  /^Current Foundation version:\s+\*\*(\d+\.\d+\.\d+) \(pre-1\.0\)\*\*\.\s*$/gm,
  'README.md',
);
if (readmeVersion && readmeVersion !== version) fail('README Foundation version must match package.json');

const agents = read('AGENTS.md');
const agentsVersion = extractSingleVersion(
  agents,
  /^Foundation-Version:\s*(\d+\.\d+\.\d+)\s*$/gm,
  'AGENTS.md',
);
if (agentsVersion && agentsVersion !== version) fail('AGENTS Foundation-Version must match package.json');

for (const marker of [
  'PRODUCT.md',
  'DESIGN.md',
  'Issue-driven development',
  'Mandatory AI implementation loop',
  'Approval-required decisions',
  'Completion gate',
  'reviewed full commit SHAs',
  'Semantic Versioning',
  'Changeset',
  'Conventional Commit',
]) {
  if (!agents.toLowerCase().includes(marker.toLowerCase())) fail(`AGENTS.md missing contract marker: ${marker}`);
}

function parseYamlObject(source, label) {
  let value;
  try {
    value = parseYaml(source);
  } catch (error) {
    throw new Error(`${label} is not valid YAML: ${error.message}`);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a YAML mapping`);
  }
  return value;
}

function extractDesignFrontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error('DESIGN.base.md must start with closed YAML front matter');
  return parseYamlObject(match[1], 'DESIGN.base.md front matter');
}

const design = read('DESIGN.base.md');
try {
  const front = extractDesignFrontMatter(design);
  if (front.version !== 'alpha') throw new Error('DESIGN.base.md version must be alpha');
  if (typeof front.name !== 'string' || !front.name.trim()) throw new Error('DESIGN.base.md name is required');
  if (typeof front.description !== 'string' || !front.description.trim()) {
    throw new Error('DESIGN.base.md description is required');
  }
  if (!Array.isArray(front.omitted)) throw new Error('DESIGN.base.md omitted must be a YAML list');
  for (const item of front.omitted) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('DESIGN.base.md omitted entries must be mappings');
    }
    if (typeof item.section !== 'string' || !item.section.trim()) {
      throw new Error('DESIGN.base.md omitted entry section is required');
    }
    if (typeof item.reason !== 'string' || !item.reason.trim()) {
      throw new Error(`DESIGN omitted section lacks a reason: ${item.section ?? '<unknown>'}`);
    }
  }
} catch (error) {
  fail(error.message);
}

const sections = [
  '## Overview',
  '## Colors',
  '## Typography',
  '## Layout',
  '## Elevation & Depth',
  '## Shapes',
  '## Components',
  "## Do's and Don'ts",
];
let previous = -1;
for (const section of sections) {
  const index = design.indexOf(section);
  if (index < 0) fail(`DESIGN.base.md missing canonical section: ${section}`);
  else if (index <= previous) fail(`DESIGN.base.md canonical section order invalid at: ${section}`);
  previous = index;
}

function validatePermissions(path, permissions, scope, { required = false } = {}) {
  if (permissions === undefined || permissions === null) {
    if (required) fail(`${path} ${scope} permissions must be declared explicitly`);
    return;
  }
  if (typeof permissions === 'string' || typeof permissions !== 'object' || Array.isArray(permissions)) {
    fail(`${path} ${scope} permissions must be an explicit mapping, not ${String(permissions)}`);
    return;
  }
  for (const [name, level] of Object.entries(permissions)) {
    if (!['read', 'write', 'none'].includes(level)) {
      fail(`${path} ${scope} permission ${name} has unsupported level: ${String(level)}`);
    }
    if (level === 'write') fail(`${path} ${scope} permission ${name} must not grant write access`);
  }
}

function validateUses(path, ref, location) {
  if (typeof ref !== 'string' || !ref.trim()) {
    fail(`${path} ${location} uses must be a non-empty string`);
    return;
  }
  if (ref.startsWith('./')) return;
  if (!/^[^/\s]+\/[^@\s]+(?:\/[^@\s]+)*@[0-9a-f]{40}$/i.test(ref)) {
    fail(`${path} external action/workflow must use a full commit SHA: ${ref}`);
  }
}

function findStep(workflow, jobName, stepName, path) {
  const job = workflow.jobs?.[jobName];
  if (!job || !Array.isArray(job.steps)) {
    fail(`${path} missing steps for job: ${jobName}`);
    return null;
  }
  const matches = job.steps.filter((step) => step?.name === stepName);
  if (matches.length !== 1) {
    fail(`${path} must contain exactly one step named "${stepName}" in job ${jobName}`);
    return null;
  }
  return matches[0];
}

function requireRunStep(workflow, path, jobName, stepName, command, expectedIf = undefined) {
  const step = findStep(workflow, jobName, stepName, path);
  if (!step) return;
  if (String(step.run ?? '').trim() !== command) {
    fail(`${path} step "${stepName}" must run exactly: ${command}`);
  }
  if (step['continue-on-error'] !== undefined && step['continue-on-error'] !== false) {
    fail(`${path} step "${stepName}" must not continue on error`);
  }
  if (expectedIf === undefined) {
    if (step.if !== undefined) fail(`${path} step "${stepName}" must not be conditional`);
  } else if (String(step.if ?? '').trim() !== expectedIf) {
    fail(`${path} step "${stepName}" must use condition: ${expectedIf}`);
  }
}

function validateReusableWebCi(workflow, path) {
  const on = workflow.on;
  if (!on?.workflow_call || typeof on.workflow_call !== 'object') {
    fail(`${path} must expose workflow_call`);
  }

  const inputs = on?.workflow_call?.inputs ?? {};
  for (const name of [
    'working_directory',
    'run_check',
    'check_opt_out_reason',
    'run_typecheck',
    'typecheck_opt_out_reason',
    'run_test',
    'test_opt_out_reason',
    'run_e2e',
  ]) {
    if (!Object.hasOwn(inputs, name)) fail(`${path} missing workflow_call input: ${name}`);
  }

  if (String(workflow.env?.CI ?? '') !== 'true') fail(`${path} must set CI=true at workflow scope`);

  const job = workflow.jobs?.verify;
  if (!job || typeof job !== 'object') {
    fail(`${path} must define verify job`);
    return;
  }
  if (job['continue-on-error'] !== undefined && job['continue-on-error'] !== false) {
    fail(`${path} verify job must not continue on error`);
  }

  const contract = findStep(workflow, 'verify', 'Validate npm script contract', path);
  if (contract) {
    const expectedEnv = {
      RUN_CHECK: '${{ inputs.run_check }}',
      CHECK_OPT_OUT_REASON: '${{ inputs.check_opt_out_reason }}',
      RUN_TYPECHECK: '${{ inputs.run_typecheck }}',
      TYPECHECK_OPT_OUT_REASON: '${{ inputs.typecheck_opt_out_reason }}',
      RUN_TEST: '${{ inputs.run_test }}',
      TEST_OPT_OUT_REASON: '${{ inputs.test_opt_out_reason }}',
      RUN_E2E: '${{ inputs.run_e2e }}',
    };
    for (const [name, expected] of Object.entries(expectedEnv)) {
      if (String(contract.env?.[name] ?? '').trim() !== expected) {
        fail(`${path} script-contract step must map ${name} to ${expected}`);
      }
    }
    for (const marker of [
      "requireScript('build')",
      "validateGate('RUN_CHECK', 'CHECK_OPT_OUT_REASON', 'check')",
      "validateGate('RUN_TYPECHECK', 'TYPECHECK_OPT_OUT_REASON', 'typecheck')",
      "validateGate('RUN_TEST', 'TEST_OPT_OUT_REASON', 'test')",
      "if (process.env.RUN_E2E === 'true') requireScript('test:e2e')",
    ]) {
      if (!String(contract.run ?? '').includes(marker)) {
        fail(`${path} script-contract step missing executable rule: ${marker}`);
      }
    }
  }

  requireRunStep(workflow, path, 'verify', 'Install dependencies', 'npm ci');
  requireRunStep(workflow, path, 'verify', 'Static checks', 'npm run check', '${{ inputs.run_check }}');
  requireRunStep(workflow, path, 'verify', 'Typecheck', 'npm run typecheck', '${{ inputs.run_typecheck }}');
  requireRunStep(workflow, path, 'verify', 'Unit and component tests', 'npm run test', '${{ inputs.run_test }}');
  requireRunStep(workflow, path, 'verify', 'Production build', 'npm run build');
  requireRunStep(workflow, path, 'verify', 'End-to-end tests', 'npm run test:e2e', '${{ inputs.run_e2e }}');

  for (const stepName of [
    'Validate npm script contract',
    'Install dependencies',
    'Static checks',
    'Typecheck',
    'Unit and component tests',
    'Production build',
    'End-to-end tests',
  ]) {
    const step = findStep(workflow, 'verify', stepName, path);
    if (step && String(step['working-directory'] ?? '').trim() !== '${{ inputs.working_directory }}') {
      fail(`${path} step "${stepName}" must use inputs.working_directory`);
    }
  }
}

function validateFoundationCi(workflow, path) {
  requireRunStep(workflow, path, 'validate', 'Reproducible install', 'npm ci');
  requireRunStep(workflow, path, 'validate', 'Validate Foundation contracts', 'npm run foundation:validate');
  requireRunStep(workflow, path, 'validate', 'Run validator regression tests', 'npm run foundation:test');
  requireRunStep(workflow, path, 'validate', 'Run reusable CI contract tests', 'npm run foundation:test:web-ci');
  requireRunStep(workflow, path, 'validate', 'Exercise release cycle', 'npm run foundation:test:release');
  requireRunStep(workflow, path, 'validate', 'Validate current release metadata', 'npm run foundation:release-validate');
  requireRunStep(workflow, path, 'validate', 'Verify locked Changesets CLI', 'npm run version:tooling');

  const consumer = workflow.jobs?.['consumer-smoke'];
  if (!consumer || consumer.uses !== './.github/workflows/web-ci.yml') {
    fail(`${path} must execute the local reusable web-ci.yml through consumer-smoke`);
  }
}

const workflowDir = '.github/workflows';
const workflowPaths = readdirSync(workflowDir)
  .filter((name) => /\.ya?ml$/i.test(name))
  .map((name) => `${workflowDir}/${name}`)
  .sort();

if (workflowPaths.length === 0) fail('no GitHub Actions workflows found');

for (const path of workflowPaths) {
  let workflow;
  try {
    workflow = parseYamlObject(read(path), path);
  } catch (error) {
    fail(error.message);
    continue;
  }

  validatePermissions(path, workflow.permissions, 'top-level', { required: true });
  if (workflow.permissions?.contents !== 'read') fail(`${path} top-level contents permission must be read`);

  const jobs = workflow.jobs;
  if (!jobs || typeof jobs !== 'object' || Array.isArray(jobs)) {
    fail(`${path} must define jobs as a mapping`);
    continue;
  }

  for (const [jobName, job] of Object.entries(jobs)) {
    if (!job || typeof job !== 'object' || Array.isArray(job)) {
      fail(`${path} job ${jobName} must be a mapping`);
      continue;
    }
    validatePermissions(path, job.permissions, `job ${jobName}`);
    if (job.uses !== undefined) validateUses(path, job.uses, `job ${jobName}`);

    if (job['continue-on-error'] !== undefined && job['continue-on-error'] !== false) {
      fail(`${path} job ${jobName} must not continue on error`);
    }

    if (Array.isArray(job.steps)) {
      for (const [index, step] of job.steps.entries()) {
        if (step?.uses !== undefined) validateUses(path, step.uses, `job ${jobName} step ${index + 1}`);
      }
    }
  }

  if (path === '.github/workflows/web-ci.yml') validateReusableWebCi(workflow, path);
  if (path === '.github/workflows/foundation-ci.yml') validateFoundationCi(workflow, path);
}

const changesets = readJson('.changeset/config.json');
if (changesets.baseBranch !== 'main') fail('Changesets baseBranch must be main');
if (changesets.privatePackages?.version !== true || changesets.privatePackages?.tag !== true) {
  fail('Changesets must version and tag private applications/foundation repositories');
}

for (const dependency of ['@changesets/cli', 'yaml']) {
  const declared = pkg.devDependencies?.[dependency];
  if (!semver.test(declared ?? '')) fail(`${dependency} must be an exact SemVer devDependency`);
  if (lock.packages?.['']?.devDependencies?.[dependency] !== declared) {
    fail(`package-lock root must record the exact ${dependency} devDependency`);
  }
  if (lock.packages?.[`node_modules/${dependency}`]?.version !== declared) {
    fail(`package-lock must contain the exact installed ${dependency} version`);
  }
}

for (const script of [
  'changeset',
  'version-packages',
  'version:status',
  'version:tooling',
  'tag-version',
  'foundation:release-validate',
  'foundation:test:web-ci',
  'foundation:test:release',
]) {
  if (!pkg.scripts?.[script] || pkg.scripts[script].includes('npx')) {
    fail(`${script} must use lockfile-installed tooling and committed scripts`);
  }
}

if (failures.length) {
  console.error('Foundation validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Foundation validation passed for version ${version}.`);
