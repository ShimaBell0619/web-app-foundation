# GitHub Pages production and PR previews

This capability is optional. It is intended for browser-first applications that publish a static site to **project GitHub Pages** while keeping production available and exposing temporary same-repository pull-request previews.

The Foundation splits the workflow into two trust levels:

1. `.github/workflows/web-pages-candidate.yml` runs application code with read-only repository permissions after the normal quality gate. It builds the same event SHA used by normal CI and uploads a static candidate artifact. For pull requests, GitHub normally uses the event merge SHA as `github.sha`; the candidate separately records the PR head SHA as the source revision used for freshness checks. Optional Playwright screenshots are created here because this job is intentionally unprivileged.
2. `.github/workflows/web-pages-publish.yml` runs only after the candidate workflow has completed successfully. It has the write permissions required for Pages, but it **does not checkout source, install dependencies, or execute application scripts**. It validates workflow-run provenance, downloads the candidate from that exact run, verifies its manifest, checks that the PR/main revision has not advanced, and only then publishes.

This separation follows the Foundation deployment rule: privileged publishing must not execute pull-request code. The publisher validates the triggering workflow name, run ID, source revision SHA, repository, event, branch/PR number, current revision, and candidate manifest before publishing.

## Supported model

- Production: `https://<owner>.github.io/<repo>/`
- PR preview: `https://<owner>.github.io/<repo>/pr-<number>/`
- Publishing source: **GitHub Actions**
- Internal aggregate staging branch: `pages-content`
- PR screenshots:
  - mobile: `pr-<number>/review/mobile.png`
  - desktop: `pr-<number>/review/desktop.png`

`pages-content` is internal persistence used to assemble production and active previews into one Pages artifact. It is not the Pages publishing source and should not be configured under **Deploy from a branch**.

Custom domains, user/organization Pages roots, and non-GitHub Pages providers are outside this reference pattern.

## 1. Add the candidate job to the application CI workflow

The normal Foundation CI remains the quality gate. Add the Pages candidate as a second job that depends on `verify`.

Pin both reusable workflows to the same reviewed Foundation commit SHA.

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  verify:
    uses: ShimaBell0619/web-app-foundation/.github/workflows/web-ci.yml@<FULL_FOUNDATION_COMMIT_SHA>
    with:
      node_version_file: .node-version
      cache_dependency_path: package-lock.json

  pages-candidate:
    name: Build Pages candidate
    needs: verify
    if: >-
      github.event_name == 'push' ||
      (github.event_name == 'pull_request' &&
       github.event.pull_request.head.repo.full_name == github.repository)
    uses: ShimaBell0619/web-app-foundation/.github/workflows/web-pages-candidate.yml@<FULL_FOUNDATION_COMMIT_SHA>
    with:
      node_version_file: .node-version
      cache_dependency_path: package-lock.json
      build_command: 'npm run build -- --base="$PAGES_BASE_PATH"'
      output_directory: dist
      enable_review_images: true
```

The default build command is suitable for the Vite baseline. A different static-site tool may override `build_command`, but it must honor `PAGES_BASE_PATH` so production and `/pr-N/` assets resolve correctly.

The candidate job repeats only the install/build work required to create the deployable artifact. It does not rerun `check`, `typecheck`, unit tests, or the full E2E suite. The `needs: verify` dependency ensures the candidate is created only after the same event build SHA passes the normal Foundation quality gate.

Fork pull requests still run the ordinary unprivileged CI, but the example skips Pages candidate generation because privileged preview publication is intentionally limited to same-repository PRs.

### PR revision SHA versus event build SHA

For a `pull_request` workflow, two SHAs matter:

- **source revision SHA**: the PR head commit (`github.event.pull_request.head.sha`). GitHub exposes the same revision as `workflow_run.head_sha` to the trusted publisher.
- **event build SHA**: `github.sha`, normally the generated pull-request merge ref. Both the normal Foundation CI and Pages candidate explicitly checkout this SHA, so the candidate is built from the same integration revision that was validated.

The candidate manifest records both values as `sourceSha` and `buildSha`. The privileged publisher does not pretend that `workflow_run.head_sha` is the merge-ref SHA. Instead, it trusts the artifact provenance from the exact successful workflow run, validates `sourceSha` against that run's head revision, and checks the repository again before staging so an older successful run cannot overwrite a newer PR preview.

For a `push` to `main`, `sourceSha` and `buildSha` are the same commit.

## 2. Add the trusted publisher caller

Create an app-owned `.github/workflows/pages-publish.yml`:

```yaml
name: Pages publish

on:
  workflow_run:
    workflows: [CI]
    types: [completed]
  pull_request_target:
    types: [closed]

permissions:
  contents: read

jobs:
  publish-production:
    if: >-
      github.event_name == 'workflow_run' &&
      github.event.workflow_run.conclusion == 'success' &&
      github.event.workflow_run.event == 'push' &&
      github.event.workflow_run.head_branch == 'main' &&
      github.event.workflow_run.head_repository.full_name == github.repository
    permissions:
      actions: read
      contents: write
      issues: write
      pull-requests: write
      pages: write
      id-token: write
    uses: ShimaBell0619/web-app-foundation/.github/workflows/web-pages-publish.yml@<FULL_FOUNDATION_COMMIT_SHA>
    with:
      operation: publish
      publish_target: production
      source_run_id: ${{ github.event.workflow_run.id }}
      source_sha: ${{ github.event.workflow_run.head_sha }}
      pr_number: 0
      production_branch: main
      validated_workflow_name: CI
      expect_review_images: true

  publish-preview:
    if: >-
      github.event_name == 'workflow_run' &&
      github.event.workflow_run.conclusion == 'success' &&
      github.event.workflow_run.event == 'pull_request' &&
      github.event.workflow_run.head_repository.full_name == github.repository &&
      github.event.workflow_run.pull_requests[0].number > 0
    permissions:
      actions: read
      contents: write
      issues: write
      pull-requests: write
      pages: write
      id-token: write
    uses: ShimaBell0619/web-app-foundation/.github/workflows/web-pages-publish.yml@<FULL_FOUNDATION_COMMIT_SHA>
    with:
      operation: publish
      publish_target: preview
      source_run_id: ${{ github.event.workflow_run.id }}
      source_sha: ${{ github.event.workflow_run.head_sha }}
      pr_number: ${{ github.event.workflow_run.pull_requests[0].number }}
      production_branch: main
      validated_workflow_name: CI
      expect_review_images: true

  cleanup-preview:
    if: >-
      github.event_name == 'pull_request_target' &&
      github.event.action == 'closed' &&
      github.event.pull_request.head.repo.full_name == github.repository
    permissions:
      contents: write
      issues: write
      pull-requests: write
      pages: write
      id-token: write
    uses: ShimaBell0619/web-app-foundation/.github/workflows/web-pages-publish.yml@<FULL_FOUNDATION_COMMIT_SHA>
    with:
      operation: cleanup
      publish_target: preview
      pr_number: ${{ github.event.pull_request.number }}
      expect_review_images: true
```

The caller grants write permissions at the individual job because GitHub does not allow a called reusable workflow to elevate permissions above its caller. The called workflow then declares the exact permissions it needs.

### Why `workflow_run`

The Pages publisher is privileged. `workflow_run` lets the trusted default-branch publisher react after CI has completed, while the reusable publisher downloads the candidate into `runner.temp` and never checks out or executes the candidate source.

The publisher also rejects stale runs. For production it verifies that `main` still points to `workflow_run.head_sha`. For previews it verifies that the pull request is still open, still belongs to the same repository, and still has that head SHA. It repeats this check immediately before mutating persistent Pages content to narrow the race window.

Do not change the publisher to checkout `workflow_run.head_sha` and rebuild there. That would put pull-request code in a write-enabled context and remove the trust separation.

### Why `pull_request_target` appears only for close cleanup

Cleanup needs a trusted event after the PR is closed, but it does not need application source. The reference uses `pull_request_target: closed` only to identify and remove the existing `pr-N` directory.

The cleanup path must never:

- checkout the PR head,
- run package-manager commands,
- execute scripts from the PR,
- read executable content from PR artifacts.

If cleanup needs application code in the future, redesign the trust boundary instead of expanding this job.

## 3. Enable review screenshots

For the React + Vite baseline, copy:

`templates/github-pages/capture-pr-preview.mjs`

to:

`scripts/capture-pr-preview.mjs`

The template expects:

- an app-owned `dev` script that starts Vite,
- `@playwright/test` in the application's committed lockfile.

The candidate workflow installs the browser through the lockfile-installed Playwright binary and then runs the capture script. It does not use an ad-hoc package download.

If an application does not want review images, set `enable_review_images: false` on the candidate and `expect_review_images: false` on both publisher calls.

Screenshots are a human-review convenience, not a second quality gate. Keep behavioral assertions such as overflow, focus, semantics, or product-specific E2E checks in the application's normal CI.

## 4. PR comment behavior

After a preview deploy succeeds, the publisher upserts one PR Conversation comment identified by:

`<!-- web-foundation-pages-preview -->`

The comment contains:

- interactive `/pr-N/` preview link,
- 390px mobile screenshot inline,
- 1440px desktop screenshot under `<details>`,
- the source-revision short SHA.

Image URLs include the full source revision SHA as a query string to avoid stale GitHub image-proxy caches.

When the PR closes, the preview directory is removed and the same comment is changed to a closed message rather than creating another comment.

The reference grants both `issues: write` and `pull-requests: write` for this PR-comment operation. A real consumer returned HTTP 403 with `issues: write` alone; adding `pull-requests: write` allowed the upsert to succeed.

## 5. Aggregate staging and concurrency

GitHub Pages exposes one site per repository. A PR deployment must therefore not replace the production root.

The publisher serializes all production/preview updates and maintains an internal `pages-content` branch:

- production publish replaces the root while preserving `pr-*`,
- preview publish replaces only its own `pr-N`,
- preview cleanup removes only its own `pr-N`,
- before the first production publish, a generated root index lists active previews,
- once production exists, preview updates do not modify the production root.

The generated placeholder root is tracked internally with `.preview-root-placeholder`. This avoids a stale preview list when PRs are added or removed before the first production publish.

## 6. Repository settings

In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.

Do not configure `pages-content` or `gh-pages` as a branch publishing source for this pattern.

## Security checklist

Before enabling the capability, verify:

- [ ] CI caller and Pages publisher reference Foundation workflows by reviewed full commit SHA.
- [ ] Pages candidate depends on the normal `verify` job.
- [ ] Normal CI and Pages candidate checkout the same event build SHA (`github.sha`).
- [ ] Candidate metadata keeps PR/push source revision and event build SHA distinct.
- [ ] Fork PRs cannot enter privileged preview publication.
- [ ] Privileged publisher never uses `actions/checkout`.
- [ ] Privileged publisher never runs `npm ci`, build commands, test commands, or PR-provided scripts.
- [ ] Cross-run artifact is downloaded to `runner.temp`, not the workspace.
- [ ] Publisher validates workflow name, successful conclusion, run ID, source revision SHA, repository, event, branch/PR number, and candidate manifest.
- [ ] Publisher rejects stale production/PR revisions and rechecks immediately before staging.
- [ ] Publish concurrency is not cancel-in-progress.
- [ ] Cleanup uses `pull_request_target` only for metadata-driven deletion and never executes PR code.
- [ ] Pages Source is GitHub Actions.