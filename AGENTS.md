# Web App Foundation — Agent Instructions

Foundation-Version: 0.8.0
## Scope

These rules define the default engineering approach for web applications derived from this repository. Application repositories may add stricter app-specific rules or documented exceptions, but should not silently contradict the Foundation.

The current implementation baseline is React + TypeScript + Vite + npm for browser-first apps. The engineering principles are intentionally broader so an application can adopt Next.js, SSR, server components, API routes, backend services, or other web architectures when product requirements justify them.

## Document responsibilities and read order

Before a material change, establish repository context in this order:

1. Read the Issue / approved request and Acceptance Criteria.
2. Read `PRODUCT.md` — authoritative product behavior, boundaries, and non-goals — when the repository is a product consumer.
3. Read `AGENTS.md` — repository-specific engineering, routing, and agent rules.
4. Apply `## Context routing` and load the union of matching contracts. `DESIGN.md` is authoritative and required for product-design/UX, UI-infrastructure, and other material user-facing changes; specialist `docs/*` are loaded when their registered boundary is affected.
5. Read `README.md` when public/user/contributor orientation or documented usage is affected.

Decision history lives in Issues, PRs, releases, CHANGELOG, and Git history. Current approved behavior belongs in the current contract documents rather than being reconstructed from history.

Do not duplicate the same normative rule across several files unless the duplication is deliberately summarized and one source is clearly authoritative.

## Context-routed implementation

For material Chat-based implementation, use the operating method in `docs/ai-implementation.md` before the first implementation write.

- Classify the change by affected area, then load the base contracts plus the union of matching specialist routes.
- Keep a small `## Context routing` index in the adopting repository's `AGENTS.md`. Register normative specialist documents there when they are created, renamed, or retired so future agents can discover them deterministically.
- Build a session-local Repository Context Packet from the Issue/Acceptance Criteria, base SHA, routed contracts, relevant implementation/tests, and current Foundation provenance. The packet is working context, not a repository source of truth and not a permanent `CONTEXT.md`.
- Extract change-specific Design Intent before implementation: requested delta, must preserve, may change, must not change, responsibility/trust boundaries, validation requirements, and explicit non-goals.
- Build an Implementation Map from contract/Acceptance Criterion -> implementation surface -> validation evidence before writes. Expand routing and the packet when scope crosses a new material boundary.
- Use Bootstrap Read once for a new Issue and Incremental Read for later corrections. Do not repeatedly fetch unchanged contracts merely to recreate context. Reuse revision-bound evidence and known resource/run identifiers while they remain valid; refresh mutable state when freshness or staleness requires it.
- When an Acceptance Criterion expects existing behavior to be preserved but proof is missing, add or run the smallest focused validation before changing stable production code when practical; missing evidence is not itself a defect.
- Optimize GitHub I/O around coherent read/write batches, but preserve expected-HEAD checks, non-force updates, conflict reconciliation, security boundaries, and final evidence.
- Self-review the final diff against the extracted Design Intent as well as code quality and Acceptance Criteria.

## Context routing

Derived applications must adapt this index to the normative documents that actually exist in the repository. Do not create empty documents merely to fill a route.

| Change area / condition | Required context in addition to the base route |
| --- | --- |
| Product behavior | Product-specific specialist contract when behavior is delegated from `PRODUCT.md` |
| Product design / UX | `DESIGN.md` |
| UI infrastructure | `DESIGN.md` plus the adopted UI implementation/review contract |
| Domain / data | Registered domain and architecture contracts |
| Integration / trust | Registered integration-specific and architecture/security contracts |
| Architecture / platform | Registered architecture/compatibility contracts |
| Delivery / operations | Registered deployment, release, staging, or operations contract for the affected path |
| Local implementation / refactor | No additional contract unless the actual implementation surface triggers another route |
| Foundation adoption | Foundation provenance plus target Foundation adoption/change guidance |

Matching routes are additive. The implementation agent may expand the classification after discovery, but must route and load newly affected contracts before writing across the new boundary. Normative specialist documents must be added to, renamed in, or removed from this index when agents depend on the index to discover them.

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
6. **Completion report** — state what changed, acceptance-criteria evidence, reviewed commit/SHA or diff scope, review findings/corrections, validation results, independent-review decision/evidence when applicable, and remaining risk.

Self-review should consider, where relevant: acceptance criteria and product-contract fit; extracted Design Intent; regressions and edge cases; security/privacy boundaries; error/failure behavior; state lifecycle and cleanup; accessibility and focus behavior; responsive/rendered UI; performance hot paths; maintainability and unnecessary abstraction; dependency/supply-chain impact; and whether tests validate behavior rather than implementation trivia.

Do not make meaningless code changes merely to prove that a review occurred. If the review finds no material correction, report that fact and the evidence checked.

### Completion gate

Do not report a material change as complete until:

- every acceptance criterion is satisfied or explicitly documented as unresolved,
- self-review has been performed against the final implementation rather than an earlier draft,
- review-driven corrections have been re-reviewed,
- final validation has run after the last material correction,
- no unresolved Blocker/High or otherwise material finding is being silently carried forward.

If a material finding cannot be fixed within the approved scope, surface it and leave the work explicitly incomplete/conditional rather than hiding it in the completion report.

Self-review remains mandatory even when an independent review is requested. An implementation agent reviewing its own work again with the same implementation context is still self-review, not independent review.

## Independent review

Independent review is a separate, risk-based review layer performed by a reviewer that did not own the implementation context. It supplements rather than replaces the mandatory self-review and CI evidence above. The detailed operating method lives in `docs/independent-review.md`.

- Low-risk changes may skip independent review when the decision and reason are recorded in the PR.
- For authentication/authorization or trust-boundary changes; destructive migration or data-integrity risk; concurrency/race-sensitive behavior; compatibility/public-contract changes; release/publishing/deployment/rollback machinery; privileged workflows; reusable Foundation workflows; or other changes whose failure may appear only in production/operations, obtain independent review before merge when practical.
- Request independent review against the intended **merge-candidate HEAD** after self-review and relevant CI have succeeded, so the reviewer evaluates the version that is actually proposed for merge.
- Before every Codex review invocation, including re-review, present the user/maintainer with the concrete reason the review is warranted, the affected risk category, and the expected review value, then obtain explicit approval. Do not invoke `@codex review` autonomously or treat approval for an earlier invocation as approval for a later one.
- When Codex GitHub Code Review is used, keep **Automatic Review / Review my pull requests OFF** and, only after that explicit approval, request it manually from the PR conversation with `@codex review`. Do not make every PR consume an independent review by default.
- Treat repository evidence as authoritative for the independent review: PR purpose, Issue/acceptance criteria, final diff, repository contracts including `AGENTS.md`, tests, and CI. The implementation agent's private conversation, hidden reasoning, or self-review conclusions are not prerequisites and must not be treated as authoritative evidence.
- Independent reviewers should prioritize requirement mismatch, regression, failure/error paths, security boundaries, authentication/authorization, concurrency/race conditions, backward compatibility, destructive side effects, data integrity, CI/CD quality-gate bypass, deployment/rollback defects, and serious operational failure modes.
- Do not fill an independent review with formatting/style preferences or minor findings that deterministic CI should own unless they expose a correctness, security, compatibility, or operability problem.
- The implementation agent must reassess each independent finding rather than accepting it mechanically. Fix valid findings; reject non-applicable findings with concise evidence; surface unresolved material risk instead of silently dismissing it.
- Do not rerun independent review after every correction. Consider another review when responding to a Blocker/High finding, changing a security/auth/privilege boundary, materially changing compatibility or CI/CD behavior, or taking a substantially different implementation path. Local low-risk corrections normally do not need another review. Any new Codex invocation still requires a fresh rationale and explicit approval.
- Record the independent-review decision, review rationale, approval evidence when Codex is used, reviewed SHA, material findings/disposition, and re-review decision in the PR. If the HEAD changes after review, explicitly decide whether the previous review still covers the merge candidate based on the materiality of the change.

## Code Review Rules

When acting as an independent code reviewer, prioritize concrete high-impact defects over mechanical or stylistic findings.

- **Contract integrity** — compare the PR purpose, linked Issue/Acceptance Criteria, diff, tests, and current repository contracts. Flag requirement mismatches, regressions, or consumer-facing contract changes that omit required documentation or Changeset evidence.
- **Trust and delivery safety** — flag any path that executes untrusted PR code with write credentials or secrets, bypasses required quality gates, publishes/deploys a different source revision than the validated SHA, or makes rollback/recovery materially unsafe.
- **State and compatibility safety** — flag concrete concurrency, ordering, retry/idempotency, data-integrity, destructive-side-effect, or backward-compatibility failures, especially when partial failure, cleanup, or operator actions can overwrite or corrupt newer valid state.

Do not report formatting, naming taste, style preference, or routine lint/type issues unless they materially contribute to a correctness, security, compatibility, or operability defect. Deterministic checks should own mechanical enforcement.

## Architecture

- Start with the simplest architecture that exposes real boundaries clearly.
- Keep domain/business logic independent from UI framework state when that improves testability or reuse.
- Do not add repository/service/use-case/interface layers solely to match a pattern; introduce abstractions when they own a real boundary, lifecycle, substitution point, or repeated behavior.
- Prefer local component state for truly local ephemeral UI state.
- Keep server/client boundaries explicit in SSR/full-stack frameworks; never assume browser-only security properties protect server-side resources.
- Treat persistent storage, authentication, external APIs, file handling, cross-origin communication, and privileged server code as explicit trust boundaries.
- Avoid premature microservices, monorepo complexity, state-management libraries, or generic component wrappers without measured need.

## Complexity discipline

Overengineering is not an acceptable form of future-proofing. Add only the complexity required by the current approved objective.

- Do not introduce a new abstraction, layer, dependency, service, configuration format, generated framework, workflow, permanent document, compatibility adapter, or extension point solely for hypothetical future reuse, stylistic purity, or conformity with a newer standard.
- Additional complexity must be justified by a current Acceptance Criterion/product requirement, a real responsibility/lifecycle/security/trust/compatibility boundary, observed repetition, measured operational/performance evidence, or an already-adopted Foundation contract.
- Even when justified, prefer the least powerful mechanism that solves the current problem. A direct local implementation is preferable to a generic framework when both satisfy the same contract.
- Do not replace stable consumer code solely because a newer Foundation default exists. Migration must have an objective benefit and an explicit bounded scope.
- During self-review, remove speculative flexibility, unused extension points, duplicate configuration, unnecessary indirection, and abstractions that merely rename another API.
- Do not simplify away complexity that correctness actually requires: security boundaries, failure recovery, concurrency safety, data migration/integrity, accessibility, and validation remain mandatory where applicable.

See `docs/ai-implementation.md` for how this discipline is applied during Design Intent extraction, Implementation Mapping, batching, and self-review.

## Web and UI baseline

- Prefer semantic HTML, native browser behavior, progressive enhancement, and accessible primitives.
- For a new React-oriented browser-first consumer, use the default primitive-first profile in `docs/ui-implementation.md` unless the application documents a justified deviation: Tailwind CSS for styling infrastructure, shadcn/ui-style accessible generic primitives, and product-specific semantic components above them.
- Keep a generic primitive layer such as `components/ui` free of product-domain meaning; product-specific state, hierarchy, actions, and presentation belong in semantic components above it.
- Do not copy component-library demo/page composition as the application information architecture. Primitive reuse does not determine page composition.
- Do not rebuild routine button, input, dialog, overlay, focus, or keyboard behavior in bespoke CSS when a reviewed mature primitive already supplies it; specialist custom CSS remains valid for justified product-specific visualizations/interactions.
- Existing consumers do not require a migration solely to conform to the default profile; treat a migration as material UI work with an explicit objective and rendered review.
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
- When a normative specialist document is created, renamed, or retired, update the repository's Context Routing in the same change when agents depend on that document for implementation decisions.
- Avoid broad refactors while implementing an unrelated Issue.
- Do not silently expand product scope.
