# Phase 9 — Improvement proposals

Status: implementation complete with local acceptance; live human-review/PR pilot
pending. Phase 10 is not automatically released by this evidence.

Main consolidation boundary: the locally approved optimization and its pilot
artifacts are excluded and will follow in a separately authorized PR. This document
records infrastructure acceptance, not completion of that remote PR workflow.

## Entry and delivery

Phase 8 provides canonical eval-node benchmarks and Phase 7 run observations.
Delivered `@specdd/improvement-proposals`: versioned proposal schema, failure
observation analysis, evidence qualification, strict hash-linked review journal,
and guarded draft PR handoff metadata. Workspace, lockfile, README and CI job wired.
Design: [spec](../../superpowers/specs/2026-09-04-improvement-proposals-design.md),
[plan](../../superpowers/plans/2026-09-04-improvement-proposals.md),
[ADR 0012](../adrs/0012-human-governed-improvement-proposals.md).

## Roadmap alignment

| Roadmap stage | Delivered evidence / limit |
|---|---|
| Run history | Reuses graph-bound Phase 7 observations inside validated datasets |
| Failure analysis | Final eval failures/errors/retries/missing observations; no invented root causes |
| Improvement proposal | Pinned target, hypothesis, change, risks, rollback and explicit acceptance |
| Benchmark | Recomputes Phase 8 source and candidate reports, pins task/evaluator/baseline, preserves unknowns |
| Human review | Exact proposal/assessment binding; local actor attestation, not authenticated authority |
| PR | Approved-state, preimage-checked draft handoff; no remote PR is created by the library |
| Adoption/rejection | Separate immutable lifecycle records; merge receipts remain caller-attested |

## Actual evidence replay

See [reproduction instructions](../../../packages/improvement-proposals/README.md).
The checked-in proposal asks whether serial file execution could improve the fixed
runner. It retrospectively reuses the unchanged Phase 8 benchmark, not a new
pre-registered experiment. Six observations, six passing evals, zero observed final
failures, zero retries; no evidence of a general Harness defect. Candidate latency
delta is **+718.3333333333333 ms**, so required improvement fails. Cost remains null.
The inspection CLI returns exit 2, `eligibleForReview: false`, review state `draft`.
The journal is empty: no fabricated approval, rejection, PR or adoption.

## Validation performed locally

- Whole workspace unit run passed: 246 existing tests plus initial 20 new tests.
  Subsequent focused run passed all **27** final Phase 9 tests (273 total current
  unit tests across the workspace). It includes CLI child exit-code/read-only
  verification, stale evidence, target drift, unqualified rejection, date ordering,
  missing metrics, failed/error evals, forged fields and synthetic lifecycle paths.
- All workspace builds passed; final changed package rebuilt successfully.
- Phase 5 preparation regression: 1 passed.
- Browser regression: 11 passed (4 portal, 3 SpecDD, 2 SpecForge, 2 SpecDeploy).
- `npm audit --audit-level=low`: zero findings; added only an internal workspace.
- CI YAML parsed with Phase 9 job present; no claim of a hosted CI run.
- `git -c core.safecrlf=false diff --check`: passed.

Synthetic tests shorten candidate timings and label actors/decisions synthetic.
These are not new runtime measurements, actual human decisions or real merged PRs.
Existing React/Vite deprecation and chunk-size warnings remain non-blocking.

## Exit gate, deferred work and risks

Local infrastructure acceptance is satisfied. The positive live proposal/review/PR
cycle remains outside this base consolidation. Phase 10 stays gated until its
separate PR is authorized and verified. The
current serial-profile example is not eligible for adoption and should not be
approved just to pass a phase gate.

No automatic Harness/policy/spec/baseline mutation, model selection, hosted agent,
authenticated review, PR API adapter, merge or deployment. Warp remains an optional
reference/adapter, with no account, credits or paid runtime needed. Phase 5 PR #2
was not changed. Existing uncommitted work was preserved.

Hash linkage requires a trusted head to detect complete journal rewrites. Supplied
paths, profiles, actor IDs and remote receipts do not prove execution or authority.
The human/operator must verify target-change relevance, permissions and remote
facts; applying a future patch needs a fresh preimage check at write time.
