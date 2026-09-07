# Product Contract

Status: template baseline.

Copy this file to `PRODUCT.md` when creating an application. Replace instructional text with the application's actual contract. Keep it concise enough that an AI agent can reliably read it before implementation.

`PRODUCT.md` answers **what the product is, what it must do, and what it deliberately does not do**. UI visual rules belong in `DESIGN.md`; implementation architecture belongs in `docs/ARCHITECTURE.md` when that detail is substantial.

## 1. Purpose

Describe the problem the product exists to solve and the primary outcome it should create.

## 2. Users and primary jobs

Define the intended users and their most important jobs-to-be-done. Prefer concrete tasks over broad personas.

## 3. Core behaviors

List behavior that must remain true across implementations.

Examples:

- supported user flows,
- persistence/data ownership expectations,
- offline/network expectations,
- authentication/authorization behavior,
- import/export behavior,
- compatibility promises,
- user-visible failure behavior.

## 4. Product constraints

Record constraints that materially affect product behavior or implementation choices.

Examples:

- privacy/data-residency boundaries,
- supported environments or browsers,
- local-only or cloud-connected operation,
- legal/licensing constraints,
- performance or accessibility commitments that are part of the product promise.

If a constraint needs detailed implementation guidance, keep the durable product rule here and link to the relevant detailed document.

## 5. Non-goals

Explicitly list adjacent capabilities that are intentionally out of scope. Non-goals prevent agents from expanding the product during unrelated implementation work.

## 6. Acceptance boundaries

Define the evidence required before a feature or product capability may be called supported.

Examples:

- required browser/device validation,
- representative data-size validation,
- accessibility checks,
- security review,
- migration/update verification.

## 7. Evolution rules

- Do not silently change this contract while implementing a feature.
- If implementation pressure conflicts with `PRODUCT.md`, raise the conflict and obtain an explicit product decision.
- Update this file when the approved product behavior changes.
- Keep decision history in Issues/PRs; keep the currently approved behavior here.
