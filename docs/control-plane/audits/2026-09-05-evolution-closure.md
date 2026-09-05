# Evolution closure — cross-phase audit and joint regression

Date: 2026-09-05. Scope: audit and validate the current local tree and close the O5
SpecControl pilot; inspect Bloom PR #1 read-only. No PR mutation, merge, automatic
adoption, pipeline activation, real deployment, or SPECDDSTARTERKIT commit/push.

The user confirmed that project/company/infrastructure-specific SpecDeploy work is
future scope. Existing portable contracts, wizard templates and the accepted local
rehearsal are preserved; this audit does not resume deployment development.

## Evidence basis and architectural alignment

Compared root `SpecDD Platform Evolution — Agentic Control Plane Roadmap.md`, the
phase tracker/evidence, package contracts/entry points, fixed host scripts, npm
workspace scripts and CI jobs. Acceptance is scoped, not a statement that every
aspirational capability of an autonomous factory is implemented.

| Phase | Evidence inspected | Implemented/accepted boundary |
|---|---|---|
| 0 | [Baseline](../phases/phase-0-baseline.md), ADRs 0001–0003 | Architecture baseline and Harness compatibility; no runtime claim |
| 1 | `project-model` schemas/types/validator/migration, wizard tests | Portable project definition separate from generation receipt |
| 2 | `capability-model`, SpecForge generation/tests, ADR 0004 | One role per portable pack, compatible generated Harness artifacts |
| 3 | `control-plane-model` schemas/types/validator, ADRs 0005–0006 | Finite declarative DAG; validation is not graph execution or authorization |
| 4 | Warp compiler and [fidelity report](../../../packages/warp-adapter/examples/unsupported-features.md), ADR 0007 | Replaceable optional projection; no hosted Warp execution/enforcement demonstrated |
| 5 | [Real pilot](../phases/phase-5-pilot-001-evidence.md), preparation scripts/tests | Human-operated Issue → Harness/spec/review/eval → draft PR, not a universal scheduler |
| 6 | `eval-adapters` normalization/local host and Phase 6 evidence | Actual bounded local eval plus optional scorer projection; host is not a security sandbox |
| 7 | `run-history` schemas/store/graph binding and Phase 7 evidence | Immutable structured observations; no central observability service or reviewer authentication |
| 8 | `benchmarks` comparator/fixed host, saved plans/datasets | Reproducible eval-node slices; unknown costs/defects/interventions stay unknown |
| 9 | proposal lifecycle, [actual pilot](../../../packages/improvement-proposals/pilot/README.md), journal verification | Qualified specific candidate through human review and draft PR; no automatic adoption |
| 10 | [Explicit acceptance](../phases/phase-10-acceptance.md), fixed B1/B2 hosts | Actual local approval/promotion/post-deploy; cloud execution explicitly outside accepted scope |
| O0–O5 | [Bloom pilot and operational evidence](../phases/local-operation-o5-bloom-baseline.md), SpecControl journal/tests | One local operator and registered project through exact approvals, isolated implementation/review/checks, fail-closed recovery and one real draft PR; no merge/deploy/general scheduler |

Core contracts retain vendor-neutral ownership. Runtime-specific settings remain
in adapters; no Warp account is required for the validated local path. Portable
policy/retry/approval declarations must not be marketed as universal enforcement.
The generic graph is not a complete runtime: only the fixed documented hosts execute.

## Findings and disposition

1. **Outdated continuity instruction — corrected.** Implementation status still
   requested verifying Phase 9 before starting Phase 10. Updated to the completed
   local Phase 10 boundary and the remaining closure/release steps.
2. **Stale Phase 9 CI instruction — corrected.** Phase 9 evidence still said its
   final CI needed verification. Reconfirmed final remote checks and documented
   that they cover that PR head, not unpublished Phase 10 changes.
3. **Ambiguous proposal-example entry point — clarified.** Package README now
   distinguishes the intentionally unqualified retrospective serial-profile example
   from the actual approved candidate pilot. Their different results are not drift.
4. **Per-increment regression evidence — consolidated below.** Historical
   test counts and statements such as “next phase not started” remain historical
   evidence, not the current tracker. Do not rewrite old receipts or benchmark data.
5. **SpecControl publication gap — closed at the authorized draft-PR boundary.** O5
   published the exact two-file Bloom change from a private clone after approval and
   recovered a prior uncertain pre-head attempt without replaying it.
6. **External application CI — disclosed, not waived.** Bloom's 66 domain tests pass,
   but its backend job fails 18 integration tests with `401 Unauthorized`. The same
   failure class is present on base `master@60558d8`; the pilot proves faithful
   publication, not merge readiness of the target application.
7. **Historical Phase 10 status — drift detected.** The immutable local delivery
   run still records its accepted hash, while the current fixture bytes have changed.
   The status command correctly fails closed. O5-D did not rewrite or replay history.

No architecture expansion is required by these findings. This review checks roadmap
alignment and regressions; it is not a penetration test, exhaustive proof of code
correctness, or evidence of deployment capability across arbitrary projects.

## Remote state (read-only observation)

GitHub CLI reconfirmed PR #2 and PR #3 are OPEN/draft against main. PR #3 head is
`debc4447a944796bd2c7a5990912a0a5dd3f20fb`, base
`4fb6f0b908a7354c713131e68d4287e4b2f301b7`. Its CI run
[33965393351](https://github.com/MarcosArielFontenla/specdd-starter-kit/actions/runs/33965393351)
has successful checks. No PR was modified; none was merged. Local HEAD is the same
Phase 9 head plus dirty Phase 10/SpecControl/documentation changes.

Bloom [PR #1](https://github.com/MarcosArielFontenla/bloom-appointments-app/pull/1)
is OPEN/draft against `master@60558d82a52f1e324037fa6e8c2a25295bd6654a`.
Its exact head and branch ref are
`37ac7312eb9c32b046b0c248ed67a9e81989e50a`; it has one commit and only
`PhoneNormalizer.cs` (+3) plus `PhoneNormalizerTests.cs` (+9). Frontend CI passes.
Backend CI fails after all 66 domain tests pass because 18 integration tests receive
401 responses; the base branch's latest run also fails integration authentication
with 401. No remote state was changed during this audit.

## Verification record

Environment: Windows, Node `v24.16.0`, npm `11.0.0`; workspace minimum Node 22.12+.
`npm audit --offline --audit-level=low --json` returned exit 0 and zero cached
advisories across 767 dependency entries. This was deliberately offline, is not a
fresh registry lookup or claim of zero application vulnerabilities, and changed no
dependencies.

| Check executed in this audit | Result |
|---|---|
| `npm run test:unit --workspaces --if-present` | 397 passed, exit 0; includes 46 SpecControl tests |
| `npm run build --workspaces --if-present` | All configured package, portal and three wizard builds passed, exit 0 |
| Browser suites | 12 E2E passed: portal 4, SpecDD 3, SpecForge 2, SpecDeploy 3. The first combined CI-mode attempt found port 4320 occupied and the next workspace did not terminate; it was stopped, its child port closed, and all four suites then passed independently. Platform reused the operator's existing local dev server. |
| `npm run test:phase5` | 1 preparation/collision-safety test passed |
| Phase 9 pilot TypeScript build, `verify.mjs`, candidate regression | Build and journal/source equality pass; `eligibleForReview: true`, `pr-recorded`; 27 regressions passed |
| Phase 10 `rehearse ... status phase10-local-001` | Expected fail-closed result: current fixture differs from retained run; no replay or evidence rewrite |
| `npm audit --offline --audit-level=low --json` | 0 cached advisories, 767 dependency entries; exit 0 |
| Local Markdown link scan | 68 product/control-plane documents and package READMEs, 131 local targets, none missing; fenced examples, anchors and remote URLs excluded |
| `git diff --check` | Exit 0, no whitespace errors; Windows LF→CRLF notices only |

The 28 supplemental tests are reported separately from the 397 workspace tests.
Phase 9 verification replays existing measured evidence, not new timings or human
decisions. Phase 10 verification did not redeploy or request/replay an approval;
its drift failure is the intended integrity behavior.
React/Vite option-deprecation warnings remain non-blocking maintenance items.
This audit ran on Node 24; hosted Node 22 CI for the current uncommitted tree was not run.
All four browser suites ultimately exited normally. No test failure was waived or
suite omitted; the initial orchestration/port conflict is retained above.

Conclusion: SpecControl O5 is accepted for the documented **bounded local** scope
through an exact draft PR. The control-plane regression is green and its recovery,
cancellation and security boundaries are exercised. Bloom is not declared ready to
merge while its pre-existing integration baseline is red, and the historical Phase
10 rehearsal is not declared current after source drift. This is not a production,
cloud, multi-tenant or universal-autonomy certification.

## Remaining closure sequence

The [unified practical usage guide](../../GUIA_DE_USO.md) now includes the complete
opt-in SpecControl path through draft PR. It maps generation, manual approval,
explicit host execution, evals, history and proposal review to actual commands and
limitations. Separately authorize the reviewed SPECDDSTARTERKIT commit/push and any
main integration. Resolve Bloom's integration-test baseline before merging its PR.
Infrastructure-specific deployment,
general scheduler/runtime enforcement, authenticated multi-user approvals and broader
Brownfield stack coverage remain explicit future scope, not hidden completion claims.

Guide-only follow-up (2026-09-05): verified its four public read-only examples against
the current builds: graph `valid: true`; historical eval pass with partial/unknown
workflow coverage; benchmark `complete`; unqualified proposal returns native exit 2,
`eligibleForReview: false`, `draft`. Checked all 9 local guide links, none missing.
No target project was changed, dependency installation performed, or deployment
started to validate this documentation. The full regression above was not rerun
for these documentation-only edits. README, tracker and implementation status now
link the guide; no commit/push/merge was performed.

O5-D follow-up (2026-09-05): the full regression was rerun after SpecControl was
added to the workspaces, producing the 397/28/12 counts above. The Bloom PR and base
CI were observed read-only, failure/recovery/cancellation/security evidence was
contrasted, and README, guide, tracker, implementation status, design/plan and pilot
evidence were synchronized. The final local-link scan and `git diff --check` passed.
No dependency install/update, Bloom/PR mutation, commit, push, merge or deploy occurred.

O5-E release closure (2026-09-05): commit
`49bc05cae91c98d0a730a5220740202ab14e1e6c` published the reviewed 65-file
SpecControl evolution to `main`. Hosted
[CI run 33996093563](https://github.com/MarcosArielFontenla/specdd-starter-kit/actions/runs/33996093563)
passed all jobs, including online dependency audit, package tests/builds, Phase 5,
proposal verification and the 12 browser regressions. GitHub emitted only maintenance
warnings that `actions/checkout@v4` and `actions/setup-node@v4` still target deprecated
Node 20 internals while the runner forces Node 24. Bloom PR #1 was not changed.
