# Web App Foundation — Agent Instructions

Foundation-Version: 0.3.0
## Scope

These rules define the default engineering approach for web applications derived from this repository. Application repositories may add stricter app-specific rules or documented exceptions, but should not silently contradict the Foundation.

The current implementation baseline is React + TypeScript + Vite + npm for browser-first apps. The engineering principles are intentionally broader so an application can adopt Next.js, SSR, server components, API routes, backend services, or other web architectures when product requirements justify them.

## Document responsibilities and read order

Before changing an application, read:

1. `PRODUCT.md` — authoritative product behavior, boundaries, and non-goals.
2. `DESIGN.md` — authoritative UI/UX and design-system contract for user-facing changes.
3. `AGENTS.md` — repository-specific engineering and agent rules.
4. `README.md` — public/user/contributor orientation.
5. Relevant `docs/*` files when the change touches architecture, security, release, compatibility, operations, migration, or another specialist domain.

Decision history lives in Issues, PRs, releases, CHANGELOG, and Git history. Current approved behavior belongs in the current contract documents rather than being reconstructed from history.

Do not duplicate the same normative rule across several files unless the duplication is deliberately summarized and one source is clearly authoritative.

## Before changing code

1. Read the applicable contracts, current Foundation provenance in derived apps, and existing implementation before choosing an abstraction or dependency.
2. Verify current official documentation for browser APIs, framework/runtime behavior, security-sensitive library options, Node/tool compatibility, deprecations, or versions that may have changed.
3. Prefer the smallest coherent change that satisfies the Issue acceptance criteria.
4. Before the first GitHub write, resolve the current base-branch SHA, create a short-lived feature branch from that exact SHA, and explicitly target that branch for implementation writes.
5. Batch related reads and coherent writes when practical, without sacrificing conflict detection, correctness, or CI evidence.
6. If a requested implementation conflicts with `PRODUCT.md`, `DESIGN.md`, or a material architecture/security contract, surface the conflict and obtain an explicit design decision rather than silently rewriting the contract.

## Issue-driven development

- Feature work, meaningful bug fixes, and material refactors should normally start from an Issue.
- One Issue should represent one independently understandable objective and include acceptance criteria.
- One Issue does **not** have to equal one PR.
- Closely related Issues may share a PR when they touch the same implementation area, have compatible risk, and remain independently traceable and reviewable.
- When one Issue needs multiple PRs, intermediate PRs use `Refs #N`; only the PR that satisfies all remaining acceptance criteria uses `Closes #N`.
- When one PR covers several Issues, map evidence to each Issue's acceptance criteria separately.
- Do not mix unrelated cleanup or speculative future work into the same PR.
- Use a short-lived branch named from the change type and primary Issue where practical, for example `feat/issue-12-search` or `fix/issue-34-focus-trap`.
- PR titles should use Conventional Commit style (`feat:`, `fix:`, `docs:`, `ci:`, `refactor:`, etc.).

## Approval-required decisions

Agents should act autonomously on implementation details that preserve already-approved behavior, while stopping for genuinely material new decisions.

| Agent may decide autonomously | Approval is required before proceeding |
| --- | --- |
| Local refactors that preserve approved behavior | New product behavior or compatibility changes |
| Naming, internal structure, focused regression tests | Authentication, authorization, privilege, or trust-boundary changes |
| Error handling and input validation that follow existing contracts | New persistence location, retention policy, data residency, or destructive migration |
| Small dependency-free hardening within the Issue scope | New external data transmission/integration or recurring-cost provider/service |
| Implementation details already implied by approved architecture/design | Material platform, deployment, public API/URL/identity, or architecture changes |

Do not re-ask decisions already approved in the current Issue, contracts, or conversation. If a correction is clearly required to satisfy an approved acceptance criterion and does not cross the approval-required boundary, make it autonomously.

## Mandatory AI implementation loop

The first implementation pass is never sufficient evidence of completion.

For every material change:

1. **Implement** — satisfy the approved scope with the simplest coherent implementation.
2. **Self-review** — review the entire diff/behavior as if it were authored by another engineer. Do not defend the implementation merely because you wrote it.
3. **Correct/harden** — autonomously fix real defects or reasonable hardening gaps that do not require a new approval-required decision.
4. **Re-review** — inspect the affected code and behavior again after corrections.
5. **Final validation** — run the relevant checks from a clean/reproducible state where practical.
6. **Completion report** — state what changed, acceptance-criteria evidence, reviewed commit/SHA or diff scope, review findings/corrections, validation results, and remaining risk.

Self-review should consider, where relevant: acceptance criteria and product-contract fit; regressions and edge cases; security/privacy boundaries; error/failure behavior; state lifecycle and cleanup; accessibility and focus behavior; responsive/rendered UI; performance hot paths; maintainability and unnecessary abstraction; dependency/supply-chain impact; and whether tests validate behavior rather than implementation trivia.

Do not make meaningless code changes merely to prove that a review occurred. If the review finds no material correction, report that fact and the evidence checked.

### Completion gate

Do not report a material change as complete until:

- every acceptance criterion is satisfied or explicitly documented as unresolved,
- self-review has been performed against the final implementation rather than an earlier draft,
- review-driven corrections have been re-reviewed,
- final validation has run after the last material correction,
- no unresolved Blocker/High or otherwise material finding is being silently carried forward.

If a material finding cannot be fixed within the approved scope, surface it and leave the work explicitly incomplete/conditional rather than hiding it in the completion report.

For changes to authentication/authorization, destructive migrations, release/publishing machinery, privileged workflows, or reusable Foundation workflows, obtain an independent human or second-agent review before merge when practical. Self-review remains required but is not treated as independent review.

## Architecture

- Start with the simplest architecture that exposes real boundaries clearly.
- Keep domain/business logic independent from UI framework state when that improves testability or reuse.
- Do not add repository/service/use-case/interface layers solely to match a pattern; introduce abstractions when they own a real boundary, lifecycle, substitution point, or repeated behavior.
- Prefer local component state for truly local ephemeral UI state.
- Keep server/client boundaries explicit in SSR/full-stack frameworks; never assume browser-only security properties protect server-side resources.
- Treat persistent storage, authentication, external APIs, file handling, cross-origin communication, and privileged server code as explicit trust boundaries.
- Avoid premature microservices, monorepo complexity, state-management libraries, or generic component wrappers without measured need.

## Web and UI baseline

- Prefer semantic HTML, native browser behavior, progressive enhancement, and accessible primitives.
- Preserve keyboard support, visible focus, meaningful labels, error association, and appropriate target sizing.
- Design responsive behavior from available layout space rather than device-name checks.
- User-facing UI changes require actual rendered validation. Source inspection alone is not sufficient.
- Before substantial UI implementation, read the product-specific direction and information hierarchy from `DESIGN.md`. If they are missing and the choice materially affects the experience, establish them there rather than filling the gap with a generic dashboard/template default.
- Do not treat common AI/generic UI signals—equal KPI cards, repeated cards/pills, soft icon boxes, decorative gradients/glows/orbs, uppercase eyebrow labels, arbitrary section numbers, or similar patterns—as either mandatory defaults or blanket violations. Keep them when they serve the product; question them when no product/data/workflow/accessibility reason explains them.
- Material user-facing changes use a **render → critique → fix → re-render** loop. Review the rendered result independently of implementation effort, correct material findings, and render again after the correction.
- As a default rendered-review baseline, inspect roughly 1440px desktop, 390px mobile, and 320px narrow layouts, then add product-specific widths when needed. These values are review baselines, not universal breakpoints or device-support promises.
- At relevant widths, check unintended horizontal overflow, long/real text wrapping, hierarchy under constrained space, keyboard reachability, visible focus, and status/state meaning without color-only dependence.
- For Japanese/CJK interfaces, inspect real line breaking and font fallback in rendered output; do not assume a Latin-focused font stack or one CI browser matches target devices.
- Add E2E, visual regression, or accessibility automation when the protected flow justifies its CI/runtime cost; automate durable invariants rather than creating a large browser matrix by default.
- Screenshots and preview comments are review conveniences, not substitutes for product-specific behavioral/accessibility assertions.
- Keep UI-specific design decisions in `DESIGN.md`, not in this file. Use Foundation guidance such as `docs/ui-review.md` as a method, not as a shared visual style.

## Dependencies and supply chain

- Prefer platform/runtime capabilities and existing dependencies before adding a package.
- Before adding a dependency, review maintenance status, compatibility, license, security history/implications, bundle/runtime cost, and whether the dependency crosses a trust boundary.
- Use a committed lockfile and reproducible installation (`npm ci`) for the default npm baseline.
- Pin direct dependencies deliberately; review upgrades instead of silently floating foundational packages.
- Pin external GitHub Actions and reusable Foundation workflows to reviewed full commit SHAs. Do not execute a Foundation workflow via `@main` or another mutable reference.
- Never commit secrets, tokens, private keys, production credentials, or generated credential files.

## Testing and CI

The default npm-based PR validation contract requires:

- reproducible dependency install,
- `check`,
- `typecheck`,
- `test` in one-shot/non-watch mode,
- production `build`.

A project may explicitly opt out of `check`, `typecheck`, or `test` only through reusable-workflow inputs with a non-empty reason. `build` is mandatory. Do not satisfy the contract with empty/no-op scripts merely to make CI green.

`.github/workflows/web-ci.yml` provides this reusable baseline. `test:e2e` is optional, but when enabled it must be a one-shot command that owns the required browser/runtime/server startup and cleanup lifecycle. If E2E setup needs provider/platform-specific privileged steps, keep it in an app-owned job instead of hiding those responsibilities in the shared workflow.

Use npm's package-manager cache through `actions/setup-node`; do not cache `node_modules`. Add heavier caches only after measurement shows the speed benefit exceeds invalidation, storage, and cache-poisoning complexity.

Deployment provider configuration is application-specific. Any automated publish must use the same source commit SHA that passed the required quality gates, and privileged publish jobs must not execute untrusted code or restore caches containing secrets/privileged state.

## Versioning and Changesets

- Use Semantic Versioning by default.
- Foundation remains `0.x` until real consumers validate a deliberate 1.0 stability gate.
- While Foundation is pre-1.0, use patch for compatible fixes/clarifications and minor for new consumer-facing capability or any intentional breaking Foundation-contract change; call breaking changes out explicitly in `CHANGELOG.md`.
- Add a Changeset for consumer-visible or release-relevant behavior/contract changes, including reusable CI behavior changes.
- A Changeset is normally unnecessary for docs-only, test-only, formatting-only, or internal refactors that do not alter a consumer-facing contract.
- Changesets CLI is an exact devDependency installed by `npm ci`; do not rely on ad-hoc `npx` resolution for Foundation releases.
- Maintain `CHANGELOG.md` for released changes.
- Downstream apps record separately the copied Foundation version/commit, reusable-workflow full commit SHA, and app-specific deviations.

## Change discipline

- Update `PRODUCT.md` when approved product behavior changes.
- Update `DESIGN.md` when approved UI/UX or design-system decisions change.
- Update `AGENTS.md` only when repeatable engineering/agent behavior changes.
- Create or update a specialist `docs/*` file when a technical topic becomes too detailed for the core contracts.
- Avoid broad refactors while implementing an unrelated Issue.
- Do not silently expand product scope.
