---
agent: agent
description: Record an architecture decision (ADR)
---

# /specdd-adr

Record an architecture decision so future readers understand why a significant
technical choice was made, not just what it was.

## Steps
1. Read `specs/<feature-slug>/plan.md` (and `research.md` if present) for the
   decision context, plus `context/tech-stack.md` for existing conventions.
2. Draft an ADR covering: Title, Status (proposed/accepted/superseded), Context,
   Decision, Consequences (positive and negative), and Alternatives considered.
3. Write it to `specs/<feature-slug>/adr/<NNNN>-<decision-slug>.md`, numbering
   sequentially within that feature's `adr/` directory.

## Output
`specs/<feature-slug>/adr/<NNNN>-<decision-slug>.md`, linked from `plan.md` where
the decision is referenced.

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
