# specforge-kit

Role-based (BA/QA/Dev/UX) agentic scaffold generator. Pick a persona, answer a few role-specific
questions, and download a Copilot-ready scaffold: instructions, prompts, skills, context, and
optional MCP config (Figma for UX, Playwright for QA).

## Run
```powershell
npm install                       # once, at the repo root (npm workspaces)
npm run dev -w specforge-wizard   # serves on :4322
```
Open the Astro URL, choose a persona, and download the scaffold ZIP. Extract it at your project root.

## What you get
- `.github/copilot-instructions.md`, `.github/instructions/specforge-<persona>.instructions.md`
- `.github/prompts/specforge-*.prompt.md` for your persona
- `context/<feature>.md`, selected `skills/*.md`
- `.vscode/mcp.json` (only if you enable Figma/Playwright — placeholders only)

## Skills source
`skills.config.json` selects local (default) or remote-with-local-fallback. See `SETUP.md`.

## Not included
Azure DevOps publishing, deployment, governance tiers — see `specdd-kit` for the SDD methodology kit.
