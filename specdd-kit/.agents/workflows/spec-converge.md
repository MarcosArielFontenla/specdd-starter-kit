# Spec Converge — align existing code to a spec (brownfield)

Use this workflow when the codebase predates its spec: migrations, legacy adoption,
resumed features, or a fresh harness dropped onto an existing project.

1. Load `.agents/specs/tasks/brownfield-convergence.tasks.md` when present, then load
   the target spec and its `acceptanceChecks`.
2. If the spec is still a placeholder, inspect the referenced production code, tests,
   routes and repository checks. Propose requirements plus executable acceptance checks
   (or a reasoned waiver), append the proposal to the convergence task, and STOP for
   human approval. Never promote the contract automatically.
3. Once the contract is approved, run
   `pwsh .agents/scripts/validate-spec.ps1 -Run -SpecPath [spec]`.
   Failing checks = the measurable delta between the codebase and the spec.
4. Audit the codebase against the spec's requirements for gaps no check covers yet.
   Propose new acceptanceChecks for those gaps — the human approves them; they amend
   the spec.
5. APPEND the remaining work to the feature's tasks file
   (`.agents/specs/tasks/[feature-slug].tasks.md`, create it if absent).
   Never rewrite or uncheck completed tasks — converge adds, it does not rewrite
   history.
6. The human reviews the delta before any implementation resumes.
7. If an approved implementation changes files recorded in the Brownfield content
   baseline, run `.agents/scripts/rebaseline-source.ps1 -Mode propose` with the exact
   changed paths. Stop and obtain approval for the printed subject SHA-256. Apply only
   that exact hash; never edit baseline fingerprints manually. Added, removed or
   unlisted changed paths require a new proposal or a fresh ingestion.

Constraints: converge never touches `designContract.status` · never retro-approves
anything · its output is always tasks, never direct edits.

First session on a freshly scaffolded brownfield project: run
`pwsh .agents/scripts/validate-project.ps1` and read
`context/harness-validation-report.md` before reading
`context/brownfield-analysis.md`. The consolidated report is the extraction gate;
the analysis file explains what the wizard detected and which scaffold files were
skipped because they already existed.
