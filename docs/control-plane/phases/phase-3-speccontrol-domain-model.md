# Phase 3 — SpecControl Domain Model

Status: complete  
Date: 2026-09-04

## Entry criteria

- Project Definition `1.0.0` provides stable project and Harness identity.
- Capability Pack `1.0.0` provides stable capability identity and artifact references.
- Existing Harness and wizard compatibility tests pass.

## Outcome

The repository now has a versioned, runtime-neutral SpecControl definition. It can
describe workflows and finite control graphs, agent roles, capability bindings, human
approvals, policies, failure routes, bounded retries, eval gates, artifact contracts,
and portable runtime hints without executing work or adopting a runtime's domain model.

## Deliverables

- `@specdd/control-plane-model` strict TypeScript workspace package;
- aggregate `SpecDDControlPlane` schema `1.0.0`;
- reusable graph and policy JSON Schemas using draft 2020-12;
- typed agent, workflow, graph, node, edge, approval, policy, failure, retry, eval,
  artifact, and runtime-hint contracts;
- factories and stable semantic diagnostics;
- validation for IDs, versions, paths, unknown fields, namespaced extensions, internal
  references, typed nodes, edge outcomes, reachability, terminal nodes, graph cycles,
  failure-route ownership, human approvals, and retry bounds;
- minimal and representative human-gated feature-delivery examples;
- CI and clean platform-build integration;
- conceptual documentation and two accepted ADRs.

## Acceptance and exit evidence

| Check | Result |
|---|---|
| Project-model tests | 11 passed |
| Capability-model tests | 7 passed |
| Control-plane-model tests | 10 passed, including strict TypeScript build |
| SpecDD unit tests | 71 passed |
| SpecForge unit tests | 27 passed |
| SpecDeploy unit tests | 42 passed |
| Total unit tests | 168 passed |
| Platform E2E | 4 passed |
| SpecDD E2E | 3 passed |
| SpecForge E2E | 2 passed |
| SpecDeploy E2E | 2 passed |
| Workspace builds | Three model packages, platform, and all three standalone wizards passed |
| Runtime-neutrality check | Canonical schemas, types, and examples contain no Warp-specific state |
| Diff whitespace check | Passed |

## Accepted ADRs

- [ADR-0005 — Separate Harness from Control Plane](../adrs/0005-separate-harness-from-control-plane.md)
- [ADR-0006 — Finite Declarative Control Graphs](../adrs/0006-finite-declarative-control-graphs.md)

## Deferred work

- graph execution, schedules, run state, and persistence;
- Warp or other runtime compilation;
- adapter-specific models, environments, scorers, and APIs;
- issue ingestion, code changes, PRs, merge gates, and deployment;
- eval result normalization and evidence capture;
- telemetry aggregation, benchmarks, and improvement loops;
- a SpecControl wizard, service, CLI, or generated project layout.

## Risks

- External source references require future project-level resolution; document validity
  alone does not prove referenced files exist or are installed.
- DAG semantics intentionally exclude general loops. Any future loop contract requires
  explicit versioning and a governance decision.
- Runtime hints must remain preferences. Adapters must report unsupported semantics
  rather than silently weakening policies or approvals.

