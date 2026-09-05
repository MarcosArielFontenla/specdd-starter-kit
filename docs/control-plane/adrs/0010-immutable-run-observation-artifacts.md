# ADR-0010 — Immutable run observations, separate from Harness telemetry

Status: Accepted for Phase 7 implementation
Date: 2026-09-04

## Context / problem

Harness v1 telemetry is deliberately lossy and session-oriented. Graphs describe
intent; eval results describe single observations. Overloading any of these would
conflate intended execution, observed execution and enforcement.

## Options

1. Extend Harness v1 events in place: rejected because existing consumers permit
   unknown fields/events and lack run identity or lifecycle completeness.
2. Add a database/dashboard or provider-specific collector: premature and coupled.
3. Separate versioned run events plus immutable local exports: selected.

## Decision

`@specdd/run-history` owns strict observation envelopes, pure projections and a
small Node filesystem boundary. Reuse canonical EvalResult via its published schema.
Bind observations to the canonical control-definition fingerprint. Runtime-specific
payloads must pass an explicit adapter; Phase 7 first imports normalized Phase 6 results.

Store one create-only JSONL file per run beneath a caller-selected trusted directory.
Readers bound byte/event counts and validate the full trace before projection.
Partial exports are immutable too: their missing lifecycle coverage remains visible.
Published files are never rewritten; publication uses an exclusive temporary file
and an atomic no-replace hard link on a local filesystem. Unsupported filesystems
fail rather than falling back to overwrite. No prune/delete command is provided.

## Consequences / migration

No generated Harness, existing monthly JSONL log or empty drift baseline changes.
Legacy session events cannot truthfully supply workflow/node/model identity and are
not automatically upgraded. Graph checks prove reference consistency only, not
execution, approval authority or artifact authenticity. A reported workflow success
does not certify all required gates ran. Missing pairs have null duration.

Local artifacts are ignored by Git by default. Ninety days remains the Harness
retention guideline, not an automatic deletion promise. Archival/deletion requires
human review. Live ingestion, multiwriter streaming and benchmark metrics wait.
