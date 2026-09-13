# Vercel Fixed Staging slot profile

Fixed Staging is an **optional** hosted-review profile. The Foundation default is On-demand Preview from `docs/vercel-on-demand-preview.md`. Add Fixed Staging only when a stable non-Production origin is a real requirement, such as exact-origin OAuth allowlists, webhooks, or a reviewer flow that cannot use changing generated Preview URLs.

It is not a release branch, shared integration branch, or second Production environment.

## Relationship to the default profile

The default Vercel branch policy enables only Production `main` and trusted `preview/**` refs:

```json
{
  "git": {
    "deploymentEnabled": {
      "**": false,
      "main": true,
      "preview/**": true
    }
  }
}
```

A consumer that deliberately adopts Fixed Staging adds only:

```json
"staging": true
```

The resulting policy still keeps ordinary feature/fix/PR branches disabled. Do not remove the slash-safe `"**": false` catch-all.

## Topology

```text
same-repository PR
      |
      +-> ordinary CI / rendered review
      |
      +-> optional manual Fixed Staging request
                |
                v
        read-only request workflow on main
                |
                v
        trusted workflow_run resolver
                |
                +-> exact PR HEAD A
                |
                +-> reusable Foundation CI validates A
                |
                v
        write-enabled publisher
                |
                +-> revalidate current PR HEAD == A
                +-> synthetic B: parent(B)=A, tree(B)=tree(A)
                +-> staging = B via --force-with-lease
                |
                v
        Vercel Git Integration
                |
                v
        stable Staging domain
```

The synthetic child commit makes slot ownership explicit without changing the validated application tree. It is the same non-Production transport exception used by the default Hosted Review architecture; it must not be reused to satisfy Production or versioned Release publication rules.

## Why the request and publisher remain split

The optional Fixed Staging profile retains the existing manual request + trusted `workflow_run` handoff. A `workflow_dispatch` can be selected against branches/tags, so the write-enabled operation must not trust a manually selected feature-branch workflow definition.

The profile therefore keeps:

1. `request-staging.yml` — read-only manual selector on `main`, emitting a short-lived bounded artifact;
2. `deploy-staging.yml` — trusted default-branch `workflow_run` path that resolves the selected PR, validates its exact HEAD A through reusable Foundation CI, then mutates `staging` only from trusted automation;
3. `cleanup-staging.yml` — trusted close cleanup serialized with publication.

This profile may move to an `issue_comment` `/staging` entry in a future revision, but v0.10.0 does not need that extra migration to satisfy the fixed-origin requirement safely.

## Exact-source quality gate

A Fixed Staging request is not allowed to rely only on normal pull-request merge-commit CI.

The publisher first resolves the current same-repository PR HEAD A and passes A to reusable `web-ci.yml` through `checkout_ref`. That validation job is read-only. Only after exact-A CI succeeds does the write-enabled publisher run.

Before mutation the publisher re-fetches the PR and requires the current HEAD still to equal A. A changed PR fails closed and must be requested again.

## Synthetic source and explicit ownership

The publisher creates B with these invariants:

```text
parent(B) = A
 tree(B) = tree(A)
 diff(A,B) = empty
```

B records:

- `Foundation-Fixed-Staging-PR: <N>`
- `Source-PR-HEAD: <A>`

`staging` points to B rather than directly to A. This solves the previous cleanup ambiguity where a PR could be staged at A, advance to A2, then close while `staging` still pointed to A.

Cleanup now reads the current Staging commit's explicit PR ownership marker. If the closed PR still owns the slot, cleanup resets `staging` to current `main`; if another PR has replaced it, cleanup skips.

Publication and cleanup use the same global `fixed-staging-deploy-slot` concurrency group and ref mutation uses `--force-with-lease`, so stale cleanup cannot overwrite a newer occupant.

## Request ordering

The existing newest-request-wins rule remains:

- a newer eligible `workflow_dispatch` request on `main` supersedes an older request before mutation;
- if that newer request later fails validation/deployment, the older request is not replayed automatically;
- Staging remains at its last committed occupant until another valid request succeeds.

The publisher re-checks supersession immediately before mutation.

## Bootstrap

Copy these application-owned files:

- `templates/vercel/fixed-staging/request-staging.yml` -> `.github/workflows/request-staging.yml`
- `templates/vercel/fixed-staging/deploy-staging.yml` -> `.github/workflows/deploy-staging.yml`
- `templates/vercel/fixed-staging/cleanup-staging.yml` -> `.github/workflows/cleanup-staging.yml`
- `templates/vercel/fixed-staging/staging-slot.mjs` -> `scripts/staging-slot.mjs`

Then:

1. Start from the default On-demand Preview `vercel.json` and add `"staging": true` to `git.deploymentEnabled`.
2. Create `staging` once from current `main`.
3. Add repository variable `FIXED_STAGING_URL` with the exact stable Staging origin.
4. The copied `deploy-staging.yml` contains a reviewed immutable Foundation full SHA for exact-source CI. Replace that pinned full SHA with the reviewed full SHA of the Foundation release the consumer adopts.
5. Merge the trusted workflows/helper to `main` before first use.
6. In Vercel, map the stable Branch Domain/custom domain to Git branch `staging`.
7. Configure only the minimum Preview values required by `staging`; it is technically a Vercel Preview-environment branch.
8. Register the exact Staging origin with external identity/integration providers when required.
9. Run the post-adoption smoke described below.

When upgrading from the pre-v0.10 profile, update all four copied files together because exact-A validation and ownership-aware cleanup are one contract.

## Normal operation

1. Ensure the PR is an open same-repository PR targeting `main`.
2. In Actions, run **Request PR for Fixed Staging** on `main` and enter the PR number.
3. The trusted resolver obtains exact HEAD A.
4. Reusable Foundation CI validates A with no inherited secrets.
5. The write-enabled publisher revalidates A and publishes content-identical B to `staging` with compare-and-swap semantics.
6. Vercel deploys the `staging` branch to the stable domain.
7. If the PR changes and needs new fixed-origin validation, submit a new request.
8. On merge/close, cleanup resets the slot only when the current Staging commit explicitly belongs to that PR.

The slot is intentionally singular. Multiple PRs can still use CI and On-demand Preview concurrently, but only one PR owns Fixed Staging at a time.

## Security boundary

Preserve these constraints:

- only open same-repository PRs targeting `main` are deployable;
- fork PRs are rejected;
- the manual request workflow is read-only;
- exact source A is validated in a read-only reusable CI job;
- the publisher checks out trusted `main` only and never executes PR code with its write token;
- write jobs receive no OIDC permission by default;
- Production secrets/state are not exposed to Staging PR code;
- external Actions are pinned to reviewed full SHAs;
- ref mutation uses `--force-with-lease`.

The selected PR code still executes later in Vercel. Treat branch-scoped Staging configuration as a separate trust boundary.

## Browser-origin caveat

A stable Staging hostname is still a different origin from Production. `https://example.com` and `https://staging.example.com` have separate `localStorage`, IndexedDB, cookies, and other origin-scoped state.

If an integration creates durable remote resources, do not depend solely on a Production-local browser identifier when Staging must reuse that resource. Fixed Staging solves address stability, not cross-origin browser-state synchronization.

## Post-adoption smoke

After the optional profile is on `main`:

- ordinary slash-containing feature branch -> no Vercel deployment;
- `/preview` -> normal On-demand Preview still works when adopted;
- Fixed Staging request -> exact-A CI succeeds and the stable Staging domain deploys the selected tree;
- closing the staged PR after advancing its HEAD -> cleanup still recognizes the explicit ownership marker and safely releases the slot;
- `main` -> Production remains unaffected.

## Proven consumer evidence

`ms-credentials-tracker` proved the stable Staging domain need with exact-origin Google OAuth. Earlier Foundation implementations moved `staging` directly to the selected PR HEAD; v0.10.0 hardens that profile with exact-A CI and explicit synthetic ownership so cleanup no longer depends on the close-time PR HEAD matching the staged revision.

## References

- `docs/vercel.md`
- `docs/vercel-on-demand-preview.md`
- GitHub Actions `workflow_run`: https://docs.github.com/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run
- GitHub Actions secure `pull_request_target`: https://docs.github.com/actions/reference/security/securely-using-pull_request_target
- Git `--force-with-lease`: https://git-scm.com/docs/git-push
- Vercel Git configuration: https://vercel.com/docs/project-configuration/git-configuration
