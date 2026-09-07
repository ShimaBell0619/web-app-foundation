# CI Performance Guidance

## Default cache

The reusable web CI uses `actions/setup-node` with npm caching.

This caches npm's package-manager download cache, **not `node_modules`**. `npm ci` still reconstructs dependencies from the committed lockfile, preserving a simple reproducibility boundary while avoiding repeated package downloads.

Use `cache-dependency-path` to point at the authoritative `package-lock.json`.

## What not to cache by default

Do not add these caches merely because they exist:

- `node_modules`,
- Playwright/browser binaries,
- framework build output such as `.next/cache`,
- test-runner caches,
- generated artifacts.

Each adds invalidation rules, storage use, security considerations, and debugging complexity.

## When to add another cache

Add an additional cache only after measuring at least:

1. the uncached step duration,
2. the expected hit rate,
3. the cache restore/save time,
4. typical cache size,
5. invalidation correctness,
6. trust boundary/cache-poisoning implications.

A cache that saves seconds but adds opaque stale-state failures is not an optimization.

## Dependency install baseline

For npm applications:

```bash
npm ci
```

is the CI installation contract. Keep `package-lock.json` committed and review lockfile changes.

## E2E

Browser E2E is opt-in in the reusable baseline because downloading browsers and starting a runtime can dominate CI time. Enable it for flows where browser-runtime regression coverage is worth that cost.

If browser setup later becomes a measured bottleneck, add a cache only with a documented invalidation key that includes the browser/test-runner version and runner platform.
