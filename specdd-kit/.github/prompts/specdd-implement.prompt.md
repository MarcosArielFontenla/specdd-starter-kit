---
agent: agent
description: Implement tasks TDD-style following the plan
---

# /specdd-implement

Implement tasks TDD-style, following an approved plan. This is the final step of
the SDD flow for a given feature, run after tasks are cut and approved.

## Steps
1. Read `specs/<feature-slug>/tasks.md` and pick the next incomplete task in order.
2. Write a failing test that captures the task's Done condition (red), implement
   the minimum code to make it pass (green), then refactor while keeping tests
   green.
3. Mark the task's Done checkbox in `specs/<feature-slug>/tasks.md` and move to
   the next task — never skip ahead or batch multiple tasks silently.

## Output
Working code and passing tests for each completed task, with `tasks.md` checkboxes
updated to accurately reflect what has and hasn't been implemented.

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
