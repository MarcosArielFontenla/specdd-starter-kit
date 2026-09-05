# Phase 9 pilot-001 — review package

Status: **pr-recorded**. Published as [draft PR #3](https://github.com/MarcosArielFontenla/specdd-starter-kit/pull/3)
on `codex/phase9-proposal-pilot`, against main. Not merged, deployed or adopted.

The initial experiment authorization was separate from the subsequent explicit
user message, "si aprobada la propuesta". The latter is recorded as approval of
this exact proposal/evidence, not authorization to publish, merge or deploy.

## Candidate

Production target: `packages/improvement-proposals/src/index.ts`, now matches the approved candidate.
Extract a private `summarizeValidatedReport` helper and reuse the source report
already validated inside `assessProposal`. Public `analyzeHistory` still calls the
canonical comparator. No validation removal, persistent cache or dependency change.
`source/index.ts` is the isolated TypeScript candidate; its schema import is relocated
for this directory only. That import relocation is not part of the proposed change.
`baseline/index.js` and `candidate/index.js` are measured JavaScript snapshots.

## Actual measurements

Acceptance fixed in the pilot plan before execution: 5 repetitions/profile,
alternating order, no warmup, same 30-assessment equivalence batch; at least 1 ms
mean improvement, all passing and no output changes.

| Metric | Baseline | Candidate |
|---|---:|---:|
| Mean batch latency including process startup | 900.2 ms | 858.6 ms |
| Median | 896 ms | 859 ms |
| Range | 892–912 ms | 841–871 ms |
| Passing batches | 5/5 | 5/5 |
| Observed retries / errors | 0 / 0 | 0 / 0 |

Observed mean reduction: 41.6 ms, approximately 4.62%. Descriptive local evidence,
not statistical significance or general Harness speedup. Cost, interventions and
defect rate are unknown. The worker compares every output to the actual baseline
and verifies no input mutation. Original immutable run exports remain under
`.specdd-benchmarks/phase9-pilot-001/`; portable datasets embed the same events here.
The proposal binds this experiment's source and candidate evidence; the problem
itself was identified by static code inspection, not a fabricated failed run.

Additional checks: all 27 existing proposal tests passed against the candidate;
its TypeScript build passed; compiled output equals the measured candidate exactly
after newline normalization. Canonical report replay and review journal validated.
After approval: production package rebuilt successfully; 27 proposal tests and 21
benchmark tests passed. The first combined root-directory invocation failed two
benchmark CLI tests due to their working-directory assumption; rerunning from the
benchmark package passed all 21 without code changes. No new global browser run,
whole-workspace build or dependency audit is claimed for this helper extraction.

## Verify without rerunning measurements

From repository root, with current workspace dependencies/builds available:

```powershell
node node_modules/typescript/bin/tsc -p packages/improvement-proposals/pilot/tsconfig.json
npm run build -w @specdd/improvement-proposals --ignore-scripts
node packages/improvement-proposals/pilot/verify.mjs
node --test packages/improvement-proposals/pilot/candidate-regression.test.mjs
```

Expected: `eligibleForReview: true`, state `pr-recorded`, 27 tests passing.
Verification now checks production source/build equality with the approved measured
candidate. The old preimage was verified before editing. `pr-handoff.json` was
prepared at that point and is historical metadata: its `applied: false` field
describes the handoff operation, not the current locally edited source.
The regression suite is a snapshot adapted to import the isolated candidate; its
CLI-specific test intentionally still exercises the production read-only CLI.

Optional new measurement: `node packages/improvement-proposals/pilot/run.mjs
.specdd-benchmarks/phase9-pilot-002`. Must use a new output directory. New evidence
does not inherit this proposal's review automatically.

## Human decision / remaining work

The user separately authorized the ordered PR publication workflow. GitHub CLI
verified PR #3 is OPEN and draft, with no merged timestamp. Initial head:
`7f9ceddbbdd9db6b4acd2282e4b5c4b64f753be1`. The journal records that observation.
The evidence and approval hashes are unchanged. This repo
now has its infrastructure base published to `main` at
`4fb6f0b908a7354c713131e68d4287e4b2f301b7` (2026-09-05). The pilot was deliberately
excluded from that consolidation and is now in its own authorized PR.
Base CI succeeded; PR CI independently validates the pilot, including the journal
and compiled-candidate equivalence. No changes to PR #2, merge or deployment.
Phase 9 closes at the reviewed draft-PR boundary after CI verification, not adoption.
