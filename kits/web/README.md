# E2E templates

Files in this directory are copyable consumer examples, not Foundation runtime tests or dependencies.

`rendered-ui-review.spec.mjs` demonstrates inexpensive rendered-UI checks for the default review baseline:

- desktop around 1440px,
- mobile around 390px,
- narrow stress width around 320px,
- horizontal overflow,
- keyboard focus reachability,
- an optional text-status convention.

Consumers should adapt paths, selectors, and assertions to their own `PRODUCT.md` / `DESIGN.md`. Do not add `data-review-status` or other testing hooks blindly when a more semantic product-specific assertion exists.

Visible focus styling is intentionally not prescribed by the template. A consumer may use outline, shadow, border, background, or another accessible treatment; validate the approved treatment in the consumer where automation is worthwhile.
