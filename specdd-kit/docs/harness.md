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
| `context/scaffold-manifest.json` | Post-extraction manifest: generated paths, collisions and selected context. |
| `.agents/REGISTRY.md` | Full artifact registry + systems status. Load only when working on the harness itself. |
| `.agents/orchestration/ROUTING.md` | Task classification → which skill to load. |
| `.agents/skills/<domain>/SKILL.md` | Per-domain rules. Skeletons at scaffold time — fill as the domain takes shape. |
| `.agents/specs/<entity>.spec.yaml` | Per-entity spec with designContract + executable acceptanceChecks (placeholder until approved). |
| `.agents/evals/` | Rubrics (drift policy), scores, frozen baselines, run-eval.ps1. Baselines freeze from ≥10 real runs — never fabricated. |
| `.agents/cold-start/` | Budget manifest + compressed skill snapshots (generated once skills have real content). |
| `.agents/workflows/` | spec-first-feature.md, skill-review.md. |
| `.agents/telemetry/` | EVENTS.md contract; events/ is gitignored. |
| `.agents/scripts/` | validate-harness.ps1, generate-snapshots.ps1, validate-spec.ps1, validate-budget.ps1. |

## Lifecycle after scaffolding
1. Fill each skill skeleton with the domain's real Must/Never rules as they emerge.
2. Run `pwsh .agents/scripts/generate-snapshots.ps1 -Scaffold`, compress, then `-Check`.
3. Author specs through `.agents/workflows/spec-first-feature.md` (specify → clarify →
   approve → tasks → implement → done-gate).
4. Wire `pwsh .agents/scripts/validate-spec.ps1` and `generate-snapshots.ps1 -Check`
   into CI when the team is ready.
5. Multi-agent orchestration artifacts are deliberately absent — add them only when a
   real multi-agent workflow with named sub-agents exists.

After extracting a scaffold, run:

```powershell
pwsh .agents/scripts/validate-harness.ps1
```

The read-only gate checks the manifest, required Harness files, selected domain/entity
artifacts, internal references, collision bookkeeping and high-confidence secret-like
tokens. Add `-RunGates` when PowerShell-YAML is installed to run the existing spec and
budget validators as part of the same check.

## Brownfield additions

For an existing project, the wizard adds `context/brownfield-analysis.md` and keeps
`.agents/workflows/spec-converge.md`. The analysis can run at two levels: structural
manifest/path detection or opt-in semantic analysis over a bounded safe text
allowlist. Level 2 records evidence, confidence, architecture signals and skipped
files; it does not read secrets or modify source code.

Before generation, `Review Context` requires a human to keep, edit, exclude and
classify the detected stack, architecture, domains, entities and features. The
approved selection is applied defensively to generated skills, context and feature
artifacts. Entity contracts remain `designContract: placeholder`: context approval
is not spec approval. Existing destination files are still skipped and reported;
reconciliation belongs to `spec-converge`.
