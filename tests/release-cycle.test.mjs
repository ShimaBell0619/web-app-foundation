import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
  readFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const currentVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
const match = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);
if (!match) throw new Error(`invalid current Foundation version: ${currentVersion}`);
const expectedVersion = `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;

const dir = mkdtempSync(join(tmpdir(), 'web-foundation-release-cycle-'));

function run(command, args) {
  const result = spawnSync(command, args, { cwd: dir, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
}

try {
  for (const entry of readdirSync('.')) {
    if (entry === '.git' || entry === 'node_modules') continue;
    cpSync(entry, join(dir, entry), { recursive: true });
  }

  for (const entry of readdirSync(join(dir, '.changeset'))) {
    if (entry.endsWith('.md')) unlinkSync(join(dir, '.changeset', entry));
  }

  writeFileSync(
    join(dir, '.changeset', 'release-cycle-test.md'),
    `---\n"web-app-foundation": patch\n---\n\nSynthetic release-cycle verification.\n`,
  );

  run('npm', ['ci', '--ignore-scripts']);
  run('npm', ['run', 'version-packages']);

  const released = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version;
  if (released !== expectedVersion) {
    throw new Error(`release cycle expected ${expectedVersion}, got ${released}`);
  }

  if (existsSync(join(dir, '.changeset', 'release-cycle-test.md'))) {
    throw new Error('Changesets version step did not consume the synthetic Changeset');
  }

  run('npm', ['ci', '--ignore-scripts']);
  run('npm', ['run', 'foundation:validate']);
  run('npm', ['run', 'foundation:release-validate']);

  console.log(`Foundation release-cycle test passed: ${currentVersion} -> ${released}.`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
