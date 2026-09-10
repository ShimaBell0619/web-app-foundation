import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const validatorPath = resolve('scripts/validate-ai-implementation.mjs');
const files = [
  'docs/ai-implementation.md',
  'AGENTS.md',
  'docs/adoption.md',
  'docs/ui-review.md',
  'docs/independent-review.md',
  'README.md',
  '.github/ISSUE_TEMPLATE/work-item.yml',
  '.github/pull_request_template.md',
  'package.json',
];
const dirs = [];

function makeCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'web-foundation-ai-implementation-'));
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
  run(resolve('.'), true, 'current AI implementation profile');

  {
    const dir = makeCopy();
    unlinkSync(join(dir, 'docs/ai-implementation.md'));
    run(dir, false, 'missing implementation guide');
  }

  {
    const dir = makeCopy();
    mutate(
      dir,
      'docs/ai-implementation.md',
      (text) => text.replace('## Context Routing', '## Context discovery'),
      'routing guide section',
    );
    run(dir, false, 'routing guide contract removed');
  }

  {
    const dir = makeCopy();
    mutate(
      dir,
      'AGENTS.md',
      (text) => text.replace('## Context routing', '## Document selection'),
      'repository routing index',
    );
    run(dir, false, 'AGENTS loses routing index');
  }

  {
    const dir = makeCopy();
    mutate(
      dir,
      'AGENTS.md',
      (text) => text.replace('## Complexity discipline', '## Implementation preferences'),
      'complexity discipline',
    );
    run(dir, false, 'anti-overengineering contract removed');
  }

  {
    const dir = makeCopy();
    mutate(
      dir,
      '.github/ISSUE_TEMPLATE/work-item.yml',
      (text) => text.replace('      multiple: true', '      multiple: false'),
      'additive change-area routing',
    );
    run(dir, false, 'issue form loses additive area selection');
  }

  {
    const dir = makeCopy();
    mutate(
      dir,
      '.github/ISSUE_TEMPLATE/work-item.yml',
      (text) => text.replace('    id: non_goals', '    id: scope_notes'),
      'explicit non-goals input',
    );
    run(dir, false, 'issue form loses explicit non-goals input');
  }

  {
    const dir = makeCopy();
    mutate(
      dir,
      '.github/pull_request_template.md',
      (text) => text.replace('## Context routing / Design Intent', '## Implementation notes'),
      'PR context evidence section',
    );
    run(dir, false, 'PR loses context-routing evidence');
  }

  {
    const dir = makeCopy();
    mutate(
      dir,
      'package.json',
      (text) => text.replace(' && node scripts/validate-ai-implementation.mjs', ''),
      'validator script integration',
    );
    run(dir, false, 'foundation validation no longer runs AI contract validator');
  }

  console.log('Context-routed AI implementation regression tests passed.');
} finally {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
}
