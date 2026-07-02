---
name: acceptance-criteria
description: Write Given/When/Then acceptance criteria per story
persona: BA
---

# Acceptance Criteria

## Purpose
Turn each user story into a set of testable Given/When/Then acceptance criteria that a QA or Dev persona can implement and verify against, with no ambiguity about pass/fail.

## When to use
After a story is drafted and before it is handed off for estimation, splitting, or implementation.

## How
1. Read the story and restate its goal and value in one sentence to confirm understanding.
2. Enumerate the story's scenarios: the happy path, key edge cases, and at least one negative/error case.
3. Write each scenario as Given (starting context) / When (action) / Then (observable outcome), using concrete, measurable outcomes rather than vague adjectives.
4. Flag any scenario that reveals missing context or a hidden assumption as an open question instead of guessing.
5. Attach the criteria to the story so they travel together into traceability and testing.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
