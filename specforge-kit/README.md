# specforge-kit

Capability Pack generator (BA/QA/Dev/UX): builds one independent, validated capability
manifest per selected role alongside the established Role Pack artifacts. The result
plugs into an existing SpecDD-Harness project without rewriting its routing or registry.
Target-project ingestion is optional: point it at your project folder so the pack can
detect the harness and skip files that already exist there.

## Run
```powershell
npm install                       # once, at the repo root (npm workspaces)
npm run dev -w specforge-wizard   # serves on :4322
```
Open the Astro URL, select one or more roles, and download the role-pack ZIP. Extract
it at the root of your SpecDD-Harness project.

## What you get
- `.agents/capabilities/role-<role>/capability.json` — portable Capability Pack
  `1.0.0` manifest with role, skill, playbook, workflow, policy, eval, context,
  inactive-subagent, routing, and dependency metadata
- `.agents/skills/role-<role>/SKILL.md` + selected `assets/*.md` playbooks per role
- `.agents/evals/rubrics/role-<role>.yaml`, `.agents/workflows/role-<role>/*.md`,
  `.agents/subagents/role-<role>.agent.md`
- `.agents/specs/tasks/role-pack-install.tasks.md` — install tasks the agent executes
  after human approval; the pack never modifies existing harness files by itself
- `context/role-pack-report.md` — what was generated, what was skipped, and the kickoff steps
- `.github/prompts/specforge-*.prompt.md` — only when GitHub Copilot is among the
  selected tools; the Copilot projection is optional
- `.vscode/mcp.json` (only if you enable Figma/Playwright — placeholders only)

Existing Role Pack paths and the ZIP filename are retained for backward compatibility.
Projects with `context/project-definition.json` receive a human-reviewed installation
task for the capability binding; older Harnesses retain the routing/registry/budget path.

## Skills source
`skills.config.json` selects local (default) or remote-with-local-fallback. See `SETUP.md`.

## Not included
Azure DevOps publishing, deployment, governance tiers — see `specdd-kit` for the SDD
methodology kit and harness generation.
