# Application versioned release profile

Use this profile when a downstream application milestone is intentionally versioned and published as a GitHub Release.

A normal merged PR is not automatically a release. Release intent must be explicit.

## Completion contract

When a user/Issue explicitly requests an application release, do not report the milestone complete until all requested release evidence exists:

```text
validated application commit
  -> application version source updated
  -> immutable vX.Y.Z tag resolving to the validated commit
  -> published GitHub Release
  -> post-publication tag / release verification
  -> hosting/deployment status checked when the app has a Production deployment
```

A Git tag alone is not equivalent to a published GitHub Release.

## Default npm version source

For an npm-based application, use root `package.json` as the default application SemVer source unless the app documents another source.

Do not bump the application version for every ordinary PR. Update it when there is explicit release/version intent.

## Copyable workflow

`templates/release/release.yml` is an application-owned template for repositories whose quality workflow is named `CI` and runs on `main`.

The template:

- triggers only after the `CI` workflow completes;
- continues only when that CI run succeeded for `main`;
- checks out the exact `workflow_run.head_sha` that produced the successful CI result without persisting Git credentials;
- detects explicit root `package.json` SemVer change;
- resolves lightweight and annotated tags to their underlying commit before accepting them;
- refuses to move an existing conflicting tag;
- safely treats an already-matching published GitHub Release as idempotent;
- tolerates a concurrent same-tag publisher only when final verification proves the resulting Release is correct;
- verifies published state, prerelease metadata, and tag target after publication;
- creates a published GitHub Release only when version change expresses release intent;
- supports GitHub prerelease publication through the template's `PRERELEASE` setting.

Copy the template into the consuming repository as `.github/workflows/release.yml` and adapt only documented application-owned values such as the CI workflow name or prerelease setting.

## Why `workflow_run.head_sha` matters

A privileged release workflow must publish the exact revision that passed CI, not whatever commit happens to be at the tip of `main` when the release job runs.

The workflow therefore carries the validated SHA explicitly through checkout, tag verification, and `gh release create`.

This also avoids a race where a newer `main` commit lands while a release for the previous validated commit is still starting.

## Security boundary

The release workflow has `contents: write`, so keep its trust boundary small:

- trigger from the trusted CI workflow rather than from arbitrary PR code;
- require successful `main` CI;
- check out only the validated `main` SHA;
- do not download/execute arbitrary PR artifacts in the privileged release job;
- do not restore untrusted caches containing privileged state;
- pin external actions to reviewed full commit SHAs.

GitHub documents `workflow_run` as a privileged trigger; do not combine it with checkout/execution of untrusted PR content.

## Existing-state handling

For version `X.Y.Z`, expected tag is `vX.Y.Z`.

- no tag/release -> create the release at the validated SHA;
- matching published release whose tag resolves to the same validated SHA -> succeed idempotently;
- matching lightweight or annotated tag with no Release -> reuse it only when it resolves to the validated SHA;
- tag resolves to a different SHA -> fail; never move the tag;
- release exists but is draft/unpublished -> fail;
- release prerelease metadata differs from `PRERELEASE` -> fail final verification;
- version did not change relative to the validated commit's first parent -> skip publication.

If a repository intentionally uses merge commits or another version topology that makes first-parent comparison unsuitable, adapt the detection logic and document the deviation.

The workflow resolves Git tag objects rather than comparing raw tag-object IDs. This matters for annotated tags, whose tag-object SHA intentionally differs from the commit SHA they ultimately reference.

## Publication races

A pre-publication check cannot by itself exclude another trusted run publishing the same tag concurrently. The template therefore performs final verification after publication. A concurrent same-tag result is accepted only when the resulting Release is published, has the configured prerelease state, and its tag resolves to the exact CI-validated SHA. Conflicting results fail closed.

## Prereleases

GitHub prerelease status is metadata separate from SemVer text. An initial beta may therefore use `0.1.0` and publish the GitHub Release with `prerelease: true`, or an application may adopt SemVer prerelease identifiers through a separately documented version-source policy.

The provided template keeps the Foundation's simple `X.Y.Z` application version source and exposes a `PRERELEASE` switch.

## Release notes

Generated GitHub notes are a reasonable default for small applications. Add a concise curated summary when a milestone needs user-facing context that generated PR lists do not convey.

## Proven consumer evidence

`ms-credentials-tracker` established the pattern that led to this profile:

1. a product milestone was merged and validated;
2. the absence of version/tag/release evidence exposed a Foundation process gap;
3. a later release workflow bound publication to successful `main` CI and explicit `package.json` version change;
4. `v0.3.1` was published as a normal GitHub Release after the validated `main` CI completed.

This profile turns that corrective consumer experience into a reusable application release path.

## Foundation releases are separate

This document describes **downstream application releases**. Web App Foundation itself continues to use Changesets and the release sequence in `docs/versioning.md`.
