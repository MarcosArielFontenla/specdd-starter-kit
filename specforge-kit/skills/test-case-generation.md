---
name: test-case-generation
description: Derive test cases from acceptance criteria, at least one per AC
persona: QA
---

# Test Case Generation

## Purpose
Convert each acceptance criterion into one or more concrete, executable test cases, so every AC has explicit, traceable test coverage before implementation is considered verifiable.

## When to use
After a story's acceptance criteria have passed `ac-validation`, and before or alongside implementation — early enough that Dev can see the test cases while building.

## How
1. Take the story's acceptance criteria one at a time; do not batch-summarize across ACs, since coverage must be traceable per AC.
2. For each AC, write at least one test case covering its Given/When/Then as stated (the happy path implied by the AC).
3. Add test cases for boundary and negative variations the AC implies but doesn't spell out (empty input, max/min values, unauthorized access, network/service failure) when they are plausible for that AC.
4. For each test case, record: a stable ID, the AC it traces to, preconditions (Given), the action (When), and the expected observable result (Then) — in terms specific enough that pass/fail requires no judgment call.
5. Prefer the smallest test level that can verify the AC (unit over integration, integration over end-to-end); reserve `playwright-testing` for cases that genuinely require exercising the UI.
6. Feed the finished test case list into `requirements-traceability` (BA skill) or the project's own traceability record so AC-to-test linkage stays visible.
7. Flag any AC for which no meaningful test case can be written — that is a signal to send it back through `ac-validation`, not a gap to silently skip.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
