# Canonical Project Definition — Phase 1 Design

**Date:** 2026-09-03  
**Status:** Approved for Phase 1 implementation  
**Scope:** Canonical model, schema, validation, migration, and Harness v1 compatibility boundary only

## Goal

Introduce a stable, machine-readable representation of a SpecDD project that exists independently of React, generated files, any agent vendor, and any execution runtime.

## Decisions

| Concern | Decision |
|---|---|
| Canonical serialization | JSON, validated by JSON Schema draft 2020-12 plus semantic rules |
| Package boundary | New dependency-light workspace package: `@specdd/project-model` |
| Version | Project Definition starts at semantic schema version `1.0.0` |
| Aggregate | One root document with explicit sections and stable scoped IDs; later phases may split modules without changing identity semantics |
| Scaffold manifest | Remains a separate generation receipt; it is never treated as the canonical definition |
| Migration | Schema 1/2 receipts can be imported only with caller-supplied project identity; missing historical fields stay empty and emit warnings |
| Compatibility | Canonical definitions can project to the existing Harness v1 generator input; runtime/build evidence stays outside canonical intent |
| Extensions | Namespaced extension values are allowed only at explicit extension points |
| Runtime neutrality | Runtime bindings are references/metadata; no Warp lifecycle, ID, directory, or scorer concept enters v1 |

## Canonical sections

The v1 document contains:

- `metadata`: stable project identity and human description;
- `project`: scenario, product context, domains, entities, features, principles, security, and context-review state;
- `architecture`: patterns and stack;
- `harness`: current contract version, canonical root/primer, selected tools, and MCP server identifiers;
- `capabilities`: lightweight bindings only; detailed Capability Packs belong to Phase 2;
- `specs`, `workflows`, `evals`, and `policies`: typed artifact references, not executable graph semantics;
- `telemetry`: portable event-contract metadata;
- `deployment`: disabled or provider reference metadata; delivery knowledge remains in SpecDeploy;
- `runtime`: optional model preference and adapter bindings, without vendor state;
- `provenance`: origin and source receipt metadata.

## Identity rules

- IDs are lower-case, path-safe, human-readable tokens matching `^[a-z0-9]+(?:[._-][a-z0-9]+)*$`.
- IDs are stable references; names and paths may change independently.
- IDs are unique within their collection.
- Cross-references use IDs and must resolve.
- Vendor task/run identifiers are never canonical IDs.

## Validation

Validation returns diagnostics rather than throwing for invalid user data. Every diagnostic has a stable code, severity, JSON Pointer-like path, and message.

Validation layers:

1. document shape and primitive types;
2. required canonical sections and supported version;
3. identity uniqueness;
4. cross-reference integrity;
5. Brownfield approval invariants;
6. Harness v1 compatibility invariants.

Unknown top-level properties fail validation. Future/vendor data must use explicit namespaced `extensions` maps.

## Migration semantics

The current scaffold receipt records selected domains/entities/features, stack, architecture, review state, generated paths, collision bookkeeping, and fidelity evidence. It does not record complete project intent.

`migrateScaffoldManifest` therefore:

- accepts manifest schema 1 or 2;
- requires caller-supplied project `id` and `name`;
- preserves selected data, review status, generated/skipped/replaced paths, and receipt schema version;
- derives only artifacts evidenced by generated paths;
- reports a `MIGRATION_LOSSY_SOURCE` warning for information the receipt never captured;
- rejects unsupported versions and malformed receipts;
- never invents personas, outcomes, constraints, policies, tools, secrets, runtime state, or approval evidence.

## Harness v1 compatibility

`createProjectDefinitionFromWizardInput` converts current approved wizard intent to the canonical model. `toHarnessV1Input` projects it back to the existing generator input and accepts a separate compilation context for Brownfield analyzer evidence, path inventories, collision state, and legacy acknowledgement.

This separation is intentional:

- canonical definition = portable intent;
- compilation context = evidence and invocation-specific data;
- scaffold manifest = output receipt.

The compatibility gate compares existing and projected generator output for representative Greenfield input. Brownfield migration is validated for semantic preservation and explicit loss warnings; bit-for-bit Brownfield compilation remains dependent on the separate evidence context.

## Acceptance criteria

- A minimal and a representative full example validate.
- TypeScript declarations compile with strict checking.
- Invalid versions, missing sections, unsafe IDs, duplicate IDs, and broken references produce stable diagnostics.
- Brownfield definitions cannot be approved implicitly.
- Current wizard input round-trips through the model into equivalent Harness v1 input.
- Scaffold manifest schema 2 migration preserves all representable data and reports omissions.
- Schema 1 remains importable where its common fields are present.
- No schema/type/fixture contains Warp-specific state or identifiers.
- Existing workspace unit, E2E, and build baselines remain green.

## Deferred

- Capability Pack internals;
- executable graph, retry, failure-route, and approval-node semantics;
- eval result/evidence normalization;
- runtime execution APIs;
- Warp projection;
- UI persistence and editor UX;
- SpecDeploy provider configuration inside the canonical aggregate.
