# Context-routed AI implementation profile

This guide defines the default operating method for implementing Web App Foundation consumers primarily through a normal Chat-based coding agent. It extends the existing Issue-driven development, approval boundaries, mandatory self-review, rendered UI review, independent-review policy, and primitive-first UI profile. It does not replace those contracts.

The objective is to reduce repository I/O without allowing speed optimizations to weaken design fidelity, conflict detection, security, or validation.

## Core flow

```text
User request / Issue
        ↓
Change classification
        ↓
Context Routing
        ↓
Repository Context Packet (session-local)
        ↓
Design Intent extraction
        ↓
Implementation Map
        ↓
coherent implementation batch
        ↓
focused validation
        ↓
self-review against Design Intent + final diff
        ↓
correction batch when needed
        ↓
final validation
        ↓
risk-based independent-review decision
```

The repository contracts remain the source of truth. The session-local packet is only a compact working snapshot of the contracts and evidence relevant to the current Issue.

## Change classification

Classify a material change before implementation. Use the smallest useful set of areas and combine them when the change crosses boundaries.

| Change area | Typical scope |
| --- | --- |
| Product behavior | User-visible capability, workflow, compatibility, or product promise |
| Product design / UX | Information hierarchy, composition, interaction presentation, responsive priority |
| UI infrastructure | Generic primitives, design-token wiring, styling infrastructure, UI-library integration |
| Domain / data | Domain model, persistence, migration, retention, data lifecycle |
| Integration / trust | Authentication, authorization, external APIs, external transmission, secrets, trust boundaries |
| Architecture / platform | Runtime, framework boundary, service decomposition, platform capability |
| Delivery / operations | CI, release, deployment, staging, rollback, operational automation |
| Local implementation / refactor | Local structure or implementation that preserves approved external behavior |

Foundation adoption is a cross-cutting flag rather than a separate change area. Risk is also assessed separately: classification routes context; the approval-required and independent-review rules decide who must approve or review the change.

Do not create a more detailed taxonomy merely to appear precise. Add a new route only when a real repository contract cannot be selected reliably with the existing areas.

## Context Routing

Each adopting repository keeps a small `## Context routing` index in `AGENTS.md`. The index maps change areas or explicit cross-cutting conditions to the normative specialist documents that must be loaded in addition to the base route.

The base route for every material change is:

- the Issue / approved request and Acceptance Criteria;
- `PRODUCT.md` when the repository is a product consumer;
- `AGENTS.md`;
- Foundation provenance such as `docs/FOUNDATION.md` when present and relevant to Foundation-derived rules.

Add routes only for material context. Typical examples are:

| Change area | Additional required context |
| --- | --- |
| Product design / UX | `DESIGN.md` |
| UI infrastructure | `DESIGN.md` plus the adopted UI implementation/review contract |
| Domain / data | the repository's domain and architecture contracts |
| Integration / trust | integration-specific contract plus architecture/security contract |
| Architecture / platform | architecture/compatibility contract |
| Delivery / operations | deployment, release, staging, or operations contract for the affected path |
| Foundation adoption | Foundation provenance plus the target Foundation guidance/change notes |

These names are examples, not a requirement to create every file. A repository registers the actual normative paths it owns.

Routing rules:

1. Matching routes are additive; load the union of required contracts.
2. A normative specialist document must be registered when it is created, renamed, or retired if future implementation depends on agents discovering it.
3. Do not load every Markdown file by default. History, notes, and non-normative documentation are not implementation contracts merely because they exist.
4. `README.md` is loaded when public/contributor/runtime usage documentation is affected; it is not promoted into the product contract.
5. If implementation discovery expands into an un-routed area or new trust/responsibility boundary, pause writes to that new surface, extend routing, and refresh the packet first.
6. If routed contracts conflict with the Issue or one another, use the existing approval-required decision rules; do not silently choose the convenient interpretation.

## Repository Context Packet

Build one Repository Context Packet at the start of an Issue. It is session-local working state, not a new repository artifact and not a second source of truth.

A packet contains only implementation-relevant information:

```text
Identity
- repository
- Issue / approved request
- base SHA
- current working HEAD

Classification
- change areas
- cross-cutting flags
- matched routes

Sources
- contract paths and relevant sections/headings
- relevant implementation/test surfaces

Acceptance Criteria
- observable completion conditions

Design Intent
- primary product intent
- requested delta
- must preserve
- may change
- must not change
- responsibility / trust boundaries
- explicit non-goals

Implementation Map
- contract / AC -> implementation surface -> validation evidence

Validation / review profile
- focused checks
- full validation
- rendered checks when applicable
- independent-review risk decision

Observed evidence
- resource/revision/run identifiers already observed and useful for reuse
- validation results tied to a specific reviewed SHA when applicable

State
- unresolved conflicts / approvals
- rerouting triggers
- staleness observations
```

The packet should reference source paths/sections rather than copy large blocks of contract prose. Do not commit the packet as `CONTEXT.md`, paste it wholesale into an Issue, or treat chat memory as authoritative when it conflicts with the repository revision recorded in the packet.

Retain only enough observed evidence to avoid rediscovering resources that are already identified for this session. This is not a persistent cache: the observation remains useful only while its revision or resource identity still supports the current decision.

## Design Intent extraction

After loading routed contracts, compress only the constraints that affect the current change before choosing implementation details.

Treat:

- current repository contracts as the approved baseline;
- the current Issue and explicit approved decisions as the intended delta.

Use the following structure when relevant:

```text
Primary product intent:
Requested change:
Must preserve:
May change:
Must not change:
Architecture / responsibility boundaries:
Trust boundaries:
Validation requirements:
Explicit non-goals:
```

Preserve source pointers for material constraints. The extraction must not invent a new normative rule that cannot be traced to an approved request, contract, or decision.

For Foundation-derived technical standards, distinguish applying an implementation contract from redesigning the product. A newer standard is not itself an objective for replacing stable consumer code. Migration requires an approved benefit such as accessibility, maintainability, compatibility, security, or a bounded product/design objective.

## Implementation Map

Before the first implementation write, map each material Acceptance Criterion or Design Intent constraint to the implementation surface and the evidence that will prove it.

```text
Design contract / Acceptance Criterion
        -> implementation surface
        -> validation evidence
```

Use coherent granularity such as a component family, service boundary, workflow, data path, or related test group. Do not create a line-by-line plan whose maintenance costs more than implementation.

Unexpected scope is a signal, not permission to improvise. If a new surface crosses a routing, approval, security, persistence, public-contract, or deployment boundary, update classification/routing and the map before changing it.

## Complexity discipline

Prefer the smallest coherent solution that satisfies the current Acceptance Criteria and Design Intent. Overengineering is a contract violation when complexity is added without a present justification.

Do not introduce a new abstraction, layer, dependency, service, configuration format, generated framework, workflow, permanent document, or compatibility adapter solely for hypothetical future reuse, stylistic purity, or conformity with a newer standard.

Additional complexity must be justified by at least one current fact:

- an Acceptance Criterion or approved product requirement needs it;
- an existing responsibility, lifecycle, security, trust, compatibility, or substitution boundary needs an explicit owner;
- repeated behavior already exists and a shared abstraction removes real duplication or inconsistency;
- measured performance/operational evidence requires it;
- a proven Foundation contract explicitly requires it for the adopting scope.

Even when one condition applies, choose the least powerful mechanism that solves the problem. Prefer a direct local implementation over a generic framework when both satisfy the same current contract.

During self-review, actively remove speculative flexibility, unused extension points, unnecessary indirection, duplicate configuration, and abstractions that merely rename an existing API. Do not broaden the current Issue just to make an implementation look architecturally complete.

This rule does not prohibit complexity that the product genuinely requires. Security boundaries, failure recovery, concurrency correctness, migration safety, accessibility behavior, and validation must not be simplified merely to reduce code size.

## Bootstrap Read

At the start of a new Issue, plan and perform a Bootstrap Read in coherent groups:

1. resolve current base-branch SHA and the Issue / Acceptance Criteria;
2. load `AGENTS.md`, the base route, and matched routed contracts;
3. inspect enough repository structure to locate the affected implementation and tests;
4. fetch the relevant implementation/test surfaces together;
5. build the packet, Design Intent, and Implementation Map before the first implementation write.

Prefer one tree/directory discovery pass plus grouped contract/code/test reads over repeated file-by-file exploration.

Do not read every repository document preemptively. Read additional material when routing, references from an authoritative contract, or implementation discovery makes it relevant.

## Incremental Read and staleness

After the bootstrap, do not repeat the entire read phase for every correction.

Incremental Read should normally focus on:

- current working HEAD and current/final diff;
- changed implementation files;
- affected tests;
- newly affected contracts/routes;
- external documentation only when a material version/runtime/API uncertainty has appeared.

Reuse observations that are explicitly bound to an unchanged revision or stable resource identity instead of repeating broad discovery. For example, a file already fetched at the recorded commit SHA does not need to be fetched again merely to reconfirm the same content.

Mutable current state is different: refresh it when the answer depends on its current value, when a write may have changed it, or when an existing staleness/rerouting trigger applies. Once a workflow run or job ID is known, poll that known resource directly rather than repeatedly rediscovering it from a broad run listing unless discovery itself must be refreshed.

If the base branch advances, compare the original base with the new base. Refresh the packet when the drift changes a routed contract, implementation surface, relevant test, dependency/runtime assumption, or conflict-sensitive file. Do not invalidate the entire packet only because an unrelated commit landed.

Before updating a branch ref, verify the observed branch HEAD is still the expected parent. Use non-force/fast-forward updates by default and reconcile unexpected movement rather than overwriting newer work.

## GitHub read/write batching

Repository I/O should follow the implementation map.

Preferred read pattern:

```text
base SHA + Issue
        ↓
repository/tree discovery
        ↓
routed contract batch
        ↓
implementation + test batch
```

When discovery returns a stable identifier or revision-bound resource, retain and reuse it for subsequent direct reads or polling. Do not rerun repository-wide search/list operations only to recover an identifier already known to the current packet.

Preferred write pattern for a coherent multi-file change when Git data operations are available:

```text
create changed blobs
        ↓
create one tree from the observed base tree
        ↓
create commit
        ↓
fast-forward feature-branch ref
```

For a genuinely small one-file change, a simpler contents update is preferable. Do not require Git-tree plumbing when it adds more complexity than it saves.

One Issue does not have to equal one commit. The unit to optimize is a coherent candidate: related changes that can be understood and validated together. Do not combine unrelated work merely to reduce API calls.

## Validation batching

Validation is phase-gated rather than commit-gated.

A normal material change uses:

```text
implementation batch
        ↓
cheap/focused validation where useful
        ↓
full relevant CI / validation
        ↓
self-review
        ↓
correction batch if required
        ↓
final relevant validation
```

Do not run the entire CI suite after every tiny edit. Conversely, do not defer all validation until a large unreviewable change has accumulated. The coherent candidate defined by the Implementation Map is the normal validation boundary.

When an Acceptance Criterion says existing behavior must be preserved but the Implementation Map reveals that proof is missing, distinguish an evidence gap from a known defect. When practical, add or run the smallest focused validation that can tell those states apart before altering stable production code. If the evidence passes, leave the production path unchanged; if it fails, correct the behavior and revalidate normally. This rule does not apply when the requested change itself requires new production behavior.

User-facing UI work retains the existing `render -> critique -> fix -> re-render` loop from `docs/ui-review.md`. Render coherent UI batches at relevant desktop/mobile/narrow boundaries instead of taking a new Preview after every small CSS edit.

## Self-review against Design Intent

The mandatory Foundation self-review remains in force. For a context-routed change, review the final candidate against the same Design Intent extracted before implementation.

The review must answer, where applicable:

- Does every Acceptance Criterion have implementation and evidence?
- Is an apparent finding actually only missing evidence for behavior expected to be preserved, and if so was focused validation used before changing stable production code?
- Does the final diff preserve each `must preserve` constraint?
- Did anything listed under `must not change` change directly or indirectly?
- Did responsibility or trust boundaries move without an approved decision?
- Did implementation discovery create a route that was never loaded?
- Is a product redesign being smuggled into an infrastructure/standards change?
- Is stable code being replaced only for conformity rather than an objective?
- Can any added abstraction, dependency, layer, configuration, workflow, or document be removed while preserving the approved outcome?
- Are the tests proving behavior/contract evidence rather than implementation trivia?

Fix valid findings in a correction batch, re-review the affected intent, then run final validation after the last material correction.

## Independent review integration

Change classification does not replace the risk-based independent-review policy in `docs/independent-review.md`.

Use the final packet/diff to make the review decision, but repository evidence remains authoritative for an independent reviewer: Issue/AC, contracts, final diff, tests, CI, and PR evidence. Do not require the reviewer to consume the implementation agent's private packet or hidden reasoning.

## PR evidence

Persist only compact, auditable evidence in the PR:

- final change classification and routed contracts;
- whether scope expansion caused rerouting;
- Design Intent self-review result;
- Acceptance Criteria -> evidence mapping;
- final validation and independent-review decision.

Do not paste the complete Repository Context Packet into the PR.

## What this profile does not introduce

This profile deliberately does not introduce:

- a permanent `CONTEXT.md`;
- a persistent cross-session fetch cache or evidence store;
- a vector database, context service, prompt registry, or runtime agent framework;
- a Foundation-wide hard-coded list of every possible consumer specialist document;
- a requirement to read every Markdown file for every Issue;
- one-Issue/one-commit or one-Issue/one-PR rules;
- static validation that claims to prove what an AI actually read or understood;
- automatic migration of stable consumers to the newest implementation default;
- additional review/CI cycles whose only purpose is process compliance.

Generalize durable implementation contracts from real consumer evidence. Do not generalize a consumer's product-specific palette, typography, composition, domain vocabulary, or other visual/product skin.