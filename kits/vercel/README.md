# Vercel Hosted Review kit

This is **one optional app-owned kit** for explicit `/preview` and `/staging` requests on open, same-repository PRs targeting `main`. It is not installed into existing consumers automatically. Ordinary branches must not auto-deploy. **Only main publishes Production.**

## Install into a new application

1. Copy `hosted-review/workflow.yml` into `.github/workflows/hosted-review.yml` and copy `hosted-review/hosted-review.mjs` plus `shared/provenance.mjs` retaining the paths used in the Workflow. Keep Foundation's own active Workflow count at two.
2. Choose `vercel.json` or `vite-spa.json`; merge its `git.deploymentEnabled` section into the app config. `main`, `preview/**` and `staging` are the only permitted deployment refs. Configure Git Integration branch tracking and verify undesired branches do not deploy. If a fixed slot is needed, initialize the `staging` branch from `main` and configure its stable hostname.
3. Set repository variable `VERCEL_PROJECT_ID` and secret `VERCEL_API_TOKEN` (read access to deployment records; scope narrowly). If in a Vercel team, also set `VERCEL_TEAM_ID`. Set `FIXED_STAGING_URL` (HTTPS origin, trailing slash) for fixed Staging. Configure the trusted Vercel success notification bridge to emit `repository_dispatch` type `vercel.deployment.success` with the deployment ID, project ID, environment, ref, exact Git SHA, deployment URL, and staging PR number. Do not commit tokens.
4. Review and replace the full 40-digit `web-ci.yml` pin with an approved Foundation SHA. The application's `npm ci/check/typecheck/test/build` pipeline must succeed on its exact PR HEAD. Confirm token permissions, branch protection/rulesets, Vercel account/project mapping and smoke tests before enabling this privileged Workflow.

**Do not activate this kit with an unprotected main branch.** Repository writers can influence main when it is unprotected; checking PR permission alone does not secure the privileged publisher.

## Operation and security boundary

- A repository writer comments exactly `/preview` or `/staging` on an open same-repository PR targeting `main`. The request job re-fetches the comment, writer permission, PR HEAD A and its Git SHA from GitHub API. Workflow outputs record A and request comment ID.
- A credential-free reusable Web CI validates exact **A**. Only after success may a separately permissioned trusted-main publisher create child **B**, with `parent(B)=A` and `tree(B)=tree(A)`, unique owner/source commit trailers and a Git ref SHA lease. A changed HEAD or closed PR aborts the write.
- Preview uses `preview/pr-N`; Staging uses the single `staging` ref. Staging rejects requests superseded by a later authorized `/staging` comment, serializes mutations and checks request-ID ownership. PR close removes only its Preview branch and resets Staging only when that exact PR still owns it, both with SHA leases.
- **Ref update is not deployment readiness.** The publish job reports only the ref state. A correlated notification is checked against the **Vercel API** using the configured token (project ID, deployment ID, READY state, deployment URL, ref and exact B), then against current GitHub PR/ref/source A/commit tree/owner. The notification is not itself trusted.
- The callback posts the Preview URL or fixed Staging URL and records a separate fixed-origin HTTP check. **An HTTP success is not proof of rendered browser UI.** Capture actual screen/browser evidence independently before accepting a UI milestone. Failed or stale notifications do not produce a success comment.

### Notification bridge shape

Required `client_payload` fields: `environment` (`preview` or `staging`), `project.id`, `state.type` (`success`), `git.ref`, `git.sha`, `id` (Vercel deployment ID), `url` (HTTPS Vercel deployment URL), and `prNumber` for Staging. Authentication and payload delivery of the Vercel-to-GitHub bridge are app-owned; a forged dispatch cannot prove READY because the helper independently queries Vercel. Do not share GitHub/Vercel credentials with a PR runner.

## Minimal acceptance checks

- Both commands authorized only for writers, PR HEAD changes fail closed, CI failure prevents publishing, and an older Staging request cannot overwrite a newer owner.
- Preview branches are per PR; Staging is one fixed branch. A closed older PR does not reset another owner. A repeated webhook does not post another notification.
- A forged provider success, wrong project, stale B, wrong ref/parent/tree, broken fixed URL and concurrent ref change each fail closed or are distinctly reported as HTTP unverified.
- Verify Vercel production/preview policy, deploy records, stable URL and browser rendering in the **adopting app**. This Foundation kit test alone cannot prove live Vercel access.

Other relevant rules: [AGENTS.md](../../AGENTS.md), [docs/operations.md](../../docs/operations.md) and [docs/adoption.md](../../docs/adoption.md).
