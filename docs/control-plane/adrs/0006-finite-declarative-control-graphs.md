# ADR-0006 — Finite Declarative Control Graphs

**Status:** Accepted  
**Date:** 2026-09-04

## Context

Portable graphs must express execution order, approvals, eval gates, failure handling,
and retry intent without becoming an embedded runtime language. Cycles can obscure
termination and silently encode unbounded autonomous loops.

## Options considered

1. Allow arbitrary cyclic graphs and leave termination to adapters.
2. Define a runtime-specific workflow DSL.
3. Require directed acyclic graphs and model retry as a separate bounded rule.

## Decision

Adopt option 3 for schema `1.0.0`.

Graphs have one entry, explicit terminal nodes, typed nodes, and outcome-labelled
edges. Every node must be reachable, terminal nodes have no outgoing route, and cycles
are invalid. Retry rules allow 1–10 attempts with portable bounded backoff metadata.
Important gates use explicit human approval nodes; Phase 3 does not support automatic
approval.

## Consequences

- Definitions have inspectable termination behavior.
- Runtime adapters can map a small deterministic semantic surface.
- Looping workflows require a future versioned contract and governance decision.
- Failure routes remain explicit without overloading normal success edges.

## Migration impact

No existing graph format is migrated. Future adapters must reject or report any target
runtime feature that cannot preserve these graph semantics.

