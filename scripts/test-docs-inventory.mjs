import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { checkInventory, validate } from './validate-docs-inventory.mjs';

test('the documentation and workflow catalog matches the repository', () => {
  assert.deepEqual(validate(), []);
});

const guide = readFileSync('docs/README.md', 'utf8');
const docs = ['docs/ai-implementation.md', 'docs/adoption.md'];
const workflows = ['.github/workflows/foundation-ci.yml'];

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
