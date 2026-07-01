---
agent: agent
description: Derive tracker issues from unmet acceptance criteria
---

# /specdd-issues-from-unmet

Derive tracker issues from acceptance criteria that are not yet satisfied, so
gaps found during review or checklist verification turn into trackable follow-up
work instead of being lost.

## Steps
1. Read `specs/<feature-slug>/spec.md` for Acceptance criteria and
   `specs/<feature-slug>/checklist.md` (if present) for items marked unmet.
2. For each unmet acceptance criterion, draft an issue describing the gap, the
   expected behavior from the spec, and any relevant context from the checklist
   note.
3. Write the issue list to `specs/<feature-slug>/issues.md` (or create them
   directly in the configured tracker if the environment supports it), linking
   each issue back to the specific acceptance criterion it closes.

## Output
`specs/<feature-slug>/issues.md` (or created tracker issues) with every unmet
acceptance criterion represented by exactly one issue.

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
