# Phase 10 — implementation sequence

Status: steps 1–5 complete locally: A1 contracts/projection and A2 opt-in wizard
export. B1 now implements the staging/smoke/approval-pause slice of steps 6–7.
Evidence: `docs/control-plane/phases/phase-10-delivery-contracts.md`,
`phase-10-wizard-export.md` and `phase-10-local-rehearsal.md` in the same directory.
B2 approval ingestion, local promotion and post-deploy are now implemented and
observed successfully; see `phase-10-local-promotion.md`. Steps 6–8 have local evidence
and CI coverage configured; hosted CI has not run for these unpublished changes.
Gate C is satisfied: the user explicitly accepted the validated local scope and
deferred cloud adapters as future work. Phase 10 is closed with bounded local
acceptance; see `docs/control-plane/phases/phase-10-acceptance.md`. Publication,
hosted CI, merge and real delivery are not implied or newly authorized.

1. DISCOVER / MODEL / SPEC: inventory existing SpecDeploy generation and canonical
   graph boundaries; record ADR 0013 and acceptance gates. Completed as design only.
2. REVIEW: check graph representation, approval identity, provider capability gaps,
   local-vs-real deployment semantics and compatibility before coding.
3. IMPLEMENT A: scaffold browser-safe delivery definitions, strict schema/types,
   semantic validators and examples. Keep execution/hashing Node-only.
4. IMPLEMENT A: compile the delivery subset to canonical graphs plus explicit
   action bindings; reject unsupported capabilities. No generic graph executor.
5. IMPLEMENT A: opt-in SpecDeploy export and clear UI/runbook limitations; preserve
   legacy ZIP bytes without opt-in. Add provider coverage tests, no auto-activation.
6. IMPLEMENT B: fixed local fixture adapter, create-only materialization, bounded
   loopback smoke checks, exact approval binding, replay protection and cleanup.
7. TEST B: adversarial unit tests plus actual staging-slot → smoke → pause evidence.
   Request a specific human rehearsal approval before promotion to the second slot.
8. VALIDATE / DOCUMENT: record real local observations, failures and limits; run
   workspace/build/browser checks and add CI. Do not fabricate merged-source proof.
9. GATE C — completed by explicit local acceptance on 2026-09-05. Cloud adapters
   and real staging/production validation are deferred, unimplemented/unvalidated
   future scope, requiring separate target selection and authorization.

Branch: `codex/phase10-specdeploy-design`, initially based on final Phase 9 PR head
`debc4447a944796bd2c7a5990912a0a5dd3f20fb`. Do not commit/push this design into PR #3.
A1/A2 add one internal workspace and no new external dependencies. B1/B2 executed
local fixture delivery only. No cloud deployment, PR publication, merge or
provider/pipeline activation was performed.
