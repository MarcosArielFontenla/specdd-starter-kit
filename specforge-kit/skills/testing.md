---
name: testing
description: Write unit and integration tests, TDD where possible
persona: Dev
---

# Testing

## Purpose
Write unit and integration tests that actually verify behavior against acceptance criteria, preferring to write the test before the implementation (TDD) so the test is proven to fail for the right reason first.

## When to use
Whenever implementing new behavior, fixing a bug (write the failing test that reproduces it first), or extending existing code — continuously during `story-to-code`, `component-creation`, `api-endpoint`, and `refactoring`, not as a separate pass at the end.

## How
1. Translate the relevant acceptance criterion or bug report into a test name and assertion before writing implementation code; run it and confirm it fails for the expected reason (red).
2. Write the minimum implementation to make that test pass (green), then refactor with the test as a safety net — repeat per AC/behavior rather than writing all the code first and tests after.
3. Choose the right level: unit tests for pure logic and isolated functions/components; integration tests for behavior that spans modules, a database, or an API boundary; avoid mocking so heavily that the test only proves the mock works.
4. Cover edge cases explicitly: empty/null/undefined input, boundary values, error paths, and concurrent/async timing — not only the happy path.
5. Keep tests deterministic and isolated: no reliance on execution order, shared mutable state between tests, real network calls, or wall-clock timing; seed/clean up fixtures per test.
6. Name tests so a failure is self-explanatory from the test runner output alone (what was expected, under what condition) without needing to open the test file.
7. Assert on behavior/output, not implementation details (internal variable names, private method calls), so tests don't break on harmless refactors.
8. Run the full local suite before considering the change done, and treat a flaky test as a bug to fix, not a candidate for a retry loop or deletion.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
