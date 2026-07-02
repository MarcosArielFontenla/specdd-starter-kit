---
name: qa-guardrails
description: Quality gates and evidence requirements before QA sign-off
persona: QA
---

# QA Guardrails

## Purpose
State the quality gates and evidence a change must satisfy before QA sign-off, so "done" means verified, not merely attempted.

## When to use
Before marking any story, bug fix, or release candidate as QA-approved — the final check applied across all other QA skills' output.

## How
1. Confirm every acceptance criterion on the story passed `ac-validation` and has at least one linked test case from `test-case-generation`; block sign-off on any AC with zero coverage.
2. Confirm all linked test cases were actually executed (not just written) and are passing, with the run's evidence (test report, CI run link, or screenshot/log) attached — a written-but-unrun test case does not satisfy this gate.
3. Confirm the regression suite selected via `regression-testing` was run and passed; any failure outside the expected change scope blocks sign-off until explained and resolved or explicitly accepted with a documented reason.
4. Confirm every open bug filed via `bug-reporting` against this change is either fixed and re-verified, or explicitly deferred with owner and severity sign-off — no silently ignored defects.
5. If AI-assisted QA output (generated tests, generated bug reports, automated steps) was used, confirm it passed the relevant `qa-evals` threshold or was manually reviewed; do not sign off on ungated AI output.
6. Confirm no secrets, credentials, tokens, or personal data appear in any test fixture, bug report evidence, or automated test file being merged.
7. Record the sign-off decision itself (approved / approved with known issues / rejected) with the evidence links above, so the decision is auditable after the fact, not just remembered.
8. If any gate cannot be satisfied, do not sign off — send the gap back to the appropriate skill (`ac-validation`, `test-case-generation`, `regression-testing`, or `bug-reporting`) rather than waiving it silently.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
