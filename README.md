# SPECDDSTARTERKIT

Enterprise starter kit for **Spec-Driven Development (SDD)**, inspired by
[`github/spec-kit`](https://github.com/github/spec-kit): a web portal with visual
wizards that generate ready-to-use project scaffolds — no backend, everything runs
in the browser and downloads as a ZIP.

> Specifications are the source of truth. Code is the output.

The centerpiece is the **SpecDD wizard**: it generates a scaffold structured around
the **SpecDD Harness**, a vendor-neutral agent architecture that any AI coding tool
(GitHub Copilot, Claude Code, Cursor, Codex, Gemini) consumes through the same core.
Its companion, the **SpecForge wizard**, generates **Role Packs** (BA / QA / Dev / UX)
that plug into a harness project — per-role skills, playbooks, workflows and subagent
seeds, wired in by your agent under your approval.

## Scenarios

The SpecDD wizard branches by scenario on its second step:

| Scenario | Status | What it does |
|----------|--------|--------------|
| **Greenfield** | ✅ | New project. You pour in all the context you have (project, stack, domains, entities, features, principles, security, team tools) and get a fully personalized harness scaffold. |
| **Brownfield** | ✅ | Existing project. You pick your project folder; Level 1 analyzes manifests and paths, while opt-in **Level 2 — Assisted semantic analysis** reads a bounded allowlist of safe text files locally. Both pre-fill the flow, require human review of detected context, and generate a collision-safe scaffold: existing files are skipped and reported, never overwritten. Includes `spec-converge`; legacy Harness detection still requires explicit acknowledgment and can generate migration tasks. |
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
  scripts/*.ps1               Mechanical gates: validate-harness, validate-spec,
                              validate-budget, generate-snapshots
context/                      project.md, tech-stack.md, constitution.md
                              (+ scaffold-manifest.json; brownfield also includes
                               brownfield-analysis.md)
specs/, templates/, docs/     SDD templates and guides
.github/                      Copilot prompts/instructions/agents — included ONLY
                              when GitHub Copilot is among the selected tools
.vscode/mcp.json              When MCP tools are selected (placeholders, no secrets)
```

Principles baked in: the `.agents/` core is the single source of truth (adapters
carry zero rules), nothing is fabricated (empty baselines, placeholder acceptance
checks, `log_only` drift policies), and every "auto-generated" artifact has a
validator script. See [`specdd-kit/docs/harness.md`](specdd-kit/docs/harness.md).

## What a SpecForge Role Pack contains

For each selected role (example: QA):

```
.agents/skills/role-qa/SKILL.md          Role skill: scope, Must/Never rules, verification
.agents/skills/role-qa/assets/*.md       The playbooks you selected, verbatim
.agents/evals/rubrics/role-qa.yaml       Drift policy (log_only)
.agents/workflows/role-qa/<command>.md   Role commands as vendor-neutral workflows
.agents/subagents/role-qa.agent.md       Canonical subagent seed (Multi-Agent stays inactive)
--- once per pack ---
.agents/specs/tasks/role-pack-install.tasks.md   Draft install tasks — your agent wires
                                                 ROUTING/REGISTRY/budget after YOUR approval
context/role-pack-report.md              What was generated, harness detection result,
                                         skipped collisions, agent kickoff
.github/prompts/specforge-*.prompt.md    ONLY when GitHub Copilot is selected — pointers
                                         to the pack's workflows
```

The pack never modifies existing harness files: collisions with the target project are
skipped and reported, and all wiring happens through the install tasks with a human gate.

## Step-by-step guides

### Greenfield — new project

1. Open the SpecDD wizard → pick **Greenfield**.
2. Fill the steps: project (name, description, personas, outcomes, constraints), tech
   stack, **domains** (1–8, they become skills and routing — think business areas, not
   tech folders) and primary **entities**, initial features, principles, MCP tools,
   **team tools** (one pointer adapter each), security (classification + OWASP focus).
3. Review the grouped preview and download the ZIP; extract it into your empty repo.
4. Run `pwsh .agents/scripts/validate-harness.ps1` after extraction.
5. First agent session: your agent auto-loads `AGENTS.md` and routes work through the
   harness. Define real specs per entity with `.agents/workflows/spec-first-feature.md`
   when you are ready.

### Brownfield — existing project

1. Open the SpecDD wizard → pick **Brownfield** → choose your project folder.
   Select the analysis depth. Level 1 reads manifests and paths; Level 2 is an
   explicit opt-in that reads only a bounded allowlist of safe documentation,
   manifests, models, routes and tests. Both run 100% in your browser.
2. Open **Review Context** and edit, exclude or classify each detected language,
   technology, architecture signal, domain, entity and feature. Approval is required
   before the wizard can continue.
3. If a previous agent harness is detected, read the warning and check the
   acknowledgment — its mechanism files will be deprecated, its knowledge triaged.
4. Walk the remaining steps (pre-filled), check the preview — including the
   "Skipped — already exist" group — and download; extract into your repo root.
5. Run `pwsh .agents/scripts/validate-harness.ps1` after extraction. It checks the
   manifest, required files, selected artifacts, internal references and safe content.
6. Verify nothing was clobbered: `git status` must show only new files (plus, with an
   acknowledged legacy harness, the replaced harness paths).
7. First agent session — one line:
   `Read AGENTS.md and follow it. Then read context/brownfield-analysis.md and do what its Kickoff section says.`
   The agent will ask for your approval on the pre-generated migration tasks (if a
   legacy harness existed) and then run `spec-converge` against your specs.

#### Brownfield analysis depth

The scenario and the analysis depth are separate decisions:

- **Level 1 — Structural bootstrap:** reads known manifests and file paths only;
  detects technologies, suggests domains/entities, and detects legacy harnesses.
- **Level 2 — Assisted semantic analysis:** an opt-in local analysis over a bounded
  safe allowlist. It records safe files read, evidence, confidence, architecture
  signals and skipped files; it never reads secrets, environment files or binaries.

Neither level invents business rules, approves specs automatically, or modifies
existing source code. Brownfield context approval is not spec approval: generated
entity contracts remain placeholders until the project defines real requirements and
executable checks.

### Role Pack — add BA/QA/Dev/UX roles to a harness project

1. Open the SpecForge wizard. Optionally pick your **target project folder** — the
   wizard detects its SpecDD Harness and computes collisions (skip to get a standard
   pack; generate the harness first with SpecDD if you don't have one).
2. Select the **roles** your team needs, tune role options (QA test approach, Figma
   for UX), review the preselected playbooks per role, pick your team tools.
3. Download and extract into the project root.
4. First agent session — one line:
   `Read AGENTS.md and follow it. Then read context/role-pack-report.md and do what its Kickoff section says.`
   The agent asks for your approval on `role-pack-install.tasks.md`, wires
   ROUTING/REGISTRY/budget, scaffolds the role-skill snapshots, and re-runs the gates.

After any scaffold: the harness validation scripts (`.agents/scripts/*.ps1`) need
PowerShell 7+ and the `powershell-yaml` module (`Install-Module powershell-yaml -Scope CurrentUser`).

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
zips everything client-side with JSZip. The current Brownfield analyzer
(`analyzer.js`) implements both levels. Level 1 uses manifests for stack detection,
folder structure for domain suggestions and filename patterns for entities. Level 2
adds a bounded safe text allowlist with evidence/confidence; secrets, environment
files and binaries are excluded. The approved context is applied defensively by
`generators.js`.
SpecForge's target ingestion reads only the path LIST (no content at all) to detect
the destination harness and compute collisions.

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

To try the wizards end-to-end without a real project, point the folder pickers at the
test fixtures: [`specdd-kit/website/e2e/fixtures/brownfield-sample/`](specdd-kit/website/e2e/fixtures/brownfield-sample/)
(Brownfield: detection, pre-fill, collision skipping),
[`specdd-kit/website/e2e/fixtures/brownfield-legacy/`](specdd-kit/website/e2e/fixtures/brownfield-legacy/)
(Brownfield with a legacy harness: warning + migration tasks), and
[`specforge-kit/website/e2e/fixtures/harness-target/`](specforge-kit/website/e2e/fixtures/harness-target/)
(SpecForge: harness detection + collision skipping).

### Tests

```powershell
npm run test:unit -w sdd-kit-wizard      # unit (Node test runner): generators, analyzer, steps
npm run test:unit -w specforge-wizard
npm run test:unit -w specdeploy-wizard
npm test -w sdd-kit-wizard               # Playwright e2e: greenfield + brownfield (+legacy) walkthroughs
npm test -w specforge-wizard             # Playwright e2e: standalone pack + target-ingestion walkthroughs
npm test -w specdd-platform              # Playwright e2e: portal + wizard mounts
npm run build -w specdd-platform         # production build (bundles all kits first)
```

CI (`.github/workflows/ci.yml`) runs unit + build per workspace; e2e runs locally.

## Repo layout & docs

- `docs/superpowers/specs/` — approved design specs per iteration (Greenfield harness,
  Brownfield ingestion, legacy-harness deprecation, SpecForge Role Packs).
- `docs/superpowers/plans/` — the implementation plans executed task-by-task.
- `docs/ROADMAP.md` — improvement backlog.
- `docs/IMPLEMENTATION_STATUS.md` — completed scope and the next Brownfield analysis phase.

## References

- `github/spec-kit` — SDD methodology and templates.
