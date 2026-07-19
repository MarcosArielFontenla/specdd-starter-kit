# specforge-kit

Role Pack generator (BA/QA/Dev/UX): builds multi-role `.agents/` extensions — role
skills, playbooks, workflows and subagent seeds — that plug into an existing
SpecDD-Harness project. Target-project ingestion is optional: point it at your project
folder so the pack can detect the harness and skip files that already exist there.

## Run
```powershell
npm install                       # once, at the repo root (npm workspaces)
npm run dev -w specforge-wizard   # serves on :4322
```
Open the Astro URL, select one or more roles, and download the role-pack ZIP. Extract
it at the root of your SpecDD-Harness project.

## What you get
- `.agents/skills/role-<role>/SKILL.md` + selected `assets/*.md` playbooks per role
- `.agents/evals/rubrics/role-<role>.yaml`, `.agents/workflows/role-<role>/*.md`,
  `.agents/subagents/role-<role>.agent.md`
- `.agents/specs/tasks/role-pack-install.tasks.md` — install tasks the agent executes
  after human approval; the pack never modifies existing harness files by itself
- `context/role-pack-report.md` — what was generated, what was skipped, and the kickoff steps
- `.github/prompts/specforge-*.prompt.md` — only when GitHub Copilot is among the
  selected tools; the Copilot projection is optional
- `.vscode/mcp.json` (only if you enable Figma/Playwright — placeholders only)

## Skills source
`skills.config.json` selects local (default) or remote-with-local-fallback. See `SETUP.md`.

## Not included
Azure DevOps publishing, deployment, governance tiers — see `specdd-kit` for the SDD
methodology kit and harness generation.
