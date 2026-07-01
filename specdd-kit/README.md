# specdd-kit

> Specifications are the source of truth. Code is the output.

`specdd-kit` is a Spec-Driven Development (SDD) starter kit. It gives a project a
Copilot-ready scaffold — context files, a governance-owned constitution, `/specdd-*`
prompts, agent definitions, coding instructions, and reusable spec/plan/tasks
templates — plus a visual wizard that personalizes that scaffold and packages it as
a downloadable ZIP.

The kit is inspired by [`github/spec-kit`](https://github.com/github/spec-kit) and
adapted with a visual wizard, multi-agent guidance (GitHub Copilot, Claude Code,
Cursor, Gemini), and a flat, practical governance model — no maturity levels, no
Azure DevOps integration, no deploy pipeline. See `docs/specdd-methodology.md` for
the full comparison.

## What the kit generates

Running the wizard produces a ZIP containing:

- **`context/`** — `project.md`, `tech-stack.md`, `constitution.md`: the shared
  understanding every spec is written against.
- **`.github/copilot-instructions.md`** — a project-specific instructions file,
  generated from your wizard answers (stack, agent, security classification).
- **`.github/instructions/*.instructions.md`** — scoped coding guardrails (SDD
  workflow, MCP tool usage, security/OWASP, and stack-specific rules such as
  React/Next.js/.NET/Python when relevant).
- **`.github/prompts/specdd-*.prompt.md`** — the `/specdd-*` command set that drives
  the constitution → specify → plan → tasks → implement loop (plus clarify,
  analyze, checklist, code-review, ADR, spike, and issue-generation helpers).
- **`.github/agents/*.agent.md`** — reusable agent role definitions (orchestrator,
  specify, implement, TDD red/green/refactor, security/architecture/doc reviewers).
- **`templates/`** — the spec, plan, tasks, checklist, and constitution templates
  used to scaffold every new feature under `specs/<feature>/`.
- **`.vscode/mcp.json`** — MCP server configuration for the tools you selected in
  the wizard (GitHub, SonarQube, context7, PostgreSQL, Playwright, Figma).
- **`specs/features-spec.md`** (optional) — a first-draft feature spec if you typed
  one into the wizard's preview step.

Everything is real, editable Markdown/JSON — nothing in the output is a placeholder
you have to hunt down and delete.

## Run the wizard

```powershell
cd specdd-kit\website
npm install
npm run dev
```

Open the local Astro URL that's printed in the terminal, walk through the 8 steps
(Welcome, Project, Tech Stack, Principles, MCP Tools, Agent & LLM, Security,
Preview / Download), and download the generated ZIP from the last step.

`npm run dev` and `npm run build` both re-bundle the kit's own source files into
`src/data/kit-files.json` first (via the `predev`/`prebuild` scripts calling
`scripts/bundle-kit.js`), so the wizard always ships the current contents of
`context/`, `governance/`, `templates/`, and `.github/` — except the four files the
wizard overlays with project-specific versions (`context/project.md`,
`context/tech-stack.md`, `context/constitution.md`, and
`.github/copilot-instructions.md`).

## Use the generated scaffold

1. Extract the downloaded ZIP **at the root of your project repository** (the same
   level as your existing `package.json`, `.git/`, etc.), so `.github/`,
   `context/`, `specs/`, and `templates/` land next to your source code.
2. Open the project in VS Code. GitHub Copilot automatically picks up
   `.github/copilot-instructions.md` and everything under `.github/instructions/`
   and `.github/prompts/`.
3. Start with `/specdd-constitution` to confirm or adjust the generated
   constitution, then run `/specdd-specify` on your first feature idea.

See `SETUP.md` for the full ordered walkthrough (prerequisites → context → first
feature → MCP setup → team adoption) and `docs/starter-guide.md` for a 10-minute
hands-on tutorial.

## Documentation

- [`SETUP.md`](SETUP.md) — ordered setup guide for a new project.
- [`docs/starter-guide.md`](docs/starter-guide.md) — 10-minute first feature walkthrough.
- [`docs/specdd-methodology.md`](docs/specdd-methodology.md) — what SDD is, and how this kit differs from `github/spec-kit`.
- [`docs/workflow.md`](docs/workflow.md) — the constitution → specify → plan → tasks → implement loop and its prompts.
- [`docs/greenfield-vs-brownfield.md`](docs/greenfield-vs-brownfield.md) — applying SDD to new vs. existing codebases.
- [`docs/faq.md`](docs/faq.md) — secrets, MCP, agent choice, offline use.
- [`docs/references.md`](docs/references.md) — upstream projects and further reading.

## Repository layout

```
specdd-kit/
├── context/              # project.md, tech-stack.md, constitution.md (working defaults)
├── governance/            # constitution.md (canonical, governance-owned copy)
├── specs/_template/       # spec/plan/tasks/checklist/data-model/research/api templates for a feature
├── templates/             # standalone templates + templates/commands/*.md
├── .github/
│   ├── prompts/            # /specdd-*.prompt.md command set
│   ├── instructions/       # *.instructions.md scoped coding guardrails
│   ├── agents/              # *.agent.md role definitions
│   └── copilot-instructions.md  # kit-level default (see below)
├── docs/                   # this documentation set
├── examples/                # placeholder for example scaffolds
└── website/                 # the Astro + React wizard app (not bundled into the ZIP)
```

`.github/copilot-instructions.md` in this kit is the **default** instructions file
— see that file's own header for details on how the wizard overlays a
project-specific version generated from your answers.
