import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const validatorPath = 'scripts/validate-ui-profile.mjs';
const files = [
  validatorPath,
  'docs/ui-implementation.md',
  'DESIGN.base.md',
  'AGENTS.md',
  'docs/ui-review.md',
  'docs/adoption.md',
  'README.md',
];
const dirs = [];

function makeCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'web-foundation-ui-profile-'));
  dirs.push(dir);
  for (const file of files) {
    const target = join(dir, file);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(file, target);
  }
  return dir;
}

function mutate(dir, file, transform, label) {
  const path = join(dir, file);
  const before = readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error(`${label}: mutation did not change ${file}`);
  writeFileSync(path, after);
}

function run(dir, shouldPass, label) {
  const result = spawnSync(process.execPath, [validatorPath], { cwd: dir, encoding: 'utf8' });
  const passed = result.status === 0;
  if (passed !== shouldPass) {
    throw new Error(`${label}: expected ${shouldPass ? 'success' : 'failure'}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
}

try {
  run(resolve('.'), true, 'current UI profile');

  {
    const dir = makeCopy();
    unlinkSync(join(dir, 'docs/ui-implementation.md'));
    run(dir, false, 'missing profile document');
  }

  {
    const dir = makeCopy();
    mutate(dir, 'docs/ui-implementation.md', (text) => text.replace('## Generic primitives', '## Generic controls'), 'generic primitive section');
    run(dir, false, 'generic primitive responsibility removed');
  }

  {
    const dir = makeCopy();
    mutate(dir, 'docs/ui-implementation.md', (text) => text.replaceAll('shadcn/ui-style accessible primitives', 'component primitives'), 'accessible primitive profile');
    run(dir, false, 'default accessible primitive concept removed');
  }

  {
    const dir = makeCopy();
    mutate(dir, 'AGENTS.md', (text) => text.replaceAll('docs/ui-implementation.md', 'docs/ui-profile-removed.md'), 'AGENTS profile reference');
    run(dir, false, 'AGENTS loses profile reference');
  }

  {
    const dir = makeCopy();
    mutate(dir, 'docs/ui-implementation.md', (text) => text.replace('## Specialist custom CSS', '## Styling exceptions'), 'custom CSS section');
    run(dir, false, 'specialist CSS boundary removed');
  }

  {
    const dir = makeCopy();
    mutate(dir, 'docs/ui-implementation.md', (text) => text.replace('## Existing consumers and deviations', '## Migration'), 'deviation section');
    run(dir, false, 'existing consumer deviation boundary removed');
  }

  {
    const dir = makeCopy();
    mutate(dir, 'docs/ui-review.md', (text) => text.replaceAll('composition quality', 'layout review'), 'composition review boundary');
    run(dir, false, 'UI review loses primitive/composition distinction');
  }

  console.log('Primitive-first UI profile regression tests passed.');
} finally {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
}
