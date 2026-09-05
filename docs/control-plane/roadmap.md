# Agentic Control Plane — Delivery Tracker

Status date: 2026-09-04

Audit follow-up: [F01–F07 remediation](audits/2026-09-04-remediation.md).

This tracker is subordinate to `SpecDD Platform Evolution — Agentic Control Plane Roadmap.md`. It records evidence and phase gates; it does not replace the roadmap's principles or scope.

| Phase | State | Entry condition | Exit evidence |
|---|---|---|---|
| 0 — Baseline and decisions | **Complete** | Existing platform available for inspection | [Phase 0 baseline](phases/phase-0-baseline.md), 135 unit tests, 11 E2E tests, all package builds passing |
| 1 — Canonical project model | **Complete** | Phase 0 complete | [Phase 1 evidence](phases/phase-1-canonical-project-model.md): versioned model, 3 accepted ADRs, Harness v1 compatibility boundary, examples and tests |
| 2 — SpecForge capability model | **Complete** | Stable project/model identity | [Phase 2 evidence](phases/phase-2-capability-model.md): capability schema, Role Pack migration, routing integration, examples and tests |
| 3 — SpecControl domain model | **Complete** | Stable project and capability contracts | [Phase 3 evidence](phases/phase-3-speccontrol-domain-model.md): portable graph/policy model, artifact and approval contracts, validators and ADRs |
| 4 — Warp adapter | **Complete** | Stable adapter boundary | [Phase 4 evidence](phases/phase-4-warp-adapter.md): generated Warp definition, unsupported-feature report, adapter tests, no Warp fields in canonical core |
| 5 — Minimum viable software factory | Complete — bounded human-operated pilot | Audited canonical contracts and available execution tool | [pilot-001 evidence](phases/phase-5-pilot-001-evidence.md): issue #1, explicit approval, independent review, canonical eval, telemetry and actual draft PR #2; no merge/deployment |
| 6 — Eval runtime adapters | Complete — local acceptance; optional Warp projection only | Phase 5 documentation conformance eval exercised end to end | [Phase 6 evidence](phases/phase-6-eval-runtime-adapters.md): strict contracts, local execution/normalization, hashed evidence, optional scorer compiler, 14 adapter tests; no live Warp claim |
| 7 — Run history and observability | Complete — structured artifacts and local acceptance | Stable graph, run and eval identities | [Phase 7 evidence](phases/phase-7-run-history.md): versioned events, explicit partial coverage, graph-bound eval imports, immutable JSONL history, 26 tests and a real observed eval slice |
| 8 — Benchmarking | Complete — eval-node scope and local acceptance | Phase 7 events and pinned task/eval/configuration identities | [Phase 8 evidence](phases/phase-8-benchmarking.md): strict plans/datasets, explicit metric coverage, deterministic report, 21 tests and six real local runs; unmeasured costs/interventions/defects stay null |
| 9 — Improvement proposals | Implemented — pilot approved and prepared locally; PR pending | Canonical benchmark and run-history evidence available | [Phase 9 evidence](phases/phase-9-improvement-proposals.md): qualified pilot, explicit human approval, exact candidate applied locally, 27 proposal and 21 benchmark tests; no silent Harness mutation |
| 10 — SpecDeploy integration | Blocked by Phase 9 | Controlled development loop proven | Delivery graph integration while SpecDeploy retains delivery knowledge |

## Current gate

The current gate is **Phase 9 live proposal validation**, not Phase 10 implementation.
[Phase 9 infrastructure](phases/phase-9-improvement-proposals.md) passed local
acceptance; its real replay correctly blocks an unsupported serial-runner proposal.
No Phase 9 external PR or adoption is claimed.
Update 2026-09-05: the user explicitly approved the
[pilot-001 review package](../../packages/improvement-proposals/pilot/README.md).
Its qualified candidate is now prepared in local production source and verified
against the measured snapshot. The infrastructure base was published separately
to main at `4fb6f0b908a7354c713131e68d4287e4b2f301b7`; the pilot remains local and
its PR publication still requires separate authorization.
Phase 8 has accepted
[scoped benchmark evidence](phases/phase-8-benchmarking.md): two local Node profiles,
three repetitions each, pinned fixtures and exactly regenerable descriptive results.
This is not evidence of model superiority or a basis for automatic Harness changes.
Warp remains optional and unapplied; missing costs/interventions/defects remain
unknown, and no full-workflow or general skill-quality benchmark is claimed.
The eight dependency audit findings were resolved in the approved
[security maintenance](audits/2026-09-04-dependency-security.md): zero current npm
audit findings, clean install and passing builds/unit/browser tests. The workspace
now requires Node 22.12+. Merge and deployment remain excluded; PR #2 stays draft.

## Standing constraints

- The canonical model is vendor-, model-, and runtime-neutral.
- Warp is the first projection, never the source of truth.
- Existing Harness v1 behavior is a compatibility baseline.
- Human-reviewed Brownfield evidence and collision safety are preserved.
- Generated and user-authored artifact ownership is explicit.
- A phase cannot claim completion without tests and documented validation evidence.
