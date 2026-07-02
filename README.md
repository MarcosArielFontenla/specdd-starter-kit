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
| [`specdeploy-kit`](specdeploy-kit/) | Infrastructure-agnostic deploy wizard: generates CI/CD pipelines, IaC and a runbook for 6 providers (Azure SWA, Cloudflare, AWS, Vercel, Netlify, on-prem Docker). Providers are data — see `specdeploy-kit/docs/provider-authoring.md`. | ✅ Iteration 3 |

## Design

All three wizards and the platform portal use the **Boreal Design System** (single source: `packages/ui`, the `@specdd/ui` workspace package).

## SDD flow

`constitution → specify → plan → tasks → implement`

## Quick start

```powershell
npm install                       # once, at the repo root (npm workspaces)
npm run dev -w specdd-platform    # portal with the three wizards
```

Then open http://localhost:4320 — the landing links to the three wizards
(`/specdd`, `/specforge`, `/specdeploy`). Complete a wizard and download your ZIP.

Each kit also runs standalone: `npm run dev -w sdd-kit-wizard` (4321),
`npm run dev -w specforge-wizard` (4322), `npm run dev -w specdeploy-wizard` (4323).
Demo note: the portal's own deploy pipeline can be generated with the SpecDeploy wizard
(dogfooding).

## References

- `github/spec-kit` — SDD methodology and templates.
- `github/awesome-copilot` — agents/prompts/instructions/skills (referenced, not vendored; see `awesome-copilot-main/`).
