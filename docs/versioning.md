# Versioning and Release Discipline

## Default model

Use Semantic Versioning (`MAJOR.MINOR.PATCH`) for Web App Foundation and, by default, for applications derived from it. `package.json` is the Foundation version source; README, `AGENTS.md`, and the root lockfile version must agree with it and Foundation CI verifies that consistency.

Version numbers communicate product/repository compatibility. They are not substitutes for deployment identifiers, commit SHAs, database migration versions, or environment names.

## Pre-1.0 policy

While Foundation `MAJOR = 0`:

- **patch** — backward-compatible fixes, clarifications, or small consumer-visible corrections that do not add a meaningful new Foundation capability,
- **minor** — new consumer-facing capabilities and any intentional breaking Foundation-contract change,
- breaking changes must be called out explicitly in `CHANGELOG.md` even though the numeric major remains `0`.

The decision to release `1.0.0` is a deliberate stability gate backed by real-consumer evidence. A downstream application may reach `1.0.0` independently.

## Stable SemVer policy

After `1.0.0`: patch = compatible bug fix, minor = compatible functionality, major = incompatible public/product/reusable-contract change.

## Changesets

Use Changesets to record version intent for consumer-visible or release-relevant work. Reusable workflow contract changes count as consumer-facing changes even though they live under `.github/`.

A Changeset is normally unnecessary only when the change truly does not alter a consumer-facing contract, such as test-only additions, formatting, or internal refactoring.

The CLI is an exact `@changesets/cli` devDependency covered by the committed lockfile. `npm ci` installs the release tooling used by these scripts:

```bash
npm run changeset
npm run version:status
npm run version-packages
npm run tag-version
```

Do not replace these with ad-hoc `npx` resolution during a release.

## Release sequence

A normal Foundation release is:

1. merge approved Issue-driven PRs with required Changesets,
2. start from a clean checkout and run `npm ci`, Foundation validation, and validator regression tests,
3. run the Changesets version step,
4. review the resulting package version, lockfile, README/AGENTS version fields, and changelog,
5. update any version mirrors required by the validator,
6. rerun Foundation validation from the final release commit,
7. create immutable `vX.Y.Z` release/tag evidence from that validated commit,
8. downstream apps adopt the new Foundation deliberately.

Do not mutate an existing released tag to point at different code. The release procedure itself must be exercised before the next Foundation release is treated as proven.

## Downstream provenance

An application records both the commit from which copied Foundation rules/templates were adopted and the exact full commit SHA referenced by reusable workflows. These can differ and must be upgraded deliberately. Record app-specific deviations separately so Foundation upgrades do not erase local decisions.
