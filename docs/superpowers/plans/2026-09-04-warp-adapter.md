# Warp Adapter Implementation Plan

Status: complete  
Date: 2026-09-04

## Entry gate

- Phases 0–3 are complete and evidenced.
- `SpecDDControlPlane` `1.0.0` is the stable source contract.
- Current Warp Factory `v1alpha1` documentation has been reviewed.

## Tasks

1. Record the official Warp surface and the exact/partial/unsupported mapping.
2. Add `@specdd/warp-adapter` with target-specific types and fail-closed config
   validation.
3. Implement a deterministic, side-effect-free compiler for `factory.yaml`, agent
   files, and disabled event automations.
4. Implement structured projection diagnostics and Markdown unsupported reporting.
5. Add a canonical issue-to-draft-PR fixture, adapter config, and checked-in generated
   Factory example.
6. Test validation, determinism, quoting, one-foreman invariants, trigger safety,
   projection fidelity, and unsupported semantics.
7. Wire workspace, CI, and platform prebuild dependencies.
8. Run model/adapter tests, all existing unit and E2E suites, production builds, and
   whitespace validation.
9. Record the ADR, phase exit evidence, implementation status, README, and roadmap
   gate.

## Review checkpoints

- Canonical source is not changed to satisfy Warp.
- Adapter configuration contains target bindings only.
- Generated instructions do not claim runtime enforcement.
- Eval gates remain blocked/deferred, never silently converted.
- The example cannot activate an external automation by itself.

## Exit gate

Phase 4 is complete only when all deliverables exist, tests pass, documentation names
every unsupported semantic, and Phase 5 remains explicitly unimplemented.
