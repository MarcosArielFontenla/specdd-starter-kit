# Warp Adapter Design

Status: accepted for Phase 4 implementation  
Date: 2026-09-04

## Problem

SpecControl `1.0.0` owns a portable, finite control graph. Warp Factories currently
consume a Git-backed `v1alpha1` definition made of `factory.yaml`, agent Markdown,
automation Markdown, and optional runner/scorer resources. The two models do not have
the same semantic surface: Warp requires one foreman, while its factory-as-code format
does not expose first-class static resources for every SpecControl edge, approval,
policy, retry, artifact contract, or canonical eval gate.

Phase 4 must prove that a replaceable adapter can project the useful subset without
making Warp canonical or pretending that a prompt is equivalent to runtime
enforcement.

## Scope

Create a strict TypeScript workspace package, `@specdd/warp-adapter`, that:

- validates canonical SpecControl input before compilation;
- validates separate Warp binding configuration;
- deterministically renders Warp Factory `v1alpha1` files;
- synthesizes the one Warp foreman required by the target format;
- renders one Warp custom/stage agent per canonical agent role;
- renders only explicitly bound event automations, always disabled in Phase 4;
- emits structured mapping and unsupported-feature reports;
- never calls Warp, GitHub, a model, a runner, or a secrets service.

Phase 4 does not execute the generated factory and does not prove runtime behavior.

## Inputs and ownership

The compiler has two inputs:

1. `SpecDDControlPlane` remains the canonical source for workflows, graphs, roles,
   capability bindings, approvals, policies, retries, eval gates, artifact contracts,
   and portable runtime hints.
2. `SpecDDWarpAdapterConfig` owns only target-specific bindings: Factory name,
  repositories, Warp model or harness defaults, agent stage types, optional existing
  environment IDs, and the initial GitHub `issue_created` trigger binding.

Warp environment IDs, runner names, model identifiers, and provider events must never
be written back into the canonical definition. Configuration must contain no secrets.

## Output contract

`compileWarpFactory` returns:

- an ordered map of generated Factory files;
- adapter diagnostics;
- a structured projection report;
- a deterministic Markdown unsupported-feature report.

Compilation produces no files when either input is invalid. A successful compilation
may contain warnings and unsupported items; those are an honest description of target
loss, not compilation errors.

## Mapping rules

- Factory metadata and repositories map directly to `factory.yaml`.
- Warp execution defaults come only from adapter configuration and require exactly one
  of `model` or `harness`.
- The adapter generates `agents/specdd-foreman/agent.md`. This is adapter
  infrastructure, not a new canonical role.
- Each canonical agent role generates `agents/<role-id>/agent.md`. Its capability and
  Harness references remain references; their contents are not copied.
- Graph nodes and edges are rendered into foreman instructions. This is an
  instruction-level projection and is reported as partial.
- Human approval nodes are rendered as mandatory stop/resume instructions and are
  reported as partial because the Factory definition has no equivalent canonical
  approval resource.
- Canonical eval gates are never converted to Warp scorers in Phase 4. Required eval
  nodes force a handoff/stop instruction and are reported as unsupported until Phase 6.
- Runtime-enforced policies, retry/backoff, failure routing, artifact validation, and
  portable runtime hints are reported rather than weakened silently.
- A workflow automation is generated only when an adapter binding maps an exact
  canonical event trigger to GitHub `issue_created`. Other providers, event kinds,
  filters, and schedules are deliberately outside this first slice. Manual triggers
  remain available only through manual Warp initiation and generate no automation.
- Every generated automation has `enabled: false` in Phase 4.

## Safety invariants

- No network or runtime side effects.
- No automatic merge, deployment, architecture change, Harness mutation, or scorer.
- No secret-shaped configuration fields or emitted credentials.
- Exactly one generated foreman.
- Stable ordering and quoting make repeated compilation byte-identical.
- Unsupported semantics have stable codes and canonical source paths.
- Required eval gates never become advisory through compilation.

## Acceptance criteria

- The representative issue-to-draft-PR definition and adapter config compile to a
  checked-in Warp Factory example.
- Tests prove determinism, safe trigger disablement, exactly one foreman, source and
  config rejection, target mapping, and complete unsupported reporting.
- Canonical control-plane files remain free of Warp-specific fields.
- The package builds under Node 20 and participates in CI and the platform prebuild.
- Mapping, limitations, ADR, phase evidence, and tracker status are documented.

## Deferred work

- Applying Factory definitions or invoking Warp APIs/CLI.
- Runtime environment provisioning, secrets, run history, and telemetry.
- End-to-end issue-to-draft-PR execution (Phase 5).
- Canonical eval to Warp scorer compilation (Phase 6).
- Benchmarks, self-improvement, deployment, and dynamic model selection.
