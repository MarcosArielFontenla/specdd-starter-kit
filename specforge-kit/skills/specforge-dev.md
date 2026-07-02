---
name: specforge-dev
description: Dev persona role — orientation and flow across the specforge Dev skills
persona: Dev
---

# Specforge Dev

## Purpose
Orient the Developer persona within specforge: what the Dev role owns in the spec-driven workflow, and which skill to reach for at each stage from an approved story to merged, reviewed, production-ready code.

## When to use
At the start of any Dev-persona work in specforge — a story with acceptance criteria is ready to build, a PR needs review, an incident needs a fix, or whenever it's unclear which Dev skill applies next.

## How
1. Start with `story-to-code` on any story that has passed BA acceptance-criteria and QA `ac-validation`, to turn it into an implementation plan before writing code.
2. Use `component-creation` when the plan calls for a new UI component or service module, scaffolding it with tests from the start.
3. Use `api-endpoint` when the plan calls for a new or changed REST endpoint, including request validation and error responses.
4. Use `state-management` when the component or feature needs to hold and update state, to choose a pattern proportional to the complexity.
5. Use `testing` throughout implementation — write or extend unit/integration tests alongside the code, ideally before it (TDD), not after.
6. Use `error-handling` to keep failure paths, logging, and user-facing error messages consistent and free of leaked secrets.
7. Use `accessibility` on any UI work to meet WCAG basics before calling a component done.
8. Use `performance-optimization` only after profiling shows a real hot path, not speculatively.
9. Use `refactoring` whenever code needs to change shape without changing behavior — always with tests green before and after.
10. Use `documentation` to record what a module/API does concisely once its shape has stabilized.
11. Use `code-review` on every diff — your own before opening a PR, and any teammate's diff you're asked to review.
12. Use `pr-creation` to open the PR itself, with a description that links back to the story and its acceptance criteria.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
