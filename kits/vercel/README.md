# Vercel integration kit

This kit provides an optional Git-integrated hosting profile. **Only `main` may publish Production**. Feature branches do not deploy automatically. Preview code is untrusted and must not receive Production secrets or broad provider privileges.

## Files and installation

| File | Purpose |
| --- | --- |
| [`vercel.json`](vercel.json) | `git.deploymentEnabled`: disable ordinary branches, allow `main` and `preview/**` |
| [`vite-spa.json`](vite-spa.json) | Same branch policy plus SPA fallback; do not use for server/API routes |
| [`on-demand-preview/preview.yml`](on-demand-preview/preview.yml) | Explicit `/preview` requests, exact-HEAD CI, publishing, Vercel notification, cleanup |
| [`on-demand-preview/on-demand-preview.mjs`](on-demand-preview/on-demand-preview.mjs) | Preview's trusted request/publish/notify logic |
| [`fixed-staging/request-staging.yml`](fixed-staging/request-staging.yml) | Optional fixed slot request on main |
| [`fixed-staging/deploy-staging.yml`](fixed-staging/deploy-staging.yml) | Optional exact-SHA validation and fixed-slot ref update |
| [`fixed-staging/cleanup-staging.yml`](fixed-staging/cleanup-staging.yml) | Optional PR-close slot reset |
| [`fixed-staging/staging-slot.mjs`](fixed-staging/staging-slot.mjs) | Fixed-slot validation, compare-and-swap and cleanup |
| [`shared/provenance.mjs`](shared/provenance.mjs) | Shared exact/unique commit ownership and source markers |

Copy the **selected mode plus `shared/provenance.mjs`** into an app-controlled repository, preserve their relative imports, and update helper paths in its Workflow. The app remains responsible for its Vercel Git Integration configuration, exact project name, deployment variables, and the required full 40-character Foundation reusable-CI commit SHA.

## Normal hosted review

1. The PR is open, belongs to the same repository and targets `main`. A repository writer comments exactly `/preview`.
2. A read-only job resolves **PR HEAD A**, and reusable Web CI validates **that exact A** without inheriting publishing credentials.
3. A separately permissioned job revalidates A, creates B with `parent(B)=A` and `tree(B)=tree(A)`, and updates only `preview/pr-N` under a Git SHA lease.
4. Vercel Git Integration deploys the trusted Preview branch; only a correlated `vercel.deployment.success` event for the matching project/ref/B/current A permits the real application URL to be returned.
5. On PR close, the owner-checked synthetic Preview branch is removed with a SHA lease. Stale notifications cannot authorize another ref.

Preview is not a substitute for production data/credential controls or real browser checks.

## Optional fixed Staging

Use only when a stable non-Production origin is necessary (for example an exact-origin OAuth test). Enable the protected `staging` branch in the Vercel policy and bind the stable hostname explicitly.

- `request-staging.yml` accepts a PR number through `workflow_dispatch` **from main only**. Its short-lived artifact is tied to that run and exact repository.
- The read-only resolver checks the PR and source SHA; an unprivileged reusable-CI job checks exact A.
- The publisher, running trusted main automation, revalidates A and the request, creates a content-identical synthetic child B, and moves the single `staging` ref under `--force-with-lease` with serialized requests.
- On PR closure, cleanup resets only if the current Staging ownership trailer names that exact PR; a newer slot owner is preserved.

**Publication stages must not be conflated**: (1) ref/SHA verified, (2) provider deployment confirmed, (3) stable origin HTTP check, (4) real browser/UI verification. The existing Fixed Staging publisher verifies **only stage 1** and must not call a slot “ready”. Do not treat the URL as a deployed/visually reviewed environment without later evidence.

## Minimal rollout checks

- Repository branch rules suppress disposable `feature/**` branches and permit only `main`, `preview/**`, and optional `staging`.
- `/preview` yields a Vercel deployment for the expected synthetic B and an actual application URL; closing PR removes only its own ref.
- Fixed Staging retains ownership under overlapping PRs and rejects PR #4 as owner of PR #42.
- Test a source-HEAD change between validation and publication, a failing CI job, and a stale Vercel completion; all must refuse privileged publication/notification.
- Verify provider project/branch configuration and real rendered screen separately. HTTP 200 is not a browser test.

## Operations and trust

Foundation-wide rules: [AGENTS.md](../../AGENTS.md). Chat tool selection, verification evidence and Work opt-in: [docs/operations.md](../../docs/operations.md). Tests live under [tests](../../tests). Keep privileged jobs on trusted `main` automation; **never run untrusted PR code with write tokens**. One-way CI success, Git ref movement, provider READY, actual HTTP response and screenshot/keyboard tests are distinct evidence.
