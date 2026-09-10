# Adopting Web App Foundation

## Bootstrap

For a new application:

1. Start from real product requirements rather than copying a full framework stack blindly.
2. Copy `PRODUCT.base.md` to `PRODUCT.md` and replace template text with the approved product contract.
3. Copy `DESIGN.base.md` to `DESIGN.md`, preserve the Google DESIGN.md alpha structure, and add application-specific tokens/rationale. For material UI work, use `docs/ui-review.md` to validate the rendered result against that product-specific direction.
4. Copy/adapt the relevant `AGENTS.md` rules. Add app-specific constraints rather than depending on chat memory.
5. Add specialist documents only when needed, commonly `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/RELEASE.md`, or `docs/COMPATIBILITY.md`.
6. Use a committed Node version file and package-manager lockfile.
7. Define the default npm scripts `check`, `typecheck`, `test`, and `build`; document any justified opt-out instead of omitting a script silently.
8. Add an app-owned CI caller that references the reusable Foundation workflow by a reviewed full commit SHA.
9. Record Foundation provenance before feature work begins.
10. Select hosting/deployment as an application decision. Use `docs/pages.md` for the optional GitHub Pages profile or `docs/vercel.md` for the optional Vercel Git-integrated profile; do not adopt both mechanically. If a Vercel consumer also needs one stable Preview origin, layer `docs/vercel-fixed-staging.md` on top rather than replacing normal PR Preview.
11. If the application will publish versioned GitHub Releases, adopt `docs/application-releases.md` and copy `templates/release/release.yml` before the first milestone that requires release evidence.
12. If GitHub Actions must operate Azure resources, use `docs/azure-oidc.md` to define the Microsoft Entra FIC and Azure RBAC trust boundaries before adding deployment/destructive workflows.

For GitHub Pages specifically, complete **Pages Phase 0** before the first preview-enabled application/UI PR, then complete **Pages Phase 1** as documented below.

## Provenance

An application should keep a small provenance record, for example in `docs/FOUNDATION.md`:

```markdown
# Foundation provenance

- Adopted Foundation version: 0.1.0
- Copied-rule/template commit: <full commit SHA>
- Reusable workflow commit: <full commit SHA>
- Adopted on: YYYY-MM-DD
- App-specific deviations:
  - <none or explicit deviations>
```

Copied rules/templates do not change automatically. Reusable workflows execute the exact commit SHA referenced by the app. Upgrade both deliberately, and read the current provenance before changing Foundation-derived rules or workflow refs.

## Minimum npm contract

A typical TypeScript app starts with scripts shaped like:

```json
{
  "scripts": {
    "check": "<lint/format/static check in non-watch mode>",
    "typecheck": "<type checker in non-watch mode>",
    "test": "<unit/component tests that exit>",
    "build": "<production build>"
  }
}
```

Do not use empty `echo`, `true`, or equivalent no-op scripts merely to satisfy CI. If a gate is genuinely inapplicable, opt out explicitly in the workflow caller and record why.

## Reusable CI caller

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
```

Example for a JavaScript-only app with no separate type checker:

```yaml
    with:
      run_typecheck: false
      typecheck_opt_out_reason: JavaScript-only application; no TypeScript typecheck contract.
```

`build` has no opt-out. The reusable workflow sets `CI=true` so test/check scripts should be one-shot commands rather than watch mode.

## E2E contract

`run_e2e: true` requires a `test:e2e` script. That script must terminate and own the runtime lifecycle it needs: browser availability/setup, application/server startup and readiness, test execution, and cleanup. If those responsibilities require provider-specific or privileged setup, prefer an app-owned E2E job and keep the shared workflow focused on unprivileged quality validation.

## Rendered UI review

For material user-facing changes, use `docs/ui-review.md` as the review method after the normal quality gate. It defines the product-specific design-direction check, render → critique → fix → re-render loop, 1440px / 390px / 320px baseline, overflow/focus/status review, and Japanese/CJK rendering notes.

The guide is intentionally style-neutral: consumers keep their own visual direction and product-specific assertions in `DESIGN.md` and application tests.

## Optional GitHub Pages previews

Static project Pages consumers use a two-phase adoption sequence.

**Pages Phase 0 — trusted publisher bootstrap**

- copy `templates/github-pages/pages-publish.yml`,
- replace the Foundation SHA placeholder,
- merge the workflow-only change to the repository's default branch,
- configure Pages Source as GitHub Actions.

This ordering is required because GitHub does not trigger a newly introduced `workflow_run` workflow for the same PR that introduces it.

**Pages Phase 1 — candidate + application/UI work**

- add the Foundation Pages candidate job after `verify`,
- keep candidate execution read-only,
- let the already-trusted default-branch publisher publish successful same-repository candidates.

The standard pattern provides:

- production root plus temporary `/pr-N/` previews,
- serialized aggregate staging and PR-close cleanup,
- optional 390px/1440px screenshots embedded in one updatable PR comment,
- a trust split where application code runs only in the read-only candidate job and the write-enabled publisher never checks out or executes PR code.

See `docs/pages.md` for the exact sequence, caller template, and security checklist.

## Optional Vercel Git integration

For applications that prioritize native Preview deployments and minimal deployment-workflow maintenance:

- connect/import the repository in Vercel;
- keep the Foundation CI caller as the quality gate;
- let Vercel own branch/PR Preview deployment and the configured Production Branch deployment;
- keep Production/Preview build configuration in the corresponding Vercel environment scopes;
- add `templates/vercel/vite-spa-vercel.json` only for a client-side routed Vite SPA that needs a catch-all fallback;
- document third-party identity limitations such as exact OAuth origins separately from deployment success.

Native Git integration may begin Production deployment before post-merge CI for the exact Production SHA completes. `docs/vercel.md` documents this convenience/strict-gating tradeoff and the alternative when exact post-CI publish ordering is required.

### Optional fixed Staging slot

When a Vercel consumer needs a stable origin for OAuth or other origin-dependent integration validation, keep normal PR Preview and add `docs/vercel-fixed-staging.md`.

Copy all four app-owned files:

- `templates/vercel/fixed-staging/request-staging.yml` -> `.github/workflows/request-staging.yml`;
- `templates/vercel/fixed-staging/deploy-staging.yml` -> `.github/workflows/deploy-staging.yml`;
- `templates/vercel/fixed-staging/cleanup-staging.yml` -> `.github/workflows/cleanup-staging.yml`;
- `templates/vercel/fixed-staging/staging-slot.mjs` -> `scripts/staging-slot.mjs`.

Create `staging` from `main`, add `FIXED_STAGING_URL`, then merge the bootstrap workflows to `main` before using the steady-state path. The manual workflow is read-only; its short-lived request artifact is consumed by a write-enabled `workflow_run` publisher that executes from the trusted default-branch context and independently validates the selected PR.

Map the Vercel Branch Domain to `staging`, scope only the required Preview configuration to that branch, and register the exact fixed origin with the external provider. The selected PR code later executes in that Vercel environment, so Staging configuration is a separate trust boundary from the GitHub publisher.

The slot points directly at the selected same-repository PR HEAD and uses compare-and-swap cleanup. Do not merge feature branches into `staging` or treat it as release history.

## Optional application GitHub Release flow

A versioned product milestone is explicit release intent, not a side effect of merging ordinary work.

For npm-based apps using root `package.json` as the version source, `templates/release/release.yml` provides a copyable app-owned pattern that publishes only after successful `main` CI and binds the tag/release to `workflow_run.head_sha`.

Before reporting a requested release complete, verify the application version, immutable `vX.Y.Z` tag, published GitHub Release, and Production status when applicable. See `docs/application-releases.md`.

## Optional GitHub Actions to Azure OIDC

When an application needs Azure create/update/delete validation through GitHub Actions:

- keep client/tenant/subscription IDs as GitHub Variables rather than client-secret credentials;
- grant `id-token: write` only to jobs that need OIDC;
- pin `Azure/login` to a reviewed full commit SHA;
- treat Microsoft Entra FIC trust and Azure RBAC as separate boundaries;
- use real workflow claims to validate the FIC rather than assuming a historical name-based subject shape.

For convenience-first personal repository fleets, `docs/azure-oidc.md` documents the owner-wide Flexible FIC pattern that was proven with `ms-credentials-tracker`.

## Deployment safety boundary

The Foundation does not select a deployment provider, but derived apps should preserve these provider-independent rules:

- keep required quality CI and deployment status independently visible;
- do not treat a Preview/hosting check as a substitute for application tests;
- bind privileged release/promotion operations to a known validated source revision when the provider/workflow supports it;
- document any hosting-native sequence that starts Production deployment before exact-SHA post-merge CI completes;
- separate unprivileged build/test work from privileged credentials;
- never execute untrusted PR code in a privileged publish/release context;
- do not place secrets or privileged state in caches; privileged jobs should avoid caches unless a reviewed design proves they are safe and necessary.

## Upgrading Foundation

1. Review `CHANGELOG.md` and the diff between the adopted and target Foundation commits.
2. Identify changes to copied documents/templates separately from reusable workflows.
3. Preserve app-specific deviations unless an approved change supersedes them.
4. Update copied rules/templates only where they remain appropriate for the app.
5. Update the reusable-workflow SHA after review.
6. Update the provenance record.
7. Run the application's full validation before merging.
