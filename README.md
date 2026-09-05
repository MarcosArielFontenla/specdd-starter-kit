# SPECDDSTARTERKIT

Enterprise starter kit for **Spec-Driven Development (SDD)**, inspired by
[`github/spec-kit`](https://github.com/github/spec-kit): a web portal with visual
wizards that generate ready-to-use project scaffolds — no backend, everything runs
in the browser and downloads as a ZIP.

> Specifications are the source of truth. Code is the output.

The centerpiece is the **SpecDD wizard**: it generates a scaffold structured around
the **SpecDD Harness**, a vendor-neutral agent architecture that any AI coding tool
(GitHub Copilot, Claude Code, Cursor, Codex, Gemini) consumes through the same core.
Its companion, the **SpecForge wizard**, generates composable **Capability Packs**
(BA / QA / Dev / UX) alongside backward-compatible Role Pack artifacts — per-role
skills, playbooks, workflows and inactive subagent seeds, wired in by your agent under
your approval.

## Scenarios

The SpecDD wizard branches by scenario on its second step:

| Scenario | Status | What it does |
|----------|--------|--------------|
| **Greenfield** | ✅ | New project. You pour in all the context you have (project, stack, domains, entities, features, principles, security, team tools) and get a fully personalized harness scaffold. |
| **Brownfield** | ✅ | Existing project. You pick your project folder; Level 1 analyzes manifests and paths, while opt-in **Level 2 — Assisted semantic analysis** reads a bounded allowlist of safe text files locally. Both pre-fill the flow, require human review of detected context, and generate a collision-safe scaffold: existing files are skipped and reported, never overwritten. Includes `spec-converge`; legacy Harness detection still requires explicit acknowledgment and can generate migration tasks. |
| **Deploy** (SpecDeploy wizard) | ⏸ deferred | CI/CD + IaC generation works for 6 providers, but refinement is on hold until a real target environment is defined (Azure vs AWS vs Railway vs other). |

## What the generated scaffold contains (Project Definition 1.0.0 + Harness v1)

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
  scripts/*.ps1               Mechanical gates: validate-project (one run),
                              validate-harness, validate-spec, validate-budget,
                              generate-snapshots
context/                      project-definition.json (canonical project intent),
                              project.md, tech-stack.md, constitution.md
                              (+ scaffold-manifest.json generation receipt,
                               project-validation.json;
                               brownfield also includes brownfield-analysis.md)
specs/, templates/, docs/     SDD templates and guides
.github/                      Copilot prompts/instructions/agents — included ONLY
                              when GitHub Copilot is among the selected tools
.vscode/mcp.json              When MCP tools are selected (placeholders, no secrets)
```

Principles baked in: the `.agents/` core is the single source of truth (adapters
carry zero rules), nothing is fabricated (empty baselines, placeholder acceptance
checks, `log_only` drift policies), and every "auto-generated" artifact has a
validator script. See [`specdd-kit/docs/harness.md`](specdd-kit/docs/harness.md).

## What a SpecForge Capability Pack contains

For each selected role (example: QA):

```
.agents/capabilities/role-qa/capability.json Capability Pack 1.0.0 manifest
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

Each role manifest is independent and validated before download. The pack never modifies
existing harness files: collisions with the target project are skipped and reported,
and all routing, registry, budget, and Project Definition wiring happens through the
install tasks with a human gate.

## Step-by-step guides

### Greenfield — new project

1. Open the SpecDD wizard → pick **Greenfield**.
2. Fill the steps: project (name, description, personas, outcomes, constraints), tech
   stack, **domains** (1–8, they become skills and routing — think business areas, not
   tech folders) and primary **entities**, initial features, principles, MCP tools,
   **team tools** (one pointer adapter each), security (classification + OWASP focus).
3. Review the grouped preview and download the ZIP; extract it into your empty repo.
4. Run `pwsh .agents/scripts/validate-project.ps1` after extraction. This is the
   single truthful run: it validates structure, generated-file integrity, specs,
   budget and any declared project checks, then writes a Markdown + JSON report.
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
5. Run `pwsh .agents/scripts/validate-project.ps1` after extraction. It is the single
   consolidated validation run and writes `context/harness-validation-report.md` plus
   a machine-readable JSON report. Exit `0` means `VERIFIED`; exit `2` means `PARTIAL`
   evidence remains; exit `1` means a validation failed.
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

### Post-extraction validation (all scenarios)

After copying or extracting the generated ZIP at the root of the target repository,
run the single consolidated check:

```powershell
pwsh .agents/scripts/validate-project.ps1
```

The command validates the Harness structure, immutable generated-file fingerprints,
internal references, selected artifacts, Brownfield source-path baseline, specs,
budget and the project checks declared in `context/project-validation.json`. It writes
`context/harness-validation-report.md` and
`context/harness-validation-report.json`.

Exit codes are explicit: `0` means `VERIFIED`, `2` means `PARTIAL` evidence remains,
and `1` means a structural, integrity or declared project check failed. The manifest
keeps context, draft skills/specs/features and the project-validation profile mutable
so normal project authoring does not look like an extraction error. These fingerprints
prove path/content fidelity for the generated files; they do not prove semantic
equivalence or business-rule correctness.

### Capability Pack — add BA/QA/Dev/UX roles to a harness project

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

After any SpecDD scaffold, use the consolidated validation command above; the
individual gates remain available for CI and focused debugging. The validation
scripts (`.agents/scripts/*.ps1`) need PowerShell 7+ and the `powershell-yaml` module
(`Install-Module powershell-yaml -Scope CurrentUser`).

## Workspaces

npm workspaces monorepo (Node ≥ 22.12):

| Workspace | Purpose |
|-----------|---------|
| [`platform`](platform/) | SpecDD Platform — unified portal: Boreal landing + the three wizards mounted at `/specdd`, `/specforge`, `/specdeploy`. |
| [`specdd-kit`](specdd-kit/) | The SDD scaffold content + the scenario-branched wizard (Greenfield/Brownfield) that generates the harness ZIP. |
| [`specforge-kit`](specforge-kit/) | Capability Pack wizard (BA/QA/Dev/UX): generates one portable manifest per role plus compatible skills, playbooks, workflows, rubrics, and inactive subagent seeds, with optional target-folder ingestion and human-approved install tasks. |
| [`specdeploy-kit`](specdeploy-kit/) | Deploy wizard: CI/CD pipelines, IaC and runbooks for 6 providers (Azure SWA, Cloudflare, AWS, Vercel, Netlify, on-prem Docker). Providers are data — see [`provider-authoring.md`](specdeploy-kit/docs/provider-authoring.md). |
| [`packages/ui`](packages/ui/) | `@specdd/ui` — Boreal Design System (shared Stepper + styles for all wizards). |
| [`packages/project-model`](packages/project-model/) | `@specdd/project-model` — canonical runtime-neutral Project Definition, JSON Schema, TypeScript types, validation, migration, and Harness v1 compatibility boundary. |
| [`packages/capability-model`](packages/capability-model/) | `@specdd/capability-model` — portable Capability Pack 1.0.0 schema, strict types, semantic validation, role mapping, and explicit legacy migration. |
| [`packages/control-plane-model`](packages/control-plane-model/) | `@specdd/control-plane-model` — portable SpecControl 1.0.0 workflow, graph, policy, approval, failure, retry, eval-gate, artifact, and runtime-hint contracts. It is declarative and does not execute graphs. |
| [`packages/warp-adapter`](packages/warp-adapter/) | `@specdd/warp-adapter` — deterministic, side-effect-free compiler from SpecControl 1.0.0 to Warp Factory `v1alpha1` files, with disabled GitHub issue automation and explicit fidelity/unsupported reporting. |
| [`packages/eval-adapters`](packages/eval-adapters/) | `@specdd/eval-adapters` — canonical single-run eval/results, local outcome normalization and hashed evidence, plus an optional unapplied Warp classification scorer projection. |
| [`packages/run-history`](packages/run-history/) | `@specdd/run-history` — vendor-neutral run events, explicit coverage gaps, graph-bound eval imports, immutable local JSONL history and read-only inspection. |
| [`packages/benchmarks`](packages/benchmarks/) | `@specdd/benchmarks` — pinned evaluation-node comparison plans, reproducible datasets, explicit metric coverage and descriptive baseline deltas; no automatic winner or Harness mutation. |
| [`packages/improvement-proposals`](packages/improvement-proposals/) | `@specdd/improvement-proposals` — evidence-bound proposals, failure observations, human-attested review journals and guarded draft PR handoffs; no automatic Harness mutation. |

**How generation works:** a build-time bundle script snapshots each kit's real files
into `website/src/data/*.json`. SpecDD first normalizes approved answers into
`context/project-definition.json`, then its compatibility projection feeds the existing
pure Harness v1 renderers. The wizard zips everything client-side with JSZip. The
current Brownfield analyzer
(`analyzer.js`) implements both levels. Level 1 uses manifests for stack detection,
folder structure for domain suggestions and filename patterns for entities. Level 2
adds a bounded safe text allowlist with evidence/confidence; secrets, environment
files and binaries are excluded. The approved context is applied defensively by
`generators.js`.
SpecForge's target ingestion reads only the path LIST (no content at all) to detect
the destination harness and compute collisions. Its generated manifests describe
routing and optional Project Definition bindings declaratively; installation remains
draft and human-gated.

For Brownfield SpecDD generation, the separate schema-2 generation receipt also records the approved
context, collision decisions, a source baseline and deterministic fingerprints. This
gives the extracted project one reproducible post-copy validation run without
silently overwriting existing files.

## Run it locally

Prerequisites: **Node ≥ 22.12** and npm. (PowerShell 7 + `powershell-yaml` are only
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

CI (`.github/workflows/ci.yml`) runs unit/build checks, dependency audit and browser
regressions. Run-history usage and local evidence inspection are documented in
[`packages/run-history/README.md`](packages/run-history/README.md).

## Repo layout & docs

- `docs/superpowers/specs/` — approved design specs per iteration (Greenfield harness,
  Brownfield ingestion, legacy-harness deprecation, and SpecForge Capability Packs).
- `docs/superpowers/plans/` — the implementation plans executed task-by-task.
- `docs/ROADMAP.md` — improvement backlog.
- `docs/IMPLEMENTATION_STATUS.md` — completed scope, validation flow and the remaining evolution backlog.

## References

- `github/spec-kit` — SDD methodology and templates.
