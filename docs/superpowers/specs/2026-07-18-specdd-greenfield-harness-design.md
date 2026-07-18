# SpecDD Wizard — Greenfield Scenario with Portable Agent Harness

**Date:** 2026-07-18
**Status:** Approved design, pending implementation plan
**Scope:** SpecDD kit + wizard only. SpecForge and SpecDeploy are untouched.

## Goal

Evolve the SpecDD wizard from a linear, Copilot-centric scaffold generator into a
scenario-driven generator whose output is structured around a **vendor-neutral portable
agent harness** (the "SpecDD Harness"): a `.agents/` core that is the single source of
truth for skills, specs, routing, evals, workflows, and telemetry, reached by each AI
coding tool through a thin pointer adapter.

Two scenarios are planned:

- **Greenfield** (this phase): a new project — the user pours in all available context
  through the wizard and receives a fully personalized harness scaffold.
- **Brownfield** (next phase, designed later): an existing project — the wizard ingests
  the project folder, analyzes it, and pre-populates the flow. This phase only prepares
  the seams for it.

## Decisions made

| Decision | Choice |
|----------|--------|
| Harness vs current Copilot scaffold | Harness core (`.agents/` + root `AGENTS.md` + adapters) is the spine of the generated scaffold. Current `.github/` content (prompts, instructions, agents, hooks) survives as a **Copilot-specific projection**, included only when Copilot is selected. |
| How much harness to generate | Everything, in safe initial state: primer, adapters, registry, routing, skill skeletons, spec placeholders, validation scripts, rubrics at `log_only`, telemetry contract, workflows. Empty baselines and snapshots (never fabricated). Multi-agent orchestration system **not** generated (trigger-gated: requires a real multi-agent workflow first). |
| Scenario selection | New "Scenario" step at the start of the SpecDD wizard (two cards). Brownfield card visible but disabled ("Coming soon"). |
| Domains & entities capture | Dedicated wizard step with editable chips. Explicit and deterministic — no inference. |
| Team tools | Multi-select (Copilot, Claude Code, Cursor, Codex, Gemini) replacing the single "primary agent" dropdown. One ≤5-line pointer adapter generated per tool that needs one. |
| Orphaned model fields | All rescued: personas, outcomes, constraints (Project step), owaspControls (Security step), features (new Features step → `specs/features-spec.md`). Closes ROADMAP item 3. |
| Artifact materialization | Static harness artifacts live as real files in the `specdd-kit/` tree (picked up by the existing bundler). Only personalized files are rendered in `generators.js`. |
| Generated artifact language | English (consistent with the rest of the kit; team portability). |

## Confidentiality constraint (hard rule)

The harness design originates from three private documents owned by the repo author,
which sit untracked at the repo root. Because this repository will eventually be public:

1. **The three source documents are never committed.** A generic `/_private/` entry is
   added to `.gitignore` so they can be moved there and become impossible to stage
   accidentally.
2. **No committed content may reference the source documents** by filename, version
   label, or authorship trail. All committed artifacts (kit files, generators, tests,
   docs, this spec included) refer to the architecture only as the **SpecDD Harness**
   with its own independent versioning (starting at `harness v1.0.0`).

## Generated scaffold structure (Greenfield ZIP)

```
AGENTS.md                          ← session primer, ≤40 lines, personalized:
                                     project + stack one-liners, fast task-classification
                                     table with the user's real domains, load order,
                                     context budget (≤500 injected lines), telemetry
                                     session-end fallback instruction
CLAUDE.md / GEMINI.md / ...        ← pointer adapters, ≤5 lines, zero rules, one per
                                     selected tool that needs one (Cursor/Codex read
                                     root AGENTS.md natively — no adapter emitted)
.github/copilot-instructions.md    ← becomes a pure ≤5-line pointer adapter (today it
                                     is a rules-rich generated file; those rules move
                                     into context/ and the primer)
.agents/
  REGISTRY.md                      ← artifact registry + Harness Systems Status table
  orchestration/ROUTING.md         ← one classification row per user domain
  skills/<domain>/SKILL.md         ← skeleton per domain; frontmatter carries
                                     snapshotPath, snapshotVersion, driftPolicyPath
                                     (pointer only — no inline drift policy)
  specs/<entity>.spec.yaml         ← per primary entity: designContract
                                     status: placeholder, acceptanceChecks with
                                     command: placeholder derived from spec wording,
                                     empty clarifications list
  specs/tasks/                     ← empty (used by the spec-first pipeline)
  evals/rubrics/<domain>.yaml      ← driftPolicy: log_only, aggregation: median,
                                     ciFailConsecutiveWindows: 2
  evals/baselines/                 ← EMPTY — baselines freeze from real runs only
  evals/run-eval.ps1               ← eval runner with frozen-baseline drift analysis
                                     (harness naming — no version-label suffixes)
  scripts/generate-snapshots.ps1   ← snapshot scaffolder + freshness validator (-Check)
  scripts/validate-spec.ps1        ← spec gate: acceptance checks + clarification markers
  scripts/validate-budget.ps1      ← static context-budget check vs manifest
  cold-start/budget-manifest.yaml  ← task class → artifact map, generated from domains
  cold-start/snapshots/            ← EMPTY — filled once skills have real content
  workflows/spec-first-feature.md  ← specify → clarify → tasks → implement → done-gate
  workflows/skill-review.md        ← 5 drift classifications + mandatory proposal diff
  telemetry/EVENTS.md              ← event contract; events/ gitignored in the scaffold
context/project.md                 ← personalized; enriched with outcomes, personas,
context/tech-stack.md                constraints
context/constitution.md
specs/features-spec.md             ← generated from the Features step (omitted if empty)
governance/, specs/_template/,
templates/, docs/                  ← current kit content, kept as-is
.github/prompts|instructions|agents|hooks
                                   ← ONLY when Copilot is selected; marked as
                                     vendor-specific projection of the core
.vscode/mcp.json                   ← when MCP tools are selected (unchanged behavior)
```

Notes:

- The registry is named `.agents/REGISTRY.md` (not `.agents/AGENTS.md`) to eliminate
  the primer/registry name collision for greenfield projects.
- `workflows/spec-converge.md` is **deliberately absent** in Greenfield — converge is a
  brownfield-only workflow (there is no delta to measure on a new project). The
  Brownfield phase will add it.
- PowerShell scripts require pwsh 7+ and the `powershell-yaml` module; the scaffold's
  README documents both prerequisites.
- Nothing fabricated anywhere: no synthetic baselines, no sample telemetry events, no
  invented acceptance-check commands.

## Wizard UX

Step flow (from 8 linear steps to a scenario-branched stepper):

```
1.  Welcome
2.  Scenario            NEW — two cards: Greenfield / Brownfield (disabled, "Coming soon")
── Greenfield branch ──
3.  Project             enriched: + outcomes, personas, constraints
4.  Tech Stack          unchanged
5.  Domains & Entities  NEW — editable chips:
                          domains  → SKILL.md + ROUTING row + rubric + budget-manifest entry
                          entities → .spec.yaml placeholder each
6.  Features            NEW — initial feature list → specs/features-spec.md
7.  Principles          unchanged (→ constitution)
8.  MCP Tools           unchanged
9.  Agents & Tools      single dropdown → MULTI-SELECT of team tools (adapter each)
                          + preferred model (informative, as today)
10. Security            enriched: + owaspControls checkboxes
11. Preview / Download  file tree grouped by: harness core / adapters / Copilot
                          projection (when present) — then ZIP download
```

Validation rules:

- Domains: **at least 1 required** (no domains → no routing/skills → harness is
  meaningless). Entities and Features may be empty; their artifacts are cleanly omitted.
- Agents & Tools: **at least 1 tool required**.
- Primer hard limit ≤40 lines and adapter hard limit ≤5 lines are enforced by unit
  tests against the renderers.

Branching architecture:

- The Scenario step writes `scenario: 'greenfield' | 'brownfield'` into the model from
  day one. The step array is **computed from the scenario** — this is the seam where
  the Brownfield branch (folder ingestion + analysis + its own steps) plugs in later
  without architectural change.
- The shared `@specdd/ui` Stepper API does not change; it receives the already-resolved
  step list. SpecForge and SpecDeploy are untouched.

## Implementation architecture (repo side)

- **Static harness artifacts** are committed as real files under `specdd-kit/.agents/`
  (scripts, workflows, telemetry contract, rubric template). The existing
  `bundle-kit.js` walker picks them up verbatim; its extension allowlist
  (`.md/.json/.yml/.sh`) is extended with `.ps1` and `.yaml`.
- **Personalized artifacts** are rendered by new pure functions in `generators.js`:
  `renderPrimer`, `renderAdapter(tool)`, `renderRegistry`, `renderRouting`,
  `renderSkillSkeleton(domain)`, `renderSpecYaml(entity)`, `renderRubric(domain)`,
  `renderBudgetManifest`, `renderFeaturesSpec`. The four existing renderers stay;
  `renderCopilotInstructions` is rewritten to emit the pure pointer adapter.
- **Conditional filtering** happens in `generateFiles(input)` (pure, testable): base
  bundle paths under `.github/**` are dropped unless Copilot is among the selected
  tools. The bundler stays scenario-agnostic.
- **Wizard model** gains `scenario`, `domains[]`, `entities[]`, `tools[]` (replacing
  the single `agent` field) and wires the previously orphaned fields into the UI.

## Testing

Following the kit's existing patterns:

- Unit (`generators.test.js`): primer ≤40 lines; adapters ≤5 lines and rule-free; one
  skill/rubric/ROUTING row per domain; spec YAML parseable with `status: placeholder`
  and placeholder acceptance checks; `.github/**` filtering by tool selection; no
  `spec-converge.md` in greenfield output; features-spec omitted when the list is
  empty; no reference to the private source documents in any generated content.
- Bundler test: new extensions included, `specdd-kit/.agents/` files present in the
  bundle.
- E2E (Playwright, local): full Greenfield walkthrough to ZIP download; Brownfield
  card rendered disabled.

## Prepared seams for the Brownfield phase (not implemented now)

- `scenario` field + per-scenario step computation.
- `generateFiles(input)` already parameterized by scenario; Brownfield will add
  `workflows/spec-converge.md` and pre-populate `domains`, `entities`, and stack from
  folder analysis (File System Access API), which will get its own design spec.

## Out of scope for this phase

Brownfield ingestion, SpecDeploy wizard changes, absorbing the `.github/` prompt
content into the vendor-neutral core, the multi-agent orchestration system, running
e2e in CI.
