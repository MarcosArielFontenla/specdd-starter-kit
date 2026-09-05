# Phase 1 — Canonical Project Model

Status: complete  
Date: 2026-09-03

## Outcome

SpecDD now has a persisted, versioned, runtime-neutral Project Definition. The SpecDD wizard normalizes reviewed user intent into `context/project-definition.json` and then projects that definition into the existing Harness v1 renderers. The separate scaffold manifest remains the generation receipt.

## Delivered

- `@specdd/project-model` workspace package;
- Project Definition schema `1.0.0` using JSON Schema draft 2020-12;
- strict TypeScript types and generated declarations;
- layered validation with stable diagnostics for shape, IDs, references, review state, paths, and Harness v1 invariants;
- construction from current wizard input;
- separate Brownfield compilation context;
- Harness v1 input projection;
- explicit scaffold-manifest schema 1/2 migration;
- minimal and representative full examples;
- persisted Project Definition in generated SpecDD scaffolds;
- CI coverage for the project-model package;
- ADRs for serialization, receipt separation, and compatibility boundaries.

## Public package surface

| API | Purpose |
|---|---|
| `validateProjectDefinition` | Return stable structural/semantic diagnostics without throwing for invalid user data |
| `isProjectDefinition` | Type guard over full validation |
| `createProjectDefinitionFromWizardInput` | Normalize current approved wizard intent |
| `createLegacyCompilationContext` | Isolate Brownfield evidence and invocation state |
| `toHarnessV1Input` | Project canonical intent into the current generator contract |
| `migrateScaffoldManifest` | Import receipt schema 1/2 with explicit loss reporting |
| `componentId` / `isComponentId` | Create and validate stable scoped IDs |

## Compatibility behavior

- Existing Harness paths, adapters, collision rules, review gates, and rendering remain intact.
- The new Project Definition is listed by the receipt as generated but mutable, because it becomes editable project source after extraction.
- Greenfield input round-trips exactly through the canonical model into Harness v1 input.
- Brownfield analyzer evidence, existing paths, and legacy acknowledgement remain outside portable intent and are required when reproducing a Brownfield invocation.
- Receipt migration never invents missing personas, outcomes, constraints, principles, tools, MCP servers, or runtime choices.

## Verification evidence

| Check | Result |
|---|---|
| Project-model tests | 11 passed, including strict TypeScript build |
| SpecDD unit tests | 71 passed |
| SpecForge unit tests | 23 passed |
| SpecDeploy unit tests | 42 passed |
| Total unit tests | 147 passed |
| Platform E2E | 4 passed |
| SpecDD E2E | 3 passed, including Greenfield, Brownfield, and legacy migration |
| SpecForge E2E | 2 passed |
| SpecDeploy E2E | 2 passed |
| Workspace builds | project model plus platform and all three standalone wizards passed |

## Accepted ADRs

- [ADR-0001 — Separate Project Definition from Generation Receipt](../adrs/0001-separate-project-definition-from-generation-receipt.md)
- [ADR-0002 — JSON Schema and TypeScript Contract](../adrs/0002-json-schema-and-typescript-contract.md)
- [ADR-0003 — Harness v1 Compatibility Boundary](../adrs/0003-harness-v1-compatibility-boundary.md)

## Deferred to Phase 2 and later

- Capability Pack internals and dependency semantics;
- Role Pack migration;
- executable graph and policy schemas;
- eval evidence and scorer adapters;
- run identities and observability;
- Warp compilation or API calls;
- SpecDeploy provider configuration in the canonical aggregate.

## Known risks

- The TypeScript validator implements semantic validation while JSON Schema remains the portable structural contract. Future changes must keep schema, types, validator, and fixtures synchronized.
- Current entity/feature relationships are empty when the wizard has no relationship input; the model does not infer them.
- Migration from scaffold receipts is intentionally incomplete because the historical receipt did not store full project intent.
- Capability entries are lightweight bindings only. Their current shape must not be mistaken for the Phase 2 Capability Pack contract.
