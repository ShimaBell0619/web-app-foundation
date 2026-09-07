import { existsSync, readFileSync } from 'node:fs';

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

for (const path of requiredFiles) {
  if (!existsSync(path)) fail(`missing required file: ${path}`);
}

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const semver = /^\d+\.\d+\.\d+$/;
if (!semver.test(pkg.version ?? '')) fail('package.json version must be SemVer X.Y.Z');
const version = pkg.version;

if (lock.version !== version) fail('package-lock.json top-level version must match package.json');
if (lock.packages?.['']?.version !== version) fail('package-lock.json root package version must match package.json');
if (lock.packages?.['']?.name !== pkg.name) fail('package-lock.json root package name must match package.json');

const readme = read('README.md');
if (!readme.includes(`Current Foundation version: **${version} (pre-1.0)**`)) {
  fail('README Foundation version must match package.json');
}

const agents = read('AGENTS.md');
if (!agents.includes(`Foundation-Version: ${version}`)) fail('AGENTS Foundation-Version must match package.json');
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

function parseDesignFrontMatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') throw new Error('DESIGN.base.md must start with YAML front matter');
  const end = lines.indexOf('---', 1);
  if (end < 0) throw new Error('DESIGN.base.md front matter is not closed');
  const front = lines.slice(1, end);
  const top = new Map();
  const omitted = [];
  let inOmitted = false;
  let current = null;

  for (const raw of front) {
    if (!raw.trim()) continue;
    const topMatch = raw.match(/^([a-zA-Z][\w-]*):(?:\s*(.*))?$/);
    if (topMatch) {
      const [, key, value = ''] = topMatch;
      if (!['version', 'name', 'description', 'omitted'].includes(key)) throw new Error(`unsupported DESIGN front-matter key: ${key}`);
      if (top.has(key)) throw new Error(`duplicate DESIGN front-matter key: ${key}`);
      top.set(key, value.trim());
      inOmitted = key === 'omitted';
      current = null;
      if (key === 'omitted' && value.trim()) throw new Error('DESIGN omitted must be a YAML list');
      continue;
    }
    if (!inOmitted) throw new Error(`malformed DESIGN front matter: ${raw}`);
    const sectionMatch = raw.match(/^  - section:\s*([a-z][a-z0-9_-]*)\s*$/);
    if (sectionMatch) {
      current = { section: sectionMatch[1], reason: '' };
      omitted.push(current);
      continue;
    }
    const reasonMatch = raw.match(/^    reason:\s*(\S.*)$/);
    if (reasonMatch && current) {
      current.reason = reasonMatch[1].trim();
      continue;
    }
    throw new Error(`malformed DESIGN omitted entry: ${raw}`);
  }

  if (top.get('version') !== 'alpha') throw new Error('DESIGN.base.md version must be alpha');
  if (!top.get('name')) throw new Error('DESIGN.base.md name is required');
  if (!top.get('description')) throw new Error('DESIGN.base.md description is required');
  if (!top.has('omitted')) throw new Error('DESIGN.base.md omitted list is required for the shared baseline');
  for (const item of omitted) {
    if (!item.reason) throw new Error(`DESIGN omitted section lacks a reason: ${item.section}`);
  }
}

const design = read('DESIGN.base.md');
try {
  parseDesignFrontMatter(design);
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

function stripYamlComments(text) {
  return text.split(/\r?\n/).map((line) => {
    let quote = null;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if ((char === '"' || char === "'") && line[i - 1] !== '\\') {
        quote = quote === char ? null : quote ?? char;
      }
      if (char === '#' && !quote) return line.slice(0, i).trimEnd();
    }
    return line;
  }).join('\n');
}

function validateWorkflow(path, { reusable = false } = {}) {
  const source = stripYamlComments(read(path));
  if (/^\s*permissions:\s*(write-all|read-all)\s*$/m.test(source)) fail(`${path} must not use blanket permissions`);
  if (!/^permissions:\s*\n  contents:\s*read\s*$/m.test(source)) fail(`${path} must declare top-level contents: read`);
  if (source.includes('--if-present')) fail(`${path} must not silently skip required quality scripts with --if-present`);
  if (source.includes('node_modules')) fail(`${path} must not cache or special-case node_modules`);

  const usesMatches = [...source.matchAll(/^\s*uses:\s*([^\s]+)\s*$/gm)];
  for (const match of usesMatches) {
    const ref = match[1];
    if (ref.startsWith('./')) continue;
    const at = ref.lastIndexOf('@');
    if (at < 1 || !/^[0-9a-f]{40}$/i.test(ref.slice(at + 1))) fail(`${path} external action/workflow must use a full commit SHA: ${ref}`);
  }

  if (reusable) {
    for (const marker of [
      'workflow_call:',
      'working_directory:',
      'run_check:',
      'check_opt_out_reason:',
      'run_typecheck:',
      'typecheck_opt_out_reason:',
      'run_test:',
      'test_opt_out_reason:',
      'run_e2e:',
      'run: npm ci',
      'run: npm run check',
      'run: npm run typecheck',
      'run: npm run test',
      'run: npm run build',
      'run: npm run test:e2e',
    ]) {
      if (!source.includes(marker)) fail(`${path} missing executable contract marker: ${marker}`);
    }
  }
}

validateWorkflow('.github/workflows/web-ci.yml', { reusable: true });
validateWorkflow('.github/workflows/foundation-ci.yml');

const changesets = readJson('.changeset/config.json');
if (changesets.baseBranch !== 'main') fail('Changesets baseBranch must be main');
if (changesets.privatePackages?.version !== true || changesets.privatePackages?.tag !== true) {
  fail('Changesets must version and tag private applications/foundation repositories');
}

if (pkg.devDependencies?.['@changesets/cli'] !== '3.0.2') fail('@changesets/cli must be an exact locked devDependency');
if (lock.packages?.['']?.devDependencies?.['@changesets/cli'] !== pkg.devDependencies?.['@changesets/cli']) {
  fail('package-lock root must record the exact @changesets/cli devDependency');
}
if (lock.packages?.['node_modules/@changesets/cli']?.version !== pkg.devDependencies?.['@changesets/cli']) {
  fail('package-lock must contain the exact installed @changesets/cli version');
}
for (const script of ['changeset', 'version-packages', 'version:status', 'tag-version']) {
  if (!pkg.scripts?.[script] || pkg.scripts[script].includes('npx')) fail(`${script} must use the lockfile-installed Changesets CLI`);
}

if (failures.length) {
  console.error('Foundation validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Foundation validation passed for version ${version}.`);
