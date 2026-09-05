# SpecControl Domain Model — Phase 3 Design

**Date:** 2026-09-04  
**Status:** Approved for Phase 3 implementation  
**Scope:** Portable control-plane definition, graph and policy contracts, validation,
examples, and package integration

## Context

Phase 1 established canonical project identity and Phase 2 established independently
composable capabilities. The repository still lacks a portable definition of who may
perform work, in which order, behind which human gates, and with which failure,
retry, eval, and artifact expectations.

Encoding those decisions directly in a runtime would make that runtime the source of
truth. Encoding them in the Harness would mix operating decisions with instructions
about how agents work.

## Decision

Introduce `@specdd/control-plane-model`, a runtime-neutral model package. Do not add a
SpecControl wizard or executable engine in Phase 3.

The canonical document is a `SpecDDControlPlane` definition with schema version
`1.0.0`. It references the Project Definition and Capability Pack manifests and owns:

- agent roles and capability bindings;
- workflows and their triggers;
- directed graphs, typed nodes, and edges;
- human approvals;
- permission, risk, and transition policies;
- failure routes and bounded retry rules;
- canonical eval gates;
- input, output, and evidence artifact contracts;
- portable runtime hints.

## Boundary with existing contracts

| Contract | Owns | Does not own |
|---|---|---|
| Project Definition | Project, architecture, Harness and installed capability identity | Execution order |
| Capability Pack | Specialized role ability and its operational artifacts | Cross-role orchestration |
| Harness | Instructions, routing, context, guardrails and verification practices | Run lifecycle |
| SpecControl | Who runs, order, gates, failure handling and execution requirements | Skill prose, runtime syntax or execution state |

References use stable IDs and safe repository-relative source paths. SpecControl does
not copy Project Definition or Capability Pack content.

## Graph model

A workflow references exactly one graph. A graph has one entry node, at least one
terminal node, typed nodes, and directed edges.

Node kinds are:

- `agent`: references one agent role;
- `approval`: references a human approval contract;
- `eval`: references an eval gate;
- `artifact`: references an artifact contract.

Nodes may reference a retry rule, failure route, and runtime hint where applicable.
They declare input and output artifact references. Edges use explicit outcomes:
`success`, `approved`, `rejected`, `pass`, `fail`, or `always`.

Version 1 graphs are finite DAGs. Retry is represented by a bounded retry rule rather
than graph cycles. Every node must be reachable from the entry node, and terminal
nodes cannot have outgoing edges.

## Policies and approvals

Policies are portable rules with category `permission`, `risk`, or `transition`;
effect `allow`, `deny`, or `require`; subjects; action; resource; and an explicit
enforcement owner (`instruction`, `validator`, `runtime`, or `human`). Conditions are
plain declarative statements, not executable code or a runtime expression language.

Approvals are human-only in Phase 3. Approval nodes cannot imply automatic consent.

## Failure, retry, eval, artifacts, and runtime hints

- A failure route either stops the workflow or routes to a known node after retries.
- Retry rules are bounded and define a portable backoff shape.
- Eval gates reference canonical eval IDs and require a runtime-reported pass; scorer
  configuration and normalized results remain future adapter work.
- Artifact contracts define required inputs, outputs, or evidence with paths and
  optional schema references. They do not claim that artifacts already exist.
- Runtime hints express portable preferences for location, isolation, network access,
  and interactivity. They never identify Warp, a vendor, or a model.

## Serialization and schemas

- JSON is the canonical serialization for Phase 3.
- `control-plane.schema.json` defines the aggregate.
- `graph.schema.json` and `policy.schema.json` are reusable bounded schemas.
- Strict TypeScript types and semantic validation supplement JSON Schema.
- Extension keys must be namespaced.

## Entry criteria

- Canonical Project Definition `1.0.0` is stable and validated.
- Capability Pack `1.0.0` is stable and validated.
- Harness v1 compatibility and human installation gates remain intact.

## Acceptance criteria

- Minimal and representative feature-delivery examples validate.
- Every canonical concept named by the Phase 3 roadmap is represented.
- Graph references resolve; nodes are reachable; cycles and outgoing terminal edges
  are rejected.
- Typed nodes reference exactly the matching contract type.
- Capability, policy, approval, retry, failure-route, eval, artifact, and runtime-hint
  references resolve.
- Approval mode is human and retries are bounded.
- Paths are repository-relative and extensions are namespaced.
- Schemas, types, examples, and public exports contain no Warp-specific state.
- The package builds from a clean workspace and is covered by CI.

## Exit criteria

- Package, schemas, examples, validator, tests, ADRs, and phase evidence exist.
- All workspace unit tests, builds, and existing E2E suites pass.
- Phase 4 is unblocked only after this contract is validated.

## Deferred work

- graph execution and run state;
- runtime adapters and runtime-specific validation;
- Warp mapping or API integration;
- issue ingestion, PR creation, deployment orchestration, and schedules;
- scorer configuration and normalized eval results;
- telemetry storage, benchmarking, and improvement loops;
- a SpecControl wizard, service, or CLI.

## Risks

- A graph model can become a runtime DSL; Phase 3 limits it to durable semantics.
- Runtime hints can leak vendor assumptions; the allowed vocabulary is intentionally
  portable.
- External references cannot prove the target artifacts exist without project-level
  resolution; validation distinguishes document integrity from installation checks.

