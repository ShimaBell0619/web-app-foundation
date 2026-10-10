import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function walk(dir, root) {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return walk(path, root);
    return entry.isFile() ? [path] : [];
  });
}

function listedPaths(markdown, category) {
  const regex = category === 'docs'
    ? /^\|\s*\[?`(docs\/[^\`]+\.md)`/gm
    : /^\|\s*\[?`(\.github\/workflows\/[^\`]+\.ya?ml)`/gm;
  return [...markdown.matchAll(regex)].map(match => match[1]);
}

export function checkInventory({ docs, workflows, guide }) {
  const errors = [];
  const categories = [
    { label: 'document', expected: docs, actual: listedPaths(guide, 'docs') },
    { label: 'workflow', expected: workflows, actual: listedPaths(guide, 'workflows') },
  ];

  for (const { label, expected, actual } of categories) {
    const seen = new Set();
    for (const name of actual) {
      if (seen.has(name)) errors.push(`duplicate ${label} inventory entry: ${name}`);
      seen.add(name);
      if (!expected.includes(name)) errors.push(`obsolete ${label} inventory entry: ${name}`);
    }
    for (const name of expected) {
      if (!seen.has(name)) errors.push(`unlisted ${label}: ${name}`);
    }
  }
  return errors;
}

export function validate(root = '.') {
  const guide = readFileSync(join(root, 'docs/README.md'), 'utf8');
  const docs = walk('docs', root).filter(x => x.endsWith('.md') && x !== 'docs/README.md');
  const workflows = walk('.github/workflows', root).filter(x => /\.ya?ml$/.test(x));
  const errors = checkInventory({ docs, workflows, guide });
  const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  if (!agents.includes('docs/README.md')) errors.push('AGENTS.md must route to docs/README.md');
  if (!readme.includes('docs/README.md')) errors.push('README.md must route to docs/README.md');
  return errors;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const errors = validate();
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log('Documentation and active Workflow inventory are in sync.');
  }
}
