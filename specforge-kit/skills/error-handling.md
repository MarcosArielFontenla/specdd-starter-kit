---
name: error-handling
description: Consistent error handling and logging without leaking secrets
persona: Dev
---

# Error Handling

## Purpose
Handle and log errors consistently across a codebase — catching failures at the right boundary, giving callers actionable information, and never leaking secrets or sensitive data into logs or responses.

## When to use
Whenever writing code that can fail — I/O, network calls, parsing, external dependencies — as an integral part of `component-creation`, `api-endpoint`, and `refactoring`, not an afterthought.

## How
1. Catch errors at the boundary where you can meaningfully handle them (retry, fall back, translate to a user-facing message) — avoid catching broadly just to suppress an error with no recovery action.
2. Never swallow an error silently (empty `catch` block, ignored rejected promise); at minimum log it with enough context to diagnose, even if the boundary decides to continue.
3. Preserve error context as it propagates: wrap/chain the original error (cause) rather than replacing it with a generic message that loses the root cause.
4. Distinguish expected failures (validation errors, not-found, conflict) from unexpected faults (bugs, infrastructure failures) and handle/log them differently — expected failures are normal control flow, not incidents.
5. Log structured, actionable detail (operation, relevant IDs, error type) at an appropriate level (warn for recoverable, error for faults) — never log secrets, credentials, tokens, full request/response bodies containing PII, or raw stack traces to end users.
6. Return client-safe error messages distinct from internal logs: enough for the caller to act (what was wrong, what to do) without exposing internals (queries, file paths, stack traces, dependency names).
7. Set explicit timeouts and bounded retries for external calls; make failure after exhausting retries a clear, handled error rather than an indefinite hang.
8. Add a test for each significant error path (not just the happy path) confirming the right status/message/log occurs, so error handling doesn't silently regress.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
