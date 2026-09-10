import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const fail = (message) => failures.push(message);
const read = (path) => readFileSync(path, 'utf8');

const requiredFiles = [
  'docs/ui-implementation.md',
  'DESIGN.base.md',
  'AGENTS.md',
  'docs/ui-review.md',
  'docs/adoption.md',
  'README.md',
];

for (const path of requiredFiles) {
  if (!existsSync(path)) fail(`missing UI profile contract file: ${path}`);
}

if (failures.length === 0) {
  const profile = read('docs/ui-implementation.md');

  const requiredSections = [
    '# Primitive-first UI implementation profile',
    '## Generic primitives',
    '## Product-specific semantic components',
    '## Composition is not inherited from the component library',
    '## Specialist custom CSS',
    '## Existing consumers and deviations',
    '## Review boundary',
  ];
  for (const section of requiredSections) {
    if (!profile.includes(section)) {
      fail(`docs/ui-implementation.md missing contract section: ${section}`);
    }
  }

  const requiredConcepts = [
    'Tailwind CSS',
    'shadcn/ui-style accessible primitives',
    'generic primitive layer',
    'product-specific semantic components',
  ];
  for (const concept of requiredConcepts) {
    if (!profile.toLowerCase().includes(concept.toLowerCase())) {
      fail(`docs/ui-implementation.md missing implementation concept: ${concept}`);
    }
  }

  for (const path of ['DESIGN.base.md', 'AGENTS.md', 'docs/ui-review.md', 'docs/adoption.md', 'README.md']) {
    const text = read(path);
    if (!text.includes('docs/ui-implementation.md')) {
      fail(`${path} must reference docs/ui-implementation.md`);
    }
  }

  const review = read('docs/ui-review.md').toLowerCase();
  if (!review.includes('primitive quality') || !review.includes('composition quality')) {
    fail('docs/ui-review.md must distinguish primitive quality from composition quality');
  }
}

if (failures.length > 0) {
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log('Primitive-first UI profile contract is valid.');
