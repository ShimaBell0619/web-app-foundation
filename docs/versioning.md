# Versioning and Release Discipline

## Default model

Use Semantic Versioning (`MAJOR.MINOR.PATCH`) for Web App Foundation and, by default, for applications derived from it. `package.json` is the Foundation version source; README, `AGENTS.md`, the root lockfile, and the current released `CHANGELOG.md` entry must agree with it.

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

`npm run version:status` is a **local diagnostic**, not an unconditional CI quality gate. A release/version PR has already consumed the pending Changesets, and a Changeset-exempt change is intentionally allowed to have none. CI therefore verifies that the locked CLI is installed and executable without requiring a pending Changeset on every PR.

Do not replace release tooling with ad-hoc `npx` resolution.

## Normal change PR versus release PR

A normal change PR and a release PR have different contracts:

### Normal change PR

- Add a Changeset when the change is consumer-visible or release-relevant.
- Use the PR template to state explicitly when a Changeset is not required.
- Quality CI validates the Foundation, but does not infer release intent solely from “some file changed in this root package”.
- `npm run version:status` may be used by a developer/agent as an additional diagnostic when appropriate.

### Release/version PR

- Run `npm run version-packages`.
- Changesets updates `package.json` and `CHANGELOG.md` and consumes the pending Changeset files.
- The committed sync script then updates the Foundation version mirrors in `package-lock.json`, `README.md`, and `AGENTS.md`.
- Do **not** require a new Changeset merely because the release PR has no pending Changesets.
- Run `npm run foundation:release-validate` to verify package/lock/README/AGENTS/CHANGELOG consistency.

This separation prevents the release mechanism from rejecting its own version PR.

## Release sequence

A normal Foundation release is:

1. merge approved Issue-driven PRs with required Changesets,
2. start from a clean checkout and run `npm ci`, Foundation validation, validator regression tests, and `npm run version:tooling`,
3. create a release/version branch or PR and run `npm run version-packages`,
4. review the generated package version and changelog plus the synchronized lockfile/README/AGENTS mirrors,
5. run `npm ci`, `npm run foundation:validate`, `npm run foundation:test`, and `npm run foundation:release-validate` on the final release PR state,
6. merge only after the release PR quality gates pass,
7. create immutable `vX.Y.Z` release/tag evidence from that validated commit,
8. downstream apps adopt the new Foundation deliberately.

Do not mutate an existing released tag to point at different code. The complete release procedure should be exercised before the next Foundation release is treated as proven.

## Downstream provenance

An application records both the commit from which copied Foundation rules/templates were adopted and the exact full commit SHA referenced by reusable workflows. These can differ and must be upgraded deliberately. Record app-specific deviations separately so Foundation upgrades do not erase local decisions.
