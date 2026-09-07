# Web App Foundation — Agent Instructions

Foundation-Version: 0.1.0

## Scope

These rules define the default engineering approach for web applications derived from this repository. Application repositories may add stricter app-specific rules or documented exceptions, but should not silently contradict the Foundation.

The current implementation baseline is React + TypeScript + Vite + npm for browser-first apps. The engineering principles are intentionally broader so an application can adopt Next.js, SSR, server components, API routes, backend services, or other web architectures when its product requirements justify them.

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

1. Read the applicable contracts and inspect the existing implementation before choosing an abstraction or dependency.
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
- Do not mix unrelated cleanup or speculative future work into the same PR.
- Use a short-lived branch named from the change type and primary Issue where practical, for example `feat/issue-12-search` or `fix/issue-34-focus-trap`.
- PR titles should use Conventional Commit style (`feat:`, `fix:`, `docs:`, `ci:`, `refactor:`, etc.).
- PR descriptions should close the implemented Issues and state design impact, validation, security/runtime impact, and Changeset status.

## Mandatory AI implementation loop

The first implementation pass is never sufficient evidence of completion.

For every material change:

1. **Implement** — satisfy the approved scope with the simplest coherent implementation.
2. **Self-review** — review the entire diff/behavior as if it were authored by another engineer. Do not defend the implementation merely because you wrote it.
3. **Correct/harden** — autonomously fix real defects or reasonable hardening gaps that do not require a new product/design/architecture decision.
4. **Re-review** — inspect the affected code and behavior again after corrections.
5. **Final validation** — run the relevant checks from a clean/reproducible state where practical.
6. **Completion report** — state what changed, what the self-review found, what was corrected, validation results, and any remaining material risk.

Self-review should consider, where relevant:

- Issue acceptance criteria and product-contract fit,
- regressions and edge cases,
- security/privacy boundaries,
- error and failure behavior,
- state lifecycle and cleanup,
- accessibility and keyboard/focus behavior,
- responsive/rendered UI behavior,
- performance-sensitive hot paths,
- maintainability and unnecessary abstraction,
- dependency and supply-chain impact,
- whether tests validate behavior rather than implementation trivia.

Do not make meaningless code changes merely to prove that a review occurred. If the review finds no material correction, report that fact and the evidence checked.

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
- Add E2E, visual regression, or accessibility automation when the protected flow justifies its CI/runtime cost; do not create a large browser matrix by default.
- Keep UI-specific design decisions in `DESIGN.md`, not in this file.

## Dependencies and supply chain

- Prefer platform/runtime capabilities and existing dependencies before adding a package.
- Before adding a dependency, review maintenance status, compatibility, license, security history/implications, bundle/runtime cost, and whether the dependency crosses a trust boundary.
- Use a committed lockfile and reproducible installation (`npm ci`) for the default npm baseline.
- Pin direct dependencies deliberately; review upgrades instead of silently floating foundational packages.
- Pin external GitHub Actions and reusable Foundation workflows to reviewed full commit SHAs. Do not execute a Foundation workflow via `@main` or another mutable reference.
- Never commit secrets, tokens, private keys, production credentials, or generated credential files.

## Testing and CI

The default npm-based PR validation contract is:

- reproducible dependency install,
- lint/format/static check when the app defines it,
- TypeScript typecheck when the app defines it,
- unit/component tests when defined,
- production build,
- targeted E2E only when enabled/required by the app.

`.github/workflows/web-ci.yml` provides this reusable baseline.

Use npm's package-manager cache through `actions/setup-node`; do not cache `node_modules`. Add heavier caches such as Playwright browsers or framework build output only after measurement shows that the speed benefit exceeds invalidation, storage, and cache-poisoning complexity.

Deployment provider configuration is application-specific and does not belong in the shared CI contract.

## Versioning and Changesets

- Use Semantic Versioning by default.
- Foundation remains `0.x` until real consumers validate a deliberate 1.0 stability gate.
- While Foundation is pre-1.0, use patch for compatible fixes/clarifications and minor for new consumer-facing capability or any intentional breaking Foundation-contract change; call breaking changes out explicitly in `CHANGELOG.md`.
- Add a Changeset for consumer-visible or release-relevant behavior/contract changes.
- A Changeset is normally unnecessary for docs-only, CI-only, test-only, formatting-only, or internal refactors that do not alter a consumer-facing contract.
- Private applications may still use Changesets to version/tag releases; publishing to npm is not required.
- Maintain `CHANGELOG.md` for released changes.
- Downstream apps record separately:
  - the Foundation version/commit from which copied rules/templates were adopted,
  - the Foundation full commit SHA used by reusable workflows,
  - app-specific exceptions/deviations.

## Change discipline

- Update `PRODUCT.md` when approved product behavior changes.
- Update `DESIGN.md` when approved UI/UX or design-system decisions change.
- Update `AGENTS.md` only when repeatable engineering/agent behavior changes.
- Create or update a specialist `docs/*` file when a technical topic becomes too detailed for the core contracts.
- Avoid broad refactors while implementing an unrelated Issue.
- Do not silently expand product scope.
