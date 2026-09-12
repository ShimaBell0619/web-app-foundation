# Adopting Web App Foundation

## Bootstrap

For a new application:

1. Start from real product requirements rather than copying a full framework stack blindly.
2. Copy `PRODUCT.base.md` to `PRODUCT.md` and replace template text with the approved product contract.
3. Copy `DESIGN.base.md` to `DESIGN.md`, preserve the Google DESIGN.md alpha structure, and add application-specific tokens/rationale. For a new React-oriented browser-first UI, adopt the default primitive-first profile in `docs/ui-implementation.md`; for material UI work, use `docs/ui-review.md` to validate the rendered result against that product-specific direction.
4. Copy/adapt the relevant `AGENTS.md` rules. Add app-specific constraints rather than depending on chat memory, and maintain the repository's Context Routing for normative specialist documents as described in `docs/ai-implementation.md`.
5. Add specialist documents only when needed, commonly `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/RELEASE.md`, or `docs/COMPATIBILITY.md`. When such a document becomes normative for implementation decisions, register it in Context Routing in the same change.
6. Use a committed Node version file and package-manager lockfile.
7. Define the default npm scripts `check`, `typecheck`, `test`, and `build`; document any justified opt-out instead of omitting a script silently.
8. Add an app-owned CI caller that references the reusable Foundation workflow by a reviewed full commit SHA.
9. Record Foundation provenance before feature work begins.
10. Use Vercel Git Integration as the default hosting/deployment path for new consumers, but restrict automatic Git deployment to `main` and `staging` with repository-owned `git.deploymentEnabled` configuration. Use Fixed Staging as the single hosted non-Production review slot rather than creating per-PR/feature deployments. Provider-side Preview/Branch Tracking state and a real post-adoption smoke are required evidence that the project actually honors this policy. Document a different hosting choice only when product or platform requirements justify it.
11. If the application will publish versioned GitHub Releases, adopt `docs/application-releases.md` and copy `templates/release/release.yml` before the first milestone that requires release evidence.
12. If GitHub Actions must operate Azure resources, use `docs/azure-oidc.md` to define the Microsoft Entra FIC and Azure RBAC trust boundaries before adding deployment/destructive workflows.

## Provenance

An application should keep a small provenance record, for example in `docs/FOUNDATION.md`:

```markdown
# Foundation provenance

- Adopted Foundation version: 0.1.0
- Copied-rule/template commit: <full commit SHA>
- Reusable workflow commit: <full commit SHA>
- Adopted on: YYYY-MM-DD
- App-specific deviations:
  - <none or explicit deviations>
```

Copied rules/templates do not change automatically. Reusable workflows execute the exact commit SHA referenced by the app. Upgrade both deliberately, and read the current provenance before changing Foundation-derived rules or workflow refs.

## Context-routed Chat implementation

Consumers that use Chat-based implementation should adopt the context-routing contract from `AGENTS.md` and the detailed method in `docs/ai-implementation.md`.

Keep the routing index small and repository-specific. A typical consumer starts with the base route (`PRODUCT.md`, `AGENTS.md`, Issue/Acceptance Criteria, and Foundation provenance when present) and registers only specialist documents that actually exist and are normative for implementation. Typical mappings are:

```markdown
## Context routing

| Change area | Required context |
| --- | --- |
| Product design / UX | DESIGN.md |
| UI infrastructure | DESIGN.md, adopted UI implementation/review guidance |
| Domain / data | docs/DOMAIN.md, docs/ARCHITECTURE.md |
| Integration / trust | integration-specific contract, docs/ARCHITECTURE.md, security contract when present |
| Delivery / operations | affected deployment/release/staging contract |
| Foundation adoption | docs/FOUNDATION.md, target Foundation guidance/change notes |
```

Do not create empty documents merely to match this example. Adapt the table to actual repository paths. Matching routes are additive, so a staging OAuth change can require both integration/trust and delivery/operations context.

When a normative specialist document is introduced, renamed, split, or retired, update Context Routing in the same change if future agents need it to find that contract. Issue authors should point to unusual Issue-specific constraints but should not copy full design/architecture contracts into every Issue.

For each material Issue, the implementation agent builds a session-local Repository Context Packet, extracts Design Intent, and maps contract/Acceptance Criteria -> implementation surface -> validation evidence before implementation. Do not commit that packet as a permanent context artifact. Repository contracts at the recorded revision remain authoritative.

Adoption does not require rewriting stable code merely to conform to a newer Foundation default. Use the new method on the next objective-driven material change and migrate implementation mechanisms only when the change has a concrete benefit.

The same profile includes an explicit complexity discipline: speculative abstractions, dependencies, layers, workflows, configuration formats, and permanent process artifacts are not acceptable future-proofing. Add complexity only when a current requirement, real responsibility/trust/lifecycle boundary, observed repetition, measured evidence, or already-adopted Foundation contract justifies it.

## Minimum npm contract

A typical TypeScript app starts with scripts shaped like:

```json
{
  "scripts": {
    "check": "<lint/format/static check in non-watch mode>",
    "typecheck": "<type checker in non-watch mode>",
    "test": "<unit/component tests that exit>",
    "build": "<production build>"
  }
}
```

Do not use empty `echo`, `true`, or equivalent no-op scripts merely to satisfy CI. If a gate is genuinely inapplicable, opt out explicitly in the workflow caller and record why.

## Reusable CI caller

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  verify:
    uses: ShimaBell0619/web-app-foundation/.github/workflows/web-ci.yml@<FULL_FOUNDATION_COMMIT_SHA>
    with:
      node_version_file: .node-version
      cache_dependency_path: package-lock.json
```

Example for a JavaScript-only app with no separate type checker:

```yaml
    with:
      run_typecheck: false
      typecheck_opt_out_reason: JavaScript-only application; no TypeScript typecheck contract.
```

`build` has no opt-out. The reusable workflow sets `CI=true` so test/check scripts should be one-shot commands rather than watch mode.

## E2E contract

`run_e2e: true` requires a `test:e2e` script. That script must terminate and own the runtime lifecycle it needs: browser availability/setup, application/server startup and readiness, test execution, and cleanup. If those responsibilities require provider-specific or privileged setup, prefer an app-owned E2E job and keep the shared workflow focused on unprivileged quality validation.

## Rendered UI review

For material user-facing changes, use `docs/ui-review.md` as the review method after the normal quality gate. It defines the product-specific design-direction check, render → critique → fix → re-render loop, 1440px / 390px / 320px baseline, overflow/focus/status review, and Japanese/CJK rendering notes.

The guide is intentionally style-neutral: consumers keep their own visual direction and product-specific assertions in `DESIGN.md` and application tests.

## Default React UI implementation profile

For a new React-oriented browser-first consumer, use `docs/ui-implementation.md` as the default implementation layer beneath the product-specific `DESIGN.md`:

- Tailwind CSS provides styling infrastructure and semantic token wiring;
- shadcn/ui-style accessible primitives provide common interaction controls without forcing page composition;
- a generic primitive layer stays free of product-domain meaning;
- product-specific semantic components own hierarchy, domain state, actions, and data presentation;
- specialist custom CSS remains valid for justified product-specific visualizations/interactions;
- rendered review evaluates primitive quality and composition quality separately.

Do not force-migrate an existing consumer only for conformity. Non-React consumers or applications with an established accessible design system may use an equivalent mature primitive approach and record the deviation in `DESIGN.md`, `AGENTS.md`, or Foundation provenance as appropriate.

## Selective independent code review

Consumers should inherit the `AGENTS.md` distinction between mandatory self-review and risk-based independent review. Do not treat a second pass by the implementation agent as independent evidence.

When a consumer uses Codex GitHub Code Review as the independent reviewer:

- make Code Review available for the repository but keep **Automatic Review / Review my pull requests OFF**;
- normally wait until implementation, tests, self-review, and relevant CI have produced the intended merge-candidate HEAD;
- before each `@codex review` invocation, including re-review, present the user/maintainer with the concrete review rationale, affected risk category, and expected value, and obtain explicit approval;
- only after that approval, request review manually with `@codex review` from the PR conversation;
- allow low-risk changes to skip the independent review with a recorded reason rather than making Codex a universal required check;
- reassess Codex findings against the Issue, contracts, diff, tests, and CI rather than accepting them mechanically;
- consider re-review after Blocker/High corrections or material security, compatibility, CI/CD, deployment, or implementation-path changes, not after every minor edit; a new Codex invocation requires fresh approval.

The consumer's `AGENTS.md` should keep the high-impact reviewer focus from the Foundation: requirement mismatch, regressions, failure paths, security/auth boundaries, concurrency/races, compatibility, destructive/data-integrity risk, CI/CD gate bypass, deployment/rollback risk, and operational failure modes. Style/lint noise belongs primarily to deterministic tooling.

`docs/independent-review.md` is the Foundation operating reference. Consumers do not need a new workflow merely to use this method, and the Foundation does not require a Codex status check on every PR.

## Default Vercel Git integration

For new consumers, use a **two-surface Vercel model**:

- `main` -> Production;
- `staging` -> Fixed Staging hosted review;
- every other branch -> no Vercel Git deployment.

Repository configuration is part of the contract. Copy `templates/vercel/vercel-git.json` to `vercel.json`, unless the app is a client-side routed Vite SPA that needs the combined `templates/vercel/vite-spa-vercel.json` template. Both templates define:

```json
{
  "git": {
    "deploymentEnabled": {
      "*": false,
      "main": true,
      "staging": true
    }
  }
}
```

Vercel treats unspecified branches as deployment-enabled, so the wildcard disable is required. When multiple patterns match, any matching `true` rule allows deployment; that is why `main` and `staging` remain enabled despite `"*": false`.

The repository policy is not sufficient evidence by itself. During provider setup, inspect Vercel Project Settings -> Environments: Production Branch Tracking must identify the production branch, and the Preview environment's Branch Tracking must be configured so Git-integrated branch eligibility honors the repository policy. A real consumer and a Vercel Community reproduction both showed that the presence of a correct `vercel.json` alone does not guarantee ordinary branch suppression. Therefore complete adoption only after a post-adoption smoke proves the effective behavior.

Adopt the hosting profile as follows:

- connect/import the repository in Vercel;
- keep the Foundation CI caller as the quality gate;
- keep normal feature/PR review in GitHub Actions and rendered-review artifacts rather than Vercel deployments;
- inspect Preview Environment Branch Tracking and configure the provider project so repository deployment rules are honored;
- create `staging` from `main` and adopt the trusted Fixed Staging publisher/cleanup profile below;
- use an owner-managed stable Production domain when available, normally `<app>.<domain>`;
- use `staging.<app>.<domain>` for the fixed hosted review slot;
- let Vercel own `staging` and the configured Production Branch deployment;
- keep Production configuration in Production scope and scope Staging Preview configuration specifically to branch `staging`;
- document third-party identity limitations and exact-origin requirements separately from deployment success;
- run a post-adoption smoke after the policy is on `main`: ordinary feature branch -> no Vercel deployment, `staging` -> hosted review deployment, `main` -> Production deployment.

If an ordinary feature branch still creates a Vercel deployment, the profile is not adopted yet. Correct the provider-side environment/branch-tracking state and repeat the smoke instead of adding a parallel deployment mechanism.

Native Git integration may begin Production deployment before post-merge CI for the exact Production SHA completes. `docs/vercel.md` documents this convenience/strict-gating tradeoff and the alternative when exact post-CI publish ordering is required.

### Fixed Staging slot

Fixed Staging is the default hosted non-Production review path for Vercel consumers; it is still used explicitly only when a hosted browser surface is required.

Copy all four app-owned files:

- `templates/vercel/fixed-staging/request-staging.yml` -> `.github/workflows/request-staging.yml`;
- `templates/vercel/fixed-staging/deploy-staging.yml` -> `.github/workflows/deploy-staging.yml`;
- `templates/vercel/fixed-staging/cleanup-staging.yml` -> `.github/workflows/cleanup-staging.yml`;
- `templates/vercel/fixed-staging/staging-slot.mjs` -> `scripts/staging-slot.mjs`.

Create `staging` from `main`, add `FIXED_STAGING_URL`, then merge the bootstrap workflows and `git.deploymentEnabled` policy to `main` before using the steady-state path. The manual workflow is read-only; its short-lived request artifact is consumed by a write-enabled `workflow_run` publisher that executes from the trusted default-branch context and independently validates the selected PR.

Map the Vercel Branch Domain to `staging`, scope only the required Preview configuration to that branch, and register the exact fixed origin with the external provider when needed. The selected PR code later executes in that Vercel environment, so Staging configuration is a separate trust boundary from the GitHub publisher.

The slot points directly at the selected same-repository PR HEAD and uses compare-and-swap cleanup. Do not merge feature branches into `staging` or treat it as release history.

## Optional application GitHub Release flow

A versioned product milestone is explicit release intent, not a side effect of merging ordinary work.

For npm-based apps using root `package.json` as the version source, `templates/release/release.yml` provides a copyable app-owned pattern that publishes only after successful `main` CI and binds the tag/release to `workflow_run.head_sha`.

Before reporting a requested release complete, verify the application version, immutable `vX.Y.Z` tag, published GitHub Release, and Production status when applicable. See `docs/application-releases.md`.

## Optional GitHub Actions to Azure OIDC

When an application needs Azure create/update/delete validation through GitHub Actions:

- keep client/tenant/subscription IDs as GitHub Variables rather than client-secret credentials;
- grant `id-token: write` only to jobs that need OIDC;
- pin `Azure/login` to a reviewed full commit SHA;
- treat Microsoft Entra FIC trust and Azure RBAC as separate boundaries;
- use real workflow claims to validate the FIC rather than assuming a historical name-based subject shape.

For convenience-first personal repository fleets, `docs/azure-oidc.md` documents the owner-wide Flexible FIC pattern that was proven with `ms-credentials-tracker`.

## Deployment safety boundary

Vercel Git Integration is the Foundation default hosting profile. Consumers with a justified alternative should still preserve these provider-independent rules:

- keep required quality CI and deployment status independently visible;
- do not treat a hosting/deployment check as a substitute for application tests;
- bind privileged release/promotion operations to a known validated source revision when the provider/workflow supports it;
- document any hosting-native sequence that starts Production deployment before exact-SHA post-merge CI completes;
- separate unprivileged build/test work from privileged credentials;
- never execute untrusted PR code in a privileged publish/release context;
- do not place secrets or privileged state in caches; privileged jobs should avoid caches unless a reviewed design proves they are safe and necessary.

## Upgrading Foundation

1. Review `CHANGELOG.md` and the diff between the adopted and target Foundation commits.
2. Identify changes to copied documents/templates separately from reusable workflows.
3. Preserve app-specific deviations unless an approved change supersedes them.
4. Update copied rules/templates only where they remain appropriate for the app.
5. Update the reusable-workflow SHA after review.
6. Update the provenance record.
7. Run the application's full validation before merging.
