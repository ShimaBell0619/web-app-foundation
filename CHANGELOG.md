# Changelog

## 0.7.1

### Patch Changes

- 5e77830: Refine the context-routed Chat implementation profile to reuse revision-bound evidence and known run identifiers, and to validate missing evidence before changing stable production behavior.

## 0.7.0

### Minor Changes

- dce5388: Add a context-routed Chat-based AI implementation profile that deterministically selects repository contracts, extracts session-local Design Intent, maps contracts to implementation and validation evidence, batches GitHub I/O around coherent candidates, and explicitly rejects unjustified overengineering while preserving existing review, CI, conflict, and UI-validation boundaries.

## 0.6.0

### Minor Changes

- f92ddd2: Add a primitive-first React UI implementation profile: Tailwind CSS styling infrastructure, shadcn/ui-style accessible generic primitives, product-specific semantic composition, explicit demo-layout guardrails, and a documented custom-CSS/deviation boundary backed by contract validation.

## 0.5.0

### Minor Changes

- 6946a5c: Add a proven optional Vercel fixed-Staging profile for exact-origin integration testing, with a read-only manual request, trusted default-branch publisher, compare-and-swap ref updates, conditional cleanup, copyable templates, and regression coverage.

- 29e7273: Add a selective Codex GitHub Code Review operating model that separates mandatory implementation-agent self-review from manual, risk-based independent review on merge-candidate PR heads, with consumer guidance, PR evidence fields, and repository contract validation.

## 0.4.1

### Patch Changes

- 4675752: Harden reusable Web CI regression detection for disabled required jobs and preflight checks, and cover required-script opt-out behavior symmetrically.

## 0.4.0

### Minor Changes

- 2b5568c: Add proven operational profiles for Vercel Git-integrated hosting, downstream GitHub Release publication, and GitHub-to-Azure OIDC with Flexible Federated Identity Credentials.

All notable consumer-facing changes to Web App Foundation are documented here.

The project follows Semantic Versioning and remains pre-1.0 while its contracts are validated in real applications.

## 0.3.1 - 2026-09-08

### Changed

- Fixed the trusted Pages caller permission union so cleanup calls can start reusable publisher workflows while the cleanup job still runs with its narrower least-privilege token.

## 0.3.0 - 2026-09-08

### Added

- Added product-specific design guidance for rendered UI review, responsive/CJK validation, and generic AI-template review signals without prescribing a shared visual style.
- Added a secure reusable GitHub Pages capability with CI-gated production publishing, temporary same-repository PR previews, close cleanup, and mobile-friendly screenshot comments.

### Changed

- Documented the secure two-phase bootstrap required for first GitHub Pages adoption, added a copyable trusted publisher caller, and hardened PR screenshot capture against Vite network-idle hangs.

## 0.2.0 - 2026-09-07

### Changed

- Hardened the reusable Web CI and AI-development contracts: required quality gates now fail closed by default with explicit opt-outs, Foundation CI executes a real consumer fixture and regression-tests its validator, release tooling is lockfile-installed, and agent completion/approval boundaries are explicit.

## 0.1.0 - 2026-09-07

### Added

- Initial AI-first document contract with `PRODUCT.base.md`, Google DESIGN.md-aligned `DESIGN.base.md`, and `AGENTS.md`.
- Issue-driven development and mandatory AI self-review/correction loop.
- Reusable npm-based web CI with package-manager caching.
- SemVer, Changesets, and downstream Foundation provenance rules.
