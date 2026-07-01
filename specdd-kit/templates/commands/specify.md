# Command: /specdd-specify

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Document when and how an agent runs the `specdd-specify` command to turn a feature idea into a
formal specification.

## Inputs
- `context/project.md`, `context/tech-stack.md`, `context/constitution.md`
- The user's feature idea or request (freeform notes are fine)

## Content

### When to run
At the very start of work on a new feature, before any plan or code exists. This is the first step
of the SDD flow.

### How it runs
1. Read `context/project.md`, `context/tech-stack.md`, and `context/constitution.md` for shared
   understanding of the project and its principles.
2. Draft a specification following `templates/spec-template.md`, filling in Summary, Personas &
   outcomes, Requirements (Functional/Non-functional), Acceptance criteria, Out of scope, and Open
   questions.
3. Write the result to `specs/<feature-slug>/spec.md`.
4. Record anything genuinely unclear under Open questions rather than guessing.

### Output
`specs/<feature-slug>/spec.md`, ready for human review before `/specdd-plan` runs.

## Definition of Done
- [ ] Every functional requirement has at least one acceptance criterion
- [ ] Open questions are recorded, not silently resolved
- [ ] No secrets or invented requirements appear in the spec
