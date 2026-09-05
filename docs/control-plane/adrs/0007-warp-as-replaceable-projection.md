# ADR-0007 — Warp as a Replaceable Projection

**Status:** Accepted  
**Date:** 2026-09-04

## Context

Phase 3 established a runtime-neutral `SpecDDControlPlane` with stronger semantics
than the current Warp Factory definition format directly represents. Warp Factory
definitions require one foreman and use YAML/Markdown resources for agents and
automations. Warp also offers scorers, environments, runners, APIs, and runtime
observability, but adopting those resources wholesale would move canonical ownership
into the first runtime adapter.

## Problem

The first backend must produce useful Warp configuration while preserving canonical
graph, approval, capability, policy, eval, and artifact ownership. Any semantic loss
must be visible, and Phase 4 must not execute external work.

## Options considered

1. Add Warp fields and resources directly to `SpecDDControlPlane`.
2. Generate prompts ad hoc and treat successful rendering as semantic equivalence.
3. Compile from the canonical definition plus separate Warp bindings, with typed
   fidelity and unsupported-feature reports.
4. Defer all Warp work until every future runtime abstraction exists.

## Decision

Adopt option 3.

`@specdd/warp-adapter` is a one-way, side-effect-free compiler. Warp-only repository,
execution, environment, stage, and trigger choices live in
`SpecDDWarpAdapterConfig`. The compiler validates both inputs, emits deterministic
`v1alpha1` files, synthesizes exactly one adapter-owned foreman, disables all generated
automations, and reports instruction-only or unsupported semantics with stable codes.

Phase 4 supports only GitHub `issue_created`. It generates no scorer, runner, secret,
webhook, API request, run record, pull request, merge, or deployment. A required
canonical eval becomes a mandatory stop instruction rather than an advisory target
score.

## Consequences

- Warp remains replaceable and absent from the canonical schemas.
- The first Factory artifact is small, reviewable, and deterministic.
- Human readers can distinguish exact mapping from prompt-level intent and missing
  enforcement.
- The generated definition is intentionally incomplete as an end-to-end factory; the
  runtime behavior must be proven in Phase 5.
- External schema evolution may require a new adapter version without changing the
  canonical model.

## Migration impact

There is no prior Warp adapter to migrate. Future adapter versions must keep the
`SpecDDControlPlane` input boundary, define migrations for adapter config changes, and
must not remove a reported limitation unless tests prove an equivalent target mapping.

