import assert from 'node:assert/strict';
import test from 'node:test';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createApp } from '../scripts/create-app.mjs';
import { validateLinks } from '../scripts/validate-links.mjs';
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

test('生成は文書・caller・実lockfileを揃え、依存graphを変更しない', () => {
  const root = mkdtempSync(join(tmpdir(), 'create-app-'));
  try {
    const app = join(root, 'app');
    const result = createApp(app, { name: 'fresh-app' });
    assert.equal(result.templateSha, sha); assert.equal(result.foundationSha, sha);
    const json = path => JSON.parse(readFileSync(path, 'utf8'));
    const lock = json(join(app, 'package-lock.json')), source = json('kits/web/starter/package-lock.json');
    assert.equal(json(join(app, 'package.json')).name, 'fresh-app');
    assert.equal(lock.name, 'fresh-app'); assert.equal(lock.packages[''].name, 'fresh-app');
    lock.name = source.name; lock.packages[''].name = source.packages[''].name;
    assert.deepEqual(lock, source);
    assert.equal(readFileSync(join(app, '.node-version'), 'utf8'), readFileSync('.node-version', 'utf8'));
    assert.match(readFileSync(join(app, '.github/workflows/ci.yml'), 'utf8'), new RegExp(`web-ci.yml@${sha}`));
    assert.match(readFileSync(join(app, 'AGENTS.md'), 'utf8'), /blob\/[a-f0-9]{40}\/AGENTS.md/);
    assert.match(readFileSync(join(app, 'AGENTS.md'), 'utf8'), /## ChatとWorkの使い分け/);
    assert.match(readFileSync(join(app, 'AGENTS.md'), 'utf8'), /## 承認が必要な変更/);
    assert.match(readFileSync(join(app, 'AGENTS.md'), 'utf8'), /## アプリ固有規則/);
    assert.ok(existsSync(join(app, '.github/pull_request_template.md')));
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
    for (const foundationSha of ['main', 'v0.12.1', 'b97a0d9', '', 'z'.repeat(40), 'a'.repeat(40)]) assert.throws(() => createApp(app, { name: 'app', foundationSha }));
    assert.ok(!existsSync(app));
    const result = spawnSync(process.execPath, ['scripts/create-app.mjs', app, '--name', 'app', '--oops', sha], { encoding: 'utf8' });
    assert.notEqual(result.status, 0); assert.deepEqual(readdirSync(root), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('追跡済み・未追跡の変更があるcheckoutからは出力せず生成を拒否する', async () => {
  const root = mkdtempSync(join(tmpdir(), 'create-app-dirty-'));
  try {
    const copy = join(root, 'foundation');
    execFileSync('git', ['clone', '--quiet', '--local', '--no-hardlinks', process.cwd(), copy]);
    const { createApp: createFromCopy } = await import(pathToFileURL(join(copy, 'scripts/create-app.mjs')));
    appendFileSync(join(copy, 'kits/web/starter/README.md'), '\n未コミットの変更\n');
    const app = join(root, 'app');
    assert.throws(() => createFromCopy(app, { name: 'app' }), /未コミット変更/);
    assert.ok(!existsSync(app));
    execFileSync('git', ['restore', 'kits/web/starter/README.md'], { cwd: copy });
    writeFileSync(join(copy, 'untracked.txt'), '未追跡');
    assert.throws(() => createFromCopy(app, { name: 'app' }), /未コミット変更/);
    assert.ok(!existsSync(app));
    assert.deepEqual(readdirSync(root), ['foundation']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
