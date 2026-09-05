# ADR 0013 — Delivery knowledge separate from orchestration

Status: accepted for the authorized contracts/graph increment; no deployment approval.
Date: 2026-09-05.

## Context and problem

SpecDeploy produces provider templates and receipts. SpecControl provides declarative
graphs and local evidence tools. Neither generated YAML nor an observed approval
record establishes a runtime-enforced production gate. Phase 10 must join these
components without pretending template generation is actual controlled delivery.

## Options

1. Add provider operations directly to canonical graph types: couples orchestration
   to delivery vendors and forces core schema migration.
2. Activate legacy generated pipelines as-is: cannot establish the new staged
   release identity, gate or evidence requirements.
3. Separate delivery definitions/action bindings from canonical graph orchestration,
   with explicit adapter capabilities and a bounded local rehearsal first.

## Decision

Choose option 3. SpecDeploy owns delivery semantics; SpecControl orders and gates
the stages. Reuse canonical eval/history/graph contracts without fabricated events.
Node-only local execution is distinct from browser-safe generation and real cloud
adapters. Production promotion requires exact release/environment-bound approval.

## Consequences and migration

Add a versioned delivery contract rather than reinterpret legacy specdeploy.json.
Opt-in generation preserves existing providers and ZIP behavior by default. Legacy
env/approval flags remain generation intent, never imported execution permission.
Unsupported stages fail closed. Source receipts and approvals are attested unless
an adapter explicitly verifies their origin. Runtime schema gaps require a separate
decision; no silent expansion of canonical node semantics.

Initial local evidence does not prove a real production deployment. Acceptance must
name its scope; remote environment selection and production authority remain human
decisions. No existing deployment settings or credentials are migrated automatically.

## Increment A1 representation decision

Generate a fixed seven-stage draft graph. Artifact nodes represent receipt artifacts,
not disguised deployment execution; operation bindings are explicit sidecar data.
The projection embeds the complete delivery definition so source/environment changes
invalidate prior projections. The required canonical agent role is governance context
only: no agent node or fabricated agent-run observation is generated. Every compiled
plan reports execution unavailable, including plans with declared cloud capabilities.
No core schema migration is needed for this evidence/gate projection. A later runtime
must consume the bindings under explicit authority or reject unsupported operations.
