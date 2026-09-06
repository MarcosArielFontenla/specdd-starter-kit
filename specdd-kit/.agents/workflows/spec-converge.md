# Spec Converge — align existing code to a spec (brownfield)

Use this workflow when the codebase predates its spec: migrations, legacy adoption,
resumed features, or a fresh harness dropped onto an existing project.

1. Load `.agents/specs/tasks/brownfield-convergence.tasks.md` when present, then load
   the target spec and its `acceptanceChecks`.
2. If specs are still placeholders, inspect their referenced production code, tests,
   routes and repository checks. Write one JSON candidate per entity under
   `.agents/evidence/entity-contracts/candidates/`; each candidate must name the exact
   target spec, repository evidence, requirements, and executable acceptance checks
   (or a reasoned waiver). Candidates are evidence, not approvals; the human identity
   and approval date are added only by the exact apply operation. Start from
   `templates/brownfield/entity-contract-candidate.json` and replace every marker;
   unresolved template, TODO or clarification markers are rejected.
3. Create one exact proposal for the selected candidates and STOP for human approval:

   ```powershell
   pwsh .agents/scripts/converge-contracts.ps1 -Mode propose -CandidatePaths @(
     '.agents/evidence/entity-contracts/candidates/customer.json',
     '.agents/evidence/entity-contracts/candidates/appointment.json'
   )
   ```

   The human approves the printed subject SHA-256. Apply that exact subject separately:

   ```powershell
   pwsh .agents/scripts/converge-contracts.ps1 -Mode apply `
     -SubjectSha256 <approved-hash> -ReviewedBy '<human identity>'
   ```

   Apply fails closed on candidate, target or canonical-definition drift; it changes
   only the authorized entity specs and their matching statuses in
   `context/project-definition.json`, then writes an auditable receipt.
4. Once the contracts are approved, run
   `pwsh .agents/scripts/validate-spec.ps1 -Run -SpecPath [spec]`.
   Failing checks = the measurable delta between the codebase and the spec.
5. Audit the codebase against the spec's requirements for gaps no check covers yet.
   Propose new acceptanceChecks for those gaps — the human approves them; they amend
   the spec.
6. APPEND the remaining work to the feature's tasks file
   (`.agents/specs/tasks/[feature-slug].tasks.md`, create it if absent).
   Never rewrite or uncheck completed tasks — converge adds, it does not rewrite
   history.
7. The human reviews the delta before any implementation resumes.
8. If an approved implementation changes files recorded in the Brownfield content
   baseline, run `.agents/scripts/rebaseline-source.ps1 -Mode propose` with the exact
   changed paths. Stop and obtain approval for the printed subject SHA-256. Apply only
   that exact hash; never edit baseline fingerprints manually. Added, removed or
   unlisted changed paths require a new proposal or a fresh ingestion.

Constraints: never edit `designContract.status` or canonical spec status directly;
only the exact approved `converge-contracts.ps1 -Mode apply` operation may promote
them together. Never infer or retro-approve a business rule.

First session on a freshly scaffolded brownfield project: run
`pwsh .agents/scripts/validate-project.ps1` and read
`context/harness-validation-report.md` before reading
`context/brownfield-analysis.md`. The consolidated report is the extraction gate;
the analysis file explains what the wizard detected and which scaffold files were
skipped because they already existed.
