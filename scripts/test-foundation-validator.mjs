import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const files = [
  'README.md', 'PRODUCT.base.md', 'DESIGN.base.md', 'AGENTS.md', 'CHANGELOG.md',
  'package.json', 'package-lock.json', '.changeset/config.json',
  '.github/workflows/web-ci.yml', '.github/workflows/foundation-ci.yml',
  '.github/ISSUE_TEMPLATE/work-item.yml', '.github/pull_request_template.md',
  'docs/adoption.md', 'docs/ci-performance.md', 'docs/versioning.md',
  'scripts/validate-foundation.mjs', 'scripts/test-foundation-validator.mjs',
  'fixtures/consumer/package.json', 'fixtures/consumer/package-lock.json',
  'fixtures/consumer/scripts/verify.mjs', 'fixtures/install-proof/package.json',
  'fixtures/install-proof/index.cjs',
];

function makeCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'web-foundation-validator-'));
  for (const file of files) {
    const target = join(dir, file);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(file, target);
  }
  return dir;
}

function mutate(dir, file, transform) {
  const path = join(dir, file);
  writeFileSync(path, transform(readFileSync(path, 'utf8')));
}

function setFoundationVersion(dir, version) {
  for (const file of ['package.json', 'package-lock.json']) {
    const path = join(dir, file);
    const json = JSON.parse(readFileSync(path, 'utf8'));
    json.version = version;
    if (file === 'package-lock.json') json.packages[''].version = version;
    writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
  }
  mutate(dir, 'README.md', (text) => text.replace(/Current Foundation version: \*\*\d+\.\d+\.\d+ \(pre-1\.0\)\*\*/, `Current Foundation version: **${version} (pre-1.0)**`));
  mutate(dir, 'AGENTS.md', (text) => text.replace(/Foundation-Version: \d+\.\d+\.\d+/, `Foundation-Version: ${version}`));
}

function run(dir, shouldPass, label) {
  const result = spawnSync(process.execPath, ['scripts/validate-foundation.mjs'], { cwd: dir, encoding: 'utf8' });
  const passed = result.status === 0;
  if (passed !== shouldPass) {
    throw new Error(`${label}: expected ${shouldPass ? 'success' : 'failure'}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
}

const dirs = [];
try {
  {
    const dir = makeCopy(); dirs.push(dir);
    run(dir, true, 'current Foundation');
  }
  for (const version of ['0.1.1', '0.2.0']) {
    const dir = makeCopy(); dirs.push(dir);
    setFoundationVersion(dir, version);
    run(dir, true, `coherent future release ${version}`);
  }
  {
    const dir = makeCopy(); dirs.push(dir);
    mutate(dir, 'package.json', (text) => text.replace('"version": "0.1.0"', '"version": "0.1.1"'));
    run(dir, false, 'version mismatch');
  }
  {
    const dir = makeCopy(); dirs.push(dir);
    mutate(dir, '.github/workflows/web-ci.yml', (text) => text.replace('run: npm ci', 'run: echo skipped # npm ci'));
    run(dir, false, 'npm ci no-op');
  }
  {
    const dir = makeCopy(); dirs.push(dir);
    mutate(dir, '.github/workflows/web-ci.yml', (text) => text.replace('permissions:\n  contents: read', 'permissions: write-all'));
    run(dir, false, 'blanket workflow permissions');
  }
  {
    const dir = makeCopy(); dirs.push(dir);
    mutate(dir, 'DESIGN.base.md', (text) => text.replace('version: alpha', 'version alpha'));
    run(dir, false, 'malformed DESIGN front matter');
  }
  {
    const dir = makeCopy(); dirs.push(dir);
    mutate(dir, '.github/workflows/web-ci.yml', (text) => text.replace('actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1', 'actions/checkout@main'));
    run(dir, false, 'mutable external action ref');
  }
  console.log('Foundation validator regression tests passed.');
} finally {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
}
