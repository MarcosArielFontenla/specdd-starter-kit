# Command: /specdd-tasks

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Document when and how an agent runs the `specdd-tasks` command to break an approved plan into
bite-sized, independently testable tasks.

## Inputs
- Approved `specs/<feature-slug>/plan.md`
- `specs/<feature-slug>/spec.md` for acceptance criteria to trace against

## Content

### When to run
After a plan is approved, before implementation starts.

### How it runs
1. Read `specs/<feature-slug>/plan.md` and `specs/<feature-slug>/spec.md`.
2. Draft `specs/<feature-slug>/tasks.md` following `templates/tasks-template.md`: a numbered list
   where each task has Files, Steps, and a Done condition.
3. Size each task so it can be implemented and verified in one sitting (small, reviewable diffs).
4. Ensure every functional requirement in the spec is covered by at least one task.

### Output
`specs/<feature-slug>/tasks.md`, ready for `/specdd-implement`.

## Definition of Done
- [ ] Every task has concrete Files, Steps, and a checkable Done condition
- [ ] Every functional requirement in `spec.md` maps to at least one task
- [ ] Tasks are ordered so each can be implemented without depending on a later task
