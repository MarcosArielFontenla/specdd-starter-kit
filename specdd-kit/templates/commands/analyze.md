# Command: /specdd-analyze

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Document when and how an agent runs the `specdd-analyze` command to check for gaps between the
current codebase and a spec/plan before implementation begins or continues.

## Inputs
- `specs/<feature-slug>/spec.md` and `plan.md`
- The current state of the codebase relevant to this feature

## Content

### When to run
Before starting implementation on an existing codebase (to see what already exists vs. what the
plan assumes), or mid-implementation when something in the codebase doesn't match expectations.

### How it runs
1. Read the spec and plan for the feature in question.
2. Search the codebase for existing implementations, related modules, or conflicting patterns.
3. Produce a short gap analysis: what already exists, what's missing, what contradicts the plan.
4. If the plan is now inaccurate, flag it for revision rather than implementing around the gap
   silently.

### Output
A gap analysis (inline report or appended to `research.md`) identifying discrepancies between spec,
plan, and actual codebase state.

## Definition of Done
- [ ] Every discrepancy found is called out explicitly, not implemented around silently
- [ ] Gaps that invalidate the current plan are flagged before implementation continues
