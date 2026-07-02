---
name: ux-flow-designer
description: Design an end-to-end user flow from goals to screens
persona: UX
---

# UX Flow Designer

## Purpose
Turn a feature's goals and target users into a coherent end-to-end user flow — the sequence of steps, decisions, and screens a user moves through to accomplish a task — before any individual screen is designed.

## When to use
At the start of UX work on a new feature or user journey, once the BA-authored story and acceptance criteria exist but before stages, copy, or a prototype are produced. Also use when an existing flow needs to be re-examined because scope changed.

## How
1. Restate the user goal in one sentence ("As a `<user>`, I want to `<goal>` so that `<outcome>`"), sourced from the story/spec — do not invent a goal that isn't in the spec.
2. Identify the entry points (how the user arrives at this flow: nav item, link, notification, deep link) and the exit points (success state, cancel/abandon state, error state).
3. List the flow as an ordered sequence of steps, marking each as a screen, a system action (e.g., background save), or a decision point (branch based on data or user choice).
4. For every decision point, enumerate each branch explicitly and where it rejoins the main flow or terminates — no dangling branches.
5. Note any state that must persist across steps (e.g., a multi-step form's draft data) and where validation happens (inline per-step vs. only at submit).
6. Cross-check the flow against the story's acceptance criteria: every AC should map to a step or a branch outcome in the flow; flag any AC the flow doesn't yet cover.
7. Hand the flow off to `ux-stage-generator` to expand each step into a concrete stage/screen with an intent.

## Guardrails
- Specifications/context are the source of truth — build the flow from the approved story/spec, not assumptions about what users "probably" want.
- Never output secrets.
