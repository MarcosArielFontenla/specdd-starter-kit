# SpecControl Domain Model — Phase 3 Implementation Plan

**Goal:** Define a validated, portable SpecControl domain model without implementing
execution or a runtime adapter.

**Spec:** `docs/superpowers/specs/2026-09-04-speccontrol-domain-model-design.md`

## Constraints

- No Warp schema, compiler, SDK, API, or runtime IDs.
- No graph execution, run persistence, telemetry backend, or automatic approvals.
- No deployment orchestration, benchmarking, or improvement loop.
- Existing Project Definition, Capability Pack, Harness, and wizard behavior remains
  unchanged.

## Task 1 — Package and contracts

- [x] Add `@specdd/control-plane-model` as a strict TypeScript workspace.
- [x] Define aggregate, graph, and policy schemas at version `1.0.0`.
- [x] Model workflows, graphs, nodes, edges, roles, capability bindings, approvals,
  policies, failure routes, retries, eval gates, artifact contracts, and runtime hints.

## Task 2 — Construction and validation

- [x] Add canonical factories and public exports.
- [x] Validate structure, IDs, paths, versions, references, typed nodes, and extensions.
- [x] Validate reachability, terminal behavior, DAGs, bounded retries, and human gates.
- [x] Emit stable diagnostics without executing the graph.

## Task 3 — Examples and tests

- [x] Add minimal and representative feature-delivery examples.
- [x] Cover valid documents and reference, graph, policy, retry, and boundary failures.
- [x] Assert that canonical artifacts contain no Warp-specific state.

## Task 4 — Integration and evidence

- [x] Add lockfile, build prerequisite, and CI integration.
- [x] Add architecture ADRs and package documentation.
- [x] Run all unit tests, builds, E2E tests, and whitespace checks.
- [x] Record Phase 3 evidence and unblock Phase 4 only from passing results.
