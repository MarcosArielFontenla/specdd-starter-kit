# Implementation Plan: <feature name>

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Translate an approved `spec.md` into a concrete technical approach before any tasks are cut.

## Inputs
- Approved `spec.md` for this feature
- `context/tech-stack.md`
- `context/constitution.md` (or `governance/constitution.md`)

## Content

### Architecture
<How this feature fits into the existing system. Diagrams as text/ASCII are fine. Call out new
services, modules, or major files.>

### Components
- <Component name>: <responsibility>
- <Component name>: <responsibility>

### Data flow
<Describe the request/response or event flow end to end, including external systems.>

### Risks
- <Risk>: <likelihood/impact, mitigation>

### Testing strategy
- Unit: <what gets unit-tested and how>
- Integration: <boundaries covered>
- E2E: <critical user journeys covered, if any>
- Manual/exploratory: <anything that can't be automated yet, and why>

## Definition of Done
- [ ] Architecture and components map 1:1 to the spec's functional requirements
- [ ] Every identified risk has a mitigation or an explicit "accepted risk" note
- [ ] Testing strategy covers every acceptance criterion in `spec.md`
