# Vercel Fixed Staging slot profile

This profile defines the single hosted non-Production review slot used by the default Vercel hosting contract in `docs/vercel.md`.

It is not a release branch, an integration branch, or a second Production environment. It exists so an explicitly selected same-repository PR HEAD can be deployed to one stable origin without creating Vercel deployments for every feature/PR push.

## Topology

```text
feature/* -> Pull Request -> Foundation CI / rendered review
                    |
                    +-> no Vercel deployment
                    |
                    +-> explicit hosted-review request
                              |
                              v
                    read-only request workflow
                              |
                              v
                    trusted workflow_run publisher
                              |
                              v
                    staging ref = selected PR HEAD
                              |
                              v
                    Vercel Git Integration
                              |
                              v
                    https://staging.example.com

main -> Vercel Production -> https://example.com
```

`staging` is a single mutable validation slot. It does not accumulate merge history. Moving the slot means moving the branch ref directly to the selected PR HEAD SHA.

The consuming repository must also carry the standard `git.deploymentEnabled` policy from `docs/vercel.md`: `"**": false` disables ordinary branches including slash-containing names, while only `main` and `staging` are explicitly re-enabled. The old `"*": false` catch-all is not sufficient because minimatch `*` does not span `/`.

## Why the workflow is split

A manual `workflow_dispatch` can be invoked against a selectable branch or tag. Therefore a write-enabled workflow must not trust an `if: github.ref == refs/heads/main` check inside the manually selected workflow as its only privilege boundary: a feature branch can contain a modified copy of that workflow.

The profile separates the operation into:

1. **Request workflow** — `workflow_dispatch`, read-only token, no repository checkout. It records the requested PR number into a short-lived artifact.
2. **Publisher workflow** — `workflow_run`, which executes from the repository default-branch context and owns `contents: write`. It accepts only a successful request run from `main` in the same repository, downloads only that request artifact, then independently validates the PR through the GitHub API.

The publisher never checks out the selected PR. It fetches the selected commit only as a Git object immediately before moving the `staging` ref.

The cleanup workflow uses `pull_request_target: closed`, checks out trusted `main`, and never checks out or executes PR code.

## Security boundary

Preserve these constraints:

- Fixed Staging is opt-in per hosted review, not automatic for every PR push;
- only open same-repository PRs targeting `main` are deployable;
- fork PRs are rejected;
- the manual request workflow has read-only permissions;
- the write-enabled publisher is `workflow_run`-triggered from the trusted default-branch workflow definition;
- publisher input is bound to the triggering request run ID, repository, and `refs/heads/main`;
- external Actions are pinned to reviewed full commit SHAs;
- ref mutation uses `--force-with-lease` compare-and-swap rather than unconditional force push;
- PR code is never executed in GitHub Actions with the publisher's write token;
- Production secrets are not exposed to branch-scoped Staging Preview configuration.

The selected PR code does execute later in Vercel's Staging deployment. The manual promotion decision is therefore also a Vercel environment trust decision. Give Staging only the configuration required for validation.

## Request ordering and races

The publisher uses `concurrency.queue: max` so explicit requests are not silently replaced by the default single-pending concurrency behavior. The script also looks for newer `workflow_dispatch` runs of `request-staging.yml` on `main`.

The contract is deliberately:

- a newer eligible manual request supersedes an older request before mutation;
- if that newer request later fails PR validation or deployment, the older request is **not** replayed automatically;
- Staging remains at its previously committed occupant until another valid request succeeds.

This is safer and easier to reason about than allowing an older request to become the final winner after a newer operator choice has already been made.

Every ref write is also guarded by:

```text
git push --force-with-lease=refs/heads/staging:<observed SHA>
```

If another operation changes Staging between read and write, the stale write fails instead of erasing the newer occupant.

## Close / merge cleanup

When a same-repository PR closes, cleanup resets Staging to the current observed `main` SHA only when:

```text
current staging SHA == closed PR HEAD SHA
```

The cleanup decision intentionally does not depend on the PR's current base branch. If a PR was staged while targeting `main`, then retargeted before close, cleanup can still release the slot safely because ownership is determined by the immutable closed-PR HEAD SHA comparison.

If another PR has already replaced the slot, cleanup skips. The cleanup ref update also uses `--force-with-lease`, so a concurrent newer Staging update cannot be overwritten.

## Bootstrap

Copy these application-owned files:

- `templates/vercel/fixed-staging/request-staging.yml` -> `.github/workflows/request-staging.yml`
- `templates/vercel/fixed-staging/deploy-staging.yml` -> `.github/workflows/deploy-staging.yml`
- `templates/vercel/fixed-staging/cleanup-staging.yml` -> `.github/workflows/cleanup-staging.yml`
- `templates/vercel/fixed-staging/staging-slot.mjs` -> `scripts/staging-slot.mjs`

Also copy the Vercel Git deployment policy:

- `templates/vercel/vercel-git.json` -> `vercel.json`, when no other Vercel configuration is required; or
- `templates/vercel/vite-spa-vercel.json` -> `vercel.json` for a client-side routed Vite SPA that needs the fallback rewrite.

Then:

1. Create `staging` once from current `main`.
2. Add repository variable `FIXED_STAGING_URL`, for example `https://staging.example.com`.
3. Merge the request/publisher/cleanup bootstrap and repository-owned Vercel deployment policy to `main` after normal CI review. Both `workflow_dispatch` and `workflow_run` steady-state behavior depend on the trusted workflow definitions existing on the default branch.
4. In Vercel Project Settings -> Environments, confirm Production Branch Tracking uses `main` and Preview Branch Tracking is enabled so `staging` can deploy through normal Git Integration.
5. In Vercel, map a Branch Domain/custom domain to Git branch `staging`.
6. Configure required Vercel Preview values with a `staging` branch scope. `staging` is technically a Vercel Preview deployment even though it is the only supported hosted non-Production slot in this Foundation profile.
7. Register the exact Staging origin with the external integration provider when required.
8. Validate the first real feature PR through **Actions -> Request PR for Fixed Staging**.
9. Run the **post-adoption smoke** after the corrected `"**": false` policy is on `main`:
   - push a disposable ordinary slash-containing feature branch commit and confirm Vercel creates no deployment/status for that push;
   - move/push `staging` and confirm Vercel creates the hosted review deployment;
   - push/merge `main` and confirm Vercel creates Production.
10. Record the relevant provider-side Preview/Branch Tracking state in the consumer's Foundation/deployment provenance.

The PR that introduces this profile cannot prove its own complete default-branch publisher path before the bootstrap merge. Treat that as a one-time bootstrap exception. Only the post-merge smoke determines whether adoption is complete.

If an ordinary feature branch still produces a Vercel deployment after the slash-safe globstar policy is on `main`, do not declare the profile adopted. Investigate provider state from fresh evidence and repeat the smoke.

## Normal operation

For a PR that needs only normal code/UI review:

1. Run Foundation CI and any application-owned rendered UI review.
2. Do not publish a Vercel deployment for the feature/PR branch.

For a PR that needs a hosted browser surface:

1. Ensure normal CI/review evidence is satisfactory for the current PR HEAD.
2. Open **Request PR for Fixed Staging** in GitHub Actions.
3. Select `main` and enter the PR number.
4. The read-only request run emits the bounded request artifact.
5. The trusted `workflow_run` publisher validates the request and current PR HEAD.
6. The publisher moves `staging` to that SHA with compare-and-swap semantics.
7. Vercel Git Integration deploys `staging` to the fixed Staging domain.
8. If the PR receives more commits and needs hosted re-validation, submit a new request; Staging is SHA-specific.
9. On merge/close, cleanup returns the slot to current `main` only if that PR still owns it.

The single-slot model intentionally makes hosted review explicit. Multiple PRs can still be reviewed concurrently through CI/artifacts, but only one selected PR occupies Fixed Staging at a time.

## Vercel and OAuth configuration

Production remains on the real Production Branch, normally `main`, while `staging` remains a Vercel Preview-environment branch. Other slash-containing and flat branch names are disabled by the repository `"**": false` `git.deploymentEnabled` policy; the post-adoption smoke remains the acceptance evidence.

Vercel, DNS, OAuth clients, redirect URIs, and origin allowlists remain application/provider-owned configuration. The consumer may reuse one OAuth client across Production and Staging when appropriate, or separate them when stronger isolation is required.

Browser-prefixed configuration such as Vite `VITE_*` client IDs is public client configuration, not a secret. Sensitive credentials must not be exposed to browser bundles or to Staging PR code.

## Browser-origin state caveat

A stable Staging hostname is still a different origin from Production. `https://example.com` and `https://staging.example.com` have separate `localStorage`, IndexedDB, cookies, and other origin-scoped browser state.

If an integration creates durable remote resources, do not depend solely on a Production-local browser identifier when Staging is expected to reuse that resource. Design explicit remote ownership/discovery, or deliberately isolate the resources if that is the product contract.

Fixed Staging solves address stability; it does not create cross-origin browser-state synchronization.

## Template assumptions

The templates assume:

- production/default branch: `main`;
- mutable validation branch: `staging`;
- Node version file: `.node-version`;
- request workflow filename: `request-staging.yml`;
- publisher workflow filename: `deploy-staging.yml`.

If a consumer changes those names, update the corresponding script/workflow constants and its `git.deploymentEnabled` rules deliberately.

The script uses Node.js standard-library/runtime APIs plus Git. It does not require the GitHub CLI or application dependency installation.

## Proven consumer evidence

`ms-credentials-tracker` proved the core slot model with a fixed `staging.credentials.shimabell.dev` branch domain, exact-origin Google OAuth, direct `staging = PR HEAD` ref movement, Vercel Git Integration deployment, and conditional cleanup. The consumer also exposed a real cross-origin `localStorage` issue, which is why the browser-state caveat is part of this profile.

`auth-flow-lab` demonstrated both why the slot should replace automatic feature/PR Preview deployment and why the catch-all must be slash-safe. Its Vercel Project had Preview Branch Tracking enabled and Production tracking `main`, but the old v0.9.0/v0.9.1 `"*": false` rule still allowed slash-containing `chore/...` and feature branches to deploy. The corrected profile uses `"**": false` and retains the three-path smoke as runtime evidence.

## References

- `docs/vercel.md`
- Vercel: Git configuration / `git.deploymentEnabled`
  - https://vercel.com/docs/project-configuration/git-configuration
- minimatch globstar behavior
  - https://github.com/isaacs/minimatch
- GitHub Actions: manually running a workflow
  - https://docs.github.com/actions/managing-workflow-runs/manually-running-a-workflow
- GitHub Actions: `workflow_run`
  - https://docs.github.com/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run
- GitHub Actions: secure `pull_request_target`
  - https://docs.github.com/actions/reference/security/securely-using_pull_request_target
- GitHub: `GITHUB_TOKEN` permissions
  - https://docs.github.com/actions/security-guides/automatic-token-authentication
- Git: `--force-with-lease`
  - https://git-scm.com/docs/git-push
- Vercel: Git Integration
  - https://vercel.com/kb/git-integration
