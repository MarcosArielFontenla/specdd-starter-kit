# llms.txt template

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Provide the source content for a project's `llms.txt` — a concise, curated index of key docs and
URLs that helps LLM tools quickly find authoritative context about this project.

## Inputs
- `context/project.md`, `context/tech-stack.md`, `context/constitution.md`
- List of the project's most important docs/specs/URLs

## Content

Use this structure when generating `llms.txt` at the repository root:

```markdown
# <project name>

> <one-line mission statement, from context/project.md>

## Docs
- [Project context](context/project.md): mission, personas, current stage
- [Tech stack](context/tech-stack.md): languages, frameworks, tooling
- [Constitution](context/constitution.md): SDD principles and data classification

## Specs
- [Spec template](templates/spec-template.md): how new features are specified
- <link to each active spec under specs/<feature>/spec.md>

## Optional
- <links to deeper reference material: architecture docs, ADRs, API contracts>
```

### Guidance
- Keep entries to one line each: a link plus a short description of what's inside.
- Group under `## Docs` (always current, load-bearing) vs `## Optional` (helpful but skippable).
- Regenerate/update whenever `context/*` files or the active spec list change materially.

## Definition of Done
- [ ] Every link in the generated `llms.txt` resolves to a real file/URL in the repo
- [ ] Mission statement matches `context/project.md`
- [ ] File stays short enough to be skimmed in under a minute
