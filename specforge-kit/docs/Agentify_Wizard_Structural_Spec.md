# Agentify Wizard — Structural Spec

specforge-kit collects role-specific inputs and generates a Copilot-ready scaffold.

## Personas
- **BA** — requirements, stories, acceptance criteria, traceability.
- **QA** — test cases, AC validation, Playwright, Gherkin.
- **Dev** — implementation, code review, PR creation.
- **UX** — flows, screen specs, copy, Figma context.

## Flow
Welcome → Persona → (role step) → Context → Governance-lite → Review → Download.

## Outputs
`README.md`, `.github/copilot-instructions.md`, `.github/instructions/*`, `.github/prompts/specforge-*`,
`context/<feature-slug>.md`, `templates/` (QA/Dev/UX), and `.vscode/mcp.json` (Figma/Playwright only).

## Out of scope
Azure DevOps publishing, PAT flows, deployment, governance tiers.
