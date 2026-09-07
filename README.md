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

The current default for a new browser-first application is TypeScript + React + Vite + npm with a committed lockfile and a production-suitable Node LTS pinned in `.node-version`. These are defaults, not permanent restrictions; SSR, server components, API routes, backend services, databases, or alternative frameworks are introduced when product requirements justify them.

## AI development lifecycle

Feature work is Issue-driven. An Issue represents one independently understandable objective with acceptance criteria. Related Issues may share a PR; an Issue may also span multiple PRs, using `Refs #N` until the final AC-completing PR uses `Closes #N`.

Agents do not treat the first implementation pass as complete: read contracts -> implement -> self-review as another engineer -> correct/harden -> re-review -> final validation -> evidence-based completion report. Material auth/privilege, migration, release/publish, or reusable-workflow changes should receive independent review before merge when practical.

## CI boundary

`.github/workflows/web-ci.yml` is the reusable default validation workflow for npm-based web apps. It requires `check`, `typecheck`, `test`, and production `build` by default. Check/typecheck/test can be skipped only through an explicit workflow opt-out with a non-empty reason; build remains mandatory. A small consumer fixture runs the reusable workflow in Foundation CI so GitHub validates the actual shared workflow, not only text markers.

The Foundation uses `actions/setup-node` npm download caching, never a `node_modules` cache by default. Deployment providers remain application decisions, but automated publish must use the same source SHA that passed required quality gates.

## Versioning

- Semantic Versioning is the default.
- Foundation stays in `0.x` until real consumers validate a deliberate 1.0 gate.
- Changesets record consumer-visible/release-relevant changes.
- The Changesets CLI is an exact devDependency covered by `package-lock.json` and `npm ci`.
- `CHANGELOG.md` records released Foundation changes.

See `docs/adoption.md`, `docs/ci-performance.md`, and `docs/versioning.md` for the detailed contracts.
