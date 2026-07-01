---
applyTo: "all"
description: General performance optimization guidance for application code
---

# Performance Optimization Instructions

## When this applies
Always, when writing code on a hot path (request handlers, render loops, data pipelines) or reviewing changes for performance impact.

## Guidelines
- Measure before optimizing: profile or benchmark to find the actual bottleneck instead of guessing.
- Avoid N+1 queries; batch database/API calls or use joins/`include`/`select_related` equivalents.
- Cache expensive, repeatable computations (with clear invalidation rules) rather than recomputing them on every request or render.
- Choose the right data structure and algorithmic complexity for the input size (e.g., a `Set`/`Map` lookup instead of a linear array scan in a loop).
- Stream or paginate large datasets instead of loading everything into memory at once.

## Anti-patterns
- Micro-optimizing cold, rarely-executed code paths while ignoring measured hot paths.
- Issuing a database query inside a loop instead of batching it.
- Adding caching without an invalidation strategy, leading to stale data bugs.
