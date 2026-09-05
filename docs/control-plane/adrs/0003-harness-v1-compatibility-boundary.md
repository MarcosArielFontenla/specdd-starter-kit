# ADR-0003 — Harness v1 Compatibility Boundary

**Status:** Accepted  
**Date:** 2026-09-03

## Context

Current generator input combines portable project intent with invocation evidence such as Brownfield analyzer output, source paths, collision context, and legacy-Harness acknowledgement.

## Decision

Compile Harness v1 through two inputs:

1. the canonical Project Definition for portable intent;
2. a separate compilation context for invocation-specific Brownfield evidence and migration state.

The current wizard is adapted through `createProjectDefinitionFromWizardInput`, `createLegacyCompilationContext`, and `toHarnessV1Input`. The generator persists the canonical definition before writing the generation receipt.

## Consequences

- Existing Harness v1 renderers remain compatible while the source model becomes explicit.
- Brownfield evidence is not promoted to portable truth or silently discarded.
- A future compiler can replace the legacy input projection without changing the canonical model.
- Bit-for-bit Brownfield reproduction requires the associated compilation context; a receipt alone cannot reconstruct it.
