import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';

const pagesDoc = readFileSync('docs/pages.md', 'utf8');
const adoptionDoc = readFileSync('docs/adoption.md', 'utf8');
const callerTemplateText = readFileSync('templates/github-pages/pages-publish.yml', 'utf8');
const captureTemplatePath = 'templates/github-pages/capture-pr-preview.mjs';
const captureTemplate = readFileSync(captureTemplatePath, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const callerTemplate = parseYaml(callerTemplateText);
assert(callerTemplate.on?.workflow_run, 'publisher caller template must use workflow_run');
assert(callerTemplate.on?.pull_request_target, 'publisher caller template must retain metadata-only close cleanup');
assert(!callerTemplate.on?.pull_request, 'publisher caller template must not use direct pull_request publishing');

const templateSource = JSON.stringify(callerTemplate);
for (const forbidden of ['actions/checkout@', 'npm ci', 'npm run']) {
  assert(!templateSource.includes(forbidden), `publisher caller template must not execute PR code: ${forbidden}`);
}
for (const marker of [
  '__FULL_FOUNDATION_COMMIT_SHA__',
  'web-pages-publish.yml',
  'publish-production',
  'publish-preview',
  'cleanup-preview',
]) {
  assert(callerTemplateText.includes(marker), `publisher caller template missing marker: ${marker}`);
}

for (const marker of [
  'Phase 0',
  'default branch',
  'workflow_run',
  'templates/github-pages/pages-publish.yml',
  'Phase 1',
  'direct write-enabled PR publisher',
]) {
  assert(pagesDoc.includes(marker), `Pages documentation missing bootstrap marker: ${marker}`);
}

for (const marker of [
  'Pages Phase 0',
  'default branch',
  'Pages Phase 1',
  'docs/pages.md',
]) {
  assert(adoptionDoc.includes(marker), `adoption documentation missing Pages bootstrap marker: ${marker}`);
}

const syntax = spawnSync(process.execPath, ['--check', captureTemplatePath], { encoding: 'utf8' });
assert(
  syntax.status === 0,
  `capture template must parse as JavaScript\nstdout:\n${syntax.stdout}\nstderr:\n${syntax.stderr}`,
);
for (const marker of [
  'PAGES_BASE_PATH',
  'viteCommand',
  'domcontentloaded',
  'stopServer',
  'SIGTERM',
  'SIGKILL',
  'page.waitForTimeout(300)',
]) {
  assert(captureTemplate.includes(marker), `capture template missing deterministic-capture marker: ${marker}`);
}
assert(!captureTemplate.includes('networkidle'), 'capture template must not wait for networkidle');

console.log('Pages bootstrap and screenshot-capture contract tests passed.');
