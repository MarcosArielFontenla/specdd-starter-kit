# ADR-0011 — Scope comparisons to evidence, not inferred workflow success

Status: Accepted for Phase 8 implementation
Date: 2026-09-04

## Context and options

Phase 6 defines scores; Phase 7 stores run observations, including partial traces.
Blindly averaging whole runs would misrepresent coverage and omit failures. A full
benchmark service is premature. Extending the telemetry schema with benchmark policy
would mix observation with interpretation.

## Decision

A separate pure `@specdd/benchmarks` package consumes pinned plans and datasets.
Start with eval-node scope. Require the same task bytes/input identity and canonical
eval for all groups. Pin configurations, baseline and repetitions before observing
results. Match graph/runtime/model/Harness/capability context; other configuration
dimensions are explicitly caller-attested and bound by a fingerprint.

Preserve missing samples and errors. Only complete per-metric populations produce
baseline deltas; score is not silently imputed for errors. Cost needs explicit
currency/evidence. Unknown cost, interventions and defects are never zero-filled.
Reports are deterministic descriptive artifacts, not statistical significance tests,
runtime authentication, graph enforcement or automatic model selection.

## Consequences and migration

Existing eval/run/Harness contracts remain unchanged. No baseline file is mutated.
Local acceptance uses fixed approved code and two allowlisted Node execution profiles,
not arbitrary commands supplied by a plan. No paid runtime or live Warp integration.
Imported profiles/prompts/environment identity require host attestation; hashes alone
cannot prove execution. Native collectors, whole-workflow benchmarking, human/defect
instrumentation, confidence intervals and improvement proposals remain deferred.
