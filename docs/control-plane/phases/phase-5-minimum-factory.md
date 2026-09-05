# Phase 5 — Minimum viable software factory

Status: complete for the bounded human-operated documentation pilot under ADR-0008
Date: 2026-09-04

## Boundary

Use an available agent execution tool with a human-operated runbook. No Warp account,
custom orchestrator, paid service signup, automatic approval, merge or deployment.
ADR-0008 preserves the real-run acceptance criteria. Preparation tests are not proof
that an agent executed the graph.

## Implemented preparation

`scripts/phase5/prepare.mjs` invokes the actual SpecDD and SpecForge generators. It
creates a fresh, ignored `.phase5/<run-id>` sandbox containing a generated Harness,
BA/Dev/QA Capability Packs, canonical control definition and SHA-256 inventory.
It refuses existing destination directories. It does not execute agents, authorize
Role Pack installation, create review/eval evidence, or contact GitHub.

From the repository root:

```powershell
npm run build --workspaces --if-present
node --test scripts/phase5/prepare.test.mjs
node scripts/phase5/prepare.mjs pilot-001
```

Choose a new run ID for each attempt; do not erase a previous run to make a test pass.
The generated Role Pack installation tasks remain draft and require human review.
The sandbox is not a second Git repository and is never staged wholesale.

## Live run protocol

1. Create/read one actual GitHub issue for the bounded documentation pilot. Record
   its URL, repository and issue number. Do not use a mock issue as live evidence.
2. Planner reads the generated `AGENTS.md`, registry, BA capability, role skill and
   acceptance-criteria playbook. Record the actual reads and artifact hashes using
   the existing telemetry contract (`event`, `ts`, `tool`, plus run/graph IDs).
3. Planner writes the [pilot specification](../specs/phase5-pilot-spec.md). Pause.
   The user must approve that exact scope/version and the draft Role Pack wiring.
   A generic earlier request to implement Phase 5 is not a fabricated approval of
   this new pilot specification. Rejection or requested changes keep development stopped.
4. After approval, prepare an isolated `codex/` pilot branch. Do not stage/publish
   the unrelated, uncommitted architecture changes. Developer consumes the generated
   Dev capability/skills and implements only the approved pilot files.
5. A separately authorized independent reviewer consumes the QA capability/skills,
   checks the actual diff and acceptance criteria, and records findings. The
   implementing agent must not impersonate that reviewer. Stop on blocking findings.
6. Run the pilot's approved deterministic canonical eval against the actual output.
   Capture command, stdout, exit code, input commit/hash, rubric/criteria version,
   timestamp and result. A missing evaluator or empty evaluation is not a pass.
7. Create an actual **draft** PR for only the approved files. Verify its draft state,
   head SHA and issue/spec links through GitHub. Record the returned URL. Never
   substitute a local `draft-pr.json` placeholder for an actual PR.
8. Review the complete evidence chain and only then mark Phase 5 complete. No merge
   or deployment. Phase 6 remains blocked until this review.

## Eval distinction

The generated `run-eval.ps1` analyzes drift from existing score history. On a fresh
run it can legitimately report insufficient history; that is not an executed quality
eval or a pass. Do not invent scores/baselines to satisfy it. The pilot uses explicit,
approved mechanical criteria plus independent review; runtime-specific scorer
translation remains Phase 6. Record any unmeasured qualitative criterion as unmeasured.

## Evidence checklist

- Actual issue and immutable spec version/hash.
- Generated Harness/capability/skill identities and real per-role consumption records.
- Human decision reference, identity and time before implementation starts.
- Branch/base/head identifiers, implementation diff and allowed-file check.
- Independent reviewer identity/session, findings and disposition.
- Canonical eval definition, execution output and result tied to the implementation.
- Existing-format telemetry linked by run ID and graph ID; no secrets/raw credentials.
- Actual draft PR URL and verified state/head.
- Negative checks: missing/rejected approval stops; missing/failed eval stops;
  fabricated fixture runs never count as live acceptance.

Current state: [pilot-001 live evidence](phase-5-pilot-001-evidence.md) accepted after
explicit human approval, independent implementation and evidence-chain review,
executed canonical checks, and verified draft PR #2. This does not certify an
autonomous runtime, remote-container isolation or general skill-quality/drift scores.
No completion is inferred from the preparation manifest alone.
