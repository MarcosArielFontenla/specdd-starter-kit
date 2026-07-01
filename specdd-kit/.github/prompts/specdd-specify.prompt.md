---
agent: agent
description: Turn a feature idea into a formal SDD specification
---

# /specdd-specify

Create a feature specification from the user's intent, using `context/` and any
provided feature notes. This is the `specify` step of the SDD flow.

## Steps
1. Read `context/project.md`, `context/tech-stack.md`, and `context/constitution.md`.
2. Draft a spec following `templates/spec-template.md`.
3. Write it to `specs/<feature-slug>/spec.md`.

## Output
`specs/<feature-slug>/spec.md` with Summary, Personas & outcomes, Requirements,
Acceptance criteria, Out of scope, Open questions.

## Guardrails
- Specifications are the source of truth.
- Mark unknowns as Open questions; do not guess.
- No secrets in output.
