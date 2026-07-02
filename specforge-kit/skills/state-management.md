---
name: state-management
description: Choose and apply a state management pattern proportional to complexity
persona: Dev
---

# State Management

## Purpose
Choose a state management pattern proportional to the actual complexity of the state being managed, and apply it consistently, so state stays predictable and easy to trace as the feature grows.

## When to use
When a component or feature needs to hold data that changes over time — during `component-creation` or `api-endpoint` work, or when existing state has become hard to follow and needs a deliberate pattern applied.

## How
1. Classify the state before choosing a tool: local/ephemeral (a single component's UI state), shared/cross-component (needed by siblings or a subtree), or server/cache state (data owned by an API, subject to staleness) — each has a different right answer.
2. Default to the simplest option that fits: local component state for local/ephemeral data; lift state up to the nearest common ancestor for shared state before reaching for a global store.
3. Use a dedicated server-state/cache layer (query library, cache-aside pattern) for data fetched from an API, rather than copying it into ad-hoc component or global state — let it own loading/error/staleness/refetch concerns.
4. Reach for a global store only when state is genuinely cross-cutting (auth session, feature flags, app-wide preferences) and prop-drilling or lifting state has become impractical — not by default.
5. Keep state normalized and single-sourced: avoid storing the same fact in two places that can drift out of sync; derive computed values instead of duplicating and manually syncing them.
6. Make state transitions explicit and traceable (named actions/setters, not scattered direct mutations) so it's possible to answer "what changed this value and why" from the code alone.
7. Keep state as close as possible to where it's used; push it back down/local again once a "temporary" cross-component need goes away, rather than leaving it globally scoped indefinitely.
8. Write tests for state transitions and derived values, not just for the rendered output, so logic errors in the state layer are caught independently of the UI.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
