# specforge-kit — Setup

Generate a multi-role (BA/QA/Dev/UX) Role Pack that extends a SpecDD-Harness project.

## Prerequisites
- Node.js 20+
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

## Extract
Unzip at the root of your SpecDD-Harness project. Get human approval on
`.agents/specs/tasks/role-pack-install.tasks.md`, then have the agent execute it to wire
ROUTING/REGISTRY/budget — the pack never edits existing harness files by itself. If
GitHub Copilot was among your selected tools, `.github/prompts/specforge-*` ships too
and Copilot auto-loads it.

## Skills source
`skills.config.json` controls where skills come from:
- `"source": "local"` (default) — bundles `specforge-kit/skills/*.md`.
- `"source": "remote"` — downloads from `remote.baseUrl`/`remote.manifest`, falling back to local on failure.

## MCP (optional)
- **Figma** (UX) and **Playwright** (QA) MCP config is generated into `.vscode/mcp.json` only when
  you enable them in the wizard. Values are `${input:...}` placeholders — never commit real keys.
