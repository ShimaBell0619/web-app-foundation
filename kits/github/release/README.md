# GitHub Release kit (optional)

Use this kit only for an application whose owner explicitly requests a versioned GitHub Release. Foundation itself uses Changesets ([maintaining](../../../docs/maintaining.md)); ordinary PR merges do **not** imply a release.

## Install and trust assumptions

Copy [workflow.yml](workflow.yml) to an app's `.github/workflows/release.yml` and adjust the trusted CI workflow name (default: `CI`). Protect the app's `main` branch (reviews + successful CI) before enabling publication. Unprotected main allows unreviewed code or workflow changes to be treated as trusted.

- Root workflow permissions are read-only; the release job alone receives `contents: write`.
- Only a successful `push` CI run on the same repo's `main` may trigger publication. Untrusted PR runs cannot publish.
- Checkout uses that successful run's **exact source SHA** without persisted checkout credentials. The workflow verifies `main` still points to that SHA immediately before preflight and publication. A newer main commit means this release attempt must stop, not silently move to the newer SHA.
- Publication is serialized by repository. Existing `vX.Y.Z` tags are never moved, and both lightweight and annotated tags resolve to the underlying commit before comparing with the validated SHA.
- The GitHub Release must be published (not a draft), its prerelease metadata must match the chosen `PRERELEASE` setting, and its tag must resolve to the successful CI SHA. An exact already-published match is idempotent; mismatched or partially completed states fail closed.
- Do not execute PR checkout code, attach untrusted artifacts, or restore privileged caches in the release job.

## Explicit release workflow

1. Approve the milestone and version, then update the app's `package.json` to the chosen `X.Y.Z`.
2. Run app quality gates and merge through the protected branch.
3. Successful `main` CI with a version change relative to the checked-out commit's first parent causes the release job to publish `vX.Y.Z` with generated notes.
4. Verify GitHub tag, published Release and metadata; for deployed apps, separately confirm Production deployment and actual application behavior.

A tag is not a Release; a GitHub Release is not a Vercel deployment; CI success does not prove that users can reach or use the UI.

The template assumes a first-parent version comparison and a simple stable `X.Y.Z` app version. Adapt when a project uses merge commits, independent release branches, SemVer prerelease suffixes, or custom version sources—review and test the change instead of silently accepting a skip.

## Unavailable / failure behavior

Conflicting tag, draft Release, incorrect owner/branch, missing successful exact CI, GitHub API error, an advanced main ref, or inconsistent prerelease state are errors; they do not grant implicit retries or force updates. Before retrying an uncertain API write, **query the tag and Release** to distinguish no-op from partial success.

This kit does not install credentials, alter branch protection, or run itself in Foundation. It is copied only when the application needs a release workflow.
