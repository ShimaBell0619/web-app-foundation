# CI Performance Guidance

## Default cache

The reusable web CI uses `actions/setup-node` with npm caching. This caches npm's package-manager download cache, **not `node_modules`**. `npm ci` still reconstructs dependencies from the committed lockfile.

Use `cache-dependency-path` to point at the authoritative lockfile. The reusable workflow is intended for unprivileged quality validation; do not assume the same cache policy is appropriate for privileged publishing.

## What not to cache by default

Do not add these caches merely because they exist:

- `node_modules`,
- Playwright/browser binaries,
- framework build output such as `.next/cache`,
- test-runner caches,
- generated artifacts.

Each adds invalidation rules, storage use, security considerations, and debugging complexity.

## When to add another cache

Add an additional cache only after measuring uncached duration, hit rate, restore/save time, typical size, invalidation correctness, and trust-boundary/cache-poisoning implications. A cache that saves seconds but adds opaque stale-state failures is not an optimization.

Never store secrets, credentials, production configuration, or privileged mutable state in a cache. Privileged publish/deploy jobs should default to no cache and opt in only after explicit threat-model review.

## Dependency install baseline

For npm applications, `npm ci` is the CI installation contract. Keep `package-lock.json` committed and review lockfile changes. Foundation CI also exercises an actual consumer fixture so replacing dependency installation with a textual/no-op marker does not satisfy the contract.

## Required quality gates

`check`, `typecheck`, and `test` run by default; `build` always runs. A gate is skipped only through an explicit workflow input with a non-empty reason. This makes script deletion/renaming a visible failure instead of a silent reduction in coverage.

## E2E

Browser E2E remains opt-in because browser/runtime setup can dominate CI time. When `run_e2e` is enabled, `test:e2e` must be a one-shot, self-contained command for its required browser/server lifecycle. For complex Playwright setup, visual infrastructure, environment credentials, or provider-specific services, prefer an app-owned E2E job.

Add browser or framework caches only after measurement and with version/platform-aware keys plus an explicit trust-boundary review.
