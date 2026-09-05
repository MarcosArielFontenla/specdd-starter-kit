# ADR-0009 — Canonical evals and explicit runtime evidence

Status: Accepted for Phase 6 implementation
Date: 2026-09-04

Use a separate eval-adapters package. Versioned canonical definitions own rubric,
method, labels, normalized scores and threshold. Runtime bindings own process/agent
and model choices. Results bind eval/run/input identities and hash captured evidence.

Local mechanical evaluation maps observed exit 0/nonzero to explicitly bound labels;
signals, timeout and launch errors are errors with no score. Empty successful output
is not inherently invalid (some approved tests are silent); the host is responsible
for executing the approved evaluator, not an arbitrary empty command.

The optional Warp projection supports classification definitions only, preserving
rubric and label scores. It rejects mechanical evals instead of replacing execution
with an LLM opinion. It never applies configuration, enables self-improvement or
asserts graph-gate enforcement. Imported classification observations are caller-supplied
evidence, not authenticated provider responses. No API response shape is invented.

Capture output fingerprints and byte lengths by default, not raw potentially secret
logs. Retention/redaction and authenticity remain host responsibilities. Phase 7 will
address run history; this phase does not introduce orchestration, storage services,
baseline mutation, dashboards or deployments. Existing Harness drift rubrics are
not automatically migrated to these single-run eval definitions.
