import assert from 'node:assert/strict';
import test from 'node:test';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';

// A clean app directory, rather than importing from the Foundation checkout,
// proves that all copyable paths and the real Vite/TS gates work in isolation.
test('fresh local app adopts web docs, reusable CI caller and unified Vercel kit', () => {
  const root = mkdtempSync(join(tmpdir(), 'foundation-fresh-adoption-'));
  const app = join(root, 'app');
  const run = (cmd, args, cwd = app) => {
    const result = spawnSync(cmd, args, {
      cwd, encoding: 'utf8', env: { ...process.env, CI: 'true' },
    });
    assert.equal(result.status, 0,
      cmd + ' ' + args.join(' ') + '\n' + result.stdout + '\n' + result.stderr);
  };
  try {
    cpSync('tests/fixtures/consumer', app, { recursive: true });
    cpSync('tests/fixtures/install-proof', join(root, 'install-proof'), { recursive: true });
    cpSync('kits/web/PRODUCT.md', join(app, 'PRODUCT.md'));
    cpSync('kits/web/DESIGN.md', join(app, 'DESIGN.md'));
    cpSync('AGENTS.md', join(app, 'AGENTS.md'));
    cpSync('docs', join(app, 'docs'), { recursive: true });
    mkdirSync(join(app, '.github/workflows'), { recursive: true });
    mkdirSync(join(app, 'kits/vercel/hosted-review'), { recursive: true });
    mkdirSync(join(app, 'kits/vercel/shared'), { recursive: true });
    cpSync('kits/vercel/hosted-review/workflow.yml', join(app, '.github/workflows/hosted-review.yml'));
    cpSync('kits/vercel/hosted-review/hosted-review.mjs', join(app, 'kits/vercel/hosted-review/hosted-review.mjs'));
    cpSync('kits/vercel/shared/provenance.mjs', join(app, 'kits/vercel/shared/provenance.mjs'));
    cpSync('kits/vercel/vercel.json', join(app, 'vercel.json'));
    const caller = [
      'name: App CI',
      'on: [pull_request]',
      'permissions: { contents: read }',
      'jobs:',
      '  verify:',
      '    uses: ShimaBell0619/web-app-foundation/.github/workflows/web-ci.yml@c38ae4e8e70a7307d6ff6a38cbd59797d94ac93c',
      '    with:',
      '      cache_dependency_path: package-lock.json',
      '',
    ].join('\n');
    writeFileSync(join(app, '.github/workflows/ci.yml'), caller);
    const workflow = parseYaml(readFileSync(join(app, '.github/workflows/hosted-review.yml'), 'utf8'));
    const ci = parseYaml(readFileSync(join(app, '.github/workflows/ci.yml'), 'utf8'));
    const config = JSON.parse(readFileSync(join(app, 'vercel.json'), 'utf8'));
    assert.ok(workflow.jobs.authorize && workflow.jobs.publish && workflow.jobs.notify);
    assert.ok(workflow.jobs['validate-source']);
    assert.match(ci.jobs.verify.uses, /web-ci\.yml@[a-f0-9]{40}$/);
    assert.deepEqual(config.git.deploymentEnabled, {
      '**': false, main: true, 'preview/**': true, staging: true,
    });
    assert.ok(existsSync(join(app, 'PRODUCT.md')) && existsSync(join(app, 'DESIGN.md')));
    run(process.execPath, ['--check', 'kits/vercel/hosted-review/hosted-review.mjs']);
    run('npm', ['ci', '--ignore-scripts']);
    for (const script of ['check', 'typecheck', 'test', 'build']) {
      run('npm', ['run', script]);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
