# web-app-foundation

Shared AI-first foundation for web applications developed primarily through ChatGPT and other coding agents.

## Status

Current Foundation version: **0.1.0 (pre-1.0)**.

This Foundation is intentionally pre-1.0 while its contracts are validated in real applications. React + TypeScript + Vite + npm is the current default implementation baseline, but the core development rules are intentionally framework-tolerant so future Next.js or full-stack applications can adopt the same foundation.

## Purpose

This repository is the source of truth for reusable web-development principles, AI agent behavior, document responsibilities, versioning discipline, and reusable GitHub Actions CI.

Application repositories remain self-contained. Product and design templates are copied and adapted into each app, while reusable workflows are referenced from this repository by a reviewed immutable commit SHA.

## Core document contract

- `PRODUCT.base.md` -> seed for an application's `PRODUCT.md`: **What** the product is and must do.
- `DESIGN.base.md` -> seed for an application's `DESIGN.md`: **Experience** and visual/design-system rules.
- `AGENTS.md` -> **How** AI agents plan, implement, review, validate, and change the repository.
- `README.md` -> user/contributor orientation, not the authoritative product contract.
- `docs/*` -> detailed architecture, security, release, operational, or adoption guidance when the topic deserves its own document.
- Issues/PRs/Git history -> decision history and implementation evidence, not the current source of truth.

## Default web baseline

The current default for a new browser-first application is:

- TypeScript
- React
- Vite
- npm with a committed `package-lock.json`
- current production-suitable Node.js LTS, pinned in `.node-version`
- lint/format checks, type checking, unit tests, production build
- targeted E2E/visual/accessibility tests where they provide material regression value

These are defaults, not permanent restrictions. SSR, server components, API routes, backend services, databases, or alternative frameworks are introduced when product requirements justify them.

## AI development lifecycle

Feature work is Issue-driven. An Issue represents one independently understandable objective with acceptance criteria. A PR may close multiple tightly related Issues when that improves implementation efficiency without harming reviewability.

Agents do not treat the first implementation pass as complete:

1. read the applicable contracts and existing implementation,
2. implement the smallest coherent solution,
3. self-review the entire change as if reviewing another engineer's PR,
4. correct real defects, regressions, unnecessary complexity, or hardening gaps,
5. re-review the affected areas,
6. run final validation,
7. report implementation, review-driven corrections, validation, and remaining risks.

## CI boundary

`.github/workflows/web-ci.yml` is the reusable default validation workflow for npm-based web apps. It performs reproducible install, static checks when present, type checking when present, unit tests when present, production build, and optional E2E.

The Foundation standardizes **quality CI**, not a deployment provider. GitHub Pages, Azure Static Web Apps, Vercel, App Service, Container Apps, and other deployment targets remain application decisions.

## Versioning

- Semantic Versioning is the default.
- Foundation stays in `0.x` until real consumers validate the contracts well enough to define and pass a deliberate 1.0 gate.
- Changesets record consumer-visible/release-relevant changes.
- Docs-only, CI-only, test-only, and internal-only changes do not need a Changeset unless they alter a consumer-facing Foundation contract.
- `CHANGELOG.md` records released Foundation changes.

See `docs/adoption.md` for provenance/upgrade rules and `docs/versioning.md` for the complete pre-1.0 and stable SemVer policy.
