---
name: figma-design-context
description: Extract design context from a Figma file via MCP, using placeholders only
persona: UX
---

# Figma Design Context

## Purpose
Pull design context — frames, components, variants, and design tokens (color, type, spacing) — out of an existing Figma file via a configured Figma MCP server, so `ux-stage-generator` and `ux-design-system-enforcer` can work from the real design instead of a description of it.

## When to use
When a feature already has a Figma file (a stakeholder handoff, an existing design exploration) and its content needs to be reflected into specforge's flow/stage/design-system artifacts. Only usable in a project where the wizard's Figma MCP option was enabled — check for a `figma` entry in `.vscode/mcp.json` before assuming it's available.

## How
1. Confirm the Figma MCP server is configured for this project: look for a `figma` entry in `.vscode/mcp.json`. If it's absent, this skill isn't available — surface that instead of trying to reach Figma another way (no direct API calls, no scraping).
2. Confirm the MCP config uses input-variable placeholders, not literal values, e.g.:
   ```json
   {
     "servers": {
       "figma": {
         "type": "stdio",
         "command": "npx",
         "args": ["-y", "figma-mcp-server"],
         "env": {
           "FIGMA_API_TOKEN": "${input:figma-api-token}",
           "FIGMA_FILE_URL": "${input:figma-file-url}"
         }
       }
     },
     "inputs": [
       { "id": "figma-api-token", "type": "promptString", "description": "Figma personal access token", "password": true },
       { "id": "figma-file-url", "type": "promptString", "description": "Figma file URL to extract design context from" }
     ]
   }
   ```
   Never replace `${input:...}` with a literal token or file URL in a committed file — the token and URL are supplied at runtime.
3. With the MCP tool connected, request the file's page/frame structure first (names and hierarchy) before pulling full node detail, to scope what's actually relevant to the current feature rather than the whole file.
4. Extract, for each frame relevant to the feature: frame name, component instances used, and any variant/state shown (e.g., a button frame showing default/hover/disabled) — this maps directly to `ux-stage-generator` states.
5. Extract design tokens (color styles, text styles, spacing/effect styles) referenced by the relevant frames, and pass them to `ux-design-system-enforcer` to check against the project's named design system rather than treating the Figma file itself as the system of record.
6. Record the source: file name/URL (not embedded as a literal secret-bearing value in specs — the URL is a link, not a credential) and the frame names pulled, so the context is traceable back to the design file it came from.
7. Treat extracted content as a starting point, not a finished spec — reconcile any conflict between the Figma file and the approved flow/story with the flow as the functional source of truth and Figma as the visual reference.

## Guardrails
- Specifications/context are the source of truth for behavior; Figma is the source of truth for visual detail only.
- Never output secrets — Figma API tokens and file access credentials are always `${input:...}` placeholders in MCP config, never literal values in skills, specs, or generated context files.
