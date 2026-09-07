# Changelog

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
