# Adopting Web App Foundation

## Bootstrap

For a new application:

1. Start from real product requirements rather than copying a full framework stack blindly.
2. Copy `PRODUCT.base.md` to `PRODUCT.md` and replace template text with the approved product contract.
3. Copy `DESIGN.base.md` to `DESIGN.md`, preserve the Google DESIGN.md alpha structure, and add application-specific tokens/rationale.
4. Copy/adapt the relevant `AGENTS.md` rules. Add app-specific constraints rather than depending on chat memory.
5. Add specialist documents only when needed, commonly `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/RELEASE.md`, or `docs/COMPATIBILITY.md`.
6. Use a committed Node version file and package-manager lockfile.
7. Define the default npm scripts `check`, `typecheck`, `test`, and `build`; document any justified opt-out instead of omitting a script silently.
8. Add an app-owned CI caller that references the reusable Foundation workflow by a reviewed full commit SHA.
9. Record Foundation provenance before feature work begins.

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

## Deployment safety boundary

The Foundation does not select a deployment provider, but derived apps should preserve these provider-independent rules:

- publish only source commit SHA `X` after the required quality gates have succeeded for that same SHA `X`,
- do not let a separate deploy trigger race ahead of CI for the same commit,
- prefer promoting/reusing the artifact that was validated; if rebuilding is necessary, bind the publish to the already-validated source SHA,
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
