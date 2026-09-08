# GitHub Pages production and PR previews

This capability is optional. It is intended for browser-first applications that publish a static site to **project GitHub Pages** while keeping production available and exposing temporary same-repository pull-request previews.

The Foundation splits the workflow into two trust levels:

1. `.github/workflows/web-pages-candidate.yml` runs application code with read-only repository permissions after the normal quality gate. It builds the same event SHA used by normal CI and uploads a static candidate artifact. For pull requests, GitHub normally uses the event merge SHA as `github.sha`; the candidate separately records the PR head SHA as the source revision used for freshness checks. Optional Playwright screenshots are created here because this job is intentionally unprivileged.
2. `.github/workflows/web-pages-publish.yml` runs after the candidate workflow has completed successfully. It has the write permissions required for Pages, but it **does not checkout source, install dependencies, or execute application scripts**. It validates workflow-run provenance, downloads the candidate from that exact run, verifies its manifest, checks that the PR/main revision has not advanced, and only then publishes.

This separation follows the Foundation deployment rule: privileged publishing must not execute pull-request code.

## Important: first-adoption bootstrap

GitHub only delivers a `workflow_run` event to a workflow that already exists on the repository's **default branch**. A `pages-publish.yml` introduced by the same pull request cannot react to that pull request's CI run.

Therefore first adoption is intentionally two-phase.

### Phase 0 — bootstrap the trusted publisher

Before the first application/UI pull request expects a Pages preview:

1. Copy `templates/github-pages/pages-publish.yml` to the consumer repository as `.github/workflows/pages-publish.yml`.
2. Replace `__FULL_FOUNDATION_COMMIT_SHA__` with the reviewed Foundation commit SHA used by the consumer.
3. Merge that workflow-only bootstrap change to the default branch.
4. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.

The Phase 0 pull request does not need a UI preview because it should contain only the trusted publisher caller and related adoption wiring.

Do **not** work around this bootstrap constraint by making a direct write-enabled PR publisher the normal pattern. A `pull_request` workflow whose write-enabled job checks out and executes PR code collapses the trust boundary that this capability is designed to preserve.

### Phase 1 — enable preview candidates

After the trusted publisher exists on the default branch, add the Pages candidate job to normal CI and add the application/UI changes. Successful same-repository PRs can then publish `/pr-N/` previews and screenshot comments through the trusted `workflow_run` publisher.

If a repository already has the trusted publisher on its default branch, Phase 0 is already satisfied.

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

The candidate repeats only the install/build work required to create the deployable artifact. It does not rerun `check`, `typecheck`, unit tests, or the full E2E suite. The `needs: verify` dependency ensures the candidate is created only after the same event build SHA passes the normal Foundation quality gate.

Fork pull requests still run ordinary unprivileged CI, but the reference skips Pages candidate generation because privileged preview publication is limited to same-repository PRs.

### PR revision SHA versus event build SHA

For a `pull_request` workflow, two SHAs matter:

- **source revision SHA**: the PR head commit (`github.event.pull_request.head.sha`). GitHub exposes the same revision as `workflow_run.head_sha` to the trusted publisher.
- **event build SHA**: `github.sha`, normally the generated pull-request merge ref. Both normal Foundation CI and Pages candidate explicitly checkout this SHA, so the candidate is built from the same integration revision that was validated.

The candidate manifest records both values as `sourceSha` and `buildSha`. The privileged publisher validates `sourceSha` against the triggering run and rechecks the current PR revision before mutating Pages content so an older successful run cannot overwrite a newer preview.

For a `push` to `main`, `sourceSha` and `buildSha` are the same commit.

## 2. Trusted publisher caller

The canonical app-owned caller is:

`templates/github-pages/pages-publish.yml`

Copy it during **Phase 0**, replace the Foundation SHA placeholder, and merge it to the default branch before expecting `workflow_run`-driven previews.

The caller grants write permissions at the individual job because GitHub does not allow a called reusable workflow to elevate permissions above its caller. The reusable publisher then declares and validates the exact permissions and context it needs.

### Why `workflow_run`

The Pages publisher is privileged. `workflow_run` allows a trusted default-branch workflow to react after CI has completed while the reusable publisher downloads the candidate into `runner.temp` and never checks out or executes candidate source.

The publisher rejects stale runs. For production it verifies that `main` still points to the triggering source SHA. For previews it verifies that the pull request is still open, still belongs to the same repository, and still has that head SHA. It repeats the freshness check immediately before mutating persistent Pages content.

Do not change the privileged publisher to checkout `workflow_run.head_sha` and rebuild there.

### Why `pull_request_target` appears only for close cleanup

Cleanup needs a trusted event after the PR is closed, but it does not need application source. The reference uses `pull_request_target: closed` only to identify and remove the existing `pr-N` directory.

The cleanup path must never:

- checkout the PR head,
- run package-manager commands,
- execute scripts from the PR,
- read executable content from PR artifacts.

If cleanup ever needs application code, redesign the trust boundary instead of expanding this job.

## 3. Enable review screenshots

For the React + Vite baseline, copy:

`templates/github-pages/capture-pr-preview.mjs`

to:

`scripts/capture-pr-preview.mjs`

The template expects:

- Vite installed in the application's committed lockfile,
- `@playwright/test` in the committed lockfile.

The capture template starts the local Vite binary directly, waits only for the served document to become reachable, loads it with `domcontentloaded`, waits briefly for layout, captures the screenshots, and terminates the server with a bounded SIGTERM/SIGKILL cleanup path. It intentionally does **not** wait for `networkidle`, because Vite/HMR or other long-lived browser connections can keep that condition open indefinitely.

The candidate workflow installs the browser through the lockfile-installed Playwright binary and then runs the capture script. It does not use an ad-hoc package download.

If an application does not want review images, set `enable_review_images: false` on the candidate and `expect_review_images: false` on publisher calls.

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

The reference grants both `issues: write` and `pull-requests: write` for this operation. A consumer returned HTTP 403 with `issues: write` alone; adding `pull-requests: write` allowed the upsert to succeed.

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

- [ ] Phase 0 publisher caller is already present on the default branch before the first preview-enabled PR.
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
