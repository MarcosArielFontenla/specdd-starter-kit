# ADR-0005 — Separate Harness from Control Plane

**Status:** Accepted  
**Date:** 2026-09-04

## Context

The Harness defines instructions, context loading, routing, skills, architectural
guardrails, and verification practices. Phase 3 needs to define who performs work,
when transitions occur, and which approvals and failure behavior apply.

Putting both responsibilities into `.agents/` Harness documents would mix durable
agent guidance with execution policy. Putting orchestration directly into a runtime
adapter would make that runtime the canonical architecture.

## Options considered

1. Extend the Harness schema with workflow execution state.
2. Model orchestration only in the first runtime adapter.
3. Add a separate portable SpecControl definition that references Harness and
   Capability artifacts.

## Decision

Adopt option 3. `@specdd/control-plane-model` owns portable workflow orchestration
semantics and references, but does not copy or execute Harness and Capability content.

Phase 3 ships a model package only. A new wizard, service, CLI, or generated `.control/`
layout is not justified until a real compiler or authoring workflow requires it.

## Consequences

- Harness instructions remain stable and runtime-neutral.
- SpecControl can evolve independently without becoming a duplicate source of truth.
- Runtime adapters consume a durable contract instead of defining it.
- External artifact existence must be checked by future project-level compilation;
  document validation only proves internal integrity.

## Migration impact

There is no legacy SpecControl format to migrate. Existing Project Definitions,
Capability Packs, and Harness files remain valid and unchanged. Adoption starts by
authoring a new control-plane definition that references them.

