# Selective independent code review

This document defines the Foundation operating method for adding an independent review layer after the implementation agent's mandatory self-review. Codex GitHub Code Review is the standard manual reviewer when it is available, but the contract is intentionally risk-based rather than mandatory for every pull request.

## Responsibility split

Three different evidence sources must remain distinct:

1. **Self-review** — performed by the implementation agent against its own final diff and behavior. It is mandatory for every material change.
2. **CI / deterministic validation** — lint/static checks, typecheck, tests, build, E2E, and other machine-checkable invariants.
3. **Independent review** — performed by a reviewer that did not own the implementation context, with the goal of finding high-impact mistakes that self-review and deterministic checks may miss.

Running the same implementation agent through another review pass with the same implementation context is still self-review. Independent review does not replace self-review or CI.

## Codex repository configuration

For repositories that adopt Codex GitHub Code Review:

- make Codex Code Review available to the repository;
- keep **Automatic Review / Review my pull requests OFF**;
- do not add an automatic review workflow merely to invoke Codex on every PR;
- before every Codex invocation, present the user/maintainer with the concrete review rationale, including the affected risk category and expected review value, and obtain explicit approval;
- only after that approval, request the independent review manually from the pull request conversation with:

```text
@codex review
```

Approval is per invocation. A previous approval to run an initial review does not authorize a later re-review automatically.

The Codex/GitHub account setting is external repository administration state. Foundation validation cannot prove that Automatic Review is OFF or that Codex is connected, so those settings remain an operator responsibility rather than a repository validator assertion.

## Standard flow

```text
Issue / Acceptance Criteria
        ↓
implementation
        ↓
tests
        ↓
implementation-agent self-review
        ↓
correction / hardening when needed
        ↓
relevant CI succeeds
        ↓
merge-candidate HEAD is identified
        ↓
risk-based decision: independent review warranted?
        ↓ yes
present rationale + risk category + expected value
        ↓
user/maintainer explicit approval
        ↓
PR comment: @codex review
        ↓
independent findings
        ↓
implementation agent reassesses findings
        ↓
fix valid findings / reject non-applicable findings with evidence
        ↓
consider re-review only when risk/materiality warrants it
        ↓
if re-review is warranted: present fresh rationale + obtain fresh approval
        ↓
final validation and merge decision
```

The default review target is the intended **merge-candidate HEAD**. Triggering much earlier produces review churn and may spend independent-review capacity on code that the implementation agent already knows it will replace.

## When to request independent review

Independent review is not a universal per-PR gate. It is most valuable when a plausible defect could bypass normal CI or have a large blast radius.

For the following high-risk categories, obtain independent review before merge when practical:

- authentication, authorization, privilege, secret handling, or trust-boundary changes;
- reusable or privileged GitHub Actions, release/publishing logic, deployment, rollback, or promotion machinery;
- concurrency, race conditions, idempotency, retry, or distributed state transitions;
- destructive migrations, persistence/retention changes, data integrity, or irreversible side effects;
- backward compatibility, public contracts, external integrations, protocol/version boundaries, or migration paths;
- failure behavior that appears mainly under production load, partial failure, restart, retry, timeout, or operator intervention;
- broad refactors that change an important implementation path despite preserving nominal behavior.

Low-risk copy changes, narrowly scoped documentation, formatting, deterministic dependency-free cleanup, or similarly small changes may skip independent review. Record the decision rather than invoking Codex mechanically.

When independent review is warranted, do not invoke Codex immediately. First state the concrete reason in terms of the PR's actual risk, identify which high-risk category applies, and explain what independent review is expected to catch beyond self-review and CI. Then ask the user/maintainer for explicit approval. If approval is not given, do not run Codex; record the decision and any residual risk instead.

## Independence and evidence model

The reviewer should evaluate what exists in GitHub, not the implementation agent's private reasoning. Primary evidence is:

- PR purpose and scope;
- linked Issue and Acceptance Criteria;
- PR diff and current repository state;
- tests and their coverage of failure paths;
- CI results;
- repository contracts such as `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, and relevant specialist docs.

The reviewer may see author-provided PR notes, including self-review evidence, but should not treat the implementation agent's conclusions as authoritative or require access to the implementation conversation. Do not prime `@codex review` with a defense of the implementation; the independent review should form its own judgment from repository evidence.

## Review focus and finding quality

The concise repository-facing instructions for an independent reviewer live under `## Code Review Rules` in `AGENTS.md`. Keep that section short and repository-specific; use this document for the broader operating rationale and examples.

Independent review should prioritize findings that can materially affect correctness, safety, compatibility, or operations:

- requirement / Acceptance Criteria mismatch;
- regression or missing edge-case behavior;
- failure path and error-handling defects;
- security boundary violations;
- authentication or authorization defects;
- concurrency, ordering, race, retry, or idempotency problems;
- backward-compatibility or migration breakage;
- destructive or unexpectedly broad side effects;
- data-integrity or persistence-lifecycle problems;
- CI/CD quality-gate bypass or source-SHA mismatch;
- deployment, rollback, promotion, or recovery defects;
- serious failure modes visible only in production or operational workflows.

Do not fill the review with style preferences, formatting, naming taste, or low-value observations that lint/typecheck/tests should enforce. Mention a normally mechanical issue only when it reveals a higher-impact correctness, security, compatibility, or operability problem.

A useful finding should identify the affected code/contract, the concrete failure mode, why it matters, and enough evidence for the implementation owner to reproduce or reason about it. Severity should reflect impact and likelihood rather than the amount of code changed.

## Handling findings

Independent-review output is engineering input, not an instruction stream. The implementation agent must reassess every material finding against the actual contract and code.

For each material finding, choose one disposition:

- **Accepted / fixed** — the finding is valid and the implementation is corrected.
- **Not applicable / rejected** — the finding conflicts with the actual contract or is based on an incorrect assumption; record concise evidence.
- **Unresolved** — the finding is valid but requires a new material product/architecture/security decision or cannot be fixed in scope; surface it explicitly and do not silently report completion.

After corrections, rerun the relevant deterministic validation. Do not make meaningless edits solely to demonstrate that the independent review caused code churn.

## When to request re-review

Do not issue `@codex review` mechanically after every commit made in response to a review.

Consider re-review when:

- a Blocker/High-equivalent finding required a substantive correction;
- the correction changes authentication/authorization, privilege, trust boundaries, or security assumptions;
- compatibility, persistence/data integrity, CI/CD, deployment, rollback, or release behavior materially changes;
- the chosen fix replaces an important implementation path rather than locally correcting it;
- several smaller corrections combine into a substantially different merge candidate.

A local correction with well-targeted tests normally needs self-review plus final validation, not another independent review.

If re-review is warranted, present a fresh rationale that explains what materially changed and why the previous independent review no longer provides enough coverage, then obtain explicit approval before another `@codex review`. Approval for the previous invocation does not carry forward.

If the HEAD changes after the independent review, record whether the previous review still covers the final merge candidate. The decision is based on the materiality of the post-review change, not merely whether the SHA changed.

## PR evidence

The PR should make the review decision auditable without turning Codex into an automatic status gate. Record:

- whether independent review was skipped, proposed, approved and requested with `@codex review`, completed by another reviewer, or unavailable;
- the concrete review rationale and affected risk category;
- explicit approval evidence for each Codex invocation;
- the merge-candidate SHA actually reviewed;
- material findings and their dispositions;
- whether re-review was considered/requested and why;
- residual risk or explicit merge-decision owner when a material finding remains.

The PR template contains these fields. A Codex review comment is evidence of review, but it does not replace CI evidence or the implementation agent's final validation.

## Consumer adoption

Derived applications should inherit the core `AGENTS.md` rules for:

- mandatory self-review;
- independent review as a distinct risk-based layer;
- merge-candidate-HEAD timing;
- explicit rationale and user/maintainer approval before each Codex invocation;
- high-impact review focus, including the concise `## Code Review Rules` section;
- implementation-owner triage of findings;
- risk-based re-review rather than automatic repeated review.

If the consumer uses Codex, enable Code Review for that repository, keep Automatic Review OFF, and use the same approval-gated manual `@codex review` trigger. Do not add a consumer workflow solely to auto-request Codex unless that application deliberately adopts a different reviewed policy.

## Foundation validation boundary

Repository validation should protect only durable repository contracts. It may check that the independent-review policy, AGENTS rules, PR evidence fields, and adoption guidance still exist.

It must not claim to verify:

- whether Codex is connected to the repository;
- the external Automatic Review setting;
- whether a live `@codex review` invocation completed successfully;
- whether a human actually granted approval outside repository evidence;
- the quality or correctness of an individual review response.

Those are runtime/external evidence evaluated on the PR itself.
