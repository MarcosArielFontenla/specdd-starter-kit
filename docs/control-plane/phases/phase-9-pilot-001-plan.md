# Phase 9 pilot-001 — reuse an already validated source report

Status: local experiment authorized; individual improvement approval and PR publication pending.

Observed problem: `assessProposal` calls `compareBenchmark` on source evidence,
then calls `analyzeHistory` which repeats that exact comparison. Three comparisons
are performed where two suffice. This is static code evidence, not an observed
quality failure. The proposed private helper summarizes an already validated local
report; public entry points still validate inputs and no cache survives a call.

Scope: only `packages/improvement-proposals/src/index.ts`. Prepare baseline and
candidate snapshots under the package's pilot directory; do not apply the candidate
to the production source or publish anything during this experiment.

Acceptance fixed before measurement: five repetitions per profile, alternating
order; identical batch of 30 assessments of pinned actual Phase 8 fixtures. Every
assessment must equal the baseline result exactly. Candidate mean batch latency
must decrease by at least 1 ms, with all evals passing and no quality regression.
Timing is descriptive, includes process startup, and is not a general performance
claim. Retain all runs. Also run the existing 27 proposal tests against the candidate.

No weakened evaluator, global memoization, new dependency, automatic Harness edit,
merge or deployment. Rollback is simply retaining/restoring the original source.
After measurement pin the resulting dataset to the proposal; request review of the
exact candidate and evidence. This plan is not that approval.
