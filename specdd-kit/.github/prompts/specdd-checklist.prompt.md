---
agent: agent
description: Generate or verify a pre-merge checklist for a feature
---

# /specdd-checklist

Generate or verify a pre-merge checklist for a feature. This is the last gate in
the SDD flow, run after implementation is complete and before the feature merges.

## Steps
1. Generate `specs/<feature-slug>/checklist.md` from `templates/checklist-template.md`
   if it doesn't already exist.
2. Walk each checklist item against the real diff/PR: Spec ↔ code, Spec ↔ tests,
   Tasks ↔ code, Quality gates.
3. Check off items that are verifiably true (e.g., only check "tests pass" after
   actually running them); leave unchecked items with a note on what's missing.

## Output
`specs/<feature-slug>/checklist.md` with an accurate, evidence-based checked or
unchecked state for every item.

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
