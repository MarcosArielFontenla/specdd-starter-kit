# SPECDDSTARTERKIT

Enterprise starter kit for **Spec-Driven Development (SDD)**, inspired by
[`github/spec-kit`](https://github.com/github/spec-kit) and adapted with visual
wizards and GitHub Copilot prompts/instructions.

> Specifications are the source of truth. Code is the output.

## Kits

| Kit | Purpose | Status |
|-----|---------|--------|
| [`specdd-kit`](specdd-kit/) | SDD starter-kit wizard: generates a Copilot-ready scaffold ZIP (context, prompts, instructions, templates, MCP config). | ✅ Iteration 1 |
| [`specforge-kit`](specforge-kit/) | Role-based scaffold wizard (BA/QA/Dev/UX): generates persona-specific prompts, instructions, skills, context, and optional Figma/Playwright MCP config. | ✅ Iteration 2 |

## SDD flow

`constitution → specify → plan → tasks → implement`

## Quick start

```powershell
cd specdd-kit\website
npm install
npm run dev
```

Then open the Astro URL, complete the 8-step wizard, and download your scaffold ZIP.
Extract it at the root of your project so VS Code / GitHub Copilot auto-loads
`.github/copilot-instructions.md`, `.github/instructions/*` and `.github/prompts/*`.

## References

- `github/spec-kit` — SDD methodology and templates.
- `github/awesome-copilot` — agents/prompts/instructions/skills (referenced, not vendored; see `awesome-copilot-main/`).
