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

## Role Workspace evolution

The planned Role Workspace adds structured daily work for non-technical roles,
starting with BA, while preserving this Capability Builder. Phase 0 discovery and
the proposed product boundaries are documented in the
[SpecForge Workspace tracker](../docs/specforge-workspace/roadmap.md).
Phase 4 now provides a separate local [BA Workspace](../packages/specforge-workspace/README.md)
with browser editing/review and SQLite persistence. Real-agent and observed BA
acceptance remain pending; the existing Builder is still available unchanged.
Phase 1 adds a separate [artifact model](../packages/artifact-model/README.md) for
typed requirements, questions, decisions, revision provenance and exact human review;
it does not change the existing Wizard or install a runtime.
Phases 2–3 add the [artifact graph](../packages/artifact-model/GRAPH.md) and
[BA domain](../packages/artifact-model/BA.md): rules, impact, typed proposals backed
by the existing BA pack, and graph-bound human approval. These are portable domain
APIs consumed by the Phase 4 service. See the [usage guide](../docs/specforge-workspace/usage.md)
for setup, consent, the review flow and the difference between simulated tests and real execution.
