import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const validatorPath = resolve('scripts/validate-independent-review.mjs');
const files = [
  'AGENTS.md',
  'README.md',
  'docs/adoption.md',
  'docs/independent-review.md',
  '.github/pull_request_template.md',
];
const dirs = [];

function makeCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'web-foundation-independent-review-'));
  dirs.push(dir);
  for (const file of files) {
    const target = join(dir, file);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(file, target);
  }
  return dir;
}

function mutate(dir, file, from, to, label) {
  const path = join(dir, file);
  const before = readFileSync(path, 'utf8');
  if (!before.includes(from)) throw new Error(`${label}: mutation target not found in ${file}`);
  const after = before.replace(from, to);
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
  {
    const dir = makeCopy();
    run(dir, true, 'coherent independent-review contract');
  }

  {
    const dir = makeCopy();
    mutate(dir, 'AGENTS.md', '@codex review', '@review-bot review', 'manual Codex trigger regression');
    run(dir, false, 'manual Codex trigger regression');
  }

  {
    const dir = makeCopy();
    mutate(dir, 'AGENTS.md', 'obtain explicit approval', 'proceed without approval', 'Codex approval gate regression');
    run(dir, false, 'Codex approval gate regression');
  }

  {
    const dir = makeCopy();
    mutate(
      dir,
      'AGENTS.md',
      'fresh rationale and explicit approval',
      'reuse the prior approval',
      'Codex re-review approval regression',
    );
    run(dir, false, 'Codex re-review approval regression');
  }

  {
    const dir = makeCopy();
    mutate(dir, 'AGENTS.md', '## Code Review Rules', '## Review Notes', 'Codex review rules heading regression');
    run(dir, false, 'Codex review rules heading regression');
  }

  {
    const dir = makeCopy();
    mutate(
      dir,
      'docs/independent-review.md',
      'obtain independent review before merge when practical',
      'consider independent review before merge when practical',
      'high-risk review gate regression',
    );
    run(dir, false, 'high-risk review gate regression');
  }

  {
    const dir = makeCopy();
    mutate(
      dir,
      'docs/independent-review.md',
      'Approval is per invocation',
      'Approval may be reused across invocations',
      'per-invocation approval regression',
    );
    run(dir, false, 'per-invocation approval regression');
  }

  {
    const dir = makeCopy();
    mutate(
      dir,
      'docs/independent-review.md',
      'Automatic Review / Review my pull requests OFF',
      'Automatic Review / Review my pull requests ON',
      'automatic-review policy regression',
    );
    run(dir, false, 'automatic-review policy regression');
  }

  {
    const dir = makeCopy();
    mutate(
      dir,
      '.github/pull_request_template.md',
      'Codex invocation approval:',
      'Codex invocation:',
      'Codex approval evidence regression',
    );
    run(dir, false, 'Codex approval evidence regression');
  }

  {
    const dir = makeCopy();
    mutate(
      dir,
      '.github/pull_request_template.md',
      'Merge-candidate SHA reviewed:',
      'Review completed:',
      'reviewed-SHA evidence regression',
    );
    run(dir, false, 'reviewed-SHA evidence regression');
  }

  {
    const dir = makeCopy();
    mutate(
      dir,
      'docs/adoption.md',
      'docs/independent-review.md',
      'docs/review-notes.md',
      'consumer adoption reference regression',
    );
    run(dir, false, 'consumer adoption reference regression');
  }

  {
    const dir = makeCopy();
    rmSync(join(dir, 'docs/independent-review.md'));
    run(dir, false, 'missing independent-review policy');
  }

  console.log('Independent-review contract regression tests passed.');
} finally {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
}
