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

- `templates/vercel/on-demand-preview/preview.yml` -> `.github/workflows/preview.yml`
- `templates/vercel/on-demand-preview/on-demand-preview.mjs` -> `scripts/on-demand-preview.mjs`
- `templates/vercel/vercel-git.json` -> `vercel.json`, or `templates/vercel/vite-spa-vercel.json` for a client-side routed Vite SPA.

Replace `<FULL_FOUNDATION_COMMIT_SHA>` in the copied workflow with the reviewed full commit SHA of the adopted Foundation release. The reusable workflow remains immutable from the consumer's point of view.

The default Vercel branch policy is:

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
2. Keep the Preview environment able to build the trusted `preview/**` refs created by Git Integration.
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
