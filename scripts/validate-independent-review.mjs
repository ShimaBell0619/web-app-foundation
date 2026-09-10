import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const fail = (message) => failures.push(message);

const contracts = {
  'AGENTS.md': [
    '## Independent review',
    '## Code Review Rules',
    'docs/independent-review.md',
    '@codex review',
    'Automatic Review / Review my pull requests OFF',
    'merge-candidate HEAD',
    'Self-review remains mandatory',
    'obtain explicit approval',
    'Do not invoke `@codex review` autonomously',
    'fresh rationale and explicit approval',
    '**Contract integrity**',
    '**Trust and delivery safety**',
    '**State and compatibility safety**',
  ],
  'docs/independent-review.md': [
    '# Selective independent code review',
    '@codex review',
    'Automatic Review / Review my pull requests OFF',
    'merge-candidate HEAD',
    'obtain independent review before merge when practical',
    'Approval is per invocation',
    'obtain explicit approval',
    '## Review focus and finding quality',
    '## When to request re-review',
    'Foundation validation cannot prove',
  ],
  '.github/pull_request_template.md': [
    '## AI self-review',
    '## Independent review',
    '@codex review',
    'explicit user/maintainer approval',
    'Affected risk category / expected review value:',
    'Codex invocation approval:',
    'Merge-candidate SHA reviewed:',
    'Material finding(s) and disposition:',
    'Re-review approval:',
    'Re-review decision:',
  ],
  'docs/adoption.md': [
    '## Selective independent code review',
    'docs/independent-review.md',
    '@codex review',
    'Automatic Review / Review my pull requests OFF',
    'obtain explicit approval',
    'fresh approval',
  ],
  'README.md': ['docs/independent-review.md'],
};

for (const [path, markers] of Object.entries(contracts)) {
  if (!existsSync(path)) {
    fail(`missing independent-review contract file: ${path}`);
    continue;
  }
  const text = readFileSync(path, 'utf8');
  for (const marker of markers) {
    if (!text.includes(marker)) {
      fail(`${path} missing independent-review contract marker: ${marker}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Independent-review contract validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Independent-review contract validation passed.');
}
