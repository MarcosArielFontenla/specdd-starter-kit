# ADR-0004 — One Role per Capability Pack

**Status:** Accepted  
**Date:** 2026-09-04

## Context

SpecForge historically emits one archive containing every selected Role Pack. Treating
that archive as one capability would couple unrelated roles, make routing and versioning
ambiguous, and prevent a project from composing or upgrading roles independently.

## Decision

Generate one canonical Capability Pack manifest for each selected role at
`.agents/capabilities/<capability-id>/capability.json`.

Each manifest owns one role and references its existing skills, playbooks, workflows,
policies, evals, context requirements, inactive subagent seed, routing intent, and
dependencies. Multiple manifests may still ship in the same downloadable archive.

The manifest is declarative. Existing Harness files and the Project Definition are
changed only through the generated draft installation tasks after human approval.

## Consequences

- Roles can be installed, versioned, and reasoned about independently.
- Existing Role Pack paths, prompts, archive naming, and collision behavior remain valid.
- Routing and Project Definition bindings have a stable manifest source.
- Cross-capability composition uses explicit dependencies instead of hidden archive-level
  coupling.
- Subagent metadata can be represented without activating multi-agent execution.
- Runtime graphs, adapter state, model selection, and Warp concepts remain outside the
  canonical contract.

