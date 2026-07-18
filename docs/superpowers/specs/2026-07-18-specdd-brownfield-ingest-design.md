# SpecDD Wizard — Brownfield Scenario: Folder Ingestion & Analysis

**Date:** 2026-07-18
**Status:** Approved design, pending implementation plan
**Scope:** SpecDD kit + wizard only. Builds on the Greenfield + harness iteration
(`2026-07-18-specdd-greenfield-harness-design.md`); SpecForge and SpecDeploy untouched.

## Goal

Activate the Brownfield scenario: the user picks their existing project folder, the
wizard analyzes it **entirely in the browser** (no file ever leaves their machine),
pre-populates the wizard flow with detected stack/domains/entities, and generates the
harness scaffold adapted to an existing codebase — including the `spec-converge`
workflow and a generated analysis report, and never overwriting existing files.

## Decisions made

| Decision | Choice |
|----------|--------|
| Folder selection | `<input webkitdirectory>` — works across Chrome/Edge/Firefox/Safari and is Playwright-testable (`setInputFiles`). No File System Access API in v1. |
| Analysis depth | Manifests + structure + filenames only. Stack from manifest files; domain suggestions from code folder structure; entity suggestions from filename patterns. No source-code content parsing (delegated to the agent post-scaffold). |
| Collisions | Exclude-and-report: scaffold paths that already exist in the ingested folder are dropped from the ZIP (never clobber), listed in a "Skipped — already exist" preview group and in the analysis report. Fine-grained merging is the converge agent's job. |
| Analysis trail | The ZIP includes a generated `context/brownfield-analysis.md`: what was detected and from where, what was skipped as collisions, and the kickoff instruction (first agent session runs `.agents/workflows/spec-converge.md`). |

## UX flow

```
1.  Welcome
2.  Scenario              Brownfield card becomes ENABLED
3.  Ingest & Analyze      NEW — brownfield only
4.  Project               pre-filled (name from package.json name or folder name;
                          description from package.json description when present)
5.  Tech Stack            pre-filled from manifests (editable)
6.  Domains & Entities    chips pre-suggested from structure/filenames (editable)
7.  Features
8.  Principles
9.  MCP Tools
10. Agents & Tools
11. Security
12. Preview / Download    gains a 4th group: "Skipped — already exist in your project"
```

Ingest & Analyze step:
- "Choose folder" button (`webkitdirectory`) with a prominent privacy note: the
  analysis runs 100% in the browser; no file leaves the user's machine.
- After selection: summary cards — detected stack, N suggested domains, M suggested
  entities, files scanned (with a truncation warning when capped), and how many
  scaffold files collide with existing ones.
- Re-picking a folder re-runs analysis and re-applies pre-population.
- Validation: cannot advance without a completed analysis.
- Everything detected is an **editable suggestion** — subsequent steps are the same
  Greenfield steps with values pre-loaded; the user confirms or corrects.

## Analyzer module (`analyzer.js` — new, pure, no React)

API:

```
analyzeProject({ paths: string[], readFile: (path) => Promise<string> })
  → { projectName, description, stack, domains, entities, manifestsFound,
      fileCount, truncated }
```

- Only manifest files are ever read; source files contribute paths only.
- **Stack detection** via a declarative rule table (data, not conditionals), so new
  ecosystems are added by extending the table:
  - `package.json`: deps → react/vue/angular/next/astro ⇒ frontend; express/nest/
    fastify ⇒ backend; jest/vitest/playwright ⇒ testing; prisma/pg/mysql2/mongoose ⇒
    database; `tsconfig.json` present ⇒ TypeScript in languages.
  - `requirements.txt` / `pyproject.toml`: Python; django/flask/fastapi ⇒ backend.
  - `*.csproj` ⇒ .NET; `pom.xml` / `build.gradle` ⇒ Java (spring ⇒ backend);
    `go.mod` ⇒ Go; `Gemfile` ⇒ Ruby (rails ⇒ backend); `composer.json` ⇒ PHP
    (laravel ⇒ backend).
- **Domain suggestions**: top-level code folders under `src/`, `apps/`, `packages/`,
  `modules/` (or repo root when none of those exist), excluding infrastructure names
  (node_modules, dist, build, out, coverage, test, tests, __tests__, docs, doc,
  assets, public, static, config, scripts, vendor, .git and dotfolders). Ordered by
  contained-file count, capped at the existing `MAX_DOMAINS` (8) — the primer's
  ≤40-line guarantee holds unchanged.
- **Entity suggestions**: filename patterns — files under `models/`, `entities/`,
  `domain/` directories and `*.entity.*` / `*.model.*` names → base name capitalized,
  deduplicated, capped at 12.
- **Safety limits**: enumeration skips ignored directories (node_modules, .git, dist,
  build, vendor, venv, __pycache__, coverage, out); path list capped at 20,000
  entries with a `truncated` flag surfaced in the UI and the analysis report.

## Generation changes (`generators.js`, `steps.js`, `Wizard.jsx`)

- Wizard model gains `analysis` (the analyzer result, including suggestion
  provenance) and `existingPaths` (the ingested relative path list).
- `generateFiles`:
  - `scenario === 'brownfield'`: keeps `.agents/workflows/spec-converge.md` (a new
    static kit file), emits `context/brownfield-analysis.md` via a new
    `renderBrownfieldAnalysis(input)` renderer, and — as a final step — excludes
    every output path present in `existingPaths`, returning the skipped list for the
    preview group and the analysis report. Sole exemption: `context/
    brownfield-analysis.md` itself is always emitted (it is where skips are
    reported; a same-named pre-existing file is unlikely and recoverable via git).
  - `scenario === 'greenfield'`: filters `spec-converge.md` out of the base bundle;
    nothing else changes (the existing test asserting no converge in greenfield
    output stays green).
- `spec-converge.md` (static kit file, `.agents/workflows/`): the brownfield
  alignment workflow — load the spec and its acceptance checks (abort if none are
  executable), run the spec validator to measure the delta, audit for gaps not
  covered by checks and propose new ones (human approves), APPEND remaining work to
  the feature's tasks file (never rewrite or uncheck completed tasks), human reviews
  before implementation resumes. It never touches designContract status and never
  retro-approves.
- `steps.js`: `stepsFor('brownfield')` inserts `'Ingest & Analyze'` after Scenario
  (the seam left by the Greenfield iteration); `errorFor` gains a rule requiring a
  completed analysis on that step.
- `Wizard.jsx`: Brownfield scenario card enabled; new Ingest step UI; preview gains
  the skipped-collisions group.

## Testing

- Analyzer unit tests with path-list + manifest-text fixtures: Node/React project,
  Python/Django, .NET, an unconventional monorepo, an empty folder, and a >20k-path
  case asserting `truncated`.
- Brownfield generation unit tests: converge present in brownfield and still absent
  in greenfield; collisions excluded and reported; analysis report content; primer
  still ≤40 lines with detected domains.
- E2E (Playwright): full Brownfield walkthrough using `setInputFiles` with a small
  fixture project (package.json + src/auth/... + models/User.ts) — verifies
  pre-population, the "Skipped" group, and ZIP download. The existing Greenfield e2e
  is untouched.

## Out of scope (v1)

File System Access API, source-code content parsing, multi-project selection inside
monorepos (the chosen folder is analyzed as-is), and automatic merge tooling for
collisions (that is the agent's job via the converge workflow).

## Confidentiality constraint (carried over)

Same hard rule as the Greenfield iteration: no committed content references the
private harness source documents by filename or version label; the architecture is
the **SpecDD Harness** with its own versioning. The generated-content guard test
(no version tags in output) continues to cover all new renderers.
