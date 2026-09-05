# Phase 7 — Run history and observability

## Discovery / model

Harness v1 EVENTS.md is best-effort, open-ended and session-oriented. Phase 3 owns
declarative graphs, not executions. Phase 6 owns canonical eval results bound to
run/input/definition identities. None provides persistent normalized run history.

Add a bounded Node package, `@specdd/run-history`, rather than embedding filesystem
access in the canonical graph, eval adapter or browser wizards. ADR-0010 records
the boundary. Existing generated telemetry stays unchanged.

## Entry / scope

Phase 6 accepted; dependency findings remediated. User authorized proceeding to
Phase 7. Capture workflow/node/role/capability/runtime/model/harness identity,
timestamps, status, artifact hashes, eval results, human decision observations and
failure codes. Unknown runtime/model/agent information is null, never inferred.

## Acceptance / exit

- Published versioned event schema, strict TypeScript union and semantic validator.
- A run is bound to workflow, graph, input and canonical control-definition hash.
- Duplicate IDs, conflicting identities, reversed time, duplicate completions,
  cross-run evals and mismatched graph references are rejected.
- Partial imported traces remain usable with explicit coverage gaps. A terminal
  observation is not proof of graph execution or human authorization enforcement.
- Eval-result adapter accepts Phase 6 local or imported external-runtime results;
  it never guesses provider API payloads or manufactures missing workflow events.
- Pure reconstruction gives durations only for observed matching pairs, retains
  failures/retries and approval evidence, and distinguishes unknown from success.
- Bounded, read-only inspection and create-only JSONL persistence. One immutable
  export per run; no silent overwrite, replay append, automatic pruning or raw logs.
- Real approved local eval execution is normalized, persisted and read back;
  synthetic full-workflow fixtures are explicitly test data, not live evidence.
- Regression tests, CI job, README, phase evidence and roadmap updated.

## Review

Design reviewed against roadmap sections 14, 18, 19, 21 and Phase 7: no vendor schema
in the core; no fabricated approval/duration; no graph executor or new dashboard;
no benchmark/improvement/deploy scope. Graph-reference checks are consistency checks,
not authorization. File hashes are integrity identifiers, not authentication.

## Deferred / risks

Live provider collectors, incremental streaming, centralized storage, authenticated
ingestion, automatic retention, UI and Phase 8 comparisons are deferred. Filesystem
operations assume a trusted local directory without hostile concurrent path swaps.
Raw logs are excluded; caller-supplied identifiers can still contain sensitive data
and require review before sharing. Immutable partial exports cannot later be extended.
