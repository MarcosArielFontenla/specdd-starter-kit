# SPECDDSTARTERKIT

Enterprise starter kit for **Spec-Driven Development (SDD)**, inspired by
[`github/spec-kit`](https://github.com/github/spec-kit): a web portal with visual
wizards that generate ready-to-use project scaffolds — no backend, everything runs
in the browser and downloads as a ZIP.

> Specifications are the source of truth. Code is the output.

The centerpiece is the **SpecDD wizard**: it generates a scaffold structured around
the **SpecDD Harness**, a vendor-neutral agent architecture that any AI coding tool
(GitHub Copilot, Claude Code, Cursor, Codex, Gemini) consumes through the same core.

## Scenarios

The SpecDD wizard branches by scenario on its second step:

| Scenario | Status | What it does |
|----------|--------|--------------|
| **Greenfield** | ✅ | New project. You pour in all the context you have (project, stack, domains, entities, features, principles, security, team tools) and get a fully personalized harness scaffold. |
| **Brownfield** | ✅ | Existing project. You pick your project folder; the wizard analyzes it **100% in the browser** (no file ever leaves your machine), pre-fills the flow, and generates a collision-safe scaffold: files that already exist in your project are skipped and reported, never overwritten. Includes the `spec-converge` workflow so your agent can align existing code to the specs. If a previous agent harness is detected in the folder, the wizard warns you, requires an explicit acknowledgment, and pre-generates `.agents/specs/tasks/harness-migration.tasks.md` so your agent migrates it (mechanism archived, knowledge triaged) without hand-written prompts. |
| **Deploy** (SpecDeploy wizard) | ⏸ deferred | CI/CD + IaC generation works for 6 providers, but refinement is on hold until a real target environment is defined (Azure vs AWS vs Railway vs other). |

## What the generated scaffold contains (SpecDD Harness v1)

```
AGENTS.md                     Session primer (≤40 lines): stack one-liners, task
                              classification table, load order, context budget
CLAUDE.md / GEMINI.md / ...   ≤5-line pointer adapters, one per selected tool
                              (Cursor/Codex read AGENTS.md natively — no adapter)
.agents/
  REGISTRY.md                 Artifact registry + harness systems status
  orchestration/ROUTING.md    Task classification → which skill to load
  skills/<domain>/SKILL.md    One skeleton per domain you entered
  specs/<entity>.spec.yaml    Placeholder spec per entity (designContract +
                              executable acceptanceChecks pattern)
  evals/                      Rubrics (drift policy, log_only) + empty baselines
  cold-start/                 Context-budget manifest + snapshots dir
  workflows/                  spec-first-feature, skill-review
                              (+ spec-converge, brownfield only)
  telemetry/EVENTS.md         Vendor-neutral JSONL event contract
  scripts/*.ps1               Mechanical gates: validate-spec, validate-budget,
                              generate-snapshots (require pwsh 7+ + powershell-yaml)
context/                      project.md, tech-stack.md, constitution.md
                              (+ brownfield-analysis.md, brownfield only)
specs/, templates/, docs/     SDD templates and guides
.github/                      Copilot prompts/instructions/agents — included ONLY
                              when GitHub Copilot is among the selected tools
.vscode/mcp.json              When MCP tools are selected (placeholders, no secrets)
```

Principles baked in: the `.agents/` core is the single source of truth (adapters
carry zero rules), nothing is fabricated (empty baselines, placeholder acceptance
checks, `log_only` drift policies), and every "auto-generated" artifact has a
validator script. See [`specdd-kit/docs/harness.md`](specdd-kit/docs/harness.md).

## Workspaces

npm workspaces monorepo (Node ≥ 20):

| Workspace | Purpose |
|-----------|---------|
| [`platform`](platform/) | SpecDD Platform — unified portal: Boreal landing + the three wizards mounted at `/specdd`, `/specforge`, `/specdeploy`. |
| [`specdd-kit`](specdd-kit/) | The SDD scaffold content + the scenario-branched wizard (Greenfield/Brownfield) that generates the harness ZIP. |
| [`specforge-kit`](specforge-kit/) | Role Pack wizard (BA/QA/Dev/UX): generates per-role .agents/ extensions (skills + playbooks, workflows, rubrics, subagent seeds) that plug into a SpecDD-Harness project, with optional target-folder ingestion and agent-executed install tasks. |
| [`specdeploy-kit`](specdeploy-kit/) | Deploy wizard: CI/CD pipelines, IaC and runbooks for 6 providers (Azure SWA, Cloudflare, AWS, Vercel, Netlify, on-prem Docker). Providers are data — see [`provider-authoring.md`](specdeploy-kit/docs/provider-authoring.md). |
| [`packages/ui`](packages/ui/) | `@specdd/ui` — Boreal Design System (shared Stepper + styles for all wizards). |

**How generation works** (same pattern in all three wizards): a build-time bundle
script snapshots the kit's real files into `website/src/data/*.json`; pure functions
in `generators.js` overlay the personalized artifacts from your answers; the wizard
zips everything client-side with JSZip. The Brownfield analyzer (`analyzer.js`) is
equally pure: manifest files for stack detection, folder structure for domain
suggestions, filename patterns for entities — source code content is never read.

## Run it locally

Prerequisites: **Node ≥ 20** and npm. (PowerShell 7 + `powershell-yaml` are only
needed by the *generated scaffold's* validation scripts, not to run this app.)

```powershell
npm install                       # once, at the repo root (npm workspaces)
npm run dev -w specdd-platform    # portal with the three wizards
```

Open http://localhost:4320 — the landing links to the three wizards. Complete a
wizard and download your ZIP.

Each wizard also runs standalone:

```powershell
npm run dev -w sdd-kit-wizard       # http://localhost:4321  (SpecDD)
npm run dev -w specforge-wizard     # http://localhost:4322  (SpecForge)
npm run dev -w specdeploy-wizard    # http://localhost:4323  (SpecDeploy)
```

To try **Brownfield** end-to-end without a real project, point the folder picker at
[`specdd-kit/website/e2e/fixtures/brownfield-sample/`](specdd-kit/website/e2e/fixtures/brownfield-sample/)
— a tiny Node/React fixture that exercises detection, pre-fill and collision skipping.

### Tests

```powershell
npm run test:unit -w sdd-kit-wizard      # unit (Node test runner): generators, analyzer, steps
npm run test:unit -w specforge-wizard
npm run test:unit -w specdeploy-wizard
npm test -w sdd-kit-wizard               # Playwright e2e: greenfield + brownfield walkthroughs
npm test -w specdd-platform              # Playwright e2e: portal + wizard mounts
npm run build -w specdd-platform         # production build (bundles all kits first)
```

CI (`.github/workflows/ci.yml`) runs unit + build per workspace; e2e runs locally.

## Repo layout & docs

- `docs/superpowers/specs/` — approved design specs per iteration (the two most
  recent cover the Greenfield harness and the Brownfield ingestion).
- `docs/superpowers/plans/` — the implementation plans executed task-by-task.
- `docs/ROADMAP.md` — improvement backlog.
- `awesome-copilot-main/` — vendored reference copy of `github/awesome-copilot`.

## References

- `github/spec-kit` — SDD methodology and templates.
- `github/awesome-copilot` — agents/prompts/instructions/skills.
