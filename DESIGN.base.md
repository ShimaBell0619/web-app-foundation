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

Design for the user's task first. Prefer clear hierarchy, predictable interaction, accessible controls, and restrained visual complexity over decorative novelty.

## Colors

- Define semantic roles rather than scattering literal colors through components.
- Support sufficient contrast for text, icons, controls, focus indicators, and status states.
- Do not rely on color alone to communicate required meaning.
- Light/dark/system appearance should be an explicit product decision rather than an accidental side effect.
- Keep product-specific token values in the application `DESIGN.md` and implementation theme.

## Typography

- Define a small, intentional hierarchy for headings, body text, labels, and metadata.
- Prefer readable line lengths and comfortable default sizes.
- Respect browser/user zoom and text scaling.
- Avoid near-duplicate type styles that add complexity without improving hierarchy.
- Record product-specific font families and token values in the application's `DESIGN.md`.

## Layout

- Start from the primary task and content hierarchy rather than a framework grid.
- Design responsive behavior from actual available viewport/container space.
- Avoid layouts that merely stretch compact content across large screens.
- Keep important actions reachable and preserve usable information density across narrow and wide layouts.
- Prevent unintended horizontal overflow.
- Use stable spacing tokens instead of arbitrary per-component values once a spacing scale exists.
- Treat touch, pointer, keyboard, and resizable-window usage as first-class web interaction modes where relevant.

## Elevation & Depth

- Prefer surface hierarchy, borders, spacing, and contrast before strong shadows.
- Use elevation to communicate layering or interaction, not as decoration.
- Keep overlays, popovers, dialogs, and sticky regions visually distinguishable from underlying content.

## Shapes

- Use a small, consistent radius vocabulary.
- Shape differences should reinforce component role or product identity.
- Avoid arbitrary radius changes between equivalent components.

## Components

- Prefer semantic HTML and accessible platform behavior before custom interaction primitives.
- Reuse proven component primitives when they improve accessibility and consistency.
- Create app-specific reusable components only when a real pattern repeats or expresses a durable product interaction rule.
- Preserve keyboard navigation, focus visibility, labels/names, error association, and appropriate target sizes.
- Model loading, empty, error, disabled, selected, and success states deliberately when they are relevant to the component.

## Do's and Don'ts

### Do

- Make the primary task and primary action obvious.
- Validate important UI changes in the actual rendered application, not only by source inspection.
- Check narrow and wide layouts, keyboard operation, focus behavior, and meaningful loading/error/empty states.
- Use design tokens to keep implementation consistent with this document.
- Prefer progressive enhancement and resilient browser behavior when practical.
- Keep the canonical Google DESIGN.md section order when editing this file.

### Don't

- Do not put product requirements, release policy, or detailed system architecture into `DESIGN.md`.
- Do not introduce a bespoke design system before the product demonstrates a need.
- Do not use motion, shadows, gradients, glass effects, or visual density merely because a UI library makes them easy.
- Do not hide essential actions behind hover-only behavior.
- Do not treat a single desktop screenshot as responsive validation.
- Do not make an external design file the only source of truth required for routine AI implementation.

Google's DESIGN.md format is currently alpha. Preserve valid machine-readable front matter, prefer the published schema over invented fields, and keep unsupported but important design rationale in Markdown prose until the specification can represent it directly.
