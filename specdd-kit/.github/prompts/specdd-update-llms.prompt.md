---
agent: agent
description: Refresh an existing llms.txt
---

# /specdd-update-llms

Refresh an existing `llms.txt` so it stays accurate as `context/` files and the
active spec list change over time.

## Steps
1. Read the existing `llms.txt` at the repository root alongside current
   `context/project.md`, `context/tech-stack.md`, and the list of
   `specs/<feature-slug>/spec.md` files.
2. Update the mission statement if it no longer matches `context/project.md`, add
   entries for new specs, remove entries for specs that no longer exist, and fix
   any broken links.
3. Write the refreshed content back to `llms.txt`, preserving the structure from
   `templates/llms-txt-template.md`.

## Output
An updated `llms.txt` at the repository root, with no stale or broken links.

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
