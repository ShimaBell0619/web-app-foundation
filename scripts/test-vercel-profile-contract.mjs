import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const validatorPath = resolve('scripts/validate-vercel-profile.mjs');
const files = [
  'README.md',
  'docs/adoption.md',
  'docs/vercel.md',
  'docs/vercel-fixed-staging.md',
  'templates/vercel/vercel-git.json',
  'templates/vercel/vite-spa-vercel.json',
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function assertPolicy(path) {
  const config = readJson(path);
  assert.deepEqual(config.git?.deploymentEnabled, {
    '*': false,
    main: true,
    staging: true,
  });
}

function makeCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'web-foundation-vercel-'));
  for (const file of files) {
    const target = join(dir, file);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(file, target);
  }
  return dir;
}

function mutateJson(dir, file, mutator) {
  const path = join(dir, file);
  const json = JSON.parse(readFileSync(path, 'utf8'));
  mutator(json);
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
}

function mutateText(dir, file, mutator) {
  const path = join(dir, file);
  writeFileSync(path, mutator(readFileSync(path, 'utf8')));
}

function runValidator(dir) {
  return spawnSync(process.execPath, [validatorPath], { cwd: dir, encoding: 'utf8' });
}

test('generic Vercel template deploys only main and staging', () => {
  assertPolicy('templates/vercel/vercel-git.json');
});

test('Vite SPA Vercel template keeps the same deployment policy and fallback', () => {
  assertPolicy('templates/vercel/vite-spa-vercel.json');
  const config = readJson('templates/vercel/vite-spa-vercel.json');
  assert.ok(
    config.rewrites.some(
      (rewrite) => rewrite?.source === '/(.*)' && rewrite?.destination === '/index.html',
    ),
  );
});

test('current Vercel profile validates', () => {
  const result = runValidator(process.cwd());
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('validator rejects feature/PR deployment being re-enabled by wildcard policy drift', () => {
  const dir = makeCopy();
  try {
    mutateJson(dir, 'templates/vercel/vercel-git.json', (config) => {
      config.git.deploymentEnabled['*'] = true;
    });
    const result = runValidator(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /disable Git deployment for all branches by default/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validator rejects main or staging being removed from the allowed deployment set', () => {
  const dir = makeCopy();
  try {
    mutateJson(dir, 'templates/vercel/vite-spa-vercel.json', (config) => {
      delete config.git.deploymentEnabled.staging;
    });
    const result = runValidator(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /define only \*, main, and staging|enable Git deployment for staging/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validator rejects removal of the provider-side Branch Tracking gate', () => {
  const dir = makeCopy();
  try {
    mutateText(dir, 'docs/vercel.md', (text) => text.replaceAll('Branch Tracking', 'branch selection'));
    const result = runValidator(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Preview Branch Tracking provider-side gate/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validator rejects removal of post-adoption smoke evidence', () => {
  const dir = makeCopy();
  try {
    mutateText(dir, 'docs/adoption.md', (text) => text.replaceAll('post-adoption smoke', 'deployment check'));
    const result = runValidator(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /post-adoption smoke/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
