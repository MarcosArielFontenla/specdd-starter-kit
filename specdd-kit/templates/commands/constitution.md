# Command: /specdd-constitution

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Document when and how an agent runs the `specdd-constitution` command to draft or update the
project's constitution.

## Inputs
- Existing `context/constitution.md` / `governance/constitution.md`, if any
- Team input on values, quality bar, and any compliance constraints

## Content

### When to run
Once at project setup (constitution is the first step of the SDD flow), and again whenever the
team deliberately decides to amend a principle — never as a silent side effect of another task.

### How it runs
1. Read the existing constitution (if any) and `templates/constitution-template.md`.
2. Draft/update SDD flow statement, Principles, Data classification, and Amendments sections.
3. Keep principles concrete and checkable in review — avoid vague aspirational language.
4. Do not introduce numbered governance levels or tiers; use plain descriptive labels only.
5. Mirror any change into both `context/constitution.md` and `governance/constitution.md` so they
   stay consistent.

### Output
An updated `context/constitution.md` and `governance/constitution.md`, with the rationale for any
change recorded in the amending PR/spec.

## Definition of Done
- [ ] Principles are concrete enough to be checked in code review
- [ ] Data classification uses plain labels (no L1-L4 or similar tiers)
- [ ] `context/constitution.md` and `governance/constitution.md` agree with each other
