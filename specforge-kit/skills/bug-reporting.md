---
name: bug-reporting
description: Write a reproducible bug report with steps, expected, actual, and evidence
persona: QA
---

# Bug Reporting

## Purpose
Produce a bug report that lets Dev reproduce and fix the defect without needing to ask a follow-up question first — precise steps, a clear expected/actual gap, and evidence.

## When to use
Any time a test case fails unexpectedly, or exploratory testing surfaces behavior that contradicts an acceptance criterion, a spec, or reasonable user expectation.

## How
1. Write a one-line title that states the observed defect concretely (component + wrong behavior), not a vague symptom ("checkout fails" not "bug in checkout").
2. List exact reproduction steps, numbered, starting from a known clean state (fresh session, seeded data, specific URL/route) — every step a second person would need to hit the same result.
3. State the expected result, citing the acceptance criterion, spec section, or stated requirement it comes from — never an assumption.
4. State the actual result observed, in the same terms as the expected result, so the delta is obvious at a glance.
5. Attach evidence: screenshot, screen recording, console/network log, stack trace, or failing test output — whichever is smallest and most directly shows the defect. Redact any secrets, tokens, or personal data before attaching.
6. Record environment details that could affect reproduction: app version/commit, browser/OS, environment (local/staging/prod), and any relevant feature flags or test data state.
7. Classify severity/priority by user impact (data loss or security > broken core flow > degraded experience > cosmetic) and link the report to the story/AC/test case it traces back to.
8. If reproduction is intermittent, state the observed frequency and any pattern noticed, rather than downgrading it to "works on retry."

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
