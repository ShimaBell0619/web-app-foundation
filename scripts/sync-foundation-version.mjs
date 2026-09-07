import { readFileSync, writeFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
const semver = /^\d+\.\d+\.\d+$/;

if (!semver.test(pkg.version ?? '')) {
  throw new Error('package.json version must be SemVer X.Y.Z before syncing Foundation mirrors');
}
const version = pkg.version;

function replaceExactly(path, pattern, replacement, label) {
  const text = read(path);
  const matches = [...text.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`${label}: expected exactly one version declaration, found ${matches.length}`);
  }
  writeFileSync(path, text.replace(pattern, replacement));
}

const lock = JSON.parse(read('package-lock.json'));
lock.version = version;
lock.packages ??= {};
lock.packages[''] ??= {};
lock.packages[''].version = version;
writeFileSync('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);

replaceExactly(
  'README.md',
  /^Current Foundation version:\s+\*\*\d+\.\d+\.\d+ \(pre-1\.0\)\*\*\.\s*$/gm,
  `Current Foundation version: **${version} (pre-1.0)**.`,
  'README Foundation version',
);

replaceExactly(
  'AGENTS.md',
  /^Foundation-Version:\s*\d+\.\d+\.\d+\s*$/gm,
  `Foundation-Version: ${version}`,
  'AGENTS Foundation version',
);

console.log(`Synchronized Foundation version mirrors to ${version}.`);
