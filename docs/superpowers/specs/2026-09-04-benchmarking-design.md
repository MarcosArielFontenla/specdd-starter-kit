# Phase 8 — Reproducible evaluation-node benchmarks

## Discovery and scope

Phase 7 can record partial workflows truthfully. A completed eval-node slice is
enough for an explicitly eval-node-scoped comparison, not for whole-agent quality,
end-to-end workflow latency, defect rate or human intervention claims.

Add `@specdd/benchmarks`, a pure comparison layer over Phase 6 eval semantics and
Phase 7 events. Keep all existing schemas/generators unchanged. User authorized
Phase 8; no hosted model, paid runtime or external API is required.

## Entry / deliverables

Phase 7 local acceptance and zero dependency findings. Deliver versioned plan and
dataset schemas, strict TS types/validation, deterministic report, read-only CLI,
bounded reproducible local experiment, tests, ADR, reviewed evidence and tracker.

## Acceptance

- Plan pins task content hash/inputRef, canonical evaluator, scope, configurations,
  baseline and expected repetitions before evaluating any observations.
- Configurations describe runtime, model, Harness, capabilities, graph, prompt
  strategy, environment and execution profile; null means unknown, never default.
- Samples bind plan/configuration/task identities and exact canonical graph. Reject
  duplicated runs/slots, incompatible inputs/evals, fabricated score-label mappings,
  runtime/context mismatches, mixed currency and nonfinite/negative measurements.
- Missing repetitions or selected-node start/end pairs remain incomplete; comparisons
  cannot quietly exclude them. Errors/failures stay in the pass-rate denominator.
- Latency is the selected eval slice including retries, not whole-workflow latency.
  Attempts must be contiguous from 1 with observed non-overlapping pairs.
- Report per-metric counts, descriptive statistics and baseline deltas only when
  the metric has all expected observations. No significance or superiority claims.
- Costs require explicit amount/currency/evidence; missing cost remains null.
  Human interventions and defect rate are unavailable at this scope.
- Real local experiment compares two Node execution profiles with interleaved
  repeated runs on one pinned deterministic task; retain hashes and events, no raw logs.
- No proposal generation, auto-tuning, Harness writes, new PR/merge or deployment.

## Design review / risks / exit

Reviewed against roadmap sections 18–22 and Phase 8: a separate bounded comparison
layer avoids mixing telemetry with scoring or observation with optimization. Dataset
hashes prove identity/integrity, not that callers executed a declared prompt/model.
Local host checks fixture and execution profile; imported data remains caller-attested.
Small local timings are descriptive and environment-sensitive. A passing smoke
benchmark is infrastructure acceptance, not evidence of LLM quality improvement.
Exit requires tests, real report reproducibility and documented coverage limits.
