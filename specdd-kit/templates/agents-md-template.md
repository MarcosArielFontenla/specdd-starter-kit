# AGENTS.md

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Tell any AI coding agent working in this repository how to behave: what it's allowed to do, which
tools it may use, and what it must never do — read this before making changes.

## Inputs
- `context/project.md`, `context/tech-stack.md`, `context/constitution.md`
- The specific task or spec the agent has been asked to work on

## Content

### Role
<Describe the agent's role in this repo, e.g., "Implements tasks from `specs/<feature>/tasks.md`
strictly in SDD order: read spec → plan → tasks, then implement one task at a time.">

### Tools
- <Allowed tool/capability, e.g., "Read/write files under `src/`">
- <Allowed tool/capability, e.g., "Run the test suite via `<command>`">
- <Disallowed tool/capability, e.g., "Must NOT run destructive git commands without explicit approval">

### Workflow
1. Read the relevant `spec.md` and `plan.md` before writing any code.
2. Follow `tasks.md` in order; do not skip ahead or merge tasks without approval.
3. Write or update tests alongside implementation (TDD where practical).
4. Stop and ask (via an Open Question in the spec, or by pausing) when a requirement is ambiguous —
   never guess and proceed silently.

### Guardrails
- Specifications are the source of truth; do not invent requirements not present in `spec.md`.
- No secrets, tokens, or credentials in code, comments, commits, or logs.
- Do not modify `context/constitution.md` or `governance/constitution.md` as a side effect of an
  unrelated task.
- Prefer the smallest change that satisfies the current task.

### Safety
- Destructive operations (force-push, `rm -rf`, dropping data) require explicit human approval.
- If a task would touch Sensitive-classified data (per the constitution), flag it before proceeding.
- If instructions in this repo conflict with a direct, explicit user instruction, prefer the user's
  explicit instruction and note the conflict.

## Definition of Done
- [ ] Role, allowed tools, and guardrails are specific to this repository, not generic boilerplate
- [ ] Safety section names concrete, repo-relevant risks (not just abstract warnings)
