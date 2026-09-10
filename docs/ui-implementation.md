# Primitive-first UI implementation profile

This document defines the default UI implementation profile for the current React-oriented Web App Foundation baseline. It complements `DESIGN.md`, which owns product-specific experience and visual direction, and `docs/ui-review.md`, which owns the rendered-review method.

The goal is to avoid two opposite failure modes:

1. rebuilding generic controls and accessibility behavior from scratch only to make the application feel "custom";
2. assembling an application from component-library demo layouts until every product looks like the same generic SaaS template.

The Foundation instead separates **primitive quality** from **product composition**.

## Default layering

For a new React + TypeScript browser-first consumer, use this layering as the default starting point:

```text
PRODUCT.md / DESIGN.md
        ↓
page composition + product-specific semantic components
        ↓
generic primitive layer (for example components/ui)
        ↓
Tailwind CSS styling infrastructure + design tokens
        ↓
semantic HTML / browser behavior / accessible primitive internals
```

The current recommended implementation profile is:

- **Tailwind CSS** as styling infrastructure and token/application-theme wiring;
- **shadcn/ui-style accessible primitives** for common controls, using source-owned components and Radix or equivalent accessible internals where they add value;
- application-owned **product-specific semantic components** above those generic primitives.

This is a default profile, not a shared visual skin and not a universal framework dependency.

## Generic primitives

Common controls should normally start from mature, accessible primitives rather than bespoke application CSS/interaction code. Typical examples include Button, Dialog, Input, Select, DropdownMenu, Tooltip, Tabs, Checkbox, and reusable Table or Skeleton patterns.

Keep the generic primitive layer free of product-domain meaning. A directory such as `components/ui` may define a button's size, focus treatment, disabled behavior, or reusable visual variants, but it should not know about a specific credential, invoice, deployment, booking, or other product concept.

Source-owned shadcn/ui-style code remains application code. Review it like any other dependency boundary: keep only the primitives the product needs, preserve accessibility behavior, and avoid turning generated source into an unreviewed dumping ground for product-specific variants.

## Product-specific semantic components

Product meaning belongs above the generic primitive layer. Prefer APIs named after durable product concepts or user tasks rather than arbitrary visual appearance.

A semantic component may compose generic buttons, dialogs, tables, icons, typography, and tokens, while owning product-specific rules such as:

- which state is most important;
- which action should dominate;
- how domain data is grouped or compared;
- when information is hidden, condensed, or reordered responsively;
- what text accompanies a color/icon state;
- what empty, warning, success, or error state means to the user.

Product identity should primarily come from information hierarchy, composition, typography, semantic color, density, data presentation, and interaction flow—not from reimplementing ordinary controls solely to look unique.

## Composition is not inherited from the component library

Using shadcn/ui-style primitives does **not** make shadcn demo/page composition the application's information architecture.

Treat the following as composition review signals rather than component bans:

- wrapping every section in Card/Surface;
- repeating Card + Icon + Heading + muted-copy structures;
- using Badge/pill treatment for every status or metadata value;
- equal KPI cards for information with unequal importance;
- applying the same radius, shadow, and elevation to every region;
- adding a marketing-style hero to a task-oriented tool without a product reason;
- decorative gradients, glows, or large whitespace whose only rationale is "modern";
- copying a component-library demo/page composition and replacing only the text.

Cards, badges, radii, shadows, popovers, dialogs, and other common affordances remain valid when they clarify grouping, state, action, or layering. The corrective question is whether the element's role and visual weight are justified by product data, workflow, hierarchy, or accessibility.

## Tailwind and design tokens

Tailwind CSS is infrastructure, not product identity. Use semantic theme variables/tokens for durable roles such as background, surface, foreground, muted text, border, primary action, warning, success, radius, shadow, spacing, and typography where the product needs them.

Avoid scattering one-off literal values until utilities themselves become an accidental, undocumented design system. The application's `DESIGN.md` remains authoritative for token intent and product-specific visual rationale.

## Specialist custom CSS

Tailwind utilities and generic primitives are the default, not a prohibition on CSS.

**Specialist custom CSS** is appropriate when a product-specific visualization or interaction is materially clearer that way—for example proportional timelines, unusual data-density layouts, complex map/chart overlays, or another visualization whose semantics do not map cleanly to standard primitives.

Do not use custom CSS to rebuild routine focus handling, dialog overlays, keyboard navigation, input states, or standard button behavior that a proven primitive already supplies.

## Existing consumers and deviations

Existing consumers are not required to migrate solely because this profile becomes the Foundation default. A migration should have a real objective—accessibility, maintainability, consistency, UI redesign, or another approved benefit—and should be reviewed as a material UI change.

React/Next.js consumers may normally use the same profile where it fits their architecture. A non-React consumer, an application with an established accessible design system, or a product with a justified incompatible constraint may use an equivalent mature primitive approach instead.

Record meaningful deviations in the consumer's `DESIGN.md`, `AGENTS.md`, or Foundation provenance as appropriate. The required invariant is the responsibility boundary: generic control behavior should be solved at the primitive layer, while product identity and semantics remain application-owned.

## Adoption sequence

For a new React consumer:

1. Define the product task, information hierarchy, and visual direction in `PRODUCT.md` / `DESIGN.md` before choosing page composition.
2. Establish Tailwind CSS and semantic design tokens.
3. Add only the generic shadcn/ui-style primitives currently needed by the application.
4. Build product-specific semantic components above those primitives.
5. Compose the page from the product hierarchy rather than a component-library demo layout.
6. Run the rendered-review loop from `docs/ui-review.md` and correct hierarchy/composition issues without discarding sound primitive foundations merely to appear more custom.

For an existing consumer, migrate incrementally when practical. Do not mix two interaction implementations indefinitely, but do not rewrite stable generic controls without a clear migration goal.

## Review boundary

Review both layers independently:

- **primitive quality**: semantics, keyboard behavior, focus, labels, disabled/error states, overlay behavior, accessible names, consistency;
- **composition quality**: hierarchy, area allocation, grouping, duplication, task flow, responsive ordering, typography, density, and whether supporting features displace primary work.

A screen can use excellent primitives and still have poor UX because its composition is wrong. Conversely, a visually distinctive composition is not a reason to accept fragile custom control behavior.

Use `docs/ui-review.md` for render → critique → fix → re-render and the 1440px / 390px / 320px baseline.

## Provenance of this profile

This profile was generalized after a real consumer migration and follow-up UX review. The evidence showed that a mature primitive foundation could remain intact while the page-level information architecture was redesigned substantially. The Foundation therefore generalizes the layering decision, not the consumer's colors, density, domain components, timelines, or page layout.
