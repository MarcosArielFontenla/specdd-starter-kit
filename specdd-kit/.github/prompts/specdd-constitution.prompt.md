---
agent: agent
description: Draft or update the project constitution
---

# /specdd-constitution

Draft or update the project's constitution — the non-negotiable principles every
spec, plan, and implementation must follow. This is the first step of the SDD
flow, and should only be re-run for deliberate amendments, never as a silent side
effect of another task.

## Steps
1. Read the existing `context/constitution.md` and `governance/constitution.md`
   (if any) and `templates/constitution-template.md`.
2. Draft or update the SDD flow statement, Principles, Data classification, and
   Amendments sections, using plain descriptive data labels (e.g. Public,
   Internal, Sensitive) rather than numbered governance tiers.
3. Mirror any change into both `context/constitution.md` and
   `governance/constitution.md` so they stay consistent, and record the rationale
   in the amending spec or PR description.

## Output
Updated `context/constitution.md` and `governance/constitution.md` that agree with
each other, plus a documented rationale for any change.

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
