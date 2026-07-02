# specforge-kit — Setup

Generate a role-specific (BA/QA/Dev/UX) Copilot scaffold in minutes.

## Prerequisites
- Node.js 20+
- VS Code with GitHub Copilot (or Claude/Cursor/Gemini)

## Run the wizard
```powershell
cd specforge-kit\website
npm install
npm run dev
```
Open the Astro URL, pick a persona, fill the role inputs, and download the scaffold ZIP.

## Extract
Unzip at the root of your project so Copilot auto-loads `.github/copilot-instructions.md`,
`.github/instructions/*` and `.github/prompts/specforge-*`.

## Skills source
`skills.config.json` controls where skills come from:
- `"source": "local"` (default) — bundles `specforge-kit/skills/*.md`.
- `"source": "remote"` — downloads from `remote.baseUrl`/`remote.manifest`, falling back to local on failure.

## MCP (optional)
- **Figma** (UX) and **Playwright** (QA) MCP config is generated into `.vscode/mcp.json` only when
  you enable them in the wizard. Values are `${input:...}` placeholders — never commit real keys.
