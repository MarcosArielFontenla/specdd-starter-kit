---
agent: agent
description: Derive tracker issues from a spec
---

# /specdd-issues-from-spec

Derive a set of tracker issues directly from a spec's requirements, so backlog
items trace back to the spec instead of being invented ad hoc.

## Steps
1. Read `specs/<feature-slug>/spec.md`, focusing on Requirements and Acceptance
   criteria.
2. Draft one issue per functional requirement (or logical group of related
   requirements), each with a title, description, and its acceptance criteria as
   the issue's definition of done.
3. Write the issue list to `specs/<feature-slug>/issues.md` (or create them
   directly in the configured tracker if the environment supports it), tagging
   each with the spec section it came from.

## Output
`specs/<feature-slug>/issues.md` (or created tracker issues) with every functional
requirement in the spec represented by at least one issue.

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
