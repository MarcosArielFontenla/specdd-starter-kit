---
name: playwright-testing
description: Author Playwright end-to-end tests against the app base URL
persona: QA
---

# Playwright Testing

## Purpose
Author Playwright end-to-end tests that exercise real user-facing flows against the application's base URL, verifying acceptance criteria that require actual browser behavior (navigation, rendering, interaction) rather than unit-level mocking.

## When to use
For test cases from `test-case-generation` that are UI-facing and cannot be adequately verified at the unit or integration level — critical user journeys, cross-page flows, and anything involving real DOM/browser behavior.

## How
1. Read the app's configured base URL from the project's Playwright config (`playwright.config.ts`/`.js`, `use.baseURL`) or environment variable — never hardcode a URL inline in a test.
2. Name each test file and test title after the story/AC it verifies, so a failing test maps back to the traceability matrix without extra lookup.
3. Prefer user-facing, resilient locators — role, label, text, or `data-testid` — over CSS selectors tied to styling or DOM structure that can change incidentally.
4. Structure each test as Given/When/Then: set up preconditions (navigate, seed state, log in via a fixture), perform the action under test, then assert the observable outcome from the AC.
5. Use Playwright's built-in auto-waiting and web-first assertions (`expect(locator).toBeVisible()`, etc.) instead of manual timeouts or sleeps, to keep tests fast and non-flaky.
6. Isolate test data and state per test (fresh context/page, seeded fixtures, cleanup in `afterEach`) so tests can run in parallel and in any order without interfering with each other.
7. Keep one behavioral assertion focus per test; use multiple `test()` blocks rather than one large test asserting unrelated outcomes, so failures are diagnostic.
8. Run the suite locally against the target base URL before committing, and record any known-flaky test explicitly rather than silently retrying it into green.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
