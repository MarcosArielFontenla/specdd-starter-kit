---
name: documentation
description: Document modules and APIs concisely
persona: Dev
---

# Documentation

## Purpose
Document a module or API concisely enough that another developer can use it correctly without reading its implementation, and no more than that.

## When to use
Once a module's or API's shape has stabilized — after `component-creation`, `api-endpoint`, or `refactoring` settle the interface — and whenever existing documentation drifts from actual behavior.

## How
1. Lead with purpose and usage: what problem the module/API solves and a minimal working example, before any exhaustive parameter listing.
2. Document the public interface precisely: parameters/props with types and whether required/optional, return shape or response schema, and thrown/returned error conditions.
3. Call out side effects and preconditions explicitly (network calls, state mutation, required auth, required setup) — the things a caller can't infer from the signature alone.
4. Keep examples runnable and current: copy them from (or verify them against) actual working code/tests, not aspirational usage that no longer matches the implementation.
5. Document what's deliberately out of scope or unsupported if it's a common point of confusion, so users don't file bugs for expected non-behavior.
6. Place documentation where it will be found: inline doc comments for functions/types close to their definition, a README/module doc for cross-cutting usage, API reference docs generated or updated alongside endpoint changes.
7. Update documentation in the same change that alters behavior — treat stale docs as a regression, not a follow-up task.
8. Avoid restating what the code already makes obvious (type signatures, trivial getters); spend the words on intent, constraints, and gotchas instead.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
