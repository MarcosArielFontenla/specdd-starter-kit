# @specdd/benchmarks

Phase 8: deterministic, vendor-neutral comparisons of **evaluation-node slices**.
Node 22.12+. Reuses canonical Phase 6 evals and Phase 7 history; no paid runtime,
dashboard, model selection, optimization loop or Harness mutation.

## Inspect the recorded experiment — no execution required

From the repository root after `npm ci`:

```powershell
npm run build -w @specdd/benchmarks
node packages/benchmarks/scripts/compare.mjs packages/benchmarks/examples/local/plan.json packages/benchmarks/examples/local/dataset.json
```

This reads two JSON files and prints the reproducible report. It executes nothing
from their contents and changes no files. The checked-in `examples/local/report.json`
is tested for exact structural equality with the regenerated report.

CLI exit 0 means the expected eval samples are complete, **not that they passed**.
Exit 2 means missing/incomplete measurements; invalid input exits 1. Inspect `passed`
and `executionError` metrics separately. This is not a CI quality gate by itself.

## Repeat the fixed local experiment

```powershell
node packages/benchmarks/scripts/local-experiment.mjs .specdd-benchmarks/my-run-001
```

Choose a new output directory each time. The host refuses an existing directory,
never overwrites evidence, and retains incomplete artifacts if interrupted. It runs
only the two bundled score-conformance test files with two fixed allowlisted profiles:
Node's default file concurrency and `--test-concurrency=1`. Three repetitions/profile,
alternating order per repetition, no warmup. Each child has a 30 s timeout and 1 MiB
output cap; there are at most six executions. This is bounded, not sandboxed.

Before execution, the host saves the plan and hashes both fixture files plus the
eval-adapter implementation. It rechecks them before/after each run. Profile refs
hash the actual flags, Node version and task hash. Environment metadata records Node,
OS family, architecture and CPU count; system load and inherited environment are not
fully controlled. Plans imported by the pure comparator do not execute this host.

Output: `plan.json`, `environment.json`, immutable `runs/*.jsonl`, `dataset.json` and
`report.json`. No raw child logs are persisted; canonical eval evidence contains hashes.
Local `.specdd-benchmarks/` is ignored. The runner exits 1 on any failed/error eval,
2 on incomplete comparison and 0 only for complete passing local acceptance.

## Contracts and API

`assertPlan(value)` validates the published versioned plan schema and canonical eval.
`compareBenchmark(plan, dataset)` validates both, checks bindings and returns a pure
versioned report. `fingerprint(value)` hashes sorted JSON object keys; array order is
retained. `statistics(values, expected)` retains observed/expected counts and nulls.

Schema exports:

- `@specdd/benchmarks/schema/plan` references `@specdd/eval-adapters/schema`.
- `@specdd/benchmarks/schema/dataset` references the Phase 7 event and Phase 3 control
  schemas (including graph/policy) and the Phase 6 result schema. Register these
  published references when using your own JSON Schema validator.

The plan pins task ID/content hash/inputRef, evaluator, workflow, baseline, repetitions
and configurations. Configurations include graph hash/node, runtime, model, Harness,
capabilities, prompt-strategy ref, environment ref and execution-profile ref. Null is
unknown. Samples bind plan, task and configuration hashes, repetition, unique run ID,
exact graph definition, events and optional evidence-backed cost.

Changing task/eval identity requires a new benchmark, not pooling incompatible runs.
Graph/runtime/model/Harness/capability context is checked against observed selected-node
events. Prompt strategy and execution/environment refs are host attestations: hashes
do not authenticate a caller or prove a model/prompt actually ran.

## Reading the metrics

- `score`: canonical final-attempt eval score. Errors remain null, not zero-filled.
- `passed`: 0/1 per completed sample, including failed/error samples in its denominator.
- `executionError`: 0/1 for final-attempt runtime error; not an application defect rate.
- `latencyMs`: first selected eval start to final completion, including retry gaps and
  host overhead. It is not end-to-end workflow latency.
- `retries`: observed contiguous attempts minus one. Missing/overlapping attempts
  invalidate the sample; no assumed zero. Retrying after pass rejects cherry-picking.
- `cost`: optional total cost of that eval-node slice, all attempts, in a declared
  common currency with nonempty evidence. Missing cost is null. Explicit zero needs
  evidence too. No conversion or model pricing is guessed.
- Human interventions and defect rate: null/unavailable at this scope.

Each statistic reports expected and observed counts, mean, median, min and max.
Means can describe a measured subset; **baseline deltas are disabled unless both
groups have every expected value for that metric**. Missing runs remain listed.
`complete` describes scoped measurement coverage, not successful quality or complete
workflow instrumentation. Phase 7 traces may truthfully remain `partial` workflows.

Differences are descriptive, not causal or statistically significant. Multiple changed
configuration dimensions can confound attribution. There is no winner/ranking and no
automatic adoption. Three local repetitions demonstrate plumbing, not model superiority.

Limits: 8 MiB per input artifact; at most 10 configs, 25 repetitions/config and 250
samples; 1,000 events/sample, plus Phase 7 event/trace bounds. Invalid data rejects
without silently dropping observations. Review IDs/refs before sharing; hashing raw
logs does not make all caller-supplied metadata free of sensitive information.
