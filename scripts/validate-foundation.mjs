import { readFileSync, existsSync } from 'node:fs';

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
];

const failures = [];

for (const path of requiredFiles) {
  if (!existsSync(path)) failures.push(`missing required file: ${path}`);
}

function read(path) {
  return readFileSync(path, 'utf8');
}

const pkg = JSON.parse(read('package.json'));
if (!/^\d+\.\d+\.\d+$/.test(pkg.version ?? '')) {
  failures.push('package.json version must be SemVer X.Y.Z');
}
if (pkg.version !== '0.1.0') {
  failures.push(`expected initial Foundation version 0.1.0, found ${pkg.version}`);
}

const readme = read('README.md');
if (!readme.includes(`Current Foundation version: **${pkg.version} (pre-1.0)**`)) {
  failures.push('README Foundation version must match package.json');
}

const agents = read('AGENTS.md');
for (const marker of [
  'PRODUCT.md',
  'DESIGN.md',
  'Issue-driven development',
  'Mandatory AI implementation loop',
  'Self-review',
  'reviewed full commit SHAs',
  'Semantic Versioning',
  'Changeset',
  'Conventional Commit',
]) {
  if (!agents.toLowerCase().includes(marker.toLowerCase())) {
    failures.push(`AGENTS.md missing contract marker: ${marker}`);
  }
}

const design = read('DESIGN.base.md');
if (!design.startsWith('---\nversion: alpha\n')) {
  failures.push('DESIGN.base.md must declare Google DESIGN.md alpha front matter');
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
  if (index < 0) {
    failures.push(`DESIGN.base.md missing canonical section: ${section}`);
  } else if (index <= previous) {
    failures.push(`DESIGN.base.md canonical section order invalid at: ${section}`);
  }
  previous = index;
}

const workflow = read('.github/workflows/web-ci.yml');
for (const marker of [
  'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
  'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020',
  'persist-credentials: false',
  'cache: npm',
  'cache-dependency-path:',
  'npm ci',
  'npm run check --if-present',
  'npm run typecheck --if-present',
  'npm run test --if-present',
  'npm run build',
]) {
  if (!workflow.includes(marker)) failures.push(`web-ci.yml missing contract marker: ${marker}`);
}
if (workflow.includes('node_modules')) {
  failures.push('web-ci.yml must not cache or special-case node_modules');
}

const changesets = JSON.parse(read('.changeset/config.json'));
if (changesets.baseBranch !== 'main') failures.push('Changesets baseBranch must be main');
if (changesets.privatePackages?.version !== true || changesets.privatePackages?.tag !== true) {
  failures.push('Changesets must version and tag private applications/foundation repositories');
}

if (failures.length) {
  console.error('Foundation validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Foundation validation passed for version ${pkg.version}.`);
