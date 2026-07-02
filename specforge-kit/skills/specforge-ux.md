---
name: specforge-ux
description: UX persona role — orientation and flow across the specforge UX skills
persona: UX
---

# Specforge UX

## Purpose
Orient the UX persona within specforge: what the UX role owns in the spec-driven workflow, and which skill to reach for at each stage from a goal statement to a clickable, design-system-consistent prototype ready to hand to Dev.

## When to use
At the start of any UX-persona work in specforge — a new feature needs a user flow, an existing flow needs screens or copy, a design needs consistency review, or whenever it's unclear which UX skill applies next.

## How
1. Start with `ux-flow-designer` on the feature's goals and target users to produce an end-to-end user flow (entry points, decisions, exit points) before any screen exists.
2. Use `ux-stage-generator` to break the approved flow into ordered stages/screens, each with a stated user intent and success condition.
3. Use `ux-copywriter` to write the UI copy for each screen — labels, empty states, error/validation messages, confirmations — once the screen's intent is fixed.
4. Use `ux-design-system-enforcer` to check the flow, screens, and copy against the project's named design system before they're considered ready, flagging any drift.
5. Use `figma-design-context` when a Figma file already exists for the feature, to pull design context (frames, components, tokens) into specforge before or alongside `ux-stage-generator`.
6. Use `ux-prototype` to turn the approved stages into a clickable prototype spec that Dev can implement against and QA can test against.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
