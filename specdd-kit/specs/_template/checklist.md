# Pre-merge Checklist: <feature name>

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Verify spec, code, and tests agree before this feature merges.

## Inputs
- `spec.md`, `plan.md`, `tasks.md` for this feature
- The actual diff/PR being merged

## Content

### Spec ↔ code
- [ ] Every functional requirement (FR-#) in `spec.md` is implemented
- [ ] Every non-functional requirement (NFR-#) is addressed or explicitly deferred with rationale
- [ ] No code exists that isn't traceable to a requirement or an explicit task

### Spec ↔ tests
- [ ] Every acceptance criterion in `spec.md` has at least one corresponding test
- [ ] All tests pass locally and in CI
- [ ] Edge cases from `research.md` (if any) are covered by tests

### Tasks ↔ code
- [ ] Every task in `tasks.md` is marked Done and matches what was actually built
- [ ] No leftover TODO/placeholder code remains

### Quality gates
- [ ] Lint/format checks pass
- [ ] No secrets, tokens, or real credentials in the diff
- [ ] Data classification (per constitution) respected for any Sensitive fields touched

## Definition of Done
- [ ] All checkboxes above are checked, or have a linked explanation for why not
- [ ] Reviewer has independently verified at least the Spec ↔ code and Spec ↔ tests sections
