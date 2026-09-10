---
version: alpha
name: Web App Foundation
description: Shared UI, UX, and design-system baseline for web applications.
omitted:
  - section: colors
    reason: Application-specific semantic colors are defined when each product is created.
  - section: typography
    reason: Application-specific typography is defined when each product is created.
  - section: spacing
    reason: Application-specific spacing tokens are defined when the layout language is established.
  - section: rounded
    reason: Application-specific shape tokens are defined when the visual language is established.
  - section: components
    reason: Reusable product components are introduced only after real interaction or visual patterns exist.
---

# Design System

## Overview

This file is the shared design baseline for web applications derived from this Foundation. Each application should copy it to `DESIGN.md`, replace the front-matter name/description, add concrete design tokens, and evolve the prose as the product's living visual and interaction source of truth.

`DESIGN.md` is for **UI/UX and design-system decisions**. Product behavior belongs in `PRODUCT.md`; engineering workflow belongs in `AGENTS.md`; substantial technical architecture belongs in `docs/ARCHITECTURE.md`.

The Google DESIGN.md alpha structure used here was reviewed against `google-labs-code/design.md` commit `9bf8eae67128b6cc55ad9bf86665767deb4c11cd` (release 0.4.0). When updating the schema, review the upstream specification deliberately rather than assuming `main` is unchanged.

Design for the user's task first. Prefer clear hierarchy, predictable interaction, accessible controls, and restrained visual complexity over decorative novelty.

Before substantial UI implementation, define a **product-specific design direction** in one short sentence. The direction should connect presentation to the product's task, data, or workflow rather than describing generic appearance such as “clean modern SaaS”. Use that direction to resolve visual choices consistently.

Each application should make the following rationale explicit in `DESIGN.md` when relevant:

- primary user task and information hierarchy,
- what must dominate the first glance and what is secondary,
- semantic color roles,
- typography roles,
- why cards/surfaces or other containers exist,
- responsive priority when space becomes constrained,
- accessibility decisions that materially shape the presentation,
- recurring generic patterns the product deliberately avoids and why.

The Foundation does not prescribe a shared product skin. Do not copy another consumer's colors, radii, typography, motifs, or dashboard structure merely because that consumer validated a useful design principle.

Implementation primitives and product visual identity are separate concerns. For the current React baseline, `docs/ui-implementation.md` defines the default primitive-first layering; this `DESIGN.md` remains authoritative for the application's information hierarchy, composition, token meaning, typography, density, and visual rationale.

## Colors

- Define semantic roles rather than scattering literal colors through components.
- Support sufficient contrast for text, icons, controls, focus indicators, and status states.
- Do not rely on color alone to communicate required meaning.
- Light/dark/system appearance should be an explicit product decision rather than an accidental side effect.
- Decorative accent colors, gradients, and glows should have a product or hierarchy rationale rather than appearing because a library makes them available.
- Keep product-specific token values in the application `DESIGN.md` and implementation theme.

## Typography

- Define a small, intentional hierarchy for headings, body text, labels, metadata, codes, dates, or other product-specific information roles.
- Prefer readable line lengths and comfortable default sizes.
- Respect browser/user zoom and text scaling.
- Avoid near-duplicate type styles that add complexity without improving hierarchy.
- Validate long representative content in the rendered UI; typography is not complete if real text clips or breaks destructively.
- For Japanese/CJK products, consider explicit CJK-capable fallback families when environment-dependent fallback materially changes the intended typography.
- Record product-specific font families and token values in the application's `DESIGN.md`.

## Layout

- Start from the primary task and content hierarchy rather than a framework grid.
- Let unequal information importance produce unequal visual weight when appropriate; do not force equal cards/columns solely for symmetry.
- Design responsive behavior from actual available viewport/container space.
- Avoid layouts that merely stretch compact content across large screens.
- Keep important actions reachable and preserve usable information density across narrow and wide layouts.
- Prevent unintended horizontal overflow.
- Use stable spacing tokens instead of arbitrary per-component values once a spacing scale exists.
- Treat touch, pointer, keyboard, and resizable-window usage as first-class web interaction modes where relevant.
- Record which information compresses, reorders, wraps, or disappears first when space is constrained.

## Elevation & Depth

- Prefer surface hierarchy, borders, spacing, and contrast before strong shadows.
- Use elevation to communicate layering or interaction, not as decoration.
- Keep overlays, popovers, dialogs, and sticky regions visually distinguishable from underlying content.
- Do not create independent surfaces for every content block; containment should clarify grouping, interaction, or hierarchy.

## Shapes

- Use a small, consistent radius vocabulary.
- Shape differences should reinforce component role or product identity.
- Avoid arbitrary radius changes between equivalent components.
- Do not use pills, soft icon boxes, circles, or badge-like shapes as generic decoration when they do not encode role, state, action, or product identity.

## Components

- Prefer semantic HTML and accessible platform behavior before custom interaction primitives.
- For the current React baseline, start common controls from the default profile in `docs/ui-implementation.md`: Tailwind CSS styling infrastructure plus shadcn/ui-style accessible generic primitives where applicable.
- Keep generic primitive code free of product-domain meaning, and build product-specific semantic components above it.
- Reuse proven component primitives when they improve accessibility and consistency.
- Create app-specific reusable components only when a real pattern repeats or expresses a durable product interaction rule.
- Derive product identity from hierarchy, composition, typography, semantic color, density, data presentation, and interaction flow rather than bespoke reinvention of routine controls.
- Keep specialist custom CSS when it clearly improves a product-specific visualization or interaction that generic utilities/primitives do not express well.
- Preserve keyboard navigation, focus visibility, labels/names, error association, and appropriate target sizes.
- Model loading, empty, error, disabled, selected, and success states deliberately when relevant.
- Use progress indicators only when the underlying value represents meaningful progress or completion semantics.
- Avoid duplicating the same status, KPI, date, or identifier in several components merely to fill visual regions.
- Do not turn product codes/identifiers into invented emblems or badges if that treatment implies meaning the underlying data does not have.

## Do's and Don'ts

### Do

- Make the primary task and primary action obvious.
- Be able to explain the visual weight of important elements in terms of product data, workflow, hierarchy, or accessibility.
- Treat equal KPI grids, repeated cards/pills, soft icon boxes, decorative gradients/glows/orbs, uppercase eyebrow labels, and numbered sections as **review signals**, not automatically correct defaults or automatic violations.
- Validate important UI changes in the actual rendered application, not only by source inspection.
- Use a render → critique → fix → re-render loop for material user-facing changes.
- Check roughly 1440px desktop, 390px mobile, and 320px narrow layouts as a default baseline, then add product-specific boundaries where needed.
- Check horizontal overflow, long-text wrapping, keyboard/focus behavior, and state semantics in rendered validation.
- For Japanese/CJK interfaces, inspect line breaks and font fallback in the actual target rendering environment.
- Use design tokens to keep implementation consistent with this document.
- Prefer progressive enhancement and resilient browser behavior when practical.
- Keep the canonical Google DESIGN.md section order when editing this file.

### Don't

- Do not put product requirements, release policy, or detailed system architecture into `DESIGN.md`.
- Do not introduce a bespoke design system before the product demonstrates a need.
- Do not use motion, shadows, gradients, glass effects, cards, pills, icon boxes, or visual density merely because a UI library or AI generator makes them easy.
- Do not treat generic phrases such as “modern dashboard” or “clean SaaS” as sufficient design rationale.
- Do not mechanically ban common visual patterns in the name of avoiding AI-generated design; require a product reason and keep useful patterns when they genuinely serve the task.
- Do not copy a component-library demo/page composition and treat primitive defaults as the product information architecture.
- Do not imitate a vendor's visual language when the consumer's task or information hierarchy is different.
- Do not hide essential actions behind hover-only behavior.
- Do not treat a single desktop screenshot as responsive validation.
- Do not make an external design file the only source of truth required for routine AI implementation.

See `docs/ui-implementation.md` for the primitive-first implementation profile and `docs/ui-review.md` for the rendered-review method, generic/AI-template review signals, viewport baseline, accessibility checks, and Japanese/CJK rendering notes.

Google's DESIGN.md format is currently alpha. Preserve valid machine-readable front matter, prefer the reviewed published schema over invented fields, and keep unsupported but important design rationale in Markdown prose until the specification can represent it directly.
