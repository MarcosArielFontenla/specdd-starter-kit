# Command: /specdd-clarify

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Document when and how an agent runs the `specdd-clarify` command to resolve a spec's open questions
by asking targeted questions instead of guessing.

## Inputs
- `specs/<feature-slug>/spec.md` with one or more Open questions
- Access to a human (or another authoritative source) who can answer them

## Content

### When to run
After `/specdd-specify` produces a spec with unresolved Open questions, and before `/specdd-plan`
starts — a plan should never be built on top of unresolved ambiguity.

### How it runs
1. Read the spec's Open questions section.
2. For each question, ask a specific, answerable question (avoid open-ended "what do you think?" —
   propose concrete options when possible).
3. Record each answer back into the relevant spec section (Requirements, Acceptance criteria, etc.)
   and remove the resolved item from Open questions.
4. Leave genuinely unresolved items in Open questions with a note on what's blocking resolution.

### Output
An updated `specs/<feature-slug>/spec.md` with fewer (ideally zero) Open questions.

## Definition of Done
- [ ] Every answered question is reflected in the spec body, not just noted as "resolved"
- [ ] Remaining Open questions have a clear blocker or owner
- [ ] No question was resolved by assumption instead of an actual answer
