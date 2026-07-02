---
name: component-creation
description: Scaffold a UI or service component with tests from the start
persona: Dev
---

# Component Creation

## Purpose
Scaffold a new UI or service component — structure, interface, and its first tests — so it starts from a consistent, testable shape rather than being retrofitted with tests later.

## When to use
When a story or implementation plan calls for a new UI component or service module that doesn't yet exist in the codebase.

## How
1. Confirm the component's single responsibility from the story/plan before writing any code; if it needs to do two unrelated things, split it into two components.
2. Follow the codebase's existing component conventions (folder layout, file naming, framework idioms) rather than inventing a new pattern — check a sibling component for the pattern to match.
3. Define the component's public interface first: props/inputs, emitted events/outputs, and return shape for a service — write this down before the internals, so it's reviewable in isolation.
4. Scaffold the test file alongside the component file (not after), with at least one test for the default/happy path so the component is never committed untested.
5. Implement the smallest version that satisfies the interface and passes the initial test, then extend behavior incrementally, adding a test for each new branch or edge case as it's added.
6. Handle loading, empty, and error states explicitly for UI components — do not leave a state unrendered because "it shouldn't happen."
7. Keep the component free of business logic that belongs elsewhere (fetch calls buried in a UI component, formatting logic duplicated from a shared util) — extract to hooks/services and import instead.
8. Wire the component into its parent/route/registration point and run the full local suite before considering the scaffold done.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
