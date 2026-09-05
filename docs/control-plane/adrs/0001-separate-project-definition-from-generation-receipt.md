# ADR-0001 — Separate Project Definition from Generation Receipt

**Status:** Accepted  
**Date:** 2026-09-03

## Context

The existing `context/scaffold-manifest.json` records selected values, generated/skipped/replaced paths, and fidelity fingerprints. It does not contain the complete intent needed to compile a project across runtimes.

## Decision

Introduce `context/project-definition.json` as the canonical portable intent document. Keep `context/scaffold-manifest.json` as a separate per-generation receipt. A receipt may identify its source definition/version in a future compatible revision, but it is not the definition.

## Consequences

- Project intent can be edited and validated without pretending that output bookkeeping is architecture.
- Receipts can remain appendable/auditable without forcing operational data into the canonical model.
- Migration from current receipts is necessarily lossy and reports that fact.
- Two related contracts must be versioned and documented independently.
