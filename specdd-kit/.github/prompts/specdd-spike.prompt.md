---
agent: agent
description: Time-box a research spike and capture findings in research.md
---

# /specdd-spike

Time-box a focused research spike to resolve a technical unknown, and capture the
findings so the plan can proceed on evidence rather than assumption.

## Steps
1. Read `specs/<feature-slug>/spec.md` (or the Open question driving the spike)
   and agree on a concrete question and a time box before starting.
2. Investigate just enough to answer the question — prototype, benchmark, or read
   documentation as needed — without turning the spike into full implementation.
3. Write findings, options considered, and a recommendation to
   `specs/<feature-slug>/research.md`, and remove the corresponding Open question
   from `spec.md` if it's now resolved.

## Output
`specs/<feature-slug>/research.md` updated with the spike's question, findings,
and recommendation.

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
