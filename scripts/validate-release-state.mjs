import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const semver = /^\d+\.\d+\.\d+$/;
const failures = [];

if (!semver.test(pkg.version ?? '')) failures.push('package.json version must be SemVer X.Y.Z');
const version = pkg.version;

function extractSingleVersion(path, pattern, label) {
  const matches = [...read(path).matchAll(pattern)];
  if (matches.length !== 1) {
    failures.push(`${label} must contain exactly one Foundation version declaration`);
    return null;
  }
  return matches[0][1];
}

if (lock.version !== version) failures.push('package-lock.json top-level version must match package.json');
if (lock.packages?.['']?.version !== version) failures.push('package-lock.json root package version must match package.json');

const readmeVersion = extractSingleVersion(
  'README.md',
  /^Current Foundation version:\s+\*\*(\d+\.\d+\.\d+) \(pre-1\.0\)\*\*\.\s*$/gm,
  'README.md',
);
if (readmeVersion && readmeVersion !== version) failures.push('README Foundation version must match package.json');

const agentsVersion = extractSingleVersion(
  'AGENTS.md',
  /^Foundation-Version:\s*(\d+\.\d+\.\d+)\s*$/gm,
  'AGENTS.md',
);
if (agentsVersion && agentsVersion !== version) failures.push('AGENTS Foundation-Version must match package.json');

const changelog = read('CHANGELOG.md');
const escaped = version.replace(/\./g, '\\.');
const releaseHeading = new RegExp(`^## ${escaped}(?:\\s+-\\s+\\d{4}-\\d{2}-\\d{2})?\\s*$`, 'm');
if (!releaseHeading.test(changelog)) {
  failures.push(`CHANGELOG.md must contain a release heading for current version ${version}`);
}

if (failures.length) {
  console.error('Foundation release-state validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Foundation release-state validation passed for version ${version}.`);
