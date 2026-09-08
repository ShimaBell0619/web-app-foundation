# Changelog

## 0.3.0

### Minor Changes

- 402a481: Strengthen consumer design guidance around product-specific visual direction, rendered UI review, responsive/CJK validation, and generic AI-template review signals without prescribing a shared visual style.
- 70be421: Add a secure reusable GitHub Pages capability with CI-gated production publishing, temporary same-repository PR previews, close cleanup, and mobile-friendly screenshot comments.
- cee36c6: Document the secure two-phase bootstrap required for first GitHub Pages adoption, add a copyable trusted publisher caller, and harden PR screenshot capture against Vite network-idle hangs.

All notable consumer-facing changes to Web App Foundation are documented here.

The project follows Semantic Versioning and remains pre-1.0 while its contracts are validated in real applications.

## 0.2.0 - 2026-09-07

### Changed

- Hardened the reusable Web CI and AI-development contracts: required quality gates now fail closed by default with explicit opt-outs, Foundation CI executes a real consumer fixture and regression-tests its validator, release tooling is lockfile-installed, and agent completion/approval boundaries are explicit.

## 0.1.0 - 2026-09-07

### Added

- Initial AI-first document contract with `PRODUCT.base.md`, Google DESIGN.md-aligned `DESIGN.base.md`, and `AGENTS.md`.
- Issue-driven development and mandatory AI self-review/correction loop.
- Reusable npm-based web CI with package-manager caching.
- SemVer, Changesets, and downstream Foundation provenance rules.
