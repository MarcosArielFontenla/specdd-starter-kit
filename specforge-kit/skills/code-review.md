---
name: code-review
description: Review a diff for correctness, security, and readability
persona: Dev
---

# Code Review

## Purpose
Review a code diff systematically for correctness, security, and readability before it merges, so defects are caught while the change is small and the author's context is still fresh.

## When to use
Before opening a PR (self-review), when asked to review a teammate's PR, or any time a diff is about to be merged into a shared branch.

## How
1. Read the story/AC or issue the diff claims to address first, and confirm the diff's stated scope actually matches what changed — flag scope creep or missing pieces.
2. Check correctness: trace each changed function against its inputs/outputs and edge cases (empty, null, zero, max, concurrent access); look for off-by-one errors, unhandled branches, and incorrect assumptions about ordering or state.
3. Check security: look for injection risks (SQL, command, template), unsanitized user input reaching a sink, missing authorization checks, secrets or credentials in code/config/logs, and unsafe deserialization.
4. Check error handling: confirm failures are caught at the right boundary, errors are logged with useful context (not swallowed silently, not leaking stack traces to end users), and retries/timeouts are bounded.
5. Check tests: confirm new/changed behavior has a corresponding test, tests actually exercise the changed code path (not just re-asserting a mock), and no test was weakened or skipped to make CI pass.
6. Check readability: naming reflects intent, functions are small enough to review at a glance, duplicated logic is extracted rather than copy-pasted, and comments explain "why" not "what" where the code isn't self-evident.
7. Distinguish blocking issues (correctness, security, missing tests) from non-blocking suggestions (style, minor naming); say explicitly which is which so the author isn't stuck guessing.
8. Leave actionable feedback: point to the exact line/file, explain the risk or reasoning, and suggest a concrete fix or alternative rather than just flagging a problem.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
