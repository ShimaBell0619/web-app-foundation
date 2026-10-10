# Vercel Kit

# Vercel Git-integrated hosting profile

Vercel Git Integration is the default application-owned hosting profile for new Web App Foundation consumers. It does not replace the reusable Foundation quality CI contract.

The default topology is:

- `main` -> Production;
- `preview/pr-N` -> explicit On-demand Preview created only by trusted Foundation automation;
- ordinary feature/fix/PR branches -> no Vercel deployment;
- Fixed Staging -> optional profile only when a stable non-Production origin is a real requirement.

Normal PR review stays in GitHub Actions and rendered-review evidence. A hosted browser deployment is created only when a repository writer explicitly requests `/preview`.

## Repository-owned deployment policy

Every default Vercel consumer should keep the branch policy in repository-owned `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "git": {
    "deploymentEnabled": {
      "**": false,
      "main": true,
      "preview/**": true
    }
  }
}
```

Copy `kits/vercel/vercel-git.json`, or `kits/vercel/vite-spa-vercel.json` for a client-side routed Vite SPA that also needs the fallback rewrite.

Vercel branch rules use minimatch behavior. The slash-safe `**` catch-all is required because plain `*` does not span `/`. Branches such as `feature/foo`, `fix/bar`, and `chore/baz` must therefore be covered by `"**": false`; `main` and trusted `preview/**` refs are explicitly re-enabled.

Do not use an Ignored Build Step merely to emulate this policy. The intended contract is that ordinary branches do not start a Vercel Git deployment at all.

## Default hosted review: On-demand Preview

The detailed contract lives in `docs/vercel-on-demand-preview.md`.

The flow is:

```text
PR HEAD A
   |
   +-> ordinary PR CI / rendered review
   |
   +-> writer comments /preview
           |
           +-> trusted workflow resolves A
           +-> reusable Foundation CI validates exact A
           +-> publisher revalidates current HEAD == A
           +-> create synthetic B where parent(B)=A and tree(B)=tree(A)
           +-> preview/pr-N = B
           +-> Vercel Git Integration builds Preview
           +-> Vercel success repository_dispatch
           +-> validate project/ref/B/current A
           +-> real client_payload.url returned to PR
```

The synthetic commit is a non-Production transport mechanism only. Production and versioned Release publication retain their exact source-SHA rules and must not use synthetic commits to satisfy quality or release gates.

No Vercel token, Deploy Hook, or direct Vercel deployment API credential is required by the default profile.

## Exact-source quality boundary

The normal GitHub pull-request workflow may validate a merge commit. Hosted review needs stronger source binding: the reusable `web-ci.yml` accepts an optional `checkout_ref`, and On-demand Preview passes the **exact PR HEAD A** as that source.

The exact-A job is unprivileged. The later write-enabled publisher checks out trusted `main` automation only, fetches A as a Git object, verifies the PR still points to A, and never executes PR code with its write token.

A request becomes stale as soon as the PR HEAD changes. Reviewers request `/preview` again for the new revision rather than silently switching the deployed source.

## Vercel success correlation

A successful Vercel event is not accepted merely because its event type says deployment success. The workflow binds the event to the expected Preview environment, project, `preview/pr-N` ref, current synthetic SHA, current PR HEAD, source tree, and provenance markers before posting a URL.

The Vercel commit-status target is a dashboard URL. The proven Git Integration success payload exposes the real generated application URL as `client_payload.url`, and that is the URL returned to the PR.

If the Vercel project name differs from the GitHub repository name, configure repository variable `VERCEL_PROJECT_NAME` with the exact project name.

## Repeated requests and cleanup

A repeated `/preview` for the same current A reuses an existing valid synthetic Preview source instead of creating another deployment commit. Per-PR ref mutation is serialized and protected with `--force-with-lease`.

When the PR closes, trusted cleanup removes only the Foundation-owned `preview/pr-N` ref. Stale Vercel completion events cannot overwrite or replace newer Preview state because the notification path is read-only and revalidates current identity.

## Preview environment trust

Preview runs PR code. Production credentials, Production write tokens, privileged Production state, or broadly scoped provider identities must not be exposed to Preview code.

Use minimum Preview-scoped configuration. Browser-prefixed client values such as Vite `VITE_*` variables are public client configuration rather than secrets. OIDC or other provider-issued Preview identities must be claim-scoped and authorized separately from Production.

## Provider-side adoption gate

Static repository configuration is necessary but not sufficient. Complete adoption only after runtime evidence shows the provider honors the intended topology.

1. Confirm Production Branch Tracking resolves `main` to Production.
2. Confirm Preview Branch Tracking/provider Preview settings can build trusted `preview/**` refs through normal Git Integration.
3. Run a **post-adoption smoke** after the policy and trusted Preview workflow are on `main`:
   - disposable ordinary slash-containing branch -> no Vercel deployment/status;
   - `/preview` on an eligible PR -> exact-A validation, `preview/pr-N` deployment, and real application URL returned to the PR;
   - `main` -> Production deployment.
4. Record project-specific Vercel state or overrides in the consumer's Foundation/deployment provenance.

`auth-flow-lab` proved that its earlier failed branch suppression was caused by the single-star catch-all rather than disabled Preview Branch Tracking. If ordinary branches still deploy under the `**` policy, investigate current provider state from fresh evidence instead of reusing that historical diagnosis.

## Optional Fixed Staging

Fixed Staging is no longer required by the default hosting profile. Adopt it only when a stable origin is materially required, for example exact-origin OAuth allowlists, webhook endpoints, or a reviewer workflow that cannot use changing generated Preview URLs.

The optional profile lives in `docs/vercel-fixed-staging.md`. It explicitly adds `staging: true` to the default branch policy and uses a single mutable stable-origin slot. It must not re-enable ordinary feature branches.

A consumer may use both On-demand Preview and Fixed Staging: `/preview` remains the normal ephemeral hosted-review path, while `staging` is reserved for the narrower fixed-origin requirement.

## Quality-gate tradeoff for Production

Native Vercel Git Integration can begin Production deployment as soon as the `main` commit exists. It does not inherently wait for a separate post-merge Foundation CI run for that exact commit.

Applications using this convenience-first Production profile should require/observe normal PR quality evidence before merge, run Foundation CI on the merged Production SHA, and verify the resulting Production deployment/status. If a product requires the stronger invariant "Production publish cannot start until CI has succeeded for that exact Production SHA", use a custom gated deployment/promotion path instead of native Git-triggered Production.

## Environment-variable ownership

Keep configuration in the environment that consumes it:

- **Production** — live `main` deployment configuration;
- **Preview** — minimum configuration required for `preview/**` review code;
- **Fixed Staging** — when adopted, branch-scoped Preview configuration for `staging`;
- **Development** — local/team development when Vercel-managed development values are useful.

Do not configure sensitive values broadly for arbitrary Preview branches merely because ordinary branches are repository-disabled.

## Vite SPA fallback

A client-side routed Vite SPA may need a fallback for direct subpath navigation/reload. `kits/vercel/vite-spa-vercel.json` includes the default Git policy plus:

```json
{
  "source": "/(.*)",
  "destination": "/index.html"
}
```

Do not copy that catch-all rewrite into applications with real server/API routes or framework-native routing without reviewing its effect.

## Adoption

1. Import/connect the GitHub repository to Vercel.
2. Confirm the Production branch is `main` unless the application deliberately documents another Production branch.
3. Add repository-owned configuration from `kits/vercel/vercel-git.json`, or the Vite SPA variant.
4. Copy the On-demand Preview workflow/helper from `kits/vercel/on-demand-preview/` and replace the Foundation workflow placeholder with the reviewed released full commit SHA.
5. Keep normal feature/PR review in GitHub Actions; do not create Vercel deployments on every push.
6. Scope Preview configuration to the minimum needed by PR code.
7. Run the three-path post-adoption smoke.
8. Adopt `docs/vercel-fixed-staging.md` only when a stable non-Production origin is actually required.

## Proven consumer evidence

`auth-flow-lab` provided the decisive runtime evidence for this profile. Its ordinary slash-containing PR branch was suppressed under the corrected `**` policy. A direct push/move of an already-seen exact PR HEAD did not provide the desired new Preview in that project, while a content-identical synthetic child commit did. Vercel then emitted a success payload containing project/ref/SHA/deployment metadata and the real Preview application URL, and GitHub Actions returned that URL to the originating PR without a Vercel credential.

`ms-credentials-tracker` remains evidence for the separate fixed-origin need: Google OAuth exact-origin testing benefits from a stable Staging hostname. That requirement is why Fixed Staging remains supported as an optional profile rather than being removed.

## References

- `docs/vercel-on-demand-preview.md`
- `docs/vercel-fixed-staging.md`
- Vercel Git configuration / `git.deploymentEnabled`: https://vercel.com/docs/project-configuration/git-configuration
- Vercel Git Integration: https://vercel.com/kb/git-integration
- Vercel Environments: https://vercel.com/kb/environments
- minimatch globstar behavior: https://github.com/isaacs/minimatch


---

# Vercel On-demand Preview profile

This profile is the default hosted-review path for Vercel consumers. Ordinary feature/fix/PR branches remain deployment-disabled. A repository writer explicitly requests a hosted Preview from the PR conversation with `/preview` only when browser-hosted review is materially useful.

## Topology

```text
feature/* -> Pull Request -> Foundation CI / rendered review
                    |
                    +-> no Vercel deployment
                    |
                    +-> writer comments /preview
                              |
                              v
                    trusted default-branch workflow
                              |
                              +-> resolve exact PR HEAD A
                              |
                              +-> reusable Foundation CI validates A
                              |
                              v
                    write-enabled trusted publisher
                              |
                              +-> revalidate current PR HEAD == A
                              |
                              +-> create synthetic B
                              |      parent(B) = A
                              |      tree(B)   = tree(A)
                              |
                              v
                    preview/pr-N = B
                              |
                              v
                    Vercel Git Integration
                              |
                              v
                    repository_dispatch success
                              |
                              v
                    validated real Preview URL -> PR comment

main -> Vercel Production
```

The synthetic commit exists only to create a fresh Git event for Vercel while preserving the exact source tree that passed CI. It is a hosted-review transport mechanism, not a Production or Release source identity.

## Repository files

Copy:

- `kits/vercel/on-demand-preview/preview.yml` -> `.github/workflows/preview.yml`
- `kits/vercel/on-demand-preview/on-demand-preview.mjs` -> `scripts/on-demand-preview.mjs`
- `kits/vercel/vercel-git.json` -> `vercel.json`, or `kits/vercel/vite-spa-vercel.json` for a client-side routed Vite SPA.

Replace `<FULL_FOUNDATION_COMMIT_SHA>` in the copied workflow with the reviewed full commit SHA of the adopted Foundation release. The reusable workflow remains immutable from the consumer's point of view.

The repository-owned `git.deploymentEnabled` policy for the default Vercel profile is:

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

The slash-safe `**` catch-all suppresses ordinary branches such as `feature/foo`, `fix/bar`, and `chore/baz`. Only Production `main` and trusted synthetic `preview/**` refs are explicitly re-enabled.

## Request authorization

The request path accepts only an exact `/preview` comment on an open pull request when all of the following are true:

- the PR targets `main` in the same repository;
- the PR head repository is the same repository, not a fork;
- the comment author currently has repository permission `write`, `maintain`, or `admin`.

The workflow definition is loaded from the repository default-branch context for `issue_comment`. The request job is read-only.

## Exact-source quality gate

The request resolves the current PR HEAD as source A. The reusable `web-ci.yml` receives A through `checkout_ref` and validates that exact source with an unprivileged token.

The publisher runs only after that exact-A validation succeeds. Before any ref mutation it re-fetches the PR and requires the current PR HEAD still to equal A. If the PR changed, the request fails and the reviewer must comment `/preview` again.

Do not treat ordinary pull-request merge-commit CI as equivalent proof for A. The hosted Preview contract deliberately binds publication to the exact source revision whose tree will be deployed.

## Synthetic deployment commit

The trusted publisher creates synthetic commit B only after A passed the quality gate.

B must satisfy all of these invariants:

```text
parent(B) = A
 tree(B) = tree(A)
 diff(A,B) = empty
```

Its commit message records both the originating PR number and A. The write-enabled publisher checks out trusted `main` automation only and fetches A as a Git object; it never executes PR code with its write token.

The synthetic-commit exception is limited to non-Production hosted review. Production and versioned Release publication continue to use their real validated source SHA contracts; do not synthesize commits to satisfy Production or Release gating.

## Serialization, reuse, and stale events

The per-PR Preview mutation path is serialized. Ref changes use compare-and-swap semantics with `--force-with-lease`, so an older operation cannot silently overwrite a newer Preview source.

When `preview/pr-N` already points to a valid synthetic commit whose parent/tree/provenance still correspond to the current source A, a repeated `/preview` request reuses that source instead of creating another deployment commit.

Vercel's `vercel.deployment.success` `repository_dispatch` is not trusted by event name alone. Before returning a URL, the workflow validates at least:

- Preview environment;
- expected Vercel project name;
- `preview/pr-N` ref shape;
- event synthetic SHA B equals the current Preview ref;
- the originating PR is still open, same-repository, and targeting `main`;
- parent(B) equals the PR's current HEAD A;
- tree(B) equals tree(A);
- B retains the expected provenance markers;
- `client_payload.url` is a generated `*.vercel.app` Preview application URL.

This prevents an old completion event from being reported as the current Preview after the PR has moved on.

## Real Preview URL feedback

The Vercel commit-status target is a Vercel dashboard URL, not the application Preview URL. The proven Git Integration event includes the real application URL in `client_payload.url`; the workflow validates that field and posts it to the originating PR.

No `VERCEL_TOKEN`, Deploy Hook, or direct Vercel deployment API credential is required by the default profile.

By default the workflow expects the Vercel project name to equal the GitHub repository name. When it differs, set repository variable `VERCEL_PROJECT_NAME` to the exact Vercel project name so success events can be bound to the intended project.

## Cleanup

Closing a same-repository PR removes only its `preview/pr-N` branch. Cleanup validates the Foundation ownership marker on the current synthetic commit and uses `--force-with-lease`; it does not execute PR code and it will not blindly delete a ref that no longer looks Foundation-owned.

## Preview security boundary

Preview executes PR code in Vercel. Treat Preview configuration as an explicit trust boundary even though GitHub publication is trusted.

- Do not expose Production credentials, Production write tokens, or privileged Production state to Preview code.
- Scope Preview environment variables to the minimum required review capability.
- Browser-prefixed values such as `VITE_*` are public client configuration, not secrets.
- If a provider issues Preview OIDC identities or tokens, scope claims and downstream permissions so a PR Preview cannot impersonate Production.
- Do not assume same-repository PR authorship makes application code safe for Production credentials.

## Provider-side adoption gate

Repository configuration is necessary but runtime behavior is the acceptance evidence.

1. Confirm Vercel Production Branch Tracking resolves `main` to Production.
2. Keep Preview Branch Tracking/provider Preview settings able to build the trusted `preview/**` refs created by Git Integration.
3. Run a post-adoption smoke after the corrected repository policy and workflow are already on `main`:
   - push a disposable ordinary slash-containing branch and confirm no Vercel deployment/status is created;
   - open a same-repository PR, request `/preview`, and confirm the exact-A gate succeeds, Vercel builds `preview/pr-N`, and the real application URL is returned to the PR;
   - push/merge to `main` and confirm Production deploys normally.
4. Record any project-specific Vercel setting or project-name override in the consumer's Foundation/deployment provenance.

Do not declare adoption complete from static configuration alone.

## Proven consumer evidence

`auth-flow-lab` proved the complete transport before Foundation adoption: ordinary slash-containing PR branches were suppressed; merely moving an already-seen exact PR HEAD did not produce the desired new Preview in that project; a fresh synthetic B with `parent(B)=A`, `tree(B)=tree(A)`, and empty diff did; Vercel emitted `vercel.deployment.success` with project/ref/SHA/URL metadata; and GitHub Actions successfully returned the real `client_payload.url` to the originating PR without a Vercel API token.

## References

- `docs/vercel.md`
- `docs/vercel-fixed-staging.md`
- Vercel Git configuration: https://vercel.com/docs/project-configuration/git-configuration
- GitHub Actions `issue_comment`: https://docs.github.com/actions/reference/workflows-and-actions/events-that-trigger-workflows#issue_comment
- GitHub Actions `repository_dispatch`: https://docs.github.com/actions/reference/workflows-and-actions/events-that-trigger-workflows#repository_dispatch
- Git `--force-with-lease`: https://git-scm.com/docs/git-push


---

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

- `kits/vercel/fixed-staging/request-staging.yml` -> `.github/workflows/request-staging.yml`
- `kits/vercel/fixed-staging/deploy-staging.yml` -> `.github/workflows/deploy-staging.yml`
- `kits/vercel/fixed-staging/cleanup-staging.yml` -> `.github/workflows/cleanup-staging.yml`
- `kits/vercel/fixed-staging/staging-slot.mjs` -> `scripts/staging-slot.mjs`

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
