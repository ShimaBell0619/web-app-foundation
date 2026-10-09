import { existsSync, readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

const failures = [];
const fail = (message) => failures.push(message);
const read = (path) => readFileSync(path, 'utf8');
const hasHeading = (source, heading) => source.split(/\r?\n/).some((line) => line.trim() === heading);

const requiredFiles = [
  'docs/ai-implementation.md', 'AGENTS.md', 'docs/adoption.md', 'README.md',
  '.github/ISSUE_TEMPLATE/work-item.yml', '.github/pull_request_template.md',
  'docs/ui-review.md', 'docs/independent-review.md', 'package.json',
];
for (const path of requiredFiles) {
  if (!existsSync(path)) fail(`missing AI implementation contract file: ${path}`);
}

function requireHeadings(path, headings) {
  const source = read(path);
  for (const heading of headings) {
    if (!hasHeading(source, heading)) fail(`${path} missing heading: ${heading}`);
  }
}

if (failures.length === 0) {
  requireHeadings('docs/ai-implementation.md', [
    '# Chat・WorkによるAI開発', '## 基本フロー', '## ChatとWorkの選択',
    '## 着手前に確認すること', '## ChatからWorkへ引き継ぐ情報',
    '## 実装と検証', '## PRと独立レビュー', '## 過剰な複雑化を防ぐ',
  ]);
  requireHeadings('AGENTS.md', [
    '## 文書とコンテキスト', '## ChatとWorkの使い分け',
    '## 承認が必要な変更', '## 実装・自己レビュー・完了条件',
    '## 設計と過剰な複雑化の抑制',
  ]);
  requireHeadings('docs/adoption.md', ['## Chat・Workでの開発']);
  requireHeadings('.github/pull_request_template.md', [
    '## 関連Issue・受け入れ条件', '## 設計・影響範囲',
    '## 検証結果', '## 自己レビュー', '## 独立レビュー（リスクに応じて）',
  ]);

  for (const [path, markers] of [
    ['AGENTS.md', ['Chat-first', 'Workは明示指示のみ', 'docs/ai-implementation.md']],
    ['docs/ai-implementation.md', ['Chatを標準の実行オーケストレーター', 'Workはユーザーが明示指示した場合に限る', '### Chatの実行経路の選択', '### GitHub・Azure操作の安全な委譲']],
    ['docs/ui-review.md', ['## Chatからの実ブラウザ検証', 'GitHub ActionsでPlaywright']],
    ['docs/azure-oidc.md', ['## Chat起点のAzure操作', '無制限のShell']],
  ]) {
    for (const marker of markers) {
      if (!read(path).includes(marker)) fail(`${path} missing chat-first contract: ${marker}`);
    }
  }

  for (const path of ['AGENTS.md', 'docs/adoption.md', 'README.md']) {
    if (!read(path).includes('docs/ai-implementation.md')) {
      fail(`${path} must reference docs/ai-implementation.md`);
    }
  }

  let issue;
  try {
    issue = parseYaml(read('.github/ISSUE_TEMPLATE/work-item.yml'));
  } catch (error) {
    fail(`work-item.yml invalid YAML: ${error.message}`);
  }
  if (!issue || !Array.isArray(issue.body)) {
    fail('work-item.yml must define form fields');
  } else {
    const controls = new Map(issue.body.map((field) => [field?.id, field]));
    for (const id of ['kind', 'goal', 'areas', 'context', 'non_goals', 'acceptance', 'validation']) {
      if (!controls.has(id)) fail(`work-item.yml missing control id: ${id}`);
    }
    if (controls.get('areas')?.type !== 'dropdown' || controls.get('areas')?.attributes?.multiple !== true) {
      fail('work-item.yml areas must be a multiple-selection dropdown');
    }
    if ((controls.get('areas')?.attributes?.options?.length ?? 0) < 7) {
      fail('work-item.yml must offer relevant change categories');
    }
    for (const id of ['goal', 'acceptance']) {
      if (controls.get(id)?.validations?.required !== true) {
        fail(`work-item.yml field ${id} must be required`);
      }
    }
  }

  const pr = read('.github/pull_request_template.md');
  for (const marker of [
    '受け入れ条件と証拠:', '参照した仕様・維持する動作:',
    '実施したコマンド・CI URL・確認対象SHA:', '未実施の検証と理由:',
  ]) {
    if (!pr.includes(marker)) fail(`PR template missing evidence: ${marker}`);
  }
  const pkg = JSON.parse(read('package.json'));
  if (!String(pkg.scripts?.['foundation:validate'] ?? '').includes('validate-ai-implementation.mjs')) {
    fail('foundation:validate must execute validate-ai-implementation.mjs');
  }
  if (!String(pkg.scripts?.['foundation:test'] ?? '').includes('test-ai-implementation-contract.mjs')) {
    fail('foundation:test must execute test-ai-implementation-contract.mjs');
  }
}
if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Chat/Work AI implementation contract is valid.');
}
