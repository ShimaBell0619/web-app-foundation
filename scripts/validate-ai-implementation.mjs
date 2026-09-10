import { existsSync, readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

const failures = [];
const fail = (message) => failures.push(message);
const read = (path) => readFileSync(path, 'utf8');

const requiredFiles = [
  'docs/ai-implementation.md',
  'AGENTS.md',
  'docs/adoption.md',
  'README.md',
  '.github/ISSUE_TEMPLATE/work-item.yml',
  '.github/pull_request_template.md',
  'package.json',
];

for (const path of requiredFiles) {
  if (!existsSync(path)) fail(`missing AI implementation contract file: ${path}`);
}

function parseYamlObject(source, label) {
  try {
    const value = parseYaml(source);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      fail(`${label} must be a YAML mapping`);
      return null;
    }
    return value;
  } catch (error) {
    fail(`${label} is not valid YAML: ${error.message}`);
    return null;
  }
}

if (failures.length === 0) {
  const guide = read('docs/ai-implementation.md');
  const requiredGuideSections = [
    '# Context-routed AI implementation profile',
    '## Change classification',
    '## Context Routing',
    '## Repository Context Packet',
    '## Design Intent extraction',
    '## Implementation Map',
    '## Complexity discipline',
    '## Bootstrap Read',
    '## Incremental Read and staleness',
    '## GitHub read/write batching',
    '## Validation batching',
    '## Self-review against Design Intent',
    '## Independent review integration',
    '## PR evidence',
  ];

  for (const section of requiredGuideSections) {
    if (!guide.includes(section)) {
      fail(`docs/ai-implementation.md missing contract section: ${section}`);
    }
  }

  const agents = read('AGENTS.md');
  for (const section of ['## Context-routed implementation', '## Complexity discipline']) {
    if (!agents.includes(section)) fail(`AGENTS.md missing contract section: ${section}`);
  }
  if (!agents.includes('docs/ai-implementation.md')) {
    fail('AGENTS.md must reference docs/ai-implementation.md');
  }

  const adoption = read('docs/adoption.md');
  if (!adoption.includes('## Context-routed Chat implementation')) {
    fail('docs/adoption.md missing consumer context-routing section');
  }
  if (!adoption.includes('docs/ai-implementation.md')) {
    fail('docs/adoption.md must reference docs/ai-implementation.md');
  }

  const readme = read('README.md');
  if (!readme.includes('docs/ai-implementation.md')) {
    fail('README.md must reference docs/ai-implementation.md');
  }

  const issueForm = parseYamlObject(read('.github/ISSUE_TEMPLATE/work-item.yml'), 'work-item.yml');
  if (issueForm) {
    if (!Array.isArray(issueForm.body)) {
      fail('work-item.yml body must be a list');
    } else {
      const controls = new Map(issueForm.body.map((item) => [item?.id, item]));
      for (const id of ['kind', 'goal', 'areas', 'context', 'non_goals', 'acceptance', 'validation']) {
        if (!controls.has(id)) fail(`work-item.yml missing control id: ${id}`);
      }

      const areas = controls.get('areas');
      if (areas) {
        if (areas.type !== 'dropdown') fail('work-item.yml areas must be a dropdown');
        if (areas.attributes?.multiple !== true) fail('work-item.yml areas dropdown must allow multiple selections');
        const options = areas.attributes?.options;
        const requiredAreas = [
          'Product behavior',
          'Product design / UX',
          'UI infrastructure',
          'Domain / data',
          'Integration / trust',
          'Architecture / platform',
          'Delivery / operations',
          'Local implementation / refactor',
        ];
        if (!Array.isArray(options)) {
          fail('work-item.yml areas must define options');
        } else {
          for (const option of requiredAreas) {
            if (!options.includes(option)) fail(`work-item.yml areas missing option: ${option}`);
          }
        }
      }
    }
  }

  const pr = read('.github/pull_request_template.md');
  if (!pr.includes('## Context routing / Design Intent')) {
    fail('pull_request_template.md missing context-routing evidence section');
  }
  for (const field of [
    '- Change classification / affected areas:',
    '- Routed repository contracts:',
    '- Scope expansion / rerouting:',
    '- Design Intent / contract-fit result:',
    '- Overengineering check',
  ]) {
    if (!pr.includes(field)) fail(`pull_request_template.md missing evidence field: ${field}`);
  }

  const pkg = JSON.parse(read('package.json'));
  if (!String(pkg.scripts?.['foundation:validate'] ?? '').includes('validate-ai-implementation.mjs')) {
    fail('foundation:validate must execute validate-ai-implementation.mjs');
  }
  if (!String(pkg.scripts?.['foundation:test'] ?? '').includes('test-ai-implementation-contract.mjs')) {
    fail('foundation:test must execute test-ai-implementation-contract.mjs');
  }

  for (const path of ['docs/ui-review.md', 'docs/independent-review.md']) {
    if (!existsSync(path)) fail(`AI implementation profile expects existing Foundation contract: ${path}`);
  }
}

if (failures.length > 0) {
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log('Context-routed AI implementation contract is valid.');
