# Versioning and Release Discipline

## Default model

Use Semantic Versioning (`MAJOR.MINOR.PATCH`) for Web App Foundation and, by default, for applications derived from it.

Version numbers communicate product/repository compatibility. They are not substitutes for deployment identifiers, commit SHAs, database migration versions, or environment names.

## Pre-1.0 policy

Web App Foundation remains in `0.x` while real applications validate the contracts.

For the Foundation while `MAJOR = 0`:

- **patch** — backward-compatible fixes, clarifications, or small consumer-visible corrections that do not add a meaningful new Foundation capability,
- **minor** — new consumer-facing Foundation capabilities and any intentional breaking Foundation-contract change,
- breaking changes must be called out explicitly in `CHANGELOG.md` even though the numeric major remains `0`.

The decision to release `1.0.0` is a deliberate stability gate backed by real-consumer evidence, not an automatic consequence of time or repository age.

A downstream application may reach `1.0.0` independently when its own product contract is stable; it does not need to wait for the Foundation.

## Stable SemVer policy

After `1.0.0`:

- **patch** — backward-compatible bug fix,
- **minor** — backward-compatible functionality,
- **major** — incompatible public/product/reusable-contract change.

## Changesets

Use Changesets to record version intent for consumer-visible or release-relevant work.

A Changeset is normally required for:

- user-visible features or fixes,
- changes to shared Foundation contracts consumed by apps,
- reusable workflow behavior changes that consumers must review,
- compatibility or public behavior changes.

A Changeset is normally not required for:

- docs-only clarification that does not alter a contract,
- tests only,
- formatting only,
- internal refactors with no consumer-visible effect,
- CI maintenance that does not alter the reusable consumer contract.

When uncertain, prefer a small Changeset if an adopter should see the change in release notes.

The Foundation uses an exact CLI version in its convenience scripts:

```bash
npm run changeset
npm run version-packages
npm run tag-version
```

Applications may install `@changesets/cli` as a pinned dev dependency instead; the important contract is the Changeset files/configuration and review discipline, not how the CLI binary is obtained.

## Release sequence

A normal Foundation release is:

1. merge approved Issue-driven PRs with required Changesets,
2. run the version step to apply version intent,
3. review the resulting version and changelog,
4. commit the version/changelog update,
5. create immutable `vX.Y.Z` release/tag evidence,
6. downstream apps adopt the new Foundation deliberately.

Do not mutate an existing released tag to point at different code.

## Downstream provenance

An application records both:

- the commit from which copied Foundation rules/templates were adopted,
- the exact full commit SHA referenced by reusable workflows.

These can differ and must be upgraded deliberately.
