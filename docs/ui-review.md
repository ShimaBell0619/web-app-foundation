# Rendered UI review guidance

Source inspection, linting, type checking, and a successful production build do not prove that a user-facing interface is visually coherent or usable. Web App Foundation consumers should review meaningful UI changes in the rendered application and judge them against the product contract, not against a generic idea of what a modern dashboard should look like.

This guide defines a review method. It does **not** define a shared visual style.

## Start from product intent

Before generating or revising UI, read `PRODUCT.md` and the application's `DESIGN.md` and be able to state, in one short sentence, the product-specific design direction for the affected experience.

A useful direction links presentation to the user's task or data. Examples of the form, not reusable styles:

- a date-first operational view where upcoming deadlines dominate,
- a dense comparison surface where differences between records dominate,
- a quiet reading workspace where content continuity dominates.

A weak direction describes only generic appearance, for example “clean modern SaaS”, “premium dashboard”, or “minimal cards”. Those phrases do not explain why the product needs a particular hierarchy, surface, type treatment, or decoration.

The application `DESIGN.md` should also identify:

- the primary user task,
- the information that must dominate first glance,
- secondary/supporting information,
- semantic color roles,
- typography roles,
- why surfaces/cards or other containers are used,
- responsive priority when space becomes constrained,
- accessibility decisions that materially affect the design.

## Separate primitive quality from composition quality

Review the generic control layer and the page composition as separate quality dimensions. A screen can use excellent accessible primitives and still have weak UX because the hierarchy, area allocation, grouping, duplication, or task flow is wrong. Conversely, a distinctive composition is not a reason to accept fragile custom control behavior.

For consumers using the default React profile in `docs/ui-implementation.md`:

- **primitive quality** covers semantic HTML, keyboard/focus behavior, labels and accessible names, disabled/error states, target sizing, dialog/popover behavior, and consistency of generic controls;
- **composition quality** covers information hierarchy, primary-versus-supporting area allocation, grouping, repeated information, semantic component boundaries, responsive ordering, density, typography, and whether the user can move from state recognition to the next relevant action.

Do not respond to a composition problem by discarding a sound primitive foundation merely to make the UI appear more custom. Change the composition, semantic components, tokens, or hierarchy first when those are the actual source of the problem.

## Generic / AI-template review signals

The following patterns are review signals, not forbidden components. Any of them can be appropriate when the product semantics justify them.

Question their use when they appear by default:

- equal KPI cards for information with unequal importance,
- repeated rounded cards or pills that add containment without clarifying grouping or interaction,
- repeated Card + Icon + Heading + muted-copy composition inherited from a component-library demo rather than the product hierarchy,
- identical radius/shadow/elevation treatment across unrelated component roles,
- icons inside soft tinted boxes merely to decorate headings,
- decorative gradients, glows, or abstract orbs unrelated to product data or workflow,
- uppercase eyebrow labels or numbered sections that do not improve navigation or comprehension,
- progress bars where the underlying value is not actually progress toward a meaningful completion state,
- duplicated dates, status values, or KPIs shown several times only to fill visual regions,
- product or qualification codes turned into invented badges/emblems that imply identity they do not have,
- uniform three-column/four-column layouts chosen before information priority is known,
- direct imitation of a vendor/product UI when the consumer's task differs from the source product.

The corrective question is not “how do we remove cards?” It is:

> What product, data, workflow, or accessibility reason explains this element and its visual weight?

If there is no useful answer, simplify it or replace it with a structure that exposes the real hierarchy.

## Render → critique → fix → re-render

For a material user-facing change:

1. **Render** the actual implementation with representative content.
2. **Critique** the rendered result independently of implementation effort.
3. **Fix** the highest-impact hierarchy, layout, wrapping, accessibility, or semantic problems.
4. **Re-render** after the corrections rather than assuming CSS/code changes had the intended effect.
5. Repeat until the remaining findings are non-material or explicitly accepted.

Review the result as if another engineer or designer authored it. Do not preserve an element merely because it took time to build.

When practical, keep screenshots or a temporary preview as review evidence, but screenshots are not a substitute for behavioral assertions or interactive testing.

## Minimum viewport baseline

The default review baseline for a browser-first consumer is:

| View | Width | Purpose |
| --- | ---: | --- |
| Desktop | about 1440px | wide hierarchy, density, alignment, over-expansion |
| Mobile | about 390px | normal narrow-phone layout, wrapping, tap/reading order |
| Narrow boundary | 320px | stress test for overflow and brittle fixed sizing |

These are review baselines, not supported-device promises and not breakpoints that every product must use. Add other widths when the product targets tablets, foldables, embedded panes, split view, very wide data tables, or another material layout boundary.

At each relevant width, check at minimum:

- no unintended horizontal overflow,
- primary information remains identifiable,
- long real-world text wraps without clipping or destructive truncation,
- controls remain reachable and appropriately sized,
- reading/order hierarchy still matches the product intent,
- sticky/fixed regions do not cover essential content.

## Keyboard, focus, and semantic state

Rendered review should include keyboard navigation for the affected flow.

Check that:

- keyboard users can reach interactive elements in a logical order,
- focus is visibly distinguishable on the actual rendered background,
- focus is not clipped by overflow containers,
- essential state is not communicated by color alone,
- status/progress semantics match the underlying data,
- headings, landmarks, controls, tables/lists, dialogs, and labels use meaningful HTML/ARIA semantics where appropriate.

A green dot next to “Active” can be meaningful. A green dot with no text or accessible name is not sufficient. Likewise, a progress bar should represent real progression, not merely the fraction of time elapsed unless the product explicitly treats that as progress.

## Japanese and CJK rendering

Japanese/CJK interfaces require rendered validation rather than assuming Latin-focused typography behaves the same way.

### Line breaking

Long Japanese headings and labels can break at grammatically awkward positions even when they technically fit the container.

- Test representative Japanese/CJK strings at narrow widths.
- Prefer natural wrapping first.
- When a high-value heading repeatedly breaks badly, group meaningful phrase units with carefully chosen spans or appropriate line-break controls.
- Do not hard-code line breaks for one screenshot if they make other widths worse.

### Font fallback

A font stack that names only a Latin font can render CJK characters with an environment-dependent fallback. Linux Chromium used in CI may choose a noticeably different serif/sans face from Windows, macOS, Android, or iOS.

- If typography consistency matters, include an appropriate CJK-capable sans/serif fallback strategy instead of relying blindly on the operating system.
- Do not ship a large webfont only to make CI screenshots identical unless the product actually requires that font.
- Treat CI screenshots as evidence from one rendering environment and inspect a real target device when typography is release-critical.

## Automation boundary

The Foundation does not require every consumer to add a visual-regression service or a large browser matrix.

Automate cheap, durable invariants such as:

- horizontal overflow,
- key element visibility,
- keyboard reachability/focus evidence,
- required text status alongside color/shape,
- critical responsive ordering.

Keep product-specific selectors and assertions in the consumer repository. Foundation provides a copyable example at `templates/e2e/rendered-ui-review.spec.mjs`; it is not a runtime dependency or universal test suite.

Pixel-perfect screenshot diffs are optional. Use them only when their maintenance cost is justified by the stability and importance of the protected UI.

## Responsibility boundary

- `PRODUCT.md` owns product behavior, scope, and non-goals.
- `DESIGN.md` owns the application's visual direction, hierarchy, interaction presentation, and design rationale.
- `AGENTS.md` owns repeatable implementation/review behavior.
- Foundation owns reusable guidance/templates and shared engineering contracts, including the default primitive-first implementation profile in `docs/ui-implementation.md`.

Do not copy a consumer's specific colors, motifs, wording, credential/calendar metaphors, or layout into Foundation merely because that consumer produced a useful design lesson. Generalize the decision method, not the product skin.
