## Phase 9 live pilot — reuse a validated source report

Base: main at 4fb6f0b908a7354c713131e68d4287e4b2f301b7; base CI succeeded.

### Change

Extract a private summary helper and reuse the source report already validated
inside assessProposal. Public analyzeHistory still validates its inputs. No cache,
weakened evaluator, new dependency or automatic Harness mutation.

### Evidence and human decisions

Five actual runs per profile, alternating order, 30 equivalent assessments per run.
Mean batch latency including startup: 900.2 ms baseline versus 858.6 ms candidate
(41.6 ms / approximately 4.62% lower). All ten batches passed with identical output.
These are descriptive local observations, not general performance guarantees.
Costs and human intervention counts are unknown.

The user explicitly approved reuse-validated-source-report and subsequently
authorized this draft PR publication. The hash-linked journal preserves the exact
proposal/evidence approval. Local actor records are not cryptographic signatures.

### Validation / scope

27 proposal tests and 27 candidate regression tests; benchmark evidence replay;
TypeScript build and exact candidate/source comparison. CI now also exercises the
pilot verification. Prior infrastructure is already on main and is not republished
as part of this diff. Pilot artifacts contain reviewed structured evidence only.

### Rollback and gate

Revert the helper extraction to restore the original comparison call. Approval and
PR creation are separate from adoption: this PR stays draft, with no merge or
deployment. Phase 9 closes to the draft-PR boundary only after remote verification.
