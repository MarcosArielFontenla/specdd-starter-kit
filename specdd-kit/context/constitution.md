# Project Constitution

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
State the non-negotiable principles every spec, plan, and implementation in this project must follow.

## Inputs
- Team values and quality bar
- Regulatory or compliance constraints, if any
- Data sensitivity of the systems involved

## Content

### SDD flow
This project follows Spec-Driven Development: **constitution → specify → plan → tasks → implement**.
Specifications are the source of truth; code is the output. When code and spec disagree, the spec
wins until deliberately updated — update the spec first, then the code.

### Principles
1. **Specs before code.** No implementation work starts without an approved `spec.md`.
2. **Small, reviewable increments.** Plans break into tasks that are independently testable and shippable.
3. **Tests define done.** Acceptance criteria in the spec map to tests; a task isn't done until its tests pass.
4. **No invented requirements.** Open questions are recorded, not silently resolved by guessing.
5. **Traceability.** Every task references the spec/plan section it implements.
6. **No secrets in the repo.** Tokens, credentials, and real customer data never appear in specs, code, or examples.

### Data classification
Classify data referenced by any spec using plain, descriptive labels (avoid rigid tiers):
- **Public** — safe to share outside the team (docs, marketing copy).
- **Internal** — team/organization use only (internal tooling, non-sensitive configs).
- **Sensitive** — requires access control and care in logs/examples (PII, credentials, financial data).

Every spec that touches Sensitive data must call this out explicitly in its Non-functional requirements.

### Amendments
Changes to this constitution require a written rationale in the change's spec or PR description, and
must not be made silently as part of an unrelated task.

## Definition of Done
- [ ] Principles are concrete enough to be checked in a code review, not just aspirational
- [ ] Data classification labels are used consistently across specs
- [ ] Amendment process is documented and followed
