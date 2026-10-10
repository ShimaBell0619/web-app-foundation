import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkInventory, validate } from '../scripts/validate-docs-inventory.mjs';
import { validateLinks } from '../scripts/validate-links.mjs';

test('relative links, reference links and heading fragments fail when broken', () => {
  const root = mkdtempSync(join(tmpdir(), 'foundation-links-'));
  try {
    writeFileSync(join(root, 'target.md'), '# 日本語の見出し\n');
    writeFileSync(join(root, 'README.md'), '[本文](target.md#日本語の見出し)\n[参照][guide]\n[guide]: target.md\n');
    assert.deepEqual(validateLinks(root, ['README.md']), []);
    writeFileSync(join(root, 'README.md'), '[欠落](missing.md)\n[誤見出し](target.md#missing)\n[未定義][guide]\n');
    const errors = validateLinks(root, ['README.md']);
    assert.equal(errors.length, 3);
    assert.match(errors.join('\n'), /broken link/);
    assert.match(errors.join('\n'), /broken fragment/);
    assert.match(errors.join('\n'), /undefined link/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('the documentation and workflow catalog matches the repository', () => {
  assert.deepEqual(validate(), []);
});

const guide = readFileSync('docs/README.md', 'utf8');
const docs = ['docs/operations.md', 'docs/adoption.md'];
const workflows = ['.github/workflows/ci.yml'];

test('missing or stale docs and workflows fail closed', () => {
  const relevantRows = guide.split('\n').filter(line =>
    docs.some(path => line.includes(`\`${path}\``)) ||
    workflows.some(path => line.includes(`\`${path}\``)),
  ).join('\n');
  assert.deepEqual(checkInventory({ docs, workflows, guide: relevantRows }), []);
  assert.match(
    checkInventory({ docs: [...docs, 'docs/brand-new.md'], workflows, guide: relevantRows }).join(' '),
    /unlisted document/,
  );
  assert.match(
    checkInventory({ docs, workflows: [...workflows, '.github/workflows/unknown.yml'], guide: relevantRows }).join(' '),
    /unlisted workflow/,
  );
  assert.match(
    checkInventory({ docs: [], workflows: [], guide: relevantRows }).join(' '),
    /obsolete/,
  );
});

test('inventory CLI actually executes and propagates invalid fixture failures', () => {
  const root = mkdtempSync(join(tmpdir(), 'foundation-doc-inventory-'));
  try {
    for (const path of ['scripts', 'docs', '.github/workflows']) mkdirSync(join(root, path), { recursive: true });
    copyFileSync('scripts/validate-docs-inventory.mjs', join(root, 'scripts/validate-docs-inventory.mjs'));
    writeFileSync(join(root, 'README.md'), 'docs/README.md');
    writeFileSync(join(root, 'AGENTS.md'), 'docs/README.md');
    writeFileSync(join(root, 'docs/README.md'), [
      '| File | Purpose |',
      '| --- | --- |',
      '| `docs/adoption.md` | entry |',
      '| `.github/workflows/ci.yml` | gate |',
    ].join('\n'));
    writeFileSync(join(root, 'docs/adoption.md'), '# Adoption');
    writeFileSync(join(root, '.github/workflows/ci.yml'), 'name: CI');
    const cli = () => spawnSync(process.execPath, ['scripts/validate-docs-inventory.mjs'], {
      cwd: root, encoding: 'utf8',
    });
    const valid = cli();
    assert.equal(valid.status, 0, valid.stderr);
    assert.match(valid.stdout, /inventory are in sync/);
    writeFileSync(join(root, 'docs/unlisted.md'), '# Missing index entry');
    writeFileSync(join(root, '.github/workflows/other.yml'), 'name: Other');
    const invalid = cli();
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /unlisted document: docs\/unlisted.md/);
    assert.match(invalid.stderr, /unlisted workflow: .github\/workflows\/other.yml/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
