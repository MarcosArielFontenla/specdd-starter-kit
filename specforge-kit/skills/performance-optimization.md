---
name: performance-optimization
description: Profile and optimize hot paths based on evidence
persona: Dev
---

# Performance Optimization

## Purpose
Profile actual hot paths and optimize based on measured evidence, so performance work targets what's really slow rather than what looks slow.

## When to use
Only after a real performance problem is observed or measured (slow endpoint, janky UI, high resource usage) — not speculatively, and never before correctness and tests are in place.

## How
1. Establish a baseline measurement before changing anything: profile the actual hot path (CPU profile, network waterfall, render trace, query plan) rather than guessing which function is slow.
2. Identify the bottleneck with data — the specific function, query, or render that dominates the time/resource budget — before touching code; optimizing a cold path wastes effort and adds risk for no gain.
3. Prefer algorithmic and structural fixes (reduce N+1 queries, add an index, memoize a genuinely expensive pure computation, batch requests) over micro-optimizations that shave negligible time at the cost of readability.
4. Keep the existing test suite green throughout — performance changes must not alter behavior; add a regression test for any bug the optimization incidentally would have introduced.
5. Change one thing at a time and re-measure after each change against the same baseline, so each optimization's actual impact is known rather than assumed.
6. Watch for common traps: premature caching that introduces staleness bugs, over-memoization that increases memory pressure, and optimizing a path that only matters at a scale the system doesn't actually operate at.
7. Document the measured before/after (with numbers) in the PR description so reviewers and future maintainers can see the optimization was justified, not just claimed.
8. Stop once the measured bottleneck is resolved to an acceptable target — do not keep optimizing past the point where it matters for the user or the system's actual constraints.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
