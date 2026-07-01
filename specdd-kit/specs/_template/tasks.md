# Tasks: <feature name>

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Break an approved `plan.md` into small, independently completable, testable tasks.

## Inputs
- Approved `plan.md` for this feature
- `spec.md` acceptance criteria to trace each task back to

## Content

### Task list

#### Task 1: <short task title>
**Files:**
- Create/modify: `<path>`

**Steps:**
1. <step>
2. <step>

**Done:**
- [ ] <test or check that proves this task works>
- [ ] Traces to spec requirement <FR-#/NFR-#>

#### Task 2: <short task title>
**Files:**
- Create/modify: `<path>`

**Steps:**
1. <step>
2. <step>

**Done:**
- [ ] <test or check that proves this task works>
- [ ] Traces to spec requirement <FR-#/NFR-#>

<Add tasks 3..N as needed. Keep each task small enough to implement and verify in one sitting.>

## Definition of Done
- [ ] Every task lists concrete files, steps, and a checkable "Done" condition
- [ ] Every functional requirement in `spec.md` is covered by at least one task
- [ ] Tasks are ordered so each one can be implemented and tested independently
