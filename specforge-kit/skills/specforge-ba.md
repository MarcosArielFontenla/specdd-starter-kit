---
name: specforge-ba
description: BA persona role — orientation and flow across the specforge BA skills
persona: BA
---

# Specforge BA

## Purpose
Orient the Business Analyst persona within specforge: what the BA role owns in the spec-driven workflow, and which skill to reach for at each stage from raw notes to a traceable, test-ready backlog.

## When to use
At the start of any BA-persona work in specforge — new feature intake, a backlog grooming pass, or whenever it's unclear which BA skill applies next.

## How
1. Start with `context-analysis` on any raw feature notes to extract actors, scope, and constraints before writing anything else.
2. Use `story-writing` to turn the analyzed context into INVEST-shaped user stories, one per discrete user goal.
3. Use `acceptance-criteria` to attach Given/When/Then criteria to each story so it is testable and unambiguous.
4. If a story is too large (bloated criteria list, oversized estimate, multiple goals), use `story-splitting` to break it along workflow/data/interface boundaries, then re-run `acceptance-criteria` on the resulting stories.
5. Use `requirements-traceability` continuously to keep the story-to-criteria-to-test matrix current, and to surface coverage gaps before calling a feature done.
6. Use `miro-collaboration` when stakeholder alignment on scope/sequencing is needed, feeding the resulting board back into stories via `context-analysis` and `story-writing`.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
