# Command: /specdd-implement

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Document when and how an agent runs the `specdd-implement` command to implement tasks TDD-style,
following an approved plan.

## Inputs
- Approved `specs/<feature-slug>/tasks.md`
- `context/tech-stack.md` for tooling/commands

## Content

### When to run
After tasks are cut and approved; this is the final step of the SDD flow for a given feature.

### How it runs
1. Read `specs/<feature-slug>/tasks.md` and pick the next incomplete task in order.
2. Write a failing test that captures the task's Done condition (TDD: red first).
3. Implement the minimum code to make the test pass (green).
4. Refactor if needed, keeping tests green.
5. Mark the task's Done checkbox and move to the next task — never skip ahead.
6. Stop and surface an Open question (rather than guessing) if a task's requirement is ambiguous.

### Output
Working code + passing tests for each completed task, with `tasks.md` checkboxes updated to reflect
actual state.

## Definition of Done
- [ ] Every completed task has a corresponding passing test
- [ ] `tasks.md` accurately reflects what has and hasn't been implemented
- [ ] No task was marked done without its Done condition actually being verified
