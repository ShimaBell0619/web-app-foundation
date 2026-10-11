import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';
import { createApp } from '../scripts/create-app.mjs';
import { validateLinks } from '../scripts/validate-links.mjs';

test('Foundation外の空ディレクトリで生成・clean install・実品質ゲートを通す', () => {
  const root = mkdtempSync(join(tmpdir(), 'foundation-fresh-adoption-'));
  const app = join(root, 'app');
  try {
    createApp(app, { name: 'fresh-adoption' });
    const ci = parseYaml(readFileSync(join(app, '.github/workflows/ci.yml'), 'utf8'));
    assert.match(ci.jobs.verify.uses, /web-ci\.yml@[a-f0-9]{40}$/);
    assert.equal(ci.permissions.contents, 'read');
    assert.deepEqual(validateLinks(app, ['README.md', 'AGENTS.md', 'PRODUCT.md', 'DESIGN.md']), []);
    for (const args of [['ci'], ...['check', 'typecheck', 'test', 'build'].map(script => ['run', script])]) {
      const result = spawnSync('npm', args, { cwd: app, encoding: 'utf8', timeout: 180000, env: { ...process.env, CI: 'true' } });
      assert.equal(result.status, 0, `npm ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
    }
    writeFileSync(join(app, 'src/invalid-hook.tsx'), "import { useState } from 'react';\nexport function InvalidHook({ flag }: { flag: boolean }) { if (flag) useState(0); return null; }\n");
    const invalid = spawnSync('npm', ['run', 'check'], { cwd: app, encoding: 'utf8', timeout: 30000 });
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stdout + invalid.stderr, /react-hooks\/rules-of-hooks/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
