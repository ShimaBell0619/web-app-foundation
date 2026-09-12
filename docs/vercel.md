# Vercel Git-integrated hosting profile

Vercel Git Integration is the default application-owned hosting profile for new Web App Foundation consumers. It does not replace the reusable Foundation quality CI contract.

The default hosted topology is deliberately limited to two Git branches:

- `main` -> Production;
- `staging` -> the single fixed non-Production review slot.

Feature branches, fix branches, and ordinary PR head branches do **not** create Vercel deployments by default. GitHub Actions remains the normal PR quality/review surface; Fixed Staging is used only when a hosted browser origin is materially needed.

## Repository-owned deployment policy

Every Vercel consumer should keep the branch deployment policy in repository-owned `vercel.json` configuration rather than relying only on mutable dashboard state.

Use:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "git": {
    "deploymentEnabled": {
      "**": false,
      "main": true,
      "staging": true
    }
  }
}
```

Copy `templates/vercel/vercel-git.json` for an application that does not otherwise need Vercel routing configuration. A client-side routed Vite SPA should instead use `templates/vercel/vite-spa-vercel.json`, which carries the same Git deployment policy plus the SPA fallback rewrite.

Vercel documents that `git.deploymentEnabled` branch rules use minimatch patterns. Three details matter for this profile:

- branches not matched by `git.deploymentEnabled` default to deployment enabled;
- minimatch `*` does not span `/`, so it is **not** a safe catch-all for slash-containing branch names such as `feature/foo`, `fix/bar`, or `chore/issue-77-vercel-globstar`;
- globstar `**` covers slash-containing branch names, while the explicit `main: true` and `staging: true` rules keep those two branches deployable because Vercel deploys when any matching rule is `true`.

The v0.9.0/v0.9.1 profile incorrectly used `"*": false`. That allowed slash-containing branches to miss the disable rule and fall back to Vercel's default deployment-enabled behavior. The required catch-all is therefore `"**": false`.

Do not replace this with an Ignored Build Step merely to suppress feature/PR builds. The intended contract is that those branches do not start a Vercel Git deployment at all.

## Provider-side adoption gate

Repository configuration is necessary but runtime behavior is still the final adoption evidence. Vercel Project settings must also support the intended two-surface model:

1. In Vercel Project Settings -> Environments, confirm Production Branch Tracking resolves `main` to Production.
2. Keep Preview Branch Tracking enabled so the `staging` branch can be deployed through normal Git Integration.
3. Perform a **post-adoption smoke** after the corrected repository policy is already on `main`:
   - push a disposable ordinary slash-containing feature branch and verify Vercel creates no deployment/status for that push;
   - move/push `staging` and verify Vercel creates the intended hosted review deployment;
   - push/merge to `main` and verify Vercel creates the Production deployment.
4. Record any provider-specific setting needed for the project in the consumer's deployment/Foundation provenance document.

`auth-flow-lab` proved that its Preview Branch Tracking was already enabled and Production tracked `main`; the failed suppression was caused by the single-star catch-all, not by disabled Branch Tracking. If an ordinary feature branch still produces a Vercel deployment with the corrected `**` policy, the migration remains incomplete and provider state should be investigated from fresh evidence rather than assuming the prior Branch Tracking hypothesis.

## Responsibility split

```text
feature/* or PR head
      |
      +--> Foundation reusable CI / app-owned rendered review
      |
      +--> no Vercel deployment

explicit hosted review request
      |
      +--> trusted Fixed Staging publisher
      |
      +--> staging ref = selected PR HEAD
      |
      +--> Vercel Git integration --> Fixed Staging

merge to main
      |
      +--> Vercel Git integration --> Production deployment
      |
      +--> main CI                --> post-merge evidence for the Production SHA
```

Foundation CI owns static checks, typecheck, tests, build, and optional E2E. Application-owned rendered-review automation may provide screenshots/artifacts for normal PR review without consuming a hosted deployment. Vercel owns only the `staging` and Production deployment lifecycles in the default profile.

Do not add a second custom Vercel deployment workflow merely to duplicate behavior already provided by the Git integration.

## Quality-gate tradeoff

Native Vercel Git integration can begin a Production deployment as soon as the `main` commit exists. It does not inherently wait for a separate post-merge Foundation CI run for that exact commit.

Applications using this convenience-first profile should:

- require/observe the normal PR quality gate before merge;
- use CI/rendered-review evidence for ordinary PR review rather than creating hosted Preview deployments for every push;
- use Fixed Staging when browser-hosted or exact-origin verification is required;
- run Foundation CI on the merged Production SHA as well;
- verify the resulting Production deployment/status after merge;
- record this hosting-native sequencing as an application-specific deployment choice.

If a product requires the stronger invariant "Production publish cannot start until CI has succeeded for that exact Production SHA", use a custom gated deployment/promotion path instead of the native Git-integrated Production trigger.

## Adoption

1. Import/connect the GitHub repository to Vercel.
2. Confirm the Production Branch is `main` unless the application deliberately documents another production branch.
3. Confirm Preview Branch Tracking is enabled for the Preview environment so `staging` can use normal Git Integration.
4. Add repository-owned `git.deploymentEnabled` configuration from `templates/vercel/vercel-git.json`, or use the Vite SPA template when its rewrite is required. The catch-all must be `"**": false`, not `"*": false`.
5. Keep the app-owned Foundation CI caller unchanged.
6. Create `staging` from current `main` and adopt the trusted Fixed Staging slot from `docs/vercel-fixed-staging.md`.
7. Map the stable Staging Branch Domain/custom domain to `staging`.
8. Configure Production values in Vercel Production scope and Staging values as branch-scoped Preview configuration for `staging`.
9. Configure the canonical Production custom domain under an owner-managed domain when available.
10. Run the post-adoption smoke: ordinary slash-containing feature branch = no Vercel deployment, `staging` = hosted review deployment, `main` = Production deployment.
11. Treat the profile as adopted only after all three observations match the contract.

## Environment-variable ownership

Vercel supports environment-scoped configuration. Keep values in the environment that consumes them:

- **Production** — live `main` deployment configuration;
- **Staging** — technically a Vercel Preview deployment for branch `staging`; scope only the values required for the fixed review slot to that branch;
- **Development** — local/team development when Vercel-managed development variables are useful.

Do not configure sensitive Staging values broadly for arbitrary Preview branches. Other branches should not deploy under the default `git.deploymentEnabled` policy, but branch-scoped configuration still makes the trust boundary explicit.

Browser-prefixed values such as Vite `VITE_*` variables are build-time public client configuration. They are not secrets merely because they are configured as environment variables.

A configuration change normally requires a new deployment before the built application sees the new value.

## Vite SPA fallback

A client-side routed Vite SPA may need a fallback for direct subpath navigation/reload. Use:

`templates/vercel/vite-spa-vercel.json`

Copy it to repository root as `vercel.json`. It includes both the standard `main` / `staging` deployment policy and the SPA fallback.

Do not copy the fallback into applications with real server/API routes or framework-native routing without reviewing its effect, because a catch-all rewrite can mask routes that should be handled elsewhere.

## Fixed Staging as the hosted review surface

`docs/vercel-fixed-staging.md` is the default non-Production hosted-review companion for Vercel consumers.

The `staging` branch is not release history and is not a shared integration branch. It is a single mutable slot whose ref is moved to an explicitly selected same-repository PR HEAD through the trusted Foundation workflow. The selected SHA is then deployed by normal Vercel Git Integration to the fixed Staging domain.

This arrangement gives OAuth, webhook, origin-allowlist, mobile review, and other hosted checks one stable origin without creating a new Vercel deployment for every feature-branch push.

## Custom-domain convention

For applications managed under one owner-controlled domain, use this convention when practical:

- Production: `<app>.<domain>`
- Fixed Staging: `staging.<app>.<domain>`

The concrete domain remains owner/application configuration. Record the canonical Production and Fixed Staging URLs in the consuming application's README/deployment documentation and revalidate them after DNS/domain changes.

Vercel/DNS/OAuth allowlists remain external setup. The Foundation Fixed Staging profile owns the repository-side deployment policy and trusted Staging ref-selection contract; provider/domain configuration remains application-owned and the post-adoption smoke remains required evidence.

## Proven consumer evidence

`ms-credentials-tracker` proved the stable Staging branch-domain model with exact-origin Google OAuth and explicit `staging = PR HEAD` promotion.

`auth-flow-lab` first demonstrated why the slot should replace automatic feature/PR Preview deployment: repeated UI-review pushes exhausted the Vercel Hobby deployment quota even though GitHub Actions already supplied quality and rendered-review evidence. During adoption it then exposed the wildcard defect: Preview Branch Tracking was enabled and Production tracked `main`, but the v0.9.0/v0.9.1 `"*": false` rule did not suppress slash-containing branches such as `chore/...`. That consumer evidence is why the profile now requires the slash-safe `"**": false` globstar and a three-path post-adoption smoke.

## References

- Vercel: Git configuration / `git.deploymentEnabled`
  - https://vercel.com/docs/project-configuration/git-configuration
- Vercel: Git Integration
  - https://vercel.com/kb/git-integration
- Vercel: Environments
  - https://vercel.com/kb/environments
- minimatch globstar behavior
  - https://github.com/isaacs/minimatch
- `docs/vercel-fixed-staging.md`
