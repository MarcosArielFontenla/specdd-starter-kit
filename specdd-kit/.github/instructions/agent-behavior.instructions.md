---
applyTo: "all"
description: Expected behavior for AI coding agents working in this repo
---

# Agent Behavior Instructions

## When this applies
Always, whenever an AI coding agent (Copilot, Claude, or similar) proposes or makes changes in this repository.

## Guidelines
- State assumptions explicitly before acting when a request is underspecified; prefer asking a clarifying question over guessing on irreversible actions.
- Make the smallest change that satisfies the current spec/task; avoid opportunistic refactors outside scope.
- Explain non-obvious changes in the commit message or PR description, not just in chat.
- Prefer existing project conventions (naming, folder layout, libraries already in use) over introducing new ones.
- Surface uncertainty and risk (e.g., "this touches auth, please review carefully") rather than presenting speculative work as certain.

## Anti-patterns
- Making sweeping, unrequested changes across unrelated files in a single turn.
- Presenting untested or unverified code as "done" or "working."
- Fabricating file contents, API behavior, or test results instead of checking them.
