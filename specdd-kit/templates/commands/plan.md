# Command: /specdd-plan

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Document when and how an agent runs the `specdd-plan` command to produce an implementation plan
from an approved spec.

## Inputs
- Approved `specs/<feature-slug>/spec.md` (no unresolved Open questions blocking design)
- `context/tech-stack.md`

## Content

### When to run
After a spec is approved (Open questions resolved or explicitly deferred), before any tasks are cut
or code is written.

### How it runs
1. Read `specs/<feature-slug>/spec.md` and `context/tech-stack.md`.
2. Draft `specs/<feature-slug>/plan.md` following `templates/plan-template.md`: Architecture,
   Components, Data flow, Risks, Testing strategy.
3. Optionally produce `data-model.md`, `research.md`, and/or `api.md` alongside it if the feature
   involves new data, unresolved technical decisions, or new endpoints.
4. Ensure every functional requirement in the spec maps to at least one component/step in the plan.

### Output
`specs/<feature-slug>/plan.md`, ready for `/specdd-tasks`.

## Definition of Done
- [ ] Plan traces to every functional requirement in `spec.md`
- [ ] Risks section is populated with real risks, not left empty
- [ ] Testing strategy covers every acceptance criterion
