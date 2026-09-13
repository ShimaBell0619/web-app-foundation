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
10. Use Vercel Git Integration as the default hosting path for new consumers. Repository-owned `git.deploymentEnabled` must use `"**": false`, explicitly enable `main`, and enable only trusted `preview/**` synthetic refs for non-Production hosted review. Ordinary feature/fix/PR branches do not deploy.
11. Copy the On-demand Preview workflow/helper from `templates/vercel/on-demand-preview/`, replace its Foundation SHA placeholder with the reviewed release commit, and treat `/preview` as an explicit hosted-review request rather than a per-push deployment.
12. Confirm Vercel Production Branch Tracking resolves `main`, and confirm Preview Branch Tracking/provider Preview settings permit trusted `preview/**` Git Integration refs.
13. Complete a real post-adoption smoke before declaring the Vercel profile adopted.
14. Adopt optional Fixed Staging from `docs/vercel-fixed-staging.md` only when a stable non-Production origin is a real requirement. It is not part of the default hosted-review topology.
15. If the application will publish versioned GitHub Releases, adopt `docs/application-releases.md` and copy `templates/release/release.yml` before the first milestone that requires release evidence.
16. If GitHub Actions must operate Azure resources, use `docs/azure-oidc.md` to define the Microsoft Entra FIC and Azure RBAC trust boundaries before adding deployment/destructive workflows.

## Provenance

An application should keep a small provenance record, for example in `docs/FOUNDATION.md`:

```markdown
# Foundation provenance

- Adopted Foundation version: 0.10.0
- Copied-rule/template commit: <full commit SHA>
- Reusable workflow commit: <full commit SHA>
- Adopted on: YYYY-MM-DD
- App-specific deviations:
  - <none or explicit deviations>
```

Copied rules/templates do not change automatically. Reusable workflows execute the exact commit SHA referenced by the app. Upgrade both deliberately, and read current provenance before changing Foundation-derived rules or workflow refs.

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

Do not create empty documents merely to match this example. Matching routes are additive. When a normative specialist document is introduced, renamed, split, or retired, update Context Routing in the same change if future agents need it to find that contract.

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

The reusable workflow validates `github.sha` by default. Trusted deployment automation that must prove an exact source revision may pass the optional `checkout_ref` input; ordinary callers should leave it empty.

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

For material user-facing changes, use `docs/ui-review.md` as the review method after the normal quality gate. It defines the product-specific design-direction check, render -> critique -> fix -> re-render loop, 1440px / 390px / 320px baseline, overflow/focus/status review, and Japanese/CJK rendering notes.

The guide is intentionally style-neutral: consumers keep their own visual direction and product-specific assertions in `DESIGN.md` and application tests.

## Default React UI implementation profile

For a new React-oriented browser-first consumer, use `docs/ui-implementation.md` as the default implementation layer beneath the product-specific `DESIGN.md`:

- Tailwind CSS provides styling infrastructure and semantic token wiring;
- shadcn/ui-style accessible primitives provide common interaction controls without forcing page composition;
- a generic primitive layer stays free of product-domain meaning;
- product-specific semantic components own hierarchy, domain state, actions, and data presentation;
- specialist custom CSS remains valid for justified product-specific visualizations/interactions;
- rendered review evaluates primitive quality and composition quality separately.

Do not force-migrate an existing consumer only for conformity. Non-React consumers or applications with an established accessible design system may use an equivalent mature primitive approach and record the deviation as appropriate.

## Selective independent code review

Consumers inherit the `AGENTS.md` distinction between mandatory self-review and risk-based independent review. Do not treat a second pass by the implementation agent as independent evidence.

When Codex GitHub Code Review is used:

- keep Automatic Review / Review my pull requests OFF;
- wait until implementation, tests, self-review, and relevant CI produce the intended merge-candidate HEAD;
- before each `@codex review` invocation, including re-review, present the concrete review rationale, affected risk category, and expected value, then obtain explicit approval;
- every Codex invocation, including re-review, requires fresh approval; an earlier approval does not carry forward;
- only after that approval, request review manually from the PR conversation;
- allow low-risk changes to skip independent review with a recorded reason;
- reassess findings against Issue/contracts/diff/tests/CI rather than accepting them mechanically.

`docs/independent-review.md` is the Foundation operating reference.

## Default Vercel Git integration

For new consumers, use this default topology:

- `main` -> Production;
- `preview/pr-N` -> explicit On-demand Preview synthetic source;
- every ordinary feature/fix/PR branch -> no Vercel Git deployment;
- Fixed Staging -> optional only.

Copy `templates/vercel/vercel-git.json` to `vercel.json`, unless a client-side routed Vite SPA needs `templates/vercel/vite-spa-vercel.json`. Both default templates define:

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

Vercel evaluates branch rules with minimatch. `**` is required because plain `*` does not span `/`; common branch names such as `feature/foo` would otherwise fall through to Vercel's deployment-enabled default.

### On-demand Preview bootstrap

Copy:

- `templates/vercel/on-demand-preview/preview.yml` -> `.github/workflows/preview.yml`;
- `templates/vercel/on-demand-preview/on-demand-preview.mjs` -> `scripts/on-demand-preview.mjs`.

Replace `<FULL_FOUNDATION_COMMIT_SHA>` with the reviewed immutable Foundation release SHA.

The trusted flow resolves exact PR HEAD A, validates A with reusable Foundation CI, then creates content-identical synthetic B with `parent(B)=A` and `tree(B)=tree(A)`. Vercel builds `preview/pr-N`, and the success event's real `client_payload.url` is validated and returned to the PR.

No `VERCEL_TOKEN`, Deploy Hook, or direct Vercel deployment API credential is part of the default contract. If the Vercel project name differs from the repository name, set repository variable `VERCEL_PROJECT_NAME`.

Production credentials and broadly privileged provider identities must not be available to Preview PR code. See `docs/vercel-on-demand-preview.md` for the full trust and source-identity contract.

### Provider smoke

Complete adoption only after a real post-adoption smoke:

- ordinary slash-containing branch -> no Vercel deployment/status;
- eligible PR + `/preview` -> exact-A validation, trusted `preview/pr-N` deployment, real Preview URL returned;
- `main` -> Production deployment.

Static `vercel.json` inspection is not enough.

### Optional Fixed Staging

Use `docs/vercel-fixed-staging.md` only when a stable origin is required. Add `"staging": true` to the default `git.deploymentEnabled` map, create the branch, map its stable domain, and copy the four Fixed Staging files.

v0.10.0 hardens the optional slot in two ways:

- the selected exact PR HEAD A must pass reusable Foundation CI before publication;
- `staging` uses a content-identical synthetic child commit with an explicit PR ownership marker, so close cleanup does not depend on the PR's later close-time HEAD still matching the staged revision.

The copied `deploy-staging.yml` contains a reviewed immutable Foundation full SHA for its exact-source CI call. Replace that pinned full SHA with the reviewed full SHA of the Foundation release the consumer adopts.

The Fixed Staging publisher/cleanup remain serialized and use `--force-with-lease`.

Native Git integration may begin Production deployment before post-merge CI for the exact Production SHA completes. `docs/vercel.md` documents this convenience/strict-gating tradeoff.

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
- do not place secrets or privileged state in caches.

## Upgrading Foundation

1. Review `CHANGELOG.md` and the diff between the adopted and target Foundation commits.
2. Identify copied documents/templates separately from reusable workflows.
3. Preserve app-specific deviations unless an approved change supersedes them.
4. Update copied rules/templates only where they remain appropriate for the app.
5. Update reusable-workflow SHAs after review.
6. Update provenance.
7. Run the application's full validation before merging.

For v0.10.0 specifically, consumers moving from the v0.9.x default should treat the hosted-review change as intentional and breaking: stop enabling `staging` by default, adopt `preview/**` plus the On-demand Preview workflow/helper, and retain Fixed Staging only when the application has a documented fixed-origin requirement.
