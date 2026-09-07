import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const validatorPath = resolve('scripts/validate-foundation.mjs');
const sourceVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;

const files = [
  'README.md', 'PRODUCT.base.md', 'DESIGN.base.md', 'AGENTS.md', 'CHANGELOG.md',
  'package.json', 'package-lock.json', '.changeset/config.json',
  '.github/workflows/web-ci.yml', '.github/workflows/web-pages-candidate.yml',
  '.github/workflows/web-pages-publish.yml', '.github/workflows/foundation-ci.yml',
  '.github/ISSUE_TEMPLATE/work-item.yml', '.github/pull_request_template.md',
  'docs/adoption.md', 'docs/ci-performance.md', 'docs/pages.md', 'docs/versioning.md',
  'scripts/validate-foundation.mjs', 'scripts/test-foundation-validator.mjs',
  'scripts/sync-foundation-version.mjs', 'scripts/validate-release-state.mjs',
  'scripts/test-web-ci-contract.mjs', 'scripts/test-web-pages-contract.mjs',
  'scripts/test-release-cycle.mjs', 'templates/github-pages/capture-pr-preview.mjs',
  'fixtures/pages-consumer/package.json', 'fixtures/pages-consumer/package-lock.json',
  'fixtures/pages-consumer/scripts/build.mjs',
  'fixtures/consumer/package.json', 'fixtures/consumer/package-lock.json',
  'fixtures/consumer/scripts/verify.mjs', 'fixtures/install-proof/package.json',
  'fixtures/install-proof/index.cjs',
];

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`invalid source version: ${version}`);
  return match.slice(1).map(Number);
}

function nextPatch(version) {
  const [major, minor, patch] = parseVersion(version);
  return `${major}.${minor}.${patch + 1}`;
}

function nextMinor(version) {
  const [major, minor] = parseVersion(version);
  return `${major}.${minor + 1}.0`;
}

function makeCopy(version = sourceVersion) {
  const dir = mkdtempSync(join(tmpdir(), 'web-foundation-validator-'));
  for (const file of files) {
    const target = join(dir, file);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(file, target);
  }
  if (version !== sourceVersion) setFoundationVersion(dir, version);
  return dir;
}

function mutate(dir, file, transform, label = file) {
  const path = join(dir, file);
  const before = readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error(`${label}: mutation did not change ${file}`);
  writeFileSync(path, after);
}

function mutateJson(dir, file, mutator, label = file) {
  mutate(dir, file, (text) => {
    const value = JSON.parse(text);
    mutator(value);
    return `${JSON.stringify(value, null, 2)}\n`;
  }, label);
}

function mutateWorkflow(dir, file, mutator, label = file) {
  mutate(dir, file, (text) => {
    const value = parseYaml(text);
    mutator(value);
    return stringifyYaml(value);
  }, label);
}

function replaceExactly(text, pattern, replacement, label) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const matches = text.match(new RegExp(pattern.source, flags)) ?? [];
  if (matches.length !== 1) throw new Error(`${label}: expected exactly one replacement target, found ${matches.length}`);
  return text.replace(pattern, replacement);
}

function setFoundationVersion(dir, version) {
  mutateJson(dir, 'package.json', (json) => {
    json.version = version;
  }, `set package version ${version}`);

  mutateJson(dir, 'package-lock.json', (json) => {
    json.version = version;
    json.packages[''].version = version;
  }, `set lock version ${version}`);

  mutate(dir, 'README.md', (text) => replaceExactly(
    text,
    /^Current Foundation version:\s+\*\*\d+\.\d+\.\d+ \(pre-1\.0\)\*\*\.\s*$/m,
    `Current Foundation version: **${version} (pre-1.0)**.`,
    'README Foundation version',
  ));

  mutate(dir, 'AGENTS.md', (text) => replaceExactly(
    text,
    /^Foundation-Version:\s*\d+\.\d+\.\d+\s*$/m,
    `Foundation-Version: ${version}`,
    'AGENTS Foundation version',
  ));
}

function run(dir, shouldPass, label) {
  const result = spawnSync(process.execPath, [validatorPath], { cwd: dir, encoding: 'utf8' });
  const passed = result.status === 0;
  if (passed !== shouldPass) {
    throw new Error(`${label}: expected ${shouldPass ? 'success' : 'failure'}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
}

function findStep(workflow, name) {
  const step = workflow.jobs?.verify?.steps?.find((candidate) => candidate?.name === name);
  if (!step) throw new Error(`test fixture could not find web-ci step: ${name}`);
  return step;
}

function mutateFirstExternalUses(workflow, replacement) {
  for (const job of Object.values(workflow.jobs ?? {})) {
    if (typeof job?.uses === 'string' && !job.uses.startsWith('./')) {
      job.uses = replacement(job.uses);
      return;
    }
    for (const step of job?.steps ?? []) {
      if (typeof step?.uses === 'string' && !step.uses.startsWith('./')) {
        step.uses = replacement(step.uses);
        return;
      }
    }
  }
  throw new Error('test fixture found no external uses reference');
}

const versions = [...new Set([sourceVersion, nextPatch(sourceVersion), nextMinor(sourceVersion)])];
const dirs = [];

try {
  for (const version of versions) {
    {
      const dir = makeCopy(version); dirs.push(dir);
      run(dir, true, `coherent Foundation ${version}`);
    }

    {
      const dir = makeCopy(version); dirs.push(dir);
      mutateJson(dir, 'package.json', (json) => {
        json.version = nextPatch(version);
      }, `version mismatch from ${version}`);
      run(dir, false, `version mismatch from ${version}`);
    }

    {
      const dir = makeCopy(version); dirs.push(dir);
      mutate(dir, 'AGENTS.md', (text) => replaceExactly(
        text,
        /^Foundation-Version:\s*\d+\.\d+\.\d+\s*$/m,
        `Foundation-Version: ${version}9`,
        'AGENTS partial-match regression',
      ));
      run(dir, false, `AGENTS exact version mismatch from ${version}`);
    }

    {
      const dir = makeCopy(version); dirs.push(dir);
      mutateWorkflow(dir, '.github/workflows/web-ci.yml', (workflow) => {
        findStep(workflow, 'Install dependencies').run = 'echo "run: npm ci"';
      }, 'npm ci no-op mutation');
      run(dir, false, `npm ci no-op from ${version}`);
    }

    {
      const dir = makeCopy(version); dirs.push(dir);
      mutateWorkflow(dir, '.github/workflows/web-ci.yml', (workflow) => {
        workflow.permissions.actions = 'write';
      }, 'top-level write permission mutation');
      run(dir, false, `top-level write permission from ${version}`);
    }

    {
      const dir = makeCopy(version); dirs.push(dir);
      mutateWorkflow(dir, '.github/workflows/foundation-ci.yml', (workflow) => {
        workflow.jobs.validate.permissions = { contents: 'write' };
      }, 'job write permission mutation');
      run(dir, false, `job write permission from ${version}`);
    }

    {
      const dir = makeCopy(version); dirs.push(dir);
      mutateWorkflow(dir, '.github/workflows/web-pages-publish.yml', (workflow) => {
        workflow.jobs.publish.permissions.packages = 'write';
      }, 'publisher unexpected write permission mutation');
      run(dir, false, `publisher unexpected write permission from ${version}`);
    }

    {
      const dir = makeCopy(version); dirs.push(dir);
      mutate(dir, 'DESIGN.base.md', (text) => replaceExactly(
        text,
        /^name:.*$/m,
        'name: [',
        'malformed DESIGN YAML',
      ));
      run(dir, false, `malformed DESIGN from ${version}`);
    }

    {
      const dir = makeCopy(version); dirs.push(dir);
      mutateWorkflow(dir, '.github/workflows/web-ci.yml', (workflow) => {
        mutateFirstExternalUses(workflow, (ref) => `${ref.slice(0, ref.lastIndexOf('@'))}@main`);
      }, 'mutable external action ref mutation');
      run(dir, false, `mutable external action ref from ${version}`);
    }

    {
      const dir = makeCopy(version); dirs.push(dir);
      mutateWorkflow(dir, '.github/workflows/web-ci.yml', (workflow) => {
        mutateFirstExternalUses(workflow, (ref) => {
          const prefix = ref.slice(0, ref.lastIndexOf('@'));
          const current = ref.slice(ref.lastIndexOf('@') + 1);
          const replacement = current === 'f'.repeat(40) ? 'e'.repeat(40) : 'f'.repeat(40);
          return `${prefix}@${replacement}`;
        });
      }, 'reviewed full-SHA update mutation');
      run(dir, true, `reviewed full-SHA update from ${version}`);
    }

    {
      const dir = makeCopy(version); dirs.push(dir);
      mutateWorkflow(dir, '.github/workflows/web-ci.yml', (workflow) => {
        findStep(workflow, 'Static checks').if = '${{ false }}';
      }, 'disabled check condition mutation');
      run(dir, false, `disabled check condition from ${version}`);
    }

    {
      const dir = makeCopy(version); dirs.push(dir);
      mutateWorkflow(dir, '.github/workflows/web-ci.yml', (workflow) => {
        findStep(workflow, 'Production build')['continue-on-error'] = true;
      }, 'ignored build failure mutation');
      run(dir, false, `ignored build failure from ${version}`);
    }

    {
      const dir = makeCopy(version); dirs.push(dir);
      const source = readFileSync(join(dir, '.github/workflows/foundation-ci.yml'), 'utf8');
      const extraPath = join(dir, '.github/workflows/extra.yml');
      writeFileSync(extraPath, source);
      mutateWorkflow(dir, '.github/workflows/extra.yml', (workflow) => {
        mutateFirstExternalUses(workflow, (ref) => `${ref.slice(0, ref.lastIndexOf('@'))}@v4`);
      }, 'new workflow mutable action mutation');
      run(dir, false, `all-workflow enumeration from ${version}`);
    }
  }

  console.log(`Foundation validator regression tests passed across versions: ${versions.join(', ')}.`);
} finally {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
}
