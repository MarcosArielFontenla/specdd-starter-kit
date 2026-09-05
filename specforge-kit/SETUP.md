# specforge-kit — Setup

Generate composable BA/QA/Dev/UX Capability Packs that extend a SpecDD-Harness project
while retaining the legacy Role Pack layout.

## Prerequisites
- Node.js 22.12+
- An existing SpecDD-Harness project (recommended — generate one with `specdd-kit` first)
- VS Code with GitHub Copilot (optional — or Claude Code/Cursor/Codex/Gemini)

## Run the wizard
```powershell
npm install                       # once, at the repo root (npm workspaces)
npm run dev -w specforge-wizard   # serves on :4322
```
Open the Astro URL, optionally pick your target project folder so the pack can detect
its harness and skip colliding files, select one or more roles, fill the role options,
and download the role-pack ZIP.

Each selected role produces `.agents/capabilities/role-<role>/capability.json`. These
manifests are validated before download and reference the familiar skill, playbook,
workflow, rubric, and inactive-subagent files instead of duplicating their content.

## Extract
Unzip at the root of your SpecDD-Harness project. Get human approval on
`.agents/specs/tasks/role-pack-install.tasks.md`, then have the agent execute it to wire
ROUTING/REGISTRY/budget — the pack never edits existing harness files by itself. If
GitHub Copilot was among your selected tools, `.github/prompts/specforge-*` ships too
and Copilot auto-loads it.

When `context/project-definition.json` exists, the approved task also adds an enabled
capability binding that points to the manifest. If it does not exist, installation uses
the original ROUTING/REGISTRY/budget flow. Existing capability manifests are never
overwritten: they are skipped and listed in `context/role-pack-report.md`.

## Migrating a legacy Role Pack

`@specdd/capability-model` exposes `migrateLegacyRolePack`. Supply explicit role
metadata, selected playbooks, and commands; the function returns a validated draft
manifest with an `INFERRED_LEGACY_ROLE_PACK` warning. Human review is required before
changing the lifecycle to `active` or installing its route.

## Skills source
`skills.config.json` controls where skills come from:
- `"source": "local"` (default) — bundles `specforge-kit/skills/*.md`.
- `"source": "remote"` — downloads from `remote.baseUrl`/`remote.manifest`, falling back to local on failure.

## MCP (optional)
- **Figma** (UX) and **Playwright** (QA) MCP config is generated into `.vscode/mcp.json` only when
  you enable them in the wizard. Values are `${input:...}` placeholders — never commit real keys.
