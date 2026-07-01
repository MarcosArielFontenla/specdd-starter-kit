---
agent: agent
description: Analyze a codebase/spec gap before implementing
---

# /specdd-analyze

Check for gaps between the current codebase and a spec/plan before implementation
begins or continues. Use this before starting on an existing codebase, or
mid-implementation when something doesn't match expectations.

## Steps
1. Read `specs/<feature-slug>/spec.md` and `specs/<feature-slug>/plan.md`.
2. Search the codebase for existing implementations, related modules, or
   conflicting patterns relevant to the feature.
3. Produce a short gap analysis — what already exists, what's missing, what
   contradicts the plan — and write it inline in the response or append it to
   `specs/<feature-slug>/research.md`.

## Output
A gap analysis identifying discrepancies between spec, plan, and actual codebase
state, flagging anything that invalidates the current plan for revision.

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
