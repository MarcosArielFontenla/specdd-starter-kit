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
| `.agents/REGISTRY.md` | Full artifact registry + systems status. Load only when working on the harness itself. |
| `.agents/orchestration/ROUTING.md` | Task classification → which skill to load. |
| `.agents/skills/<domain>/SKILL.md` | Per-domain rules. Skeletons at scaffold time — fill as the domain takes shape. |
| `.agents/specs/<entity>.spec.yaml` | Per-entity spec with designContract + executable acceptanceChecks (placeholder until approved). |
| `.agents/evals/` | Rubrics (drift policy), scores, frozen baselines, run-eval.ps1. Baselines freeze from ≥10 real runs — never fabricated. |
| `.agents/cold-start/` | Budget manifest + compressed skill snapshots (generated once skills have real content). |
| `.agents/workflows/` | spec-first-feature.md, skill-review.md. |
| `.agents/telemetry/` | EVENTS.md contract; events/ is gitignored. |
| `.agents/scripts/` | generate-snapshots.ps1, validate-spec.ps1, validate-budget.ps1. |

## Lifecycle after scaffolding
1. Fill each skill skeleton with the domain's real Must/Never rules as they emerge.
2. Run `pwsh .agents/scripts/generate-snapshots.ps1 -Scaffold`, compress, then `-Check`.
3. Author specs through `.agents/workflows/spec-first-feature.md` (specify → clarify →
   approve → tasks → implement → done-gate).
4. Wire `pwsh .agents/scripts/validate-spec.ps1` and `generate-snapshots.ps1 -Check`
   into CI when the team is ready.
5. Multi-agent orchestration artifacts are deliberately absent — add them only when a
   real multi-agent workflow with named sub-agents exists.
