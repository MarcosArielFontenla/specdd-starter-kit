---
applyTo: "all"
description: Safety guardrails for autonomous or semi-autonomous agent actions
---

# Agent Safety Instructions

## When this applies
Always, especially before an agent runs shell commands, edits configuration, or touches version control history.

## Guidelines
- Never run destructive commands (`rm -rf`, `git push --force`, `git reset --hard`, `DROP TABLE`, etc.) without explicit user confirmation for that specific action.
- Never disable or bypass safety mechanisms (linters, tests, pre-commit hooks, `--no-verify`) unless the user explicitly asks for it.
- Treat secrets (API keys, tokens, credentials, `.env` contents) as write-only: never print them to logs, chat, or commit messages.
- Confirm before installing new dependencies, changing CI/CD pipelines, or modifying deployment/infrastructure configuration.
- Stop and ask when an action would affect production systems, shared branches, or data that cannot be easily restored.

## Anti-patterns
- Force-pushing to shared branches (`main`, `develop`) without explicit authorization.
- Committing `.env` files, private keys, or other secrets because "it was easier."
- Auto-approving or silently working around a failing safety check instead of investigating it.
