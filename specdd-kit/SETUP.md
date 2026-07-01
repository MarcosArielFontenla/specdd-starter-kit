# Setup Guide

This guide walks a new project through adopting `specdd-kit`, in order:
**prerequisites → context → first feature → MCP setup → team adoption timeline.**

## 1. Prerequisites

- **Node.js 20+** (Node 22 recommended) to run the wizard locally.
- **VS Code** with the **GitHub Copilot** and **GitHub Copilot Chat** extensions
  (for `.github/copilot-instructions.md`, `.github/instructions/*`, and
  `.github/prompts/*` to be picked up automatically). Other agents — Claude Code,
  Cursor, Gemini — can also read this scaffold; see `docs/specdd-methodology.md`
  for what "multi-agent" means here.
- **Git**, initialized in the target project (SDD tracks specs and code together;
  commits are how a team reviews spec changes).
- No cloud account, database, or CI system is required to start. MCP servers
  (step 4 below) are optional and added only when you need their capabilities.

## 2. Set up context

Context is the shared understanding every spec is written against — read once,
referenced by every `/specdd-*` prompt afterward.

1. Run the wizard (`cd specdd-kit\website && npm install && npm run dev`) and
   complete the **Project**, **Tech Stack**, and **Principles** steps, or edit the
   generated `context/project.md`, `context/tech-stack.md`, and
   `context/constitution.md` directly after extracting the ZIP.
2. Fill in real values — actual personas, actual languages/frameworks/versions,
   actual non-negotiable principles for your team. Each context file has a
   **Definition of Done** checklist at the bottom; use it to confirm the file is
   usable, not just present.
3. Run `/specdd-constitution` in your agent to review or refine the generated
   constitution before writing your first spec. The constitution is the
   governance-owned source; `context/constitution.md` is the working copy teams
   adapt per project as long as it stays consistent with it (see
   `governance/constitution.md` in this kit for the canonical version).
4. Commit `context/` and `.github/copilot-instructions.md` to your repository —
   they are project source, not build output.

## 3. Build your first feature

Once context is in place, run the SDD loop on a real feature:

1. `/specdd-specify` — turn a feature idea into a formal spec under
   `specs/<feature>/spec.md`, using `templates/spec-template.md` as the shape.
2. `/specdd-clarify` — if the spec has open questions, resolve them with targeted
   questions instead of guessing.
3. `/specdd-plan` — produce an implementation plan (`specs/<feature>/plan.md`)
   from the approved spec.
4. `/specdd-tasks` — break the plan into small, independently testable tasks
   (`specs/<feature>/tasks.md`).
5. `/specdd-implement` — implement the tasks TDD-style, following the plan.
6. `/specdd-checklist` — generate or verify the pre-merge checklist before you
   open a PR.

See `docs/workflow.md` for the full loop diagram and every available prompt, and
`docs/starter-guide.md` for a concrete 10-minute walkthrough of steps 1–4.

## 4. Set up MCP (optional)

Model Context Protocol (MCP) servers give your agent extra tools — e.g. reading
GitHub issues, querying SonarQube, or driving a browser with Playwright. They are
optional; the SDD loop works with zero MCP servers configured.

1. In the wizard's **MCP Tools** step, select the servers you need. The kit
   currently offers: `github`, `sonarqube`, `context7`, `postgresql`,
   `playwright`, and `figma`.
2. The wizard writes `.vscode/mcp.json` with one entry per selected server. Most
   entries reference an input variable (e.g. `${input:github_pat}`,
   `${input:sonar_token}`) instead of a hardcoded secret — VS Code will prompt for
   these values and store them securely, so no token is ever written to the repo.
3. Open the project in VS Code; Copilot Chat (or your MCP-aware agent) will detect
   `.vscode/mcp.json` and offer to start the configured servers.
4. Read `.github/instructions/mcp-tools.instructions.md` for the guardrails every
   agent in this kit follows when using MCP tools (prefer the specific tool over a
   raw shell command, validate untrusted output, never hardcode credentials).
5. Only add servers you actually need and trust. Adding an MCP server expands what
   an agent can do on your machine — treat it the same as adding a new dependency.

See `docs/faq.md` for common MCP questions (which servers need what secrets,
whether MCP is required, what happens if you skip it).

## 5. Team adoption timeline

A rough, realistic rollout for a team adopting SDD with this kit:

**Week 1 — Pilot.**
One or two engineers run the wizard on a real (or side) project, write a
constitution, and take one small feature through the full
specify → plan → tasks → implement loop. Goal: validate the loop fits how the team
actually works, not to convert everyone yet.

**Week 2 — First shared feature.**
Bring the pilot's `context/` and constitution into the team's main repository (or
adapt them). Run one feature end-to-end with a second engineer as reviewer of the
spec and plan (not just the code). Capture friction in `docs/faq.md`-style notes —
what was unclear, what got skipped.

**Weeks 3–4 — Team default.**
Every new feature starts with `/specdd-specify` instead of a ticket-and-code flow.
`specs/<feature>/spec.md` becomes the artifact reviewed before implementation
starts, the same way a PR is reviewed before merge. Add `/specdd-code-review` and
`/specdd-checklist` to the team's definition of done.

**Month 2+ — Brownfield expansion.**
Apply SDD to existing modules incrementally as they're touched, rather than
retrofitting specs for the whole codebase at once. See
`docs/greenfield-vs-brownfield.md` for how to scope this.

**Ongoing.**
Revisit `governance/constitution.md` when principles genuinely change (not
silently — see the Amendments section in that file). Re-run
`/specdd-update-llms` if you maintain an `llms.txt`, and keep `context/tech-stack.md`
in sync as tooling changes so plans stay grounded in reality.
