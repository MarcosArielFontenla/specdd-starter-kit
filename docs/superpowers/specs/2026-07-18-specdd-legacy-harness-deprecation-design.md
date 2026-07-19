# SpecDD Wizard — Legacy Harness Detection & Deprecation (Brownfield)

**Date:** 2026-07-18
**Status:** Approved design, pending implementation plan
**Scope:** SpecDD kit + wizard, Brownfield scenario only. Builds on the Brownfield
ingestion iteration (`2026-07-18-specdd-brownfield-ingest-design.md`).

## Motivation (validated on a real case)

Applying a fresh scaffold to a repo that already carries an agent harness leaves two
parallel systems: the new spine ignores the old skills, two registries coexist, and
the developer must hand-write a migration prompt for their agent. Field test on a
real Angular landing (old-generation `.agents/` with 6 content-rich skills) confirmed
both the problem and the shape of the fix: the agent produced a 9-phase migration
tasks file that this feature now pre-generates mechanically.

Guiding decision: the developer who generates a new harness has already chosen it —
the wizard **warns, it does not ask**. Deprecation of the old harness is the only
mode. But the wizard cannot judge content value (no LLM), so old files split into
two classes: **mechanism** (deprecated directly) and **knowledge** (triaged by the
agent through a pre-generated tasks file).

## Decisions made

| Decision | Choice |
|----------|--------|
| Ask or warn | Warn only. A detected legacy harness triggers a warning card + mandatory acknowledgment checkbox (same pattern as SpecDeploy's secrets acknowledgment). Next is blocked until checked. |
| Re-running the wizard on a repo that already has a SpecDD Harness | Same treatment — no special "update mode" (YAGNI). The migration tasks resolve the delta; for a previous SpecDD scaffold they are mostly no-ops. |
| Who deletes/moves old files | The agent, never the wizard (client-side ZIP only). The wizard detects, warns, overrides collisions for harness paths, and pre-generates the migration tasks. |
| Collision policy change | Only with the acknowledgment: **harness paths** in the new scaffold are included in the ZIP even when they collide (replace-on-extract, reported as `replaced[]`). Non-harness collisions keep the never-clobber skip. |

## Detection & classification (`detectLegacyHarness` — pure, in `analyzer.js`)

Runs on the **raw** ingested path list (the same unfiltered list used for
`existingPaths` — the analyzer's ignore filter drops dot-folders like `.agents/`, so
detection must not reuse the filtered list).

Signals of a pre-existing harness (relative paths, root prefix already stripped):
- `.agents/**`, `.claude/**`, `.cursor/rules/**`
- Root files: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `SYSTEM_PROMPT.md`
- `.github/copilot-instructions.md`

Classification by path, applied to every detected file:
- **knowledge** — project rules worth rescuing: any detected path matching
  `**/skills/**`, `**/patterns/**`, `**/adrs/**` under a harness directory.
- **mechanism** — everything else detected: registries, system prompts, scripts,
  subagents, workflows, adapters, telemetry, config.

Return shape: `{ detected: boolean, mechanism: string[], knowledge: string[] }`,
exposed on the analysis result consumed by the UI and the generators.

## UX (Ingest & Analyze step)

When `detected` is true, the analysis summary gains a warning card:

> ⚠️ Legacy harness detected: N files — M mechanism files will be deprecated
> (archived by your agent, replaced on extract where paths collide), K knowledge
> files will be triaged into the new harness by your agent.

plus a mandatory checkbox: *"I understand the previous harness will be deprecated
and its mechanism files replaced by the new scaffold."* `steps.js` validation blocks
Next on the Ingest step while a detected legacy harness is unacknowledged. Without a
detected harness, nothing changes.

## Generation changes

- **Collision override** (`generateScaffold`): with a detected + acknowledged legacy
  harness, scaffold outputs whose path is a harness path (`AGENTS.md`, adapter files,
  `.agents/**`) are kept in the ZIP even when present in `existingPaths`, and listed
  in a new `replaced: string[]` (sorted). All other collisions keep the existing
  `skipped[]` behavior. Return shape becomes `{ files, skipped, replaced }`.
- **Pre-generated migration tasks** — `.agents/specs/tasks/harness-migration.tasks.md`
  (`status: draft`; the harness's human-approval gate applies — the agent must get
  approval before implementing). Structure, populated with the real detected paths:
  - Phase 1 — Archive mechanism: move each `mechanism[]` file to `.agents/_archive/`
    (explicit list).
  - Phase 2 — Triage knowledge: per legacy SKILL.md, integrate its content into the
    corresponding new skill (migrate frontmatter to the new format — snapshotPath /
    snapshotVersion / driftPolicyPath pointer — and create a `log_only` rubric) or
    archive it if dead; patterns/ADRs: register in REGISTRY or archive.
  - Phase 3 — Rewire: ROUTING/REGISTRY/budget-manifest rows for every rescued skill;
    primer stays ≤40 lines.
  - Phase 4 — Verify: `validate-spec.ps1` and `validate-budget.ps1` exit 0; no
    dangling references to archived material.
  - Pre-resolved defaults baked into the file (from the field test): snapshots
    deferred; runbooks of retired scripts archived with their scripts. Only
    content-judgment calls are left as explicit questions for the developer.
- **Analysis report** (`context/brownfield-analysis.md`): new "Legacy harness
  detected" section (inventory by class + replaced list), and when a legacy harness
  exists the kickoff instruction becomes: *first session — get the human's approval
  on `.agents/specs/tasks/harness-migration.tasks.md`, then execute it.*
- **Preview**: new group "Replaced — legacy harness files (N)" alongside the
  existing "Skipped" group; shown only when non-empty.

## Testing

- Unit — detector: classification of mechanism vs knowledge; no false positives on a
  harness-free repo; detection works on raw (unfiltered) paths including dot-folders.
- Unit — override matrix: harness-path collision + acknowledged → `replaced`;
  non-harness collision → `skipped`; detected but this-scenario-impossible
  unacknowledged state → no override; greenfield unaffected.
- Unit — migration tasks renderer: phases present, real paths listed, draft status,
  pre-resolved defaults, questions section.
- Unit — steps.js: Ingest validation blocks on unacknowledged detected harness.
- E2E — second brownfield fixture containing a fake legacy harness
  (`.agents/skills/old-skill/SKILL.md`, root `AGENTS.md`, `SYSTEM_PROMPT.md`):
  warning card visible, Next blocked until checkbox, "Replaced" group in preview,
  `harness-migration.tasks.md` present in the generated file list. The existing
  brownfield e2e (harness-free fixture) stays untouched and proves the clean case is
  unchanged.

## Out of scope

Semantic "update mode" diffing between harness generations; the wizard deleting or
moving files in the user's repo (always the agent's job); detection of exotic
harness layouts beyond the listed signals.

## Confidentiality constraint (carried over)

No committed content references private source documents by filename or version
label; the architecture is the **SpecDD Harness**. The generated-content version-tag
guard test extends to the new renderer automatically.
