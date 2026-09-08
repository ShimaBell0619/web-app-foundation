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
10. If the product uses project GitHub Pages, complete **Pages Phase 0** from `docs/pages.md`: copy the trusted publisher caller and merge it to the default branch before the first preview-enabled application/UI PR.
11. After Phase 0 is on the default branch, complete **Pages Phase 1** by adding the candidate job to normal CI.

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

## Deployment safety boundary

The Foundation does not select a deployment provider, but derived apps should preserve these provider-independent rules:

- publish only source commit SHA `X` after the required quality gates have succeeded for that same revision,
- do not let a separate deploy trigger race ahead of CI,
- prefer promoting/reusing the artifact that was validated; if rebuilding is necessary, bind the publish to the already-validated source revision,
- separate unprivileged build/test work from privileged publish credentials,
- never execute untrusted PR code in a privileged publish context,
- do not place secrets or privileged state in caches; privileged publish jobs should avoid caches unless a reviewed design proves they are safe and necessary.

## Upgrading Foundation

1. Review `CHANGELOG.md` and the diff between the adopted and target Foundation commits.
2. Identify changes to copied documents separately from reusable workflows.
3. Preserve app-specific deviations unless an approved change supersedes them.
4. Update copied rules/templates only where they remain appropriate for the app.
5. Update the reusable-workflow SHA after review.
6. Update the provenance record.
7. Run the application's full validation before merging.
