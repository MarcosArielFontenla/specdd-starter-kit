# Spec Converge — align existing code to a spec (brownfield)

Use this workflow when the codebase predates its spec: migrations, legacy adoption,
resumed features, or a fresh harness dropped onto an existing project.

1. Load the spec and its `acceptanceChecks`. ABORT if the spec has no executable
   checks — there is nothing to converge toward; write real checks first (see
   `.agents/workflows/spec-first-feature.md`, stages 1–3).
2. Run `pwsh .agents/scripts/validate-spec.ps1 -Run -SpecPath [spec]`.
   Failing checks = the measurable delta between the codebase and the spec.
3. Audit the codebase against the spec's requirements for gaps no check covers yet.
   Propose new acceptanceChecks for those gaps — the human approves them; they amend
   the spec.
4. APPEND the remaining work to the feature's tasks file
   (`.agents/specs/tasks/[feature-slug].tasks.md`, create it if absent).
   Never rewrite or uncheck completed tasks — converge adds, it does not rewrite
   history.
5. The human reviews the delta before any implementation resumes.

Constraints: converge never touches `designContract.status` · never retro-approves
anything · its output is always tasks, never direct edits.

First session on a freshly scaffolded brownfield project: read
`context/brownfield-analysis.md` for what the wizard detected and which scaffold
files were skipped because they already existed.
