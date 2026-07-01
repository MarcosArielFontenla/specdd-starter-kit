# Agent: <agent name>

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Define a single agent's role, tools, and guardrails when a project needs more than one specialized
agent (e.g., a spec-writer agent vs. an implementer agent vs. a reviewer agent).

## Inputs
- `templates/agents-md-template.md` for repo-wide defaults this agent inherits
- The specific responsibility this agent is being scoped to

## Content

### Role
<One or two sentences: what this specific agent is responsible for, and what it is NOT responsible
for (hand-offs to other agents/humans).>

### Tools
- <Tool/capability this agent may use>
- <Tool/capability this agent may use>
- <Explicitly excluded tool/capability, if relevant>

### Inputs it expects
- <e.g., an approved `spec.md`, a specific `tasks.md` entry, a diff to review>

### Outputs it produces
- <e.g., a new `plan.md`, a set of file edits, a review comment>

### Guardrails
- Operates only within the scope defined above; escalates (does not silently expand scope) when a
  task requires capabilities outside its Tools list.
- Follows the repository's `AGENTS.md` guardrails in addition to these.
- No secrets in output; no invented requirements.

### Safety
- <Any agent-specific safety constraint, e.g., "never merges its own PR", "never deploys to
  production", "always runs tests before reporting done">

## Definition of Done
- [ ] Role is narrow enough that it's clear when to use this agent vs. another
- [ ] Tools list matches what the agent is actually configured with
- [ ] Safety constraints are specific and enforceable, not generic
