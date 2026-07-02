---
name: refactoring
description: Refactor safely with tests green throughout
persona: Dev
---

# Refactoring

## Purpose
Change the internal structure of code without changing its observable behavior, keeping the test suite green throughout so a refactor never doubles as an accidental behavior change.

## When to use
When code works but is hard to extend, duplicated, poorly named, or violates a pattern established elsewhere in the codebase — never bundled into the same commit as a behavior change or bug fix.

## How
1. Confirm test coverage exists for the code being refactored before touching it; if coverage is missing or thin, add characterization tests first that lock in current behavior.
2. Run the full relevant test suite and confirm it's green before starting, so any later failure can be attributed to the refactor, not a pre-existing issue.
3. Make one small, mechanical change at a time (rename, extract function, inline variable, move module) and re-run tests after each step, rather than rewriting large sections in one pass.
4. Keep the public interface (function signatures, exported API, component props) stable unless the refactor's explicit purpose is to change it — if the interface must change, call that out separately from the internal refactor.
5. Do not fix unrelated bugs or add new behavior mid-refactor; note them separately and address in their own change so the refactor's diff stays reviewable and revertible.
6. Watch for behavior hidden in "obviously safe" changes — reordering conditions, changing loop bounds, altering error-handling order — and add a test for the specific behavior before making that change if one doesn't already exist.
7. Re-run the full suite at the end and diff the change against the goal: same behavior, cleaner structure, no new TODOs introduced.
8. Commit the refactor separately from any subsequent feature work, so it can be reviewed and reverted independently.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
