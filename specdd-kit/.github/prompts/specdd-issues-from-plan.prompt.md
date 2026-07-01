---
agent: agent
description: Derive tracker issues from a plan
---

# /specdd-issues-from-plan

Derive a set of tracker issues from an approved plan's components and steps, so
implementation work is trackable at the architecture level, not just the spec
level.

## Steps
1. Read `specs/<feature-slug>/plan.md`, focusing on Components and Data flow.
2. Draft one issue per component or major implementation step, cross-referencing
   the plan section and any related spec requirement it fulfills.
3. Write the issue list to `specs/<feature-slug>/issues.md` (or create them
   directly in the configured tracker if the environment supports it), noting
   dependencies between issues where the plan implies an order.

## Output
`specs/<feature-slug>/issues.md` (or created tracker issues) with every component
in the plan represented by at least one issue.

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
