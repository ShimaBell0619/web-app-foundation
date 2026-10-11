import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createApp } from '../scripts/create-app.mjs';
import { validateLinks } from '../scripts/validate-links.mjs';
const sha = 'a'.repeat(40);

test('生成は文書・caller・実lockfileを揃え、依存graphを変更しない', () => {
  const root = mkdtempSync(join(tmpdir(), 'create-app-'));
  try {
    const app = join(root, 'app'); createApp(app, { name: 'fresh-app', foundationSha: sha });
    const json = path => JSON.parse(readFileSync(path, 'utf8'));
    const lock = json(join(app, 'package-lock.json')), source = json('kits/web/starter/package-lock.json');
    assert.equal(json(join(app, 'package.json')).name, 'fresh-app');
    assert.equal(lock.name, 'fresh-app'); assert.equal(lock.packages[''].name, 'fresh-app');
    lock.name = source.name; lock.packages[''].name = source.packages[''].name;
    assert.deepEqual(lock, source);
    assert.equal(readFileSync(join(app, '.node-version'), 'utf8'), readFileSync('.node-version', 'utf8'));
    assert.match(readFileSync(join(app, '.github/workflows/ci.yml'), 'utf8'), new RegExp(`web-ci.yml@${sha}`));
    assert.match(readFileSync(join(app, 'AGENTS.md'), 'utf8'), /blob\/[a-f0-9]{40}\/AGENTS.md/);
    const design = readFileSync(join(app, 'DESIGN.md'), 'utf8');
    assert.match(design, /^name: fresh-app$/m);
    assert.match(design, /^## Overview$/m);
    assert.doesNotMatch(design, /__APP_NAME__|__TEMPLATE_SHA__/);
    assert.match(readFileSync(join(app, 'PRODUCT.md'), 'utf8'), /^# fresh-app — 製品の約束$/m);
    assert.match(readFileSync(join(app, 'PRODUCT.md'), 'utf8'), /^## 守るべき保証$/m);
    assert.ok(!existsSync(join(app, 'VERIFICATION.md')));
    assert.deepEqual(json(join(app, 'vercel.json')).git.deploymentEnabled, { '**': false, main: true });
    assert.deepEqual(validateLinks(app, ['README.md', 'AGENTS.md', 'PRODUCT.md', 'DESIGN.md']), []);
    assert.ok(!existsSync(join(app, 'node_modules')));
    writeFileSync(join(app, 'keep.txt'), '保持');
    assert.throws(() => createApp(app, { name: 'fresh-app', foundationSha: sha }), /空ディレクトリ/);
    assert.equal(readFileSync(join(app, 'keep.txt'), 'utf8'), '保持');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('不正な名前・pin・CLIを拒否し、出力を残さない', () => {
  const root = mkdtempSync(join(tmpdir(), 'create-app-invalid-'));
  try {
    const app = join(root, 'app');
    for (const name of ['../escape', '@scope/pkg', 'UPPER', '', 'a'.repeat(65)]) assert.throws(() => createApp(app, { name, foundationSha: sha }));
    for (const foundationSha of ['main', 'v0.12.1', 'b97a0d9', '', 'z'.repeat(40)]) assert.throws(() => createApp(app, { name: 'app', foundationSha }));
    assert.ok(!existsSync(app));
    const result = spawnSync(process.execPath, ['scripts/create-app.mjs', app, '--name', 'app', '--oops', sha], { encoding: 'utf8' });
    assert.notEqual(result.status, 0); assert.deepEqual(readdirSync(root), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
