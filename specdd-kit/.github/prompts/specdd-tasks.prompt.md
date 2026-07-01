---
agent: agent
description: Break an approved plan into bite-sized, testable tasks
---

# /specdd-tasks

Break an approved plan into bite-sized tasks. This is the `tasks` step of the SDD
flow, run after a plan is approved and before implementation starts.

## Steps
1. Read `specs/<feature-slug>/plan.md` and `specs/<feature-slug>/spec.md` (for
   acceptance criteria to trace against).
2. Draft `specs/<feature-slug>/tasks.md` following `templates/tasks-template.md`:
   a numbered list where each task has Files, Steps, and a Done condition.
3. Size each task so it can be implemented and verified in one sitting, and order
   tasks so none depends on a later one.

## Output
`specs/<feature-slug>/tasks.md`, ready for `/specdd-implement`, with every
functional requirement in the spec covered by at least one task.

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
