# Agentic Control Plane — Delivery Tracker

Status date: 2026-09-06

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
| 9 — Improvement proposals | Complete — human-reviewed draft PR #3; no adoption | Canonical benchmark and run-history evidence available | [Phase 9 evidence](phases/phase-9-improvement-proposals.md): qualified pilot, explicit human approval, exact candidate applied locally, 27 proposal and 21 benchmark tests; no silent Harness mutation |
| 10 — SpecDeploy integration | Complete — explicit bounded local acceptance | Phase 9 final PR CI succeeded | [Acceptance decision](phases/phase-10-acceptance.md), [A1](phases/phase-10-delivery-contracts.md), [A2](phases/phase-10-wizard-export.md), [B1](phases/phase-10-local-rehearsal.md), [B2](phases/phase-10-local-promotion.md): actual approved local promotion/post-deploy; cloud adapters explicitly deferred, not implemented or validated |

## Current gate

Phases 0–10 have scoped acceptance. The post-roadmap SpecControl track O0–O5 also
has bounded local acceptance after the
[O5-D closure audit and regression](audits/2026-09-05-evolution-closure.md).
The [unified practical guide](../GUIA_DE_USO.md) describes the operated path;
O5-E published the accepted implementation to `main` at
`49bc05cae91c98d0a730a5220740202ab14e1e6c`, and hosted
[CI run 33996093563](https://github.com/MarcosArielFontenla/specdd-starter-kit/actions/runs/33996093563)
passed every job. Merge of the separate Bloom pilot and deployment remain outside
this acceptance.
Project/company-specific SpecDeploy execution remains future work, not a condition
for this local architectural closure. Existing contracts/fixtures remain preserved.

The post-closure [Brownfield C4 acceptance](audits/2026-09-06-brownfield-c4-acceptance.md)
also exercised a fresh Level 2 scaffold from published `main` on a real
Angular/.NET/PostgreSQL repository. Exact-byte fingerprint parity removed false
CRLF/BOM drift; nine contract approvals and a separately approved two-file source
rebaseline then produced `extractionStatus: VERIFIED` and
`projectReadinessStatus: VERIFIED`. This is bounded Windows-hosted evidence, not a
universal semantic-analysis or arbitrary-stack certification.

The post-roadmap local-operation track has O0–O5 complete with an external pilot.
[O4-C1](phases/local-operation-o4-github-adapter.md) validates the GitHub draft-PR
adapter and reconciliation entirely offline through injected boundaries.
[O4-C2-A](phases/local-operation-o4-github-runtime.md) adds the bounded process and
Git preparation runtime, first validated offline and then exercised under explicit
authorization in O5. The live CLI, credential, push and draft-PR effect were never
enabled by default.

The [O4-C2-B1 read-only preflight](phases/local-operation-o4-github-preflight.md)
confirmed access, base SHA and an empty SpecControl branch/PR namespace on the
authorized Bloom repository. The later O5 run and exact publication approval were
new artifacts; the preflight itself granted no write authority.

[O5-A](phases/local-operation-o5-bloom-baseline.md) cloned the authorized repository
at that exact SHA and completed a read-only baseline. It proposes one two-file,
domain-only phone-normalization validation change. Dependency restore, baseline
tests, the O2/O3 run and every publication effect remain unapproved. O5-B1 then
received exact approval: the scoped restore succeeded and all 63 domain tests passed;
the O2 Planner then produced artifact
`a8c209af29e574886addcfe80c0cd7eb48b6dfa7258b4069735a3668897da9f8`
and stopped persistently at `awaiting-approval`. O3 and every publication effect
remain gated. O5-B3-A then removed generated `bin` directories from isolated source
snapshots while preserving .NET `obj` restore metadata. The full 40-test SpecControl
suite passed, and a real temporary Bloom snapshot stayed within its configured limit
and passed all 63 domain tests with `--no-restore`. O5-B3-B approved the exact plan,
produced the expected two-file diff and passed independent review, then stopped its
first attempt at `needs-attention`: the structured check's minimal environment lacks
the Windows profile-location variables required by .NET/NuGet. The failure reproduces
as `NETSDK1060`; the same isolated change passes 66/66 with that location family
present. O5-B3-C1 then added that bounded, platform-specific profile-location family
to structured checks. Its child-process boundary regression and all 41 SpecControl
tests pass; the compiled runner also passes the real isolated Bloom check. No retry
or promotion had occurred at that point. O5-B3-C2 then explicitly archived the
failed first attempt and completed attempt 2 from a fresh workspace: exact two-file
diff, independent review pass, structured domain check pass (66/66) and final
evidence `a0d807d996c4eae01e9b3a7cc9d7a4c8c97ae24abacf452aafe6a921634b973d`.
O5-C1 then prepared the exact O4-A publication subject
`5e6552e53d179f13d0d8cd3c6fc050935d54ec608bdd5a1aff6cf19a01e81593`
against clean Bloom `master` at the original revision. It is persistently paused at
`awaiting-approval` with the publisher disabled. O5-C2 then revalidated the exact
source and evidence and persisted approval of that subject while the publisher was
still disabled. All remote-effect fields remain empty; source promotion and GitHub
publication remained separately gated. O5-C3 enabled the publisher for one approved
operation, which stopped before preparing a head because the deep private checkout
did not enable Git for Windows long paths. Exact read-only GitHub observations prove
that neither the branch nor a PR exists. The journal remains `needs-attention`; a
local long-path fix and fail-closed pre-head reconciliation are required before an
explicit retry. O5-C3-R1 implemented both gaps offline: clone-local long-path support
and pre-head reconciliation that restores approval only for an exactly empty remote
state. All 46 SpecControl tests pass; the real journal and failed workspace remain
untouched pending separate reconciliation authority. O5-C3-R2 then performed that
exact read-only reconciliation against GitHub, observed neither branch nor PR, and
returned the publication to `approved` at version 5. No new publication operation
was started in that gate; the failed workspace remains preserved. O5-C3-R3 then
completed the explicitly authorized retry, producing exact commit
`37ac7312eb9c32b046b0c248ed67a9e81989e50a` and verified open draft
[Bloom PR #1](https://github.com/MarcosArielFontenla/bloom-appointments-app/pull/1).
The PR contains only the two approved files; no merge or deployment occurred.
O5-D reconfirmed the PR base/head/commit and file set. Its domain suite is 66/66,
while GitHub's broader backend check is red because 18 integration tests return the
same `401 Unauthorized` pattern already present on Bloom's base commit. The frontend
check passes. This is accepted evidence of faithful control-plane publication, not
a claim that the external application is merge-ready. The 397-test monorepo suite,
all builds and 12 browser E2E passed; recovery, cancellation and security boundaries
remain covered by the 46 SpecControl regressions and the preserved real journals.

Phase 9 reached its real human-reviewed draft-PR boundary with
[PR #3](https://github.com/MarcosArielFontenla/specdd-starter-kit/pull/3).
The user approved the exact proposal and separately authorized publication.
The hash-linked journal records the verified OPEN/draft PR; no merge or adoption.
Base and final PR CI succeeded (run `33965393351`, head `debc4447a944796bd2c7a5990912a0a5dd3f20fb`).
Phase 10 A1 contracts/graph generation and A2 opt-in SpecDeploy export are implemented
on a separate local branch. B1 adds bounded local staging and smoke to an approval
pause. B2 consumed the user's specific approval and successfully promoted those
same bytes to the second local slot, with real HTTP post-deploy verification.
Gate C is now satisfied by the user's explicit [local scope acceptance](phases/phase-10-acceptance.md).
Phase 10 is closed with that bounded scope. Cloud adapters and real delivery remain
future work, not validated capabilities. Publication/hosted CI and any real deployment
require separate follow-up; this acceptance does not authorize them.
The pilot remains on its separate branch; main retains the consolidated baseline.
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
