from pathlib import Path
import json


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one replacement target, found {count}')
    write(path, text.replace(old, new, 1))

# package script
pkg_path = Path('package.json')
pkg = json.loads(pkg_path.read_text())
scripts = pkg['scripts']
out = {}
for key, value in scripts.items():
    out[key] = value
    if key == 'foundation:test:web-ci':
        out['foundation:test:application-release'] = 'node scripts/test-application-release-contract.mjs'
pkg['scripts'] = out
pkg_path.write_text(json.dumps(pkg, indent=2) + '\n')

# Foundation CI
replace_once(
    '.github/workflows/foundation-ci.yml',
    "      - name: Run reusable CI contract tests\n        run: npm run foundation:test:web-ci\n\n      - name: Run fixed Staging profile contract tests\n",
    "      - name: Run reusable CI contract tests\n        run: npm run foundation:test:web-ci\n\n      - name: Run application Release profile contract tests\n        run: npm run foundation:test:application-release\n\n      - name: Run fixed Staging profile contract tests\n",
)

# Validator required files
replace_once(
    'scripts/validate-foundation.mjs',
    "  'docs/adoption.md',\n  'docs/ci-performance.md',\n  'docs/versioning.md',\n",
    "  'docs/adoption.md',\n  'docs/application-releases.md',\n  'docs/ci-performance.md',\n  'docs/vercel-fixed-staging.md',\n  'docs/versioning.md',\n",
)
replace_once(
    'scripts/validate-foundation.mjs',
    "  'scripts/test-web-ci-contract.mjs',\n  'scripts/test-release-cycle.mjs',\n",
    "  'scripts/test-web-ci-contract.mjs',\n  'scripts/test-application-release-contract.mjs',\n  'scripts/test-vercel-fixed-staging-contract.mjs',\n  'scripts/test-vercel-fixed-staging-context.mjs',\n  'scripts/test-release-cycle.mjs',\n  'templates/release/release.yml',\n  'templates/vercel/fixed-staging/request-staging.yml',\n  'templates/vercel/fixed-staging/deploy-staging.yml',\n  'templates/vercel/fixed-staging/cleanup-staging.yml',\n  'templates/vercel/fixed-staging/staging-slot.mjs',\n",
)
replace_once(
    'scripts/validate-foundation.mjs',
    "  requireRunStep(workflow, path, 'validate', 'Run reusable CI contract tests', 'npm run foundation:test:web-ci');\n  requireRunStep(workflow, path, 'validate', 'Exercise release cycle', 'npm run foundation:test:release');\n",
    "  requireRunStep(workflow, path, 'validate', 'Run reusable CI contract tests', 'npm run foundation:test:web-ci');\n  requireRunStep(workflow, path, 'validate', 'Run application Release profile contract tests', 'npm run foundation:test:application-release');\n  requireRunStep(workflow, path, 'validate', 'Run fixed Staging profile contract tests', 'npm run foundation:test:vercel-staging');\n  requireRunStep(workflow, path, 'validate', 'Exercise release cycle', 'npm run foundation:test:release');\n",
)

old_scan = """const workflowDir = '.github/workflows';
const workflowPaths = readdirSync(workflowDir)
  .filter((name) => /\\.ya?ml$/i.test(name))
  .map((name) => `${workflowDir}/${name}`)
  .sort();

if (workflowPaths.length === 0) fail('no GitHub Actions workflows found');

for (const path of workflowPaths) {
  let workflow;
  try {
    workflow = parseYamlObject(read(path), path);
  } catch (error) {
    fail(error.message);
    continue;
  }

  validatePermissions(path, workflow.permissions, 'top-level', { required: true });
  if (workflow.permissions?.contents !== 'read') fail(`${path} top-level contents permission must be read`);

  const jobs = workflow.jobs;
  if (!jobs || typeof jobs !== 'object' || Array.isArray(jobs)) {
    fail(`${path} must define jobs as a mapping`);
    continue;
  }

  for (const [jobName, job] of Object.entries(jobs)) {
    if (!job || typeof job !== 'object' || Array.isArray(job)) {
      fail(`${path} job ${jobName} must be a mapping`);
      continue;
    }
    const allowedWrites = [];
    validatePermissions(path, job.permissions, `job ${jobName}`, { allowedWrites });
    if (job.uses !== undefined) validateUses(path, job.uses, `job ${jobName}`);

    if (job['continue-on-error'] !== undefined && job['continue-on-error'] !== false) {
      fail(`${path} job ${jobName} must not continue on error`);
    }

    if (Array.isArray(job.steps)) {
      for (const [index, step] of job.steps.entries()) {
        if (step?.uses !== undefined) validateUses(path, step.uses, `job ${jobName} step ${index + 1}`);
      }
    }
  }

  if (path === '.github/workflows/web-ci.yml') validateReusableWebCi(workflow, path);
  if (path === '.github/workflows/foundation-ci.yml') validateFoundationCi(workflow, path);
}
"""
new_scan = """const workflowDir = '.github/workflows';
const activeWorkflowPaths = readdirSync(workflowDir)
  .filter((name) => /\\.ya?ml$/i.test(name))
  .map((name) => `${workflowDir}/${name}`)
  .sort();

const templateWorkflowPolicies = new Map([
  ['templates/release/release.yml', {
    topLevelContents: 'write',
    topLevelAllowedWrites: ['contents'],
    jobAllowedWrites: {},
  }],
  ['templates/vercel/fixed-staging/request-staging.yml', {
    topLevelContents: 'read',
    topLevelAllowedWrites: [],
    jobAllowedWrites: {},
  }],
  ['templates/vercel/fixed-staging/deploy-staging.yml', {
    topLevelContents: 'read',
    topLevelAllowedWrites: [],
    jobAllowedWrites: { deploy: ['contents', 'issues'] },
  }],
  ['templates/vercel/fixed-staging/cleanup-staging.yml', {
    topLevelContents: 'read',
    topLevelAllowedWrites: [],
    jobAllowedWrites: { cleanup: ['contents'] },
  }],
]);

const workflowPaths = [...activeWorkflowPaths, ...templateWorkflowPolicies.keys()].sort();
if (activeWorkflowPaths.length === 0) fail('no GitHub Actions workflows found');

for (const path of workflowPaths) {
  let workflow;
  try {
    workflow = parseYamlObject(read(path), path);
  } catch (error) {
    fail(error.message);
    continue;
  }

  const templatePolicy = templateWorkflowPolicies.get(path);
  const topLevelAllowedWrites = templatePolicy?.topLevelAllowedWrites ?? [];
  validatePermissions(path, workflow.permissions, 'top-level', {
    required: true,
    allowedWrites: topLevelAllowedWrites,
  });
  const expectedTopLevelContents = templatePolicy?.topLevelContents ?? 'read';
  if (workflow.permissions?.contents !== expectedTopLevelContents) {
    fail(`${path} top-level contents permission must be ${expectedTopLevelContents}`);
  }

  const jobs = workflow.jobs;
  if (!jobs || typeof jobs !== 'object' || Array.isArray(jobs)) {
    fail(`${path} must define jobs as a mapping`);
    continue;
  }

  for (const [jobName, job] of Object.entries(jobs)) {
    if (!job || typeof job !== 'object' || Array.isArray(job)) {
      fail(`${path} job ${jobName} must be a mapping`);
      continue;
    }
    const allowedWrites = templatePolicy?.jobAllowedWrites?.[jobName] ?? [];
    validatePermissions(path, job.permissions, `job ${jobName}`, { allowedWrites });
    if (job.uses !== undefined) validateUses(path, job.uses, `job ${jobName}`);

    if (job['continue-on-error'] !== undefined && job['continue-on-error'] !== false) {
      fail(`${path} job ${jobName} must not continue on error`);
    }

    if (Array.isArray(job.steps)) {
      for (const [index, step] of job.steps.entries()) {
        if (step?.uses !== undefined) validateUses(path, step.uses, `job ${jobName} step ${index + 1}`);
        if (step?.['continue-on-error'] !== undefined && step['continue-on-error'] !== false) {
          fail(`${path} job ${jobName} step ${index + 1} must not continue on error`);
        }
      }
    }
  }

  if (path === '.github/workflows/web-ci.yml') validateReusableWebCi(workflow, path);
  if (path === '.github/workflows/foundation-ci.yml') validateFoundationCi(workflow, path);
}
"""
replace_once('scripts/validate-foundation.mjs', old_scan, new_scan)
replace_once(
    'scripts/validate-foundation.mjs',
    "  'foundation:test:web-ci',\n  'foundation:test:release',\n",
    "  'foundation:test:web-ci',\n  'foundation:test:application-release',\n  'foundation:test:vercel-staging',\n  'foundation:test:release',\n",
)

# Validator regression fixture and template mutation coverage.
replace_once(
    'scripts/test-foundation-validator.mjs',
    "  'docs/adoption.md', 'docs/ci-performance.md', 'docs/versioning.md',\n",
    "  'docs/adoption.md', 'docs/application-releases.md', 'docs/ci-performance.md',\n  'docs/vercel-fixed-staging.md', 'docs/versioning.md',\n",
)
replace_once(
    'scripts/test-foundation-validator.mjs',
    "  'scripts/test-web-ci-contract.mjs', 'scripts/test-release-cycle.mjs',\n  'fixtures/consumer/package.json', 'fixtures/consumer/package-lock.json',\n",
    "  'scripts/test-web-ci-contract.mjs', 'scripts/test-application-release-contract.mjs',\n  'scripts/test-vercel-fixed-staging-contract.mjs', 'scripts/test-vercel-fixed-staging-context.mjs',\n  'scripts/test-release-cycle.mjs', 'templates/release/release.yml',\n  'templates/vercel/fixed-staging/request-staging.yml',\n  'templates/vercel/fixed-staging/deploy-staging.yml',\n  'templates/vercel/fixed-staging/cleanup-staging.yml',\n  'templates/vercel/fixed-staging/staging-slot.mjs',\n  'fixtures/consumer/package.json', 'fixtures/consumer/package-lock.json',\n",
)
marker = """    {
      const dir = makeCopy(version); dirs.push(dir);
      const source = readFileSync(join(dir, '.github/workflows/foundation-ci.yml'), 'utf8');
      const extraPath = join(dir, '.github/workflows/extra.yml');
      writeFileSync(extraPath, source);
      mutateWorkflow(dir, '.github/workflows/extra.yml', (workflow) => {
        mutateFirstExternalUses(workflow, (ref) => `${ref.slice(0, ref.lastIndexOf('@'))}@v4`);
      }, 'new workflow mutable action mutation');
      run(dir, false, `all-workflow enumeration from ${version}`);
    }
"""
addition = marker + """

    {
      const dir = makeCopy(version); dirs.push(dir);
      mutateWorkflow(dir, 'templates/release/release.yml', (workflow) => {
        mutateFirstExternalUses(workflow, (ref) => `${ref.slice(0, ref.lastIndexOf('@'))}@main`);
      }, 'release template mutable action mutation');
      run(dir, false, `release template mutable action from ${version}`);
    }

    {
      const dir = makeCopy(version); dirs.push(dir);
      mutateWorkflow(dir, 'templates/release/release.yml', (workflow) => {
        setField(workflow.permissions, 'actions', 'write', 'release template permission widening mutation');
      }, 'release template permission widening mutation');
      run(dir, false, `release template permission widening from ${version}`);
    }

    {
      const dir = makeCopy(version); dirs.push(dir);
      mutateWorkflow(dir, 'templates/vercel/fixed-staging/deploy-staging.yml', (workflow) => {
        setField(workflow.jobs.deploy.permissions, 'packages', 'write', 'staging template permission widening mutation');
      }, 'staging template permission widening mutation');
      run(dir, false, `staging template permission widening from ${version}`);
    }
"""
replace_once('scripts/test-foundation-validator.mjs', marker, addition)

release_yml = '''name: Release

on:
  workflow_run:
    workflows: [CI]
    types: [completed]

permissions:
  contents: write

env:
  # Set to 'true' for a GitHub prerelease milestone.
  PRERELEASE: 'false'

jobs:
  release:
    if: >-
      github.event.workflow_run.conclusion == 'success' &&
      github.event.workflow_run.event == 'push' &&
      github.event.workflow_run.head_branch == 'main' &&
      github.event.workflow_run.head_repository.full_name == github.repository
    runs-on: ubuntu-latest
    env:
      VALIDATED_SHA: ${{ github.event.workflow_run.head_sha }}
    steps:
      - name: Checkout validated main commit
        uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8
        with:
          ref: ${{ env.VALIDATED_SHA }}
          fetch-depth: 2
          persist-credentials: false

      - name: Detect explicit version change
        id: version
        shell: bash
        run: |
          set -euo pipefail
          current="$(node -p "require('./package.json').version")"
          previous="$(git show HEAD^:package.json 2>/dev/null | node -e "let s=''; process.stdin.on('data', d => s += d); process.stdin.on('end', () => console.log(JSON.parse(s).version));" || true)"

          if [[ ! "$current" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "Unsupported application version: $current" >&2
            exit 1
          fi
          case "$PRERELEASE" in
            true|false) ;;
            *)
              echo "PRERELEASE must be exactly 'true' or 'false'." >&2
              exit 1
              ;;
          esac

          echo "version=$current" >> "$GITHUB_OUTPUT"
          echo "tag=v$current" >> "$GITHUB_OUTPUT"
          if [[ "$current" == "$previous" ]]; then
            echo "release=false" >> "$GITHUB_OUTPUT"
            echo "Application version did not change ($current); no release requested."
          else
            echo "release=true" >> "$GITHUB_OUTPUT"
            echo "Application version changed: ${previous:-<none>} -> $current"
          fi

      - name: Verify release target
        if: steps.version.outputs.release == 'true'
        env:
          GH_TOKEN: ${{ github.token }}
          TAG: ${{ steps.version.outputs.tag }}
        shell: bash
        run: |
          set -euo pipefail

          resolve_tag_commit() {
            local type sha depth=0
            read -r type sha < <(
              gh api "repos/$GITHUB_REPOSITORY/git/ref/tags/$TAG" --jq '.object | "\(.type) \(.sha)"'
            )
            while [[ "$type" == 'tag' ]]; do
              depth=$((depth + 1))
              if (( depth > 5 )); then
                echo "Tag $TAG has an unexpectedly deep tag-object chain." >&2
                return 1
              fi
              read -r type sha < <(
                gh api "repos/$GITHUB_REPOSITORY/git/tags/$sha" --jq '.object | "\(.type) \(.sha)"'
              )
            done
            if [[ "$type" != 'commit' ]]; then
              echo "Tag $TAG resolves to unsupported object type: $type" >&2
              return 1
            fi
            printf '%s\n' "$sha"
          }

          if gh release view "$TAG" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
            draft="$(gh release view "$TAG" --repo "$GITHUB_REPOSITORY" --json isDraft --jq .isDraft)"
            [[ "$draft" == 'false' ]] || { echo "Release $TAG exists but is not published." >&2; exit 1; }
            existing_sha="$(resolve_tag_commit)"
            [[ "$existing_sha" == "$VALIDATED_SHA" ]] || {
              echo "Release $TAG resolves to $existing_sha instead of $VALIDATED_SHA" >&2
              exit 1
            }
            echo "Release $TAG already exists at validated SHA; publication is idempotent."
            exit 0
          fi

          if gh api "repos/$GITHUB_REPOSITORY/git/ref/tags/$TAG" >/dev/null 2>&1; then
            existing_sha="$(resolve_tag_commit)"
            [[ "$existing_sha" == "$VALIDATED_SHA" ]] || {
              echo "Tag $TAG resolves to $existing_sha instead of $VALIDATED_SHA" >&2
              exit 1
            }
            echo "Existing tag $TAG resolves to the validated SHA."
          fi

      - name: Publish GitHub Release
        if: steps.version.outputs.release == 'true'
        env:
          GH_TOKEN: ${{ github.token }}
          TAG: ${{ steps.version.outputs.tag }}
        shell: bash
        run: |
          set -euo pipefail
          if gh release view "$TAG" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
            exit 0
          fi

          prerelease_args=()
          if [[ "$PRERELEASE" == 'true' ]]; then
            prerelease_args+=(--prerelease)
          fi

          if ! gh release create "$TAG" \
            --repo "$GITHUB_REPOSITORY" \
            --target "$VALIDATED_SHA" \
            --title "$TAG" \
            --generate-notes \
            "${prerelease_args[@]}"; then
            if gh release view "$TAG" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
              echo "A concurrent publisher created $TAG; final verification will validate it."
            else
              exit 1
            fi
          fi

      - name: Verify published release
        if: steps.version.outputs.release == 'true'
        env:
          GH_TOKEN: ${{ github.token }}
          TAG: ${{ steps.version.outputs.tag }}
        shell: bash
        run: |
          set -euo pipefail

          resolve_tag_commit() {
            local type sha depth=0
            read -r type sha < <(
              gh api "repos/$GITHUB_REPOSITORY/git/ref/tags/$TAG" --jq '.object | "\(.type) \(.sha)"'
            )
            while [[ "$type" == 'tag' ]]; do
              depth=$((depth + 1))
              (( depth <= 5 )) || { echo "Tag chain too deep for $TAG" >&2; return 1; }
              read -r type sha < <(
                gh api "repos/$GITHUB_REPOSITORY/git/tags/$sha" --jq '.object | "\(.type) \(.sha)"'
              )
            done
            [[ "$type" == 'commit' ]] || { echo "Unsupported final tag object: $type" >&2; return 1; }
            printf '%s\n' "$sha"
          }

          draft="$(gh release view "$TAG" --repo "$GITHUB_REPOSITORY" --json isDraft --jq .isDraft)"
          prerelease="$(gh release view "$TAG" --repo "$GITHUB_REPOSITORY" --json isPrerelease --jq .isPrerelease)"
          resolved_sha="$(resolve_tag_commit)"

          [[ "$draft" == 'false' ]] || { echo "Release $TAG is not published." >&2; exit 1; }
          [[ "$prerelease" == "$PRERELEASE" ]] || {
            echo "Release $TAG prerelease=$prerelease but expected $PRERELEASE" >&2
            exit 1
          }
          [[ "$resolved_sha" == "$VALIDATED_SHA" ]] || {
            echo "Release $TAG resolves to $resolved_sha instead of $VALIDATED_SHA" >&2
            exit 1
          }
          echo "Verified $TAG at validated SHA $VALIDATED_SHA."
'''
write('templates/release/release.yml', release_yml)

release_test = r'''import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

const path = 'templates/release/release.yml';
const workflow = parseYaml(readFileSync(path, 'utf8'));
const job = workflow.jobs?.release;
assert.ok(job, 'release job must exist');
assert.deepEqual(workflow.on?.workflow_run?.workflows, ['CI']);
assert.deepEqual(workflow.on?.workflow_run?.types, ['completed']);
assert.deepEqual(workflow.permissions, { contents: 'write' });

for (const marker of [
  "workflow_run.conclusion == 'success'",
  "workflow_run.event == 'push'",
  "workflow_run.head_branch == 'main'",
  'workflow_run.head_repository.full_name == github.repository',
]) assert.ok(String(job.if).includes(marker), `missing trusted trigger marker: ${marker}`);

function step(name) {
  const found = job.steps?.find((candidate) => candidate?.name === name);
  assert.ok(found, `missing step: ${name}`);
  return found;
}
function assertPinned(ref) {
  assert.match(ref, /^[^/\s]+\/[^@\s]+(?:\/[^@\s]+)*@[0-9a-f]{40}$/i);
}

const checkout = step('Checkout validated main commit');
assertPinned(checkout.uses);
assert.equal(checkout.with?.ref, '${{ env.VALIDATED_SHA }}');
assert.equal(checkout.with?.['fetch-depth'], 2);
assert.equal(checkout.with?.['persist-credentials'], false);

const detect = String(step('Detect explicit version change').run ?? '');
for (const marker of ["require('./package.json').version", 'git show HEAD^:package.json', 'PRERELEASE', 'true|false']) {
  assert.ok(detect.includes(marker), `version detection missing ${marker}`);
}

const verify = String(step('Verify release target').run ?? '');
for (const marker of ['resolve_tag_commit', 'git/ref/tags/$TAG', 'git/tags/$sha', 'isDraft', 'VALIDATED_SHA']) {
  assert.ok(verify.includes(marker), `target verification missing ${marker}`);
}
assert.equal(verify.includes('git ls-remote'), false);

const publish = String(step('Publish GitHub Release').run ?? '');
for (const marker of ['gh release create "$TAG"', '--target "$VALIDATED_SHA"', '--generate-notes', 'A concurrent publisher created $TAG']) {
  assert.ok(publish.includes(marker), `publish step missing ${marker}`);
}

const finalVerify = String(step('Verify published release').run ?? '');
for (const marker of ['resolve_tag_commit', 'isDraft', 'isPrerelease', 'resolved_sha', 'VALIDATED_SHA', 'PRERELEASE']) {
  assert.ok(finalVerify.includes(marker), `final verification missing ${marker}`);
}

for (const candidate of job.steps ?? []) {
  if (candidate?.uses) assertPinned(candidate.uses);
  assert.notEqual(candidate?.['continue-on-error'], true, `${candidate?.name ?? '<unnamed>'} must not ignore failure`);
}
console.log('Application Release workflow contract tests passed.');
'''
write('scripts/test-application-release-contract.mjs', release_test)

# Documentation: minimal durable delta, preserving existing document structure.
replace_once(
    'docs/application-releases.md',
    "  -> immutable vX.Y.Z tag\n  -> published GitHub Release\n",
    "  -> immutable vX.Y.Z tag resolving to the validated commit\n  -> published GitHub Release\n  -> post-publication tag / release verification\n",
)
replace_once(
    'docs/application-releases.md',
    "- checks out the exact `workflow_run.head_sha` that produced the successful CI result;\n- detects explicit root `package.json` SemVer change;\n- refuses to move an existing conflicting tag;\n- safely treats an already-matching GitHub Release as idempotent;\n- creates a published GitHub Release only when version change expresses release intent;\n- supports GitHub prerelease publication through the template's `PRERELEASE` setting.\n",
    "- checks out the exact `workflow_run.head_sha` that produced the successful CI result without persisting Git credentials;\n- detects explicit root `package.json` SemVer change;\n- resolves lightweight and annotated tags to their underlying commit before accepting them;\n- refuses to move an existing conflicting tag;\n- safely treats an already-matching published GitHub Release as idempotent;\n- tolerates a concurrent same-tag publisher only when final verification proves the resulting Release is correct;\n- verifies published state, prerelease metadata, and tag target after publication;\n- creates a published GitHub Release only when version change expresses release intent;\n- supports GitHub prerelease publication through the template's `PRERELEASE` setting.\n",
)
replace_once(
    'docs/application-releases.md',
    "- matching release at the same validated SHA -> succeed idempotently;\n- tag exists at a different SHA -> fail; never move the tag;\n- release exists with an unexpected target -> fail;\n",
    "- matching published release whose tag resolves to the same validated SHA -> succeed idempotently;\n- matching lightweight or annotated tag with no Release -> reuse it only when it resolves to the validated SHA;\n- tag resolves to a different SHA -> fail; never move the tag;\n- release exists but is draft/unpublished -> fail;\n- release prerelease metadata differs from `PRERELEASE` -> fail final verification;\n",
)
insert_after = "If a repository intentionally uses merge commits or another version topology that makes first-parent comparison unsuitable, adapt the detection logic and document the deviation.\n"
replace_once(
    'docs/application-releases.md',
    insert_after,
    insert_after + "\nThe workflow resolves Git tag objects rather than comparing raw tag-object IDs. This matters for annotated tags, whose tag-object SHA intentionally differs from the commit SHA they ultimately reference.\n\n## Publication races\n\nA pre-publication check cannot by itself exclude another trusted run publishing the same tag concurrently. The template therefore performs final verification after publication. A concurrent same-tag result is accepted only when the resulting Release is published, has the configured prerelease state, and its tag resolves to the exact CI-validated SHA. Conflicting results fail closed.\n",
)

write('.changeset/bright-workflows-verify.md', '''---\n"web-app-foundation": patch\n---\n\nHarden copyable workflow template validation and downstream Application Release verification, including annotated-tag resolution, race-safe idempotency, and post-publication evidence checks.\n''')
