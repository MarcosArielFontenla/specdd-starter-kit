# Canonical Project Definition — Phase 1 Implementation Plan

**Goal:** Deliver a versioned, runtime-neutral Project Definition with schema, TypeScript types, layered validation, current-manifest migration, examples, and a Harness v1 compatibility boundary.

**Spec:** `docs/superpowers/specs/2026-09-03-canonical-project-definition-design.md`

## Constraints

- No Warp adapter, graph executor, or autonomous loop.
- No dependence on React, Astro, browser APIs, or external schema-validation packages.
- No invented migration data.
- Current generator behavior and tests remain compatible.
- Generated build output remains ignored.

## Task 1 — Package and contracts

- [x] Add `packages/project-model` as an npm workspace.
- [x] Add strict TypeScript configuration and package exports.
- [x] Define complete v1 TypeScript contracts.
- [x] Add JSON Schema draft 2020-12 for the serialized definition.

## Task 2 — Validation

- [x] Add stable diagnostic types and codes.
- [x] Validate document shape, required sections, values, and IDs.
- [x] Validate uniqueness and cross-references.
- [x] Validate Brownfield review and Harness v1 invariants.
- [x] Test invalid and valid documents.

## Task 3 — Construction and compatibility

- [x] Convert current wizard input into a canonical definition.
- [x] Project a canonical definition into existing Harness v1 generator input.
- [x] Keep Brownfield analysis/path/legacy state in a separate compilation context.
- [x] Prove representative Greenfield generated output remains equivalent.

## Task 4 — Manifest migration

- [x] Import supported scaffold receipt versions.
- [x] Require project identity and reject unsupported/malformed receipts.
- [x] Preserve selected data and receipt/collision/fidelity metadata.
- [x] Emit explicit lossy-source diagnostics.
- [x] Test schema 1, schema 2, and failure paths.

## Task 5 — Examples, ADR, and verification

- [x] Add minimal and full examples and validate them in tests.
- [x] Record accepted serialization, identity, and receipt-separation decisions.
- [x] Run package typecheck/tests.
- [x] Run all existing unit tests, E2E tests, and workspace builds.
- [x] Update the phase tracker only from passing evidence.
