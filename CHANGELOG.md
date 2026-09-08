# Changelog

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
