import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import proof from '@foundation/ci-install-proof';

const expectedOrder = ['check', 'typecheck', 'test', 'build'];
const gate = process.argv[2];
const recordPath = resolve('.foundation-ci-gates.json');

if (proof !== 'installed') throw new Error('npm ci did not install the fixture dependency');
if (process.env.CI !== 'true') throw new Error('reusable Web CI must run npm scripts with CI=true');
if (!expectedOrder.includes(gate)) throw new Error(`unexpected gate: ${gate}`);

const index = expectedOrder.indexOf(gate);
let recorded = [];

if (index === 0) {
  writeFileSync(recordPath, '[]\n');
} else {
  if (!existsSync(recordPath)) {
    throw new Error(`gate ${gate} ran before ${expectedOrder[0]}`);
  }
  recorded = JSON.parse(readFileSync(recordPath, 'utf8'));
  const expectedPrevious = expectedOrder.slice(0, index);
  if (JSON.stringify(recorded) !== JSON.stringify(expectedPrevious)) {
    throw new Error(`gate order mismatch before ${gate}: expected ${expectedPrevious.join(', ')}, got ${recorded.join(', ')}`);
  }
}

recorded.push(gate);
writeFileSync(recordPath, `${JSON.stringify(recorded)}\n`);

if (gate === 'build' && JSON.stringify(recorded) !== JSON.stringify(expectedOrder)) {
  throw new Error(`not all required gates executed: ${recorded.join(', ')}`);
}

console.log(`consumer fixture ${gate} passed with CI=true`);
