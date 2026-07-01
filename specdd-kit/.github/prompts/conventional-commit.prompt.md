---
agent: agent
description: Produce a Conventional Commits message for staged changes
---

# /conventional-commit

Produce a Conventional Commits-formatted commit message for the currently staged
changes. This is a utility command used throughout the SDD flow whenever work is
ready to commit, not tied to a single step.

## Steps
1. Inspect the staged diff (`git diff --staged`) to understand what actually
   changed — files touched, and whether the change is a feature, fix, docs,
   refactor, test, or chore.
2. Choose a type and optional scope (e.g. `feat(specdd-kit): ...`,
   `fix(website): ...`), and write a short imperative subject line under 72
   characters, with a body explaining the "why" when the change isn't obvious
   from the subject alone.
3. Output the commit message only; do not run `git commit` unless explicitly
   asked to.

## Output
A single Conventional Commits message (type(scope): subject, optional body) ready
to pass to `git commit -m`.

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
