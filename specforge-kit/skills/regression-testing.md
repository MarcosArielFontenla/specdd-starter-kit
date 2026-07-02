---
name: regression-testing
description: Select a regression suite by risk and impact
persona: QA
---

# Regression Testing

## Purpose
Select a right-sized regression suite for a given change — enough to catch breakage in related functionality, without re-running the entire test corpus for every change.

## When to use
Whenever a change (feature, fix, refactor, dependency bump) touches code, data, or configuration shared with existing tested functionality — before merging or before a release candidate is cut.

## How
1. Identify what changed: files, modules, API contracts, database schema, or shared configuration touched by the change.
2. Trace forward from the change to its blast radius using the traceability matrix and code ownership/imports — which stories, ACs, and prior test cases exercise that same code path or data.
3. Rank the affected areas by risk × impact: risk being how likely the change is to break behavior there (proximity, complexity), impact being how severe or visible a failure would be (revenue path, auth, data integrity, public API).
4. Include in the suite: every high-risk/high-impact test case identified, all tests directly covering the changed AC(s), and a smoke pass across critical user journeys unrelated to the change.
5. Explicitly exclude, and note as excluded, low-risk/low-impact areas with no plausible dependency on the change — full-suite reruns are a fallback, not the default.
6. Run the selected suite and record results against the change; any failure outside the expected change scope is itself a signal the blast-radius analysis was too narrow — widen it and re-run.
7. If the change is high-risk (auth, payments, data migration, shared infra), escalate to a full regression pass regardless of the targeted selection.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
