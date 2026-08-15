# Spec-Driven Development (SDD) Methodology

## What SDD is

Spec-Driven Development treats a written specification as the source of truth for
a feature, and the resulting code as its output — not the other way around. In
practice that means:

- No implementation work starts without an approved `spec.md`.
- A plan (`plan.md`) turns the spec into a technical approach before any code is
  written.
- The plan is broken into small, independently testable tasks (`tasks.md`) before
  implementation begins.
- When a requirement is ambiguous, it gets clarified in the spec (`/specdd-clarify`)
  rather than silently resolved by guessing in code.
- If code and spec disagree once implementation has started, the spec is updated
  first, and the code follows — the spec never quietly falls out of date.

This gives a team (and any AI agent working in that repo) a single, reviewable
artifact to align on before code changes, the same way a design doc or PR
description does today — except it's structured, templated, and driven by
consistent prompts rather than freeform prose.

## Relation to `github/spec-kit`

This kit is directly inspired by [`github/spec-kit`](https://github.com/github/spec-kit),
which established the core SDD loop — constitution → specify → plan → tasks →
implement — and the idea of slash-command-driven, template-backed specs. If you're
already familiar with `spec-kit`'s `/specify`, `/plan`, `/tasks` commands and its
`spec-template.md` / `plan-template.md` / `tasks-template.md` shape, `specdd-kit`
will feel immediately familiar: the loop and the artifact shapes are the same idea,
adapted for this kit's tooling.

## What `specdd-kit` does differently

| Aspect | `github/spec-kit` | `specdd-kit` |
|---|---|---|
| Commands | `/specify`, `/plan`, `/tasks`, etc. | `/specdd-specify`, `/specdd-plan`, `/specdd-tasks`, etc. — namespaced so they don't collide with other prompt sets in the same repo, plus additional prompts (`/specdd-clarify`, `/specdd-analyze`, `/specdd-adr`, `/specdd-spike`, `/specdd-checklist`, `/specdd-code-review`, `/specdd-issues-from-*`, `/specdd-create-llms`, `/specdd-update-llms`). |
| Onboarding | Manual template copy / CLI scaffolding. | An 8-step visual wizard (`website/`) that asks project, tech stack, principles, MCP, agent, and security questions, then generates a personalized ZIP — no manual template editing required to get started. |
| Agent support | Primarily tuned around a single assistant workflow. | Explicitly multi-agent: prompts and instructions are plain Markdown consumed by GitHub Copilot, Claude Code, Cursor, and Gemini alike. Nothing in `.github/prompts/` or `.github/instructions/` assumes one specific agent's proprietary format. |
| Governance model | — | Flat and practical: one constitution (`governance/constitution.md`, canonical) plus a working copy (`context/constitution.md`) that projects adapt. **There are no maturity levels (no L1–L4 tiers)** — every project follows the same constitution → specify → plan → tasks → implement loop regardless of team size or project age. |
| Process integrations | — | None baked in. This kit does not assume or require Azure DevOps, a specific issue tracker, or a specific deploy pipeline. `/specdd-issues-from-*` prompts produce issue text you paste into whatever tracker you use. |
| MCP tooling | — | First-class: the wizard's MCP step configures `.vscode/mcp.json` for a small, curated set of servers (GitHub, SonarQube, context7, PostgreSQL, Playwright, Figma), and `.github/instructions/mcp-tools.instructions.md` gives every agent the same MCP usage guardrails. |

## What this kit does *not* do

To be explicit about scope, so expectations are set correctly:

- **No governance tiers.** There is no L1/L2/L3/L4 maturity model anywhere in this
  kit. One constitution, one flow, applied consistently.
- **No Azure DevOps integration.** Issue-generation prompts produce plain text;
  wiring that into any specific tracker (Azure Boards, GitHub Issues, Jira, Linear)
  is up to the adopting team.
- **No deploy automation.** This kit scaffolds specs, prompts, and instructions —
  it does not deploy anything, and `context/tech-stack.md` only *documents*
  whatever deployment process a project already has.
- **No bundled "Motif" or similar design-system tooling.** The kit is
  methodology and prompt scaffolding, not a UI/design toolkit.

## A note on `specforge-kit`

A second kit, `specforge-kit` (role-based scaffolds for BA/QA/Dev/UX), is planned
as a future iteration of this project. It does not exist yet in this repository —
only `specdd-kit` is available today. Do not reference `specforge-kit` files or
commands as if they were already implemented.

## Further reading

See `docs/references.md` for links to `github/spec-kit` and MCP documentation.
