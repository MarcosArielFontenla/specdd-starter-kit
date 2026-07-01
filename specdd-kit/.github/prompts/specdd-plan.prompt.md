---
agent: agent
description: Produce an implementation plan from an approved spec
---

# /specdd-plan

Produce an implementation plan from an approved spec. This is the `plan` step of
the SDD flow, run after a spec has no unresolved Open questions blocking design.

## Steps
1. Read `specs/<feature-slug>/spec.md` and `context/tech-stack.md`.
2. Draft `specs/<feature-slug>/plan.md` following `templates/plan-template.md`:
   Architecture, Components, Data flow, Risks, Testing strategy.
3. Optionally produce `data-model.md`, `research.md`, and/or `api.md` alongside it
   if the feature involves new data, unresolved technical decisions, or new
   endpoints, then write everything under `specs/<feature-slug>/`.

## Output
`specs/<feature-slug>/plan.md`, ready for `/specdd-tasks`, with every functional
requirement in the spec traced to at least one component or step in the plan.

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
