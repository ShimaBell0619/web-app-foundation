# Vercel Git-integrated hosting profile

Vercel is an optional application-owned hosting profile. It does not replace the reusable Foundation quality CI contract.

Use this profile when the application benefits from native Git integration, automatic Preview deployments, and a Production deployment from the configured production branch without maintaining a custom deployment GitHub Action.

## Responsibility split

```text
Pull Request / branch
      |
      +--> Foundation reusable CI --> quality evidence
      |
      +--> Vercel Git integration --> Preview deployment

merge to production branch
      |
      +--> Vercel Git integration --> Production deployment
      |
      +--> main CI                --> post-merge evidence for the production SHA
```

Foundation CI owns static checks, typecheck, tests, build, and optional E2E. Vercel owns hosting and Preview/Production deployment lifecycle.

Do not add a second custom Vercel deployment workflow merely to duplicate behavior already provided by the Git integration.

## Quality-gate tradeoff

Native Vercel Git integration can begin a Production deployment as soon as the production-branch commit exists. It does not inherently wait for a separate post-merge Foundation CI run for that exact commit.

Therefore applications using this convenience-first profile should:

- require/observe the normal PR quality gate before merge;
- treat the Vercel Preview as review evidence, not as a replacement for CI;
- run Foundation CI on the merged production SHA as well;
- verify the resulting Production deployment/status after merge;
- record this hosting-native sequencing as an application-specific deployment choice.

If a product requires the stronger invariant "Production publish cannot start until CI has succeeded for that exact production SHA", use a custom gated deployment/promotion path instead of the native Git-integrated Production trigger.

## Adoption

1. Import/connect the GitHub repository to Vercel.
2. Confirm the Production Branch is the intended application production branch, normally `main`.
3. Keep the app-owned Foundation CI caller unchanged.
4. Configure Production and Preview environment variables in Vercel rather than moving hosting build configuration into GitHub Actions unnecessarily.
5. Add repository configuration only when framework/platform defaults are insufficient.
6. Verify one PR Preview and one Production deployment before treating the profile as adopted.

## Environment-variable ownership

Vercel supports environment-scoped configuration. Keep values in the environment that consumes them:

- **Production** — live deployment configuration;
- **Preview** — branch/PR Preview configuration;
- **Development** — local/team development when Vercel-managed development variables are useful.

Browser-prefixed values such as Vite `VITE_*` variables are build-time public client configuration. They are not secrets merely because they are configured as environment variables.

A configuration change normally requires a new deployment before the built application sees the new value.

## Vite SPA fallback

A client-side routed Vite SPA may need a fallback for direct subpath navigation/reload. Use the template only when the application is actually an SPA requiring `index.html` fallback:

`templates/vercel/vite-spa-vercel.json`

Copy it to repository root as `vercel.json`.

Do not copy this fallback into applications with real server/API routes or framework-native routing without reviewing its effect, because a catch-all rewrite can mask routes that should be handled elsewhere.

## Preview deployments and third-party OAuth

A Vercel Preview URL does not guarantee that every external integration works in Preview.

For example, Google OAuth Authorized JavaScript origins require exact origins and do not support a wildcard that automatically authorizes every ephemeral `*.vercel.app` Preview URL. An application may therefore have a working Preview UI while OAuth-dependent behavior remains unavailable unless that exact Preview origin is separately authorized.

Document this distinction rather than treating "Preview deployment succeeded" as proof that all external identity integrations are functional.

## Custom domains

Custom-domain ownership is application/provider configuration, not a Foundation contract. Record the canonical Production URL in the consuming application's README/deployment documentation and test it after DNS/domain changes.

## Proven consumer evidence

`ms-credentials-tracker` migrated from GitHub Pages to Vercel while retaining the reusable Foundation CI quality gate. It used:

- Git-connected PR Preview deployments;
- `main` Production deployment;
- a custom Production domain;
- Vercel-owned `VITE_GOOGLE_CLIENT_ID` build configuration;
- a minimal SPA rewrite;
- exact-origin Google OAuth configuration for the Production domain.

This consumer evidence is the basis for this optional profile; GitHub Pages remains a separate supported optional capability.

## References

- Vercel: Git Integration
  - https://vercel.com/kb/git-integration
- Vercel: Environments
  - https://vercel.com/kb/environments
