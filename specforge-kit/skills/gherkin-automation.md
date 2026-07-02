---
name: gherkin-automation
description: Turn Gherkin scenarios into automated test steps
persona: QA
---

# Gherkin Automation

## Purpose
Convert Given/When/Then Gherkin scenarios (from acceptance criteria or feature files) into automated step definitions that execute reliably, keeping the plain-language scenario and its automation in sync.

## When to use
When acceptance criteria or feature files are already written in Gherkin and need to become part of the automated suite, rather than a fresh set of test cases.

## How
1. Take each Gherkin scenario as written (Given/When/Then, plus And/But) without rewording it — the scenario is the source of truth for what the automation must do; if it's unclear, send it back through `ac-validation` rather than guessing.
2. Map each distinct Given/When/Then line to a reusable step definition; parameterize steps that differ only by value (e.g., `Given the user has {int} items in cart`) instead of writing a near-duplicate step per scenario.
3. Implement each step definition using the project's existing automation layer (Playwright, or whatever the codebase already uses) — reuse `playwright-testing` conventions for locators and waits when the steps are UI-facing.
4. Keep step definitions thin: business logic and assertions live in the step, but any repeated setup (auth, seeded data) belongs in shared fixtures/hooks, not copy-pasted per step.
5. Ensure Given steps only establish state (no assertions), When steps only perform the action, and Then steps only assert outcomes — this keeps failures diagnostic (setup failure vs. action failure vs. assertion failure).
6. Run the automated scenario and confirm it fails when the underlying behavior is broken (mutate the app or stub a wrong response) before trusting it as a regression guard — an automated step that can't fail isn't testing anything.
7. Tag scenarios (e.g., `@smoke`, `@regression`) consistently with how `regression-testing` selects suites, so tag-based test runs stay meaningful.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
