# SpecForge Capability Packs — Phase 2 Implementation Plan

**Goal:** Add a portable Capability Pack model and make SpecForge generate one validated manifest per selected role without breaking Role Pack output.

**Spec:** `docs/superpowers/specs/2026-09-03-specforge-capability-packs-design.md`

## Constraints

- Subagents remain inactive.
- No graph/runtime/Warp implementation.
- No direct mutation of target Harness files.
- No overwrite mode.
- Existing Role Pack artifacts and prompts remain compatible.

## Task 1 — Capability package

- [x] Add `@specdd/capability-model` workspace with strict TypeScript build.
- [x] Define schema `1.0.0`, types, stable IDs, and public exports.
- [x] Define role, skills, playbooks, workflows, policies, evals, context, subagents, routing, and dependencies.

## Task 2 — Validation and migration

- [x] Validate shape, paths, uniqueness, references, inactive subagents, and dependency rules.
- [x] Add stable diagnostics.
- [x] Add explicit migration from a supplied legacy Role Pack descriptor.
- [x] Add minimal/full examples and failure-path tests.

## Task 3 — SpecForge integration

- [x] Map current role metadata into Capability Packs.
- [x] Generate `.agents/capabilities/<role>/capability.json` per role.
- [x] Validate every manifest before returning the pack.
- [x] Preserve all existing output paths and conditional projections.
- [x] Include manifest collisions in skip-and-report behavior.

## Task 4 — Routing and project binding

- [x] Source routing installation instructions from capability manifests.
- [x] Add registry and budget installation instructions.
- [x] Add conditional Project Definition capability binding instructions.
- [x] Keep installation draft/human-gated and Multi-Agent inactive.

## Task 5 — Evidence and documentation

- [x] Add generator, migration, schema, and E2E assertions.
- [x] Add CI job and clean-build prerequisites.
- [x] Record ADR and migration documentation.
- [x] Run all unit tests, builds, and E2E tests.
- [x] Update status and roadmap only from passing evidence.
