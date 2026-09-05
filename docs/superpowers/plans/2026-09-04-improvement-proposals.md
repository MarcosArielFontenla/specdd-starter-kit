# Phase 9 implementation plan

1. DISCOVER: inspect roadmap and canonical benchmark/run-history contracts.
2. MODEL / SPEC: define evidence-bound proposals and explicit human transitions.
3. REVIEW: check unknown evidence, stale decisions, target safety and authority
   boundaries; record ADR 0012. This design review does not approve any proposal.
4. IMPLEMENT: pure proposal/analysis/journal/handoff library, strict schema and
   read-only CLI using existing bounded artifact reader; add workspace and CI job.
5. TEST / VALIDATE: adversarial unit tests, actual Phase 8 replay, workspace tests
   and builds; distinguish simulated lifecycle receipts from live events.
6. DOCUMENT: package usage, evidence, tracker and remaining human validation gate.
