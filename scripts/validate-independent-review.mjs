import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const fail = (message) => failures.push(message);

const contracts = {
  'AGENTS.md': [
    '## 独立レビュー',
    '### コードレビューの重点',
    'docs/independent-review.md',
    '@codex review',
    'Automatic Review / Review my pull requests',
    'マージ候補HEAD',
    '明示的な承認',
    '過去の承認は再レビューに流用しない',
    '**仕様整合性**',
    '**信頼境界と公開の安全性**',
    '**状態・互換性**',
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
    '## 自己レビュー',
    '## 独立レビュー（リスクに応じて）',
    '@codex review',
    '明示的な承認',
    '対象としたマージ候補HEAD SHA:',
    '主な指摘と採否・修正:',
    '再レビューの要否と承認証拠:',
  ],
  'docs/adoption.md': [
    '## 必要時のみ独立レビュー',
    'docs/independent-review.md',
    '@codex review',
    '明示的な承認を得る',
    '再レビューにも別途承認',
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
