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

Copy `templates/vercel/vercel-git.json`, or `templates/vercel/vite-spa-vercel.json` for a client-side routed Vite SPA that also needs the fallback rewrite.

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

The normal GitHub pull-request workflow may validate a merge commit. Hosted review needs stronger source binding: the reusable `web-ci.yml` accepts an optional `checkout_ref`, and On-demand Preview passes the exact current PR HEAD A.

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
2. Confirm the Preview environment can build trusted `preview/**` refs through normal Git Integration.
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

A client-side routed Vite SPA may need a fallback for direct subpath navigation/reload. `templates/vercel/vite-spa-vercel.json` includes the default Git policy plus:

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
3. Add repository-owned configuration from `templates/vercel/vercel-git.json`, or the Vite SPA variant.
4. Copy the On-demand Preview workflow/helper from `templates/vercel/on-demand-preview/` and replace the Foundation workflow placeholder with the reviewed released full commit SHA.
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
