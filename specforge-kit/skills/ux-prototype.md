---
name: ux-prototype
description: Describe a clickable prototype spec derived from approved stages
persona: UX
---

# UX Prototype

## Purpose
Turn an approved, design-system-checked set of stages into a clickable prototype spec — the screens, their states, and the exact transitions between them — precise enough for Dev to implement against and QA to test against without guessing. The spec is tool-agnostic: it can be realized in Figma, a code-based prototype, or plain markup depending on project setup.

## When to use
After stages are generated (`ux-stage-generator`), copy is written (`ux-copywriter`), and the design-system check (`ux-design-system-enforcer`) has passed — as the last UX step before Dev implementation begins.

## How
1. List every screen/state from the stage list as a node in the prototype (include empty, loading, error, and success states, not just the happy-path screen).
2. For each node, list every interactive element and the transition it triggers: which node it goes to, and under what condition (e.g., "Submit" → validation passes → confirmation node; validation fails → same node with inline error state).
3. Mark the entry node(s) (how the prototype/flow is reached) and terminal node(s) (where the flow ends, successfully or via cancel).
4. Note any transition that depends on external state (e.g., server response time, permission check) and specify what the user sees while waiting.
5. Attach the finalized copy (from `ux-copywriter`) to each node so the prototype reads with real content, not lorem ipsum — placeholder copy hides real-world layout problems.
6. Note responsive behavior per node only where it changes the flow (e.g., a step collapses into a drawer on mobile) — full responsive layout detail belongs to Dev, not the prototype spec.
7. Package the prototype spec (node list, transitions, attached copy, entry/exit points) as the single reference Dev implements against and QA writes test cases against; keep it updated if a stage changes rather than letting it drift from the build.

## Guardrails
- Specifications/context are the source of truth — every node and transition must trace back to an approved stage and flow.
- Never output secrets, and never embed real user data or credentials in prototype content or links.
