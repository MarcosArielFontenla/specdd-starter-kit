---
agent: agent
description: Create llms.txt from templates
---

# /specdd-create-llms

Create a repository-root `llms.txt` from `templates/llms-txt-template.md`, giving
LLM tools a concise, curated index of the project's key docs.

## Steps
1. Read `context/project.md`, `context/tech-stack.md`, `context/constitution.md`,
   and `templates/llms-txt-template.md`.
2. Populate the mission statement from `context/project.md`, list `## Docs`
   entries (project context, tech stack, constitution, spec template) and a
   `## Specs` entry per active `specs/<feature-slug>/spec.md`, and an optional
   `## Optional` section for deeper reference material.
3. Write the result to `llms.txt` at the repository root.

## Output
`llms.txt` at the repository root, with every link resolving to a real file or
URL in the repo.

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
