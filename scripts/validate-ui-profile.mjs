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
  const profileMarkers = [
    'Tailwind CSS',
    'shadcn/ui-style accessible primitives',
    'generic primitive layer',
    'product-specific semantic components',
    'component-library demo/page composition',
    'Specialist custom CSS',
    'Existing consumers',
    'non-React consumer',
    'primitive quality',
    'composition quality',
  ];
  for (const marker of profileMarkers) {
    if (!profile.toLowerCase().includes(marker.toLowerCase())) {
      fail(`docs/ui-implementation.md missing contract marker: ${marker}`);
    }
  }

  for (const forbidden of ['Azure Blue', 'CredentialStatus', 'RenewalTimeline']) {
    if (profile.toLowerCase().includes(forbidden.toLowerCase())) {
      fail(`docs/ui-implementation.md must not encode consumer-specific visual/domain contract: ${forbidden}`);
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
