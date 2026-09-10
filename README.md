# web-app-foundation

Shared AI-first foundation for web applications developed primarily through ChatGPT and other coding agents.

## Status

Current Foundation version: **0.8.0 (pre-1.0)**.
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

## Default UI implementation profile

For new React-oriented browser-first consumers, the default UI implementation profile is **Tailwind CSS + shadcn/ui-style accessible primitives + product-specific semantic composition**. Generic controls should come from mature primitives; product identity should come from information hierarchy, layout, tokens, typography, density, data presentation, and interaction flow rather than bespoke reimplementation of routine controls.

The profile is a default, not a forced shared skin. Existing consumers are not required to migrate solely for conformity, and non-React or established-design-system consumers may document an equivalent accessible primitive approach. See `docs/ui-implementation.md` for the layering, custom-CSS boundary, demo-composition guardrails, and deviation rules.

## AI development lifecycle

Feature work is Issue-driven. An Issue represents one independently understandable objective with acceptance criteria. Related Issues may share a PR; an Issue may also span multiple PRs, using `Refs #N` until the final AC-completing PR uses `Closes #N`.

Agents do not treat the first implementation pass as complete: read contracts -> implement -> self-review as another engineer -> correct/harden -> re-review -> final validation -> evidence-based completion report. Independent review is a separate risk-based layer: when Codex GitHub Code Review is used, Automatic Review stays off and a reviewer is requested explicitly with `@codex review` against the merge-candidate HEAD. See `docs/independent-review.md` for the responsibility split and operating rules.

For normal Chat-based implementation, `docs/ai-implementation.md` adds a context-routed profile above that loop: classify the change, deterministically route only the required repository contracts, build a session-local Repository Context Packet, extract change-specific Design Intent, map contract -> implementation surface -> validation evidence, then batch GitHub reads/writes around that map. The packet never replaces repository contracts, and speed improvements never remove conflict detection, self-review, CI, or rendered UI validation.

The same profile explicitly rejects overengineering: new abstractions, dependencies, layers, services, workflows, configuration formats, or permanent process artifacts need a current requirement, real boundary, observed repetition, measured evidence, or adopted Foundation contract. Hypothetical future reuse and conformity alone are not sufficient reasons.

## CI boundary

`.github/workflows/web-ci.yml` is the reusable default validation workflow for npm-based web apps. It requires `check`, `typecheck`, `test`, and production `build` by default. Check/typecheck/test can be skipped only through an explicit workflow opt-out with a non-empty reason; build remains mandatory. A small consumer fixture runs the reusable workflow in Foundation CI so GitHub validates the actual shared workflow, not only text markers.

The Foundation uses `actions/setup-node` npm download caching, never a `node_modules` cache by default. Quality evidence must remain distinct from hosting/deployment status, and applications should document any hosting-native sequencing that does not strictly wait for post-merge CI on the exact Production SHA.

## Default hosting profile

Vercel Git Integration is the default hosting/deployment profile for new web-app consumers. Foundation CI remains the quality gate; Vercel owns branch/PR Preview and Production deployment. Do not add a redundant custom Vercel deployment Action merely to duplicate native Git Integration behavior.

For applications under one owner-managed domain, use a stable naming convention when practical:

- Production: `<app>.<domain>`
- Fixed Staging, when needed: `staging.<app>.<domain>`
- ordinary ephemeral PR Preview: Vercel-provided Preview URL

Use a fixed Staging domain only when an exact/stable origin is materially required, such as OAuth allowlisting. Do not create per-PR custom-domain automation by default.

See `docs/vercel.md` for the hosting contract and `docs/vercel-fixed-staging.md` for the optional fixed-origin Staging slot.

## Operational profiles

- `docs/vercel.md` — default Vercel native Git-integrated Preview/Production hosting profile; no redundant deployment Action.
- `docs/vercel-fixed-staging.md` — optional fixed-origin, single-PR Staging slot layered on Vercel Git Integration for OAuth/origin-dependent validation.
- `docs/application-releases.md` — optional application SemVer -> immutable tag -> published GitHub Release profile with a copyable app-owned workflow template.
- `docs/azure-oidc.md` — optional GitHub Actions -> Microsoft Entra -> Azure OIDC bootstrap guidance, including owner-wide Flexible FIC for convenience-first personal-repository operation.

A consumer may document a justified hosting deviation when product or platform requirements demand it, but the Foundation keeps one default hosting path rather than maintaining parallel deployment capabilities without current evidence.

## Versioning

- Semantic Versioning is the default.
- Foundation stays in `0.x` until real consumers validate a deliberate 1.0 gate.
- Changesets record consumer-visible/release-relevant changes.
- The Changesets CLI is an exact devDependency covered by `package-lock.json` and `npm ci`.
- `CHANGELOG.md` records released Foundation changes.
- A downstream application's Git tag is not treated as a complete versioned release when the requested contract calls for a published GitHub Release.

See `docs/adoption.md`, `docs/ai-implementation.md`, `docs/ui-implementation.md`, `docs/ui-review.md`, `docs/independent-review.md`, `docs/ci-performance.md`, `docs/vercel.md`, `docs/vercel-fixed-staging.md`, `docs/application-releases.md`, `docs/azure-oidc.md`, and `docs/versioning.md` for the detailed contracts.