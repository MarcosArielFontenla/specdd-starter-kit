---
name: specforge-qa
description: QA persona role — orientation and flow across the specforge QA skills
persona: QA
---

# Specforge QA

## Purpose
Orient the QA persona within specforge: what the QA role owns in the spec-driven workflow, and which skill to reach for at each stage from a testable acceptance criterion to an evidenced, signed-off release.

## When to use
At the start of any QA-persona work in specforge — a new story lands with acceptance criteria, a release candidate needs sign-off, or whenever it's unclear which QA skill applies next.

## How
1. Use `ac-validation` first, as soon as acceptance criteria exist, to confirm each one is testable and unambiguous before any test is written against it.
2. Use `test-case-generation` to derive concrete test cases from the validated acceptance criteria, ensuring at least one test per AC.
3. Use `gherkin-automation` when scenarios are already written in Given/When/Then form and need to become automated steps rather than manual test cases.
4. Use `playwright-testing` to automate UI-facing test cases as end-to-end tests against the app's base URL.
5. Use `regression-testing` when a change lands near existing functionality, to select which prior tests must re-run based on risk and impact.
6. Use `bug-reporting` for any failing test or observed defect, capturing steps, expected/actual behavior, and evidence so Dev can reproduce it without follow-up questions.
7. Use `qa-evals` when AI-assisted QA output (generated tests, generated bug reports, generated automation) needs an objective pass/fail bar before it is trusted.
8. Use `qa-guardrails` before any sign-off to confirm the quality gates and evidence required are actually met, not assumed.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
