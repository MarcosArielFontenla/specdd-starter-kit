---
name: ux-stage-generator
description: Break an approved user flow into stages/screens with explicit intents
persona: UX
---

# UX Stage Generator

## Purpose
Expand an approved user flow into a concrete, ordered set of stages (screens or screen-states) — each with a single stated intent, its key elements, and its success/exit condition — so Dev has an unambiguous list of what to build.

## When to use
After `ux-flow-designer` has produced an approved flow and before copy (`ux-copywriter`) or a clickable prototype (`ux-prototype`) is produced. Also use when a flow gains or loses a step and the stage list needs to be regenerated.

## How
1. Walk the flow step by step; for each screen-level step, create one stage entry. For a decision point, create one stage per branch outcome that has distinct content or layout.
2. For each stage, capture: a short name, the single primary user intent ("what is the user trying to do on this screen"), the key elements needed to support that intent (inputs, actions, data displayed), and the success condition that advances the user to the next stage.
3. Keep one primary intent per stage — if a stage needs two unrelated primary actions, split it into two stages instead of overloading one screen.
4. Note every state a stage can be in beyond the happy path: empty (no data yet), loading, error, and success — these feed directly into `ux-copywriter`.
5. Order stages to match the flow exactly, and mark any stage that can be entered directly (deep link) as well as via the preceding stage, since it needs to handle missing prior-step context.
6. Reference the design system (see `ux-design-system-enforcer`) for which existing components/patterns satisfy each stage's key elements before assuming a new component is needed.
7. Output the stage list in a form Dev can consume directly: stage name, intent, elements, states, success condition — this becomes the backbone of the prototype spec.

## Guardrails
- Specifications/context are the source of truth — every stage must trace back to a step in the approved flow.
- Never output secrets.
