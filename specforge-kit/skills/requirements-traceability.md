---
name: requirements-traceability
description: Maintain a traceability matrix linking story, acceptance criteria, and test
persona: BA
---

# Requirements Traceability

## Purpose
Maintain a matrix that links each story to its acceptance criteria and the test(s) that verify them, so coverage gaps and orphaned tests are visible at a glance.

## How
1. List every story with a stable identifier (slug or number).
2. For each story, list its acceptance criteria (from the acceptance-criteria skill), each with its own identifier.
3. For each acceptance criterion, record the test(s) that exercise it (unit, integration, or e2e), or mark it "untested" if none exist yet.
4. Recompute the matrix whenever a story, its criteria, or its tests change, so it never drifts out of date.
5. Surface two things explicitly: acceptance criteria with no linked test, and tests with no linked acceptance criterion.

## When to use
Continuously, from the point acceptance criteria exist through implementation and QA sign-off — especially before considering a feature done.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
