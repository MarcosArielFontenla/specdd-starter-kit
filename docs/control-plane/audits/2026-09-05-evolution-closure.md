# Evolution closure — cross-phase audit and joint regression

Date: 2026-09-05. Scope: audit and validate the current local tree; no publication,
merge, automatic adoption, pipeline activation or real deployment.

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
5. **Publication gap — remains open, not an implementation success claim.** Current
   branch `codex/phase10-specdeploy-design` has uncommitted Phase 10 changes. Local
   closure is not equivalent to a release on main or green hosted CI for those changes.

No architecture expansion is required by these findings. This review checks roadmap
alignment and regressions; it is not a penetration test, exhaustive proof of code
correctness, or evidence of deployment capability across arbitrary projects.

## Remote state (read-only observation)

GitHub CLI reconfirmed PR #2 and PR #3 are OPEN/draft against main. PR #3 head is
`debc4447a944796bd2c7a5990912a0a5dd3f20fb`, base
`4fb6f0b908a7354c713131e68d4287e4b2f301b7`. Its CI run
[33965393351](https://github.com/MarcosArielFontenla/specdd-starter-kit/actions/runs/33965393351)
has successful checks. No PR was modified; none was merged. Local HEAD is the same
Phase 9 head plus dirty Phase 10/documentation changes.

## Verification record

Environment: Windows, Node `v24.16.0`, npm `11.0.0`; workspace minimum Node 22.12+.
An online `npm audit --audit-level=low --json` returned exit 0 and zero reported
vulnerabilities across 765 dependency entries. This is a current advisory lookup,
not a claim of zero application vulnerabilities. No dependency changes were made.

| Check executed in this audit | Result |
|---|---|
| `npm run test:unit --workspaces --if-present` | 351 passed, exit 0 |
| `npm run build --workspaces --if-present` | All configured package, portal and three wizard builds passed, exit 0 |
| `CI=true npm run test -w specdd-platform -w sdd-kit-wizard -w specforge-wizard -w specdeploy-wizard` | 12 E2E passed: portal 4, SpecDD 3, SpecForge 2, SpecDeploy 3; exit 0 |
| `npm run test:phase5` | 1 preparation/collision-safety test passed |
| Phase 9 pilot TypeScript build, `verify.mjs`, candidate regression | Build and journal/source equality pass; `eligibleForReview: true`, `pr-recorded`; 27 regressions passed |
| Phase 10 `promote.mjs status phase10-local-001` | Read-only validation: success, exact original subject/artifact hashes, post-deploy pass, server not running |
| Local Markdown link scan | 52 documents/package READMEs, 98 local targets, none missing (does not validate anchors or remote URLs) |
| `git diff --check` | No whitespace errors; existing Windows line-ending/global-ignore notices are not test failures |

The 28 supplemental tests are reported separately from the 351 workspace tests.
Phase 9 verification replays existing measured evidence, not new timings or human
decisions. Phase 10 verification does not redeploy or request/replay an approval.
React/Vite option-deprecation warnings remain non-blocking maintenance items.
This audit ran on Node 24; hosted Node 22 CI for unpublished Phase 10 remains pending.
Browser execution used elevated local permissions for Windows process teardown;
all four suites exited normally. No test failure was waived or suite omitted.

Conclusion: no unresolved blocker was found for the accepted **local** roadmap
scope in these checks. Documentation findings were corrected. Release readiness
still depends on reviewed publication and hosted CI; the practical usage guide
was completed in the follow-up documented below;
this conclusion is not a production/cloud or universal-autonomy certification.

## Remaining closure sequence

The [unified practical usage guide](../../GUIA_DE_USO.md) is now available. It maps
generation, manual approval, explicit host execution, evals, history and proposal
review to actual commands and limitations. Separately authorize reviewed commits,
publication, hosted CI and main integration. Infrastructure-specific deployment,
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
