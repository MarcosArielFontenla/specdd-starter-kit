---
agent: agent
description: Review a diff against the spec and constitution
---

# /specdd-code-review

Review a diff or PR against its spec and the project constitution, so feedback is
grounded in what was actually asked for rather than generic style opinions.

## Steps
1. Read `specs/<feature-slug>/spec.md`, `plan.md`, `tasks.md`, and
   `context/constitution.md`.
2. Diff the proposed change against each functional requirement, acceptance
   criterion, and constitution principle; note where the code deviates.
3. Write findings as a review comment or short report, separating must-fix issues
   (spec/constitution violations, missing tests) from optional suggestions.

## Output
A review report (inline PR comments or a written summary) listing spec/constitution
deviations, missing test coverage, and any secrets or credentials found in the diff.

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
