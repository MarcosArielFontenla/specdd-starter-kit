# Phase 7 — Run history and observability

Date: 2026-09-04 local (observed event timestamps are September 5 UTC)
Status: complete — structured artifacts and local acceptance validated

## Entry and method

Phase 6's local eval/result contracts were accepted and its dependency findings
remediated before this phase. The user authorized Phase 7. Discovery compared the
roadmap with existing Harness EVENTS.md, canonical graphs, eval adapters, pilot
evidence, workspace packages and tests. The design and its fidelity/security review
preceded implementation:

- [Specification](../../superpowers/specs/2026-09-04-run-history-design.md)
- [Plan](../../superpowers/plans/2026-09-04-run-history.md)
- [ADR-0010](../adrs/0010-immutable-run-observation-artifacts.md)

## Delivered

- `@specdd/run-history`: versioned JSON Schema 2020-12 and discriminated TypeScript
  events, reusing the published canonical EvalResult schema rather than duplicating it.
- Workflow, node, role, capability, runtime/model/harness, input and definition-hash
  identity; workflow and operation timestamps, statuses, artifact fingerprints,
  evals, observed human approval decisions and failures/retries.
- Strict validation for malformed/nested unknown fields, duplicate events, chronology,
  operation identity, run/input/eval matching and exact graph references.
- Pure summaries with explicit coverage gaps and null duration for missing pairs.
  `reportedStatus` is a source assertion; no implied graph-gate enforcement.
- Explicit Phase 6 result adapter for local and externally imported runtime evals.
  No native provider response shape is assumed and no live Warp claim is made.
- Bounded create-only local JSONL exports, no-replace atomic publication, read/list
  API, read-only CLI, path/junction checks and ignored private storage.
- Approved-local-test host recording a real eval slice through the existing Phase 6
  wrapper, with preflight graph checks, duplicate refusal and read-back validation.
- CI workspace job and documented usage, storage/retention and trust limits.

## Real local acceptance

Run: `phase7-local-001`. The approved documentation conformance test was re-executed
from the clean isolated worktree at commit
`c48f8736c796736bdb7442f89f917186669b87d8`.

- Canonical workflow/graph: `issue-to-draft-pr` / `issue-to-draft-pr-graph`.
- Node: `run-canonical-eval`, bound to `implementation-quality`.
- Control definition: retained `.phase5/pilot-001/control/definition.json`;
  sorted-key fingerprint `ed5ef387b4ecd91248c4897a71e58f7cabaadfd0b9320346a5b3f7865950afa6`.
  This algorithm differs from the historical raw-file hash; neither is substituted
  for or written over the older evidence.
- Runtime: `node-test`; agent, model and harness consumption unknown/null.
- Eval observed start `2026-09-05T01:05:45.373Z`, completion `2026-09-05T01:05:45.832Z`.
- Eval outcome: pass, score 1, duration 459 ms (including wrapper startup).
- Output observation: SHA-256
  `12cf004265fc0037538723b3efdff868092793ede2a1b188668ef297c925fa82`, 1206 bytes;
  raw output not stored in run events.
- Export written and read back from `.specdd-runs/run-phase7-local-001.jsonl`.
- Reviewed portable copy: `packages/run-history/examples/run-phase7-local-001.jsonl`.

Workflow coverage is deliberately **partial** and reported workflow status **unknown**:
this execution observed only the eval, not a new whole Issue → PR workflow. No new
approval, agent consumption, exact historical action times or baseline was invented.
The complete workflow/retry/approval trace in tests is explicitly synthetic test data.

## Verification

- Workspace unit suite: 225 passed (199 existing + 26 run-history tests), exit 0.
- Phase 5 preparation regression: 1 passed, exit 0.
- `npm audit --json`: 0 findings at verification time, including dev dependencies.
- Checked-in example: read-only CLI inspection passed; live private file is ignored.
- All workspace library/application builds passed, exit 0. Existing upstream
  React/Vite deprecation and chunk-size warnings remain nonblocking.
- All 11 browser tests passed (4 portal, 3 SpecDD, 2 SpecForge, 2 SpecDeploy), exit 0,
  with `CI=true` and fresh Playwright-owned servers. Windows process permissions
  were explicitly elevated for browser startup/cleanup.
- Final focused run-history suite: 26 passed after all implementation edits.
- CI YAML parsed; run-history job present. `git diff --check` passed.

Hosted CI is configured but has not run for these uncommitted workspace changes.

## Exit boundaries and deferred work

No existing Harness v1 telemetry contract, generated baseline, wizards, isolated
pilot artifacts or draft PR #2 was modified by Phase 7. No merge or deployment.
The storage directory must be trusted: symlink checks do not provide a hostile
multi-user filesystem sandbox or authenticated evidence. Imported identifiers still
need privacy review. Local hard-link support is required for atomic publication.

One immutable export per run; partial exports cannot later be extended. Retention
is a human archive/delete decision, not automatic pruning. Native provider collectors,
streaming, database/dashboard, authentication, benchmarking and improvement loops
are deferred. Phase 8 may consume the resulting artifacts, but must not treat
partial coverage or this documentation eval as a general agent-quality benchmark.

Exit decision: the bounded Phase 7 acceptance criteria are satisfied. Phase 8 is
ready for specification, not implemented by this work.
