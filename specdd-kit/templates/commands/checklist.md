# Command: /specdd-checklist

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Document when and how an agent runs the `specdd-checklist` command to generate or verify a
pre-merge checklist for a feature.

## Inputs
- `specs/<feature-slug>/spec.md`, `plan.md`, `tasks.md`
- The actual diff/PR proposed for merge

## Content

### When to run
After implementation is complete and before the feature is merged — the last gate in the SDD flow.

### How it runs
1. Generate `specs/<feature-slug>/checklist.md` from `templates/checklist-template.md` if it doesn't
   exist yet.
2. Walk each checklist item against the real diff: Spec ↔ code, Spec ↔ tests, Tasks ↔ code, Quality
   gates.
3. Check off items that are verifiably true; leave unchecked items with a note on what's missing.
4. Do not check an item without having actually verified it (e.g., don't check "tests pass" without
   running them).

### Output
`specs/<feature-slug>/checklist.md` with an accurate, evidence-based checked/unchecked state.

## Definition of Done
- [ ] Every checked item was actually verified, not assumed
- [ ] Unchecked items have a clear note on what's blocking them
- [ ] No secrets or credentials were found in the diff during review
