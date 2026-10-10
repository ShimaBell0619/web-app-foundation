# Primitive-first UI implementation profile

This document defines the default UI implementation profile for the current React-oriented Web App Foundation baseline. It complements `DESIGN.md`, which owns product-specific experience and visual direction, and `docs/ui.md`, which owns the rendered-review method.

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
6. Run the rendered-review loop from `docs/ui.md` and correct hierarchy/composition issues without discarding sound primitive foundations merely to appear more custom.

For an existing consumer, migrate incrementally when practical. Do not mix two interaction implementations indefinitely, but do not rewrite stable generic controls without a clear migration goal.

## Review boundary

Review both layers independently:

- **primitive quality**: semantics, keyboard behavior, focus, labels, disabled/error states, overlay behavior, accessible names, consistency;
- **composition quality**: hierarchy, area allocation, grouping, duplication, task flow, responsive ordering, typography, density, and whether supporting features displace primary work.

A screen can use excellent primitives and still have poor UX because its composition is wrong. Conversely, a visually distinctive composition is not a reason to accept fragile custom control behavior.

Use `docs/ui.md` for render → critique → fix → re-render and the 1440px / 390px / 320px baseline.

## Provenance of this profile

This profile was generalized after a real consumer migration and follow-up UX review. The evidence showed that a mature primitive foundation could remain intact while the page-level information architecture was redesigned substantially. The Foundation therefore generalizes the layering decision, not the consumer's colors, density, domain components, timelines, or page layout.


---

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

For consumers using the default React profile in `docs/ui.md`:

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

## Chatからの実ブラウザ検証

Chat内でブラウザにアクセスできない場合、先に**GitHub ActionsでPlaywrightを実行する経路**を検討する。アプリ側が実装とセレクターを所有し、必要なときに以下を確認できるようにする。

- 実際のPRのビルド／信頼済みPreview／公開ページを、出所と対象SHAを明示して検証する。静的モックは実画面検証の代替ではない。
- 320・390・1440pxのoverflow、重要な見出しや状態、Tab移動と可視フォーカスを最低限確認する。失敗は非ゼロ終了させ、スクリーンショットやPlaywrightレポートを**機密を含まない**短期成果物に保存する。
- Chatから成果物、実行ログ、ワークフロー完了状態を取得して検証する。Previewのビルド成功やHTTP 200、APIのJSON構造成功とブラウザ実表示は別の証拠とする。
- 本番データを使用する場合は低機密の閲覧許可済みデータに限定し、認証セッション、秘密情報、個人情報がスクリーンショット・trace・成果物に混入しないようにする。
- 過剰なブラウザマトリクス、Visual Regressionサービス、恒久的な常時起動ブラウザは既定にしない。必要なアプリだけ`test:e2e`または明示的な`/ui-review`のような信頼済みWorkflowを追加する。
- UIに接続できない場合は検証不能と報告する。**Workへはユーザーが明示指示した場合のみ移行する。**

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
- Foundation owns reusable guidance/templates and shared engineering contracts, including the default primitive-first implementation profile in `docs/ui.md`.

Do not copy a consumer's specific colors, motifs, wording, credential/calendar metaphors, or layout into Foundation merely because that consumer produced a useful design lesson. Generalize the decision method, not the product skin.
