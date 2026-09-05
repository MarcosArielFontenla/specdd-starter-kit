# Phase 8 — Evidence-backed benchmarking

Date: 2026-09-04 local (live timestamps September 5 UTC)
Status: complete — scoped benchmarking and local acceptance validated

## Entry / discovery / review

Phase 7 had accepted immutable run history and a real partial eval slice. Existing
run coverage cannot establish whole-workflow or general-agent quality. The owner
authorized Phase 8. The design limits this first benchmark to an explicit eval node,
using the existing Phase 6 evaluator and Phase 7 events without changing either.

- [Spec and acceptance](../../superpowers/specs/2026-09-04-benchmarking-design.md)
- [Implementation plan](../../superpowers/plans/2026-09-04-benchmarking.md)
- [ADR-0011](../adrs/0011-scoped-evidence-backed-benchmarks.md)

The design review considered a telemetry extension, a full benchmark platform and a
separate pure comparator. The comparator preserves observation/interpretation boundaries
and avoids Phase 9 optimization/proposal behavior.

## Delivered

- `@specdd/benchmarks`, strict versioned plan/dataset schemas and TypeScript contracts.
- Pinned task hash/inputRef, evaluator, graph, baseline, configs and repetitions.
- Runtime/model/Harness/capability observations checked against configuration;
  profile/environment/prompt references remain explicit host attestations.
- Rejected stale task/eval/config identities, score contradictions, reused runs,
  duplicate slots, mixed currencies, nonfinite/negative costs and post-pass retries.
- Missing pairs/attempts/repetitions remain incomplete. Per-metric expected/observed
  counts, mean/median/range and baseline deltas only for complete metric populations.
- Canonical eval score, pass rate, execution-error rate, scoped latency/retries and
  evidence-backed optional costs. Human interventions and defect rate remain null.
- Read-only compare CLI; fixed bounded local experiment, create-only artifacts,
  canonical run exports, reviewed dataset/report and exact regeneration test.
- CI workspace job, usage guide and unchanged core/generated Harness contracts.

## Live local experiment

The final experiment is retained in `.specdd-benchmarks/pinned-profiles/`; reviewed
portable artifacts are in `packages/benchmarks/examples/local/`. An earlier plumbing
trial remains in the ignored parent directory and was not silently overwritten.

Task: both fixed score-normalization conformance tests, hashing their bytes plus the
eval-adapter implementation. Input hash:
`356bdf3f23269f8ed3ad115d96921bf893712fd7ead01d2b94cc832cc2e8baa2`.

Plan fingerprint: `b716a5f9306c49cb5a9bde6c6135fb629702e2337b315d6651613f1197bb80b8`.
Dataset fingerprint: `063a22641546828b708cc3fce0666892de08b097b549630b245a5bb36b3b479d`.

Two fixed profiles ran three times each: default Node file concurrency and
`--test-concurrency=1`. Profile references hash actual flags, Node version and task.
Order alternated by repetition. No warmup. Environment: Node 24.16.0, Windows x64,
16 logical CPUs. Live observation interval: 2026-09-05T01:30:43.227Z to 01:30:51.070Z.

| Observed metric | Default | Serial |
|---|---:|---:|
| Samples / expected | 3 / 3 | 3 / 3 |
| Canonical score mean | 1 | 1 |
| Passed | 3 / 3 | 3 / 3 |
| Latency mean | 929.67 ms | 1648 ms |
| Latency median | 899 ms | 1654 ms |
| Latency range | 897–993 ms | 1503–1787 ms |
| Retries | 0 observed | 0 observed |
| Cost / interventions / defects | Unknown | Unknown |

This proves the comparison pipeline with actual local processes, not model superiority.
It does not measure LLM quality, deployment behavior or whole-workflow performance.
System load and inherited environment are not fully controlled. Three observations
are descriptive; no statistical significance, winner or causal improvement is claimed.
Workflow traces remain partial; the declared eval-node scope is fully observed.

## Verification

- Workspace unit suite: **246 passed**, exit 0 (225 previous + 21 benchmark tests).
- Included real fixed-host test, duplicate-directory refusal, incomplete CLI exit 2,
  failure/error retention and exact checked-in report regeneration.
- Actual final experiment: six passing runs, complete eval-slice coverage, exit 0.
- `npm audit --json`: **0 findings**, exit 0.
- Phase 5 preparation regression: one passed, exit 0.
- CI YAML parsed and benchmark job confirmed; hosted CI has not run for local changes.
- All workspace library/application builds passed, exit 0. Existing upstream
  React/Vite deprecated-option and large-chunk warnings remain nonblocking.
- `git diff --check` and both CLI syntax checks passed.
- All 11 browser regressions passed (4 portal, 3 SpecDD, 2 SpecForge, 2 SpecDeploy),
  exit 0 with `CI=true` and fresh servers. Windows process permissions were elevated
  for browser startup and cleanup.

## Limits / deferred work

Hash identity and graph consistency are not authenticated runtime execution. Imported
cost must describe the same eval slice and include evidence; no prices/conversion
are guessed. `complete` means complete measurement, not a passing quality gate.
An error remains in pass-rate counts, with null score; incomplete metrics cannot yield
a baseline delta. No observations are silently dropped to improve averages.

The local host runs only fixed bundled tests with allowlisted profiles, no arbitrary
command from a JSON plan. Filesystem writes require a new trusted output directory;
existing artifacts remain untouched. Each child has a 30-second timeout and 1 MiB
output cap. No raw logs are persisted, no automatic cleanup or archival is performed.

Deferred: live provider collectors, full-workflow/human/defect instrumentation,
statistical significance, model ranking, optimization and improvement proposals.
No Harness/eval threshold/baseline mutation, new PR, merge or deployment. The Phase 5
pilot and draft PR #2 remain outside this maintenance/benchmark scope.

Usage: [inspect or repeat the benchmark](../../../packages/benchmarks/README.md).

Exit decision: bounded Phase 8 acceptance is satisfied. Phase 9 is ready for
specification, not implemented here; these descriptive runner timings are not
sufficient evidence to automatically propose or adopt general agent changes.
