# The SpecDD Harness

The scaffold's `.agents/` directory plus the root `AGENTS.md` form the **SpecDD
Harness** (v1.0.0): a vendor-neutral core that is the single source of truth for
skills, specs, routing, evals, workflows, and telemetry. Each AI coding tool reaches
the core through a pointer adapter of ≤5 lines (`CLAUDE.md`, `GEMINI.md`,
`.github/copilot-instructions.md`); tools that read root `AGENTS.md` natively need no
adapter. Adapters contain zero rules — rules found in an adapter are architecture
drift: move them into `.agents/` and restore the pointer.

## Prerequisites
The harness validation scripts require:
- **PowerShell 7+** (`pwsh`, cross-platform: Windows/macOS/Linux)
- The **powershell-yaml** module: `Install-Module powershell-yaml -Scope CurrentUser`

## Layout
| Path | Purpose |
|------|---------|
| `AGENTS.md` (root) | Session primer, ≤40 lines. What every agent session loads first. |
| `context/project-definition.json` | Canonical, runtime-neutral project intent (schema `1.0.0`); editable project source. |
| `context/scaffold-manifest.json` | Post-extraction manifest: generated paths, collisions, selected context and fidelity fingerprints. |
| `context/project-validation.json` | Explicit project-level test/build/lint commands executed by the consolidated validator. |
| `.agents/REGISTRY.md` | Full artifact registry + systems status. Load only when working on the harness itself. |
| `.agents/orchestration/ROUTING.md` | Task classification → which skill to load. |
| `.agents/skills/<domain>/SKILL.md` | Per-domain rules. Skeletons at scaffold time — fill as the domain takes shape. |
| `.agents/specs/<entity>.spec.yaml` | Per-entity spec with designContract + executable acceptanceChecks (placeholder until approved). |
| `.agents/evals/` | Rubrics (drift policy), scores, frozen baselines, run-eval.ps1. Baselines freeze from ≥10 real runs — never fabricated. |
| `.agents/cold-start/` | Budget manifest + compressed skill snapshots (generated once skills have real content). |
| `.agents/workflows/` | spec-first-feature.md, skill-review.md. |
| `.agents/telemetry/` | EVENTS.md contract; events/ is gitignored. |
| `.agents/scripts/` | validate-project.ps1 (orchestrator), validate-harness.ps1, generate-snapshots.ps1, validate-spec.ps1, validate-budget.ps1. |

## Lifecycle after scaffolding
1. Fill each skill skeleton with the domain's real Must/Never rules as they emerge.
2. Run `pwsh .agents/scripts/generate-snapshots.ps1 -Scaffold`, compress, then `-Check`.
3. Author specs through `.agents/workflows/spec-first-feature.md` (specify → clarify →
   approve → tasks → implement → done-gate).
4. Wire `pwsh .agents/scripts/validate-spec.ps1` and `generate-snapshots.ps1 -Check`
   into CI when the team is ready.
5. Multi-agent orchestration artifacts are deliberately absent — add them only when a
   real multi-agent workflow with named sub-agents exists.

After extracting a scaffold, run the one consolidated check:

```powershell
pwsh .agents/scripts/validate-project.ps1
```

The command runs the structural Harness gate, verifies immutable generated-file fingerprints,
compares the extracted source path inventory with the Brownfield ingestion baseline,
runs approved specs and acceptance checks when `powershell-yaml` is available, checks
the context budget, and executes commands declared in `context/project-validation.json`.
It writes `context/harness-validation-report.md` and `.json`.

The JSON and Markdown reports distinguish extraction integrity from project readiness.
`extractionStatus: VERIFIED` means structure, immutable generated files and the source
inventory match the ingestion receipt. `projectReadinessStatus: VERIFIED` additionally
requires classified canonical context, real contracts and successful project checks.
Context readiness is read from `context/project-definition.json`, not from duplicated
mutable status in the extraction receipt.

Exit codes are intentionally explicit: `0` means `VERIFIED`, `2` means `PARTIAL`
(the scaffold is usable but evidence or checks are incomplete), and `1` means a
structural, integrity or declared check failed. A newly generated scaffold normally
starts as `PARTIAL` until placeholder specs are replaced and project checks are
declared.

The manifest uses schema 2 and a deterministic non-cryptographic fingerprint only to
detect accidental copy/extraction drift. Project context, selected skills/specs,
feature drafts and `context/project-validation.json` are marked mutable so normal
project authoring does not look like a broken extraction. It does not prove semantic
equivalence or approve business rules.

When the project has real commands, edit `context/project-validation.json` and keep
them explicit and reproducible, for example:

```json
{
  "schemaVersion": 1,
  "checks": [
    { "id": "unit", "command": "npm run test:unit", "expectedExitCode": 0 },
    { "id": "build", "command": "npm run build", "expectedExitCode": 0 }
  ]
}
```

Those commands are executed from the project root by the same one-shot validator.
Do not put credentials or interactive commands in this file.

## Brownfield additions

For an existing project, the wizard adds `context/brownfield-analysis.md` and keeps
`.agents/workflows/spec-converge.md`. It also creates the mutable, evidence-first queue
`.agents/specs/tasks/brownfield-convergence.tasks.md` so the first agent session has a
concrete path from detected context to approved contracts and both verification gates.
The analysis can run at two levels: structural
manifest/path detection or opt-in semantic analysis over a bounded safe text
allowlist of up to 256 files and 2,000,000 total characters. Level 2 excludes generated
outputs such as `out-tsc`, records evidence, confidence, architecture signals and every
file omitted by its limits, and proposes repository-backed build/test checks for explicit
selection. It does not read secrets or modify source code.

Before generation, `Review Context` requires a human to keep, edit, exclude and
classify the detected stack, architecture, domains, entities and features; selected
findings cannot remain `unknown`. Repository-backed project checks are proposed in
the same view and remain disabled unless explicitly selected. The approved selection
is applied defensively to generated skills, context and feature
artifacts. Entity contracts remain `designContract: placeholder`: context approval
is not spec approval. Existing destination files are still skipped and reported;
reconciliation belongs to `spec-converge`. Run the consolidated validator before the
first agent session; it will call out source drift, skipped collisions, unknown context
classifications and placeholder contracts in one report.
