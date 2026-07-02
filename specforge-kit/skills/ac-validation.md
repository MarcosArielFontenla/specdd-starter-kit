---
name: ac-validation
description: Check that each acceptance criterion is testable and unambiguous
persona: QA
---

# AC Validation

## Purpose
Review a story's acceptance criteria from a testing standpoint and confirm each one is specific, measurable, and free of ambiguity before any test case or implementation work is built on top of it.

## When to use
Immediately after a story's acceptance criteria are drafted (by the BA `acceptance-criteria` skill or otherwise), and before `test-case-generation` begins.

## How
1. Confirm each criterion follows Given/When/Then structure with a distinct starting context, action, and observable outcome — reject criteria that only describe intent ("the system should handle errors gracefully") without a concrete, checkable outcome.
2. Check that the "Then" of each criterion states a result verifiable by inspection, output, or measurement (specific values, states, or messages), not a subjective quality (fast, intuitive, nice).
3. Check for hidden or contradictory assumptions across criteria on the same story — e.g., one criterion implying a field is optional while another treats it as required.
4. Confirm the criteria collectively cover the happy path, at least one edge case, and at least one negative/error case; note any gap explicitly rather than assuming it's out of scope.
5. Check that each criterion is independently testable (does not require another criterion's test to already be running as a precondition), so `test-case-generation` can produce one clean test per AC.
6. For any criterion that fails these checks, write the specific ambiguity or gap as an open question back to the story owner rather than reinterpreting it unilaterally.
7. Mark validated criteria as ready for `test-case-generation`; do not let unvalidated criteria proceed silently.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
