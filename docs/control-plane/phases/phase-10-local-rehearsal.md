# Phase 10 B1 — local staging, HTTP smoke and approval pause

Date: 2026-09-05. B1 is a bounded vertical slice, not completion of Phase 10.
Historical B1 evidence below is preserved. The user subsequently approved this exact
subject and [B2 completed local promotion and post-deploy](phase-10-local-promotion.md).
Use B2 `status` for the current continuation; B1's pause files remain immutable.
Gate C was later closed by [explicit local acceptance](phase-10-acceptance.md).
Any pending-acceptance wording below describes the historical B1 boundary only.

User authorized preparing/running this local rehearsal, not approval of its future
artifact, remote delivery, production changes, publication or merge.

## Implemented boundary

`packages/delivery-model/scripts/rehearsal.mjs` accepts only a run directory/ID and
the checked-in static fixture, not wizard provider graphs or arbitrary commands.
It pins fixture bytes, local implementation/contract hashes, lockfile, provider,
definition, projection and canonical evals before running stages. UTF-8 decoding
preserves BOM bytes; malformed encoding, oversized files and linked paths fail.

The fixed sequence is fixture-source verification → create-only build copy →
create-only `slot-a` copy → real ephemeral IPv4 loopback HTTP 200/hash check → pause.
The server is closed before returning. Source revision is the fixture SHA-256,
explicitly **not a merged commit or evidence that PR #3 has been merged**.

Canonical eval results and run history describe deterministic local observations,
not fake agent runs. An infrastructure failure is an eval error, not a passing score.
Stage receipts bind release, delivery fingerprint, adapter, environment and evidence.
The approval request hashes the exact subject produced from successful build/smoke
receipts, including source, artifact, destination, definition and graph fingerprints.

`status` rechecks file/code pins, receipt ordering, exact artifact bytes, evals,
subject and canonical history. Existing/partial runs cannot be restarted or
overwritten. Failed smoke records failure and never creates a promotion request.
Only one attempt is allowed; failure requires a new run, not silent replay.

There is **no promotion command or approval switch in B1**. B2 must implement
specific human-decision ingestion, stale-subject revalidation, create-only same-byte
promotion, replay protection and post-deploy checks. `slot-b` is another local
rehearsal slot, not production. Neither it nor real cloud resources are created here.

## Commands

From repository root, after installing dependencies/building:

```powershell
npm run build -w @specdd/delivery-model
npm run rehearse -w @specdd/delivery-model -- start phase10-local-001
npm run rehearse -w @specdd/delivery-model -- status phase10-local-001
```

Use a new ID for a new execution. `.specdd-delivery/` is ignored; it retains raw
local evidence without publishing it. `paused.json` indexes evidence hashes;
`delivery/approval-request.json` contains the exact review subject. Read-only status
does not grant approval, replay operations or leave a server running.

## Validation

- Workspace unit regression: 329 passed before the final byte-preservation test.
- Final Delivery Model suite: 41 passed (24 contracts + 17 rehearsal), giving 330
  available workspace tests. No full-workspace rerun is claimed for that last test.
- Full workspace builds passed, including portal and all three wizards. Existing
  React/Vite deprecation warnings remain non-blocking.
- SpecDeploy browser suite: 3 passed, exit 0. Windows sandbox restrictions blocked
  automatic Astro teardown; only this test's verified temporary server was terminated
  with elevated process cleanup. Other browser suites were not rerun in B1.
- Offline dependency audit: zero findings in the locally cached advisory data;
  not a freshly fetched online security assessment. No new external dependencies.
- CI's existing Delivery Model unit job includes the new rehearsal test file.
  Hosted CI has not been run for this uncommitted/unpublished increment.

Negative tests include real HTTP digest mismatch and endpoint closure, oversize
files, exact BOM bytes, unsafe IDs, linked output, changed artifacts/definitions/
receipts/evals/request, existing/partial runs, unexpected second-slot materialization,
and absence of promotion CLI options. A **synthetic bind failure** exercises the
complete failure path: failed smoke receipt, error eval, failed canonical history,
no promotion subject. It is labeled synthetic, not a real failed deployment.

## Actual pilot awaiting review

Run `phase10-local-001` was executed locally, separate from synthetic unit runs.
Smoke observed at `2026-09-05T13:19:28.086Z`: HTTP 200, 180 response bytes, exact
artifact digest match, server closed. Source and smoke canonical evals passed.
The fixture was built once and materialized in `slot-a`; `slot-b` does not exist.
History ends with `approval.requested`, not a granted approval or completed workflow.

- Artifact SHA-256: `a1300429b1b202fd736e915588e4f3ebfd30afe33dcc62e1e9bdfc154b81a7cb`.
- Exact review subject SHA-256: `470245a25ee3d516b60043cf2a706c3d87c34961601d7b5d2ddb8bc6cd418add`.
- Proposed destination: `slot-b`, class `local-rehearsal`.
- Local request: `.specdd-delivery/phase10-local-001/delivery/approval-request.json`.
- State: `awaiting-human-approval`; `promotionEnabled: false`.

Do not repeat `start` with this ID. Read it with `status`. No human approval was
inferred from authorization to implement/run the rehearsal. Commit/push, PR state,
cloud accounts and production were not changed.

## Trust and pending acceptance

This assumes a trusted single-user checkout, installed dependencies and filesystem.
Hashes detect drift, not coordinated malicious replacement of an entire journal.
Link checks are not a race-proof multi-user sandbox. Reviewer identity is not signed
or authenticated; no approval has been granted by these scripts. Canonical draft
graphs remain non-executable by default; this is not a generic SpecControl executor.

The specific local promotion and post-deploy evidence remain pending human approval
and B2 implementation. Changed pinned implementation/evidence requires a new review
subject, never silent reuse of stale approval. Gate C still requires explicit
agreement that local acceptance suffices or separately authorized real delivery.
No Warp credits, cloud credentials, Docker, paid provider, PR merge or push required.
