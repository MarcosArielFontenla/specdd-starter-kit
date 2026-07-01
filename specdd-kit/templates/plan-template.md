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
<how this feature fits into the existing system>

### Components
- <component>: <responsibility>

### Data flow
<request/response or event flow, including external systems>

### Risks
- <risk>: <likelihood/impact, mitigation>

### Testing strategy
- Unit: <coverage>
- Integration: <coverage>
- E2E: <coverage>
- Manual/exploratory: <coverage, and why it isn't automated>

## Definition of Done
- [ ] Architecture and components map 1:1 to the spec's functional requirements
- [ ] Every identified risk has a mitigation or an explicit "accepted risk" note
- [ ] Testing strategy covers every acceptance criterion in `spec.md`
