import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
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
    createApp(app, { name: 'fresh-adoption', foundationSha: 'a'.repeat(40) });
    const ci = parseYaml(readFileSync(join(app, '.github/workflows/ci.yml'), 'utf8'));
    assert.match(ci.jobs.verify.uses, /web-ci\.yml@[a-f0-9]{40}$/);
    assert.equal(ci.permissions.contents, 'read');
    assert.deepEqual(validateLinks(app, ['README.md', 'AGENTS.md', 'PRODUCT.md', 'DESIGN.md', 'VERIFICATION.md']), []);
    for (const args of [['ci'], ...['check', 'typecheck', 'test', 'build'].map(script => ['run', script])]) {
      const result = spawnSync('npm', args, { cwd: app, encoding: 'utf8', timeout: 180000, env: { ...process.env, CI: 'true' } });
      assert.equal(result.status, 0, `npm ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
