---
agent: agent
description: Ask targeted questions to resolve a spec's open questions
---

# /specdd-clarify

Resolve a spec's Open questions by asking specific, answerable questions instead
of guessing. This runs after `/specdd-specify` and before `/specdd-plan`, so no
plan is ever built on top of unresolved ambiguity.

## Steps
1. Read `specs/<feature-slug>/spec.md` and list every item under Open questions.
2. For each item, ask a concrete question — propose options where possible instead
   of open-ended "what do you think?" prompts.
3. Record each answer back into the relevant spec section (Requirements, Acceptance
   criteria, etc.) and remove the resolved item from Open questions.

## Output
An updated `specs/<feature-slug>/spec.md` with fewer (ideally zero) Open questions,
and a note on the blocker for any question that remains unresolved.

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
