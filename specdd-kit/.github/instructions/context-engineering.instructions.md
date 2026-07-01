---
applyTo: "all"
description: Guidance for managing context provided to AI agents
---

# Context Engineering Instructions

## When this applies
Always, when preparing prompts, specs, or repository context that an AI agent will read before acting.

## Guidelines
- Keep `context/` documents (project, tech-stack, constitution) current; stale context causes agents to make decisions based on outdated facts.
- Prefer pointing an agent at the specific file(s) or spec section relevant to the task over pasting large, unfiltered context dumps.
- Structure long documents with clear headings so an agent can retrieve the relevant section instead of re-reading the whole file each turn.
- State constraints and non-goals explicitly (what NOT to do) alongside requirements, since agents otherwise infer scope from examples alone.
- Summarize prior decisions (ADRs, past PR discussion) instead of relying on an agent to infer them from raw git history.

## Anti-patterns
- Dumping an entire codebase or unrelated documents into a prompt "just in case."
- Letting `context/` files drift out of sync with the actual codebase and specs.
- Repeating the same large context block across many prompts instead of referencing a shared, versioned document.
