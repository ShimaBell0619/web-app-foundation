# Adopting Web App Foundation

## Bootstrap

For a new application:

1. Start from the application's real product requirements rather than copying a full framework stack blindly.
2. Copy `PRODUCT.base.md` to `PRODUCT.md` and replace template text with the approved product contract.
3. Copy `DESIGN.base.md` to `DESIGN.md`, preserve the Google DESIGN.md alpha structure, and add application-specific tokens/rationale.
4. Copy/adapt the relevant `AGENTS.md` rules into the application repository. Add app-specific constraints rather than depending on chat memory.
5. Add specialist documents only when needed, commonly `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/RELEASE.md`, or `docs/COMPATIBILITY.md`.
6. Use a committed Node version file and package-manager lockfile.
7. Add an app-owned CI caller that references the reusable Foundation workflow by a reviewed full commit SHA.
8. Record Foundation provenance before feature work begins.

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

Copied documents and centrally referenced workflows have different upgrade behavior:

- **Copied rules/templates** do not change automatically. Review Foundation changes and adopt them deliberately.
- **Reusable workflows** execute the exact commit SHA referenced by the app. Upgrade by reviewing a newer Foundation commit and changing the SHA deliberately.

Never reference reusable workflows through `@main` or another mutable tag.

## Default application baseline

For a browser-first app, the current preferred starting point is React + TypeScript + Vite + npm.

That is a default, not a restriction. If the product needs SSR, server components, server routes, authentication middleware, backend persistence, or framework-native deployment behavior, select an architecture such as Next.js or another suitable stack and document the resulting boundaries in the app.

The Foundation's document responsibilities, Issue discipline, AI self-review loop, dependency rules, CI principles, and versioning discipline still apply.

## Reusable CI caller

Example:

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

Use a full reviewed commit SHA in place of the placeholder.

## Upgrading Foundation

1. Review `CHANGELOG.md` and the diff between the adopted and target Foundation commits.
2. Identify changes to copied documents separately from reusable workflows.
3. Update copied rules/templates only where they remain appropriate for the app.
4. Update the reusable-workflow SHA after review.
5. Update the provenance record.
6. Run the application's full validation before merging.
