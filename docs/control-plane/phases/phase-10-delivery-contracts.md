# Phase 10 — A1 delivery contracts and graph projection

Date: 2026-09-05. Status: **A1 complete locally**. Phase 10 overall is in progress.
No execution adapter, wizard opt-in, cloud deployment or production acceptance yet.

## Authorized scope and deliverables

User requested contracts and delivery graph generation after reviewing the Phase 10
design. Added `@specdd/delivery-model` with strict versioned definition/receipt
schemas, TypeScript contracts, semantic validation, deterministic canonical graph
projection, sidecar operation bindings, portable examples and Node-only receipt/
promotion-subject identity helpers. Default entry point is browser-bundle compatible.
Added workspace/lockfile wiring and a CI job; no third-party dependency was added.

References: [design](../../superpowers/specs/2026-09-05-specdeploy-integration-design.md),
[plan](../../superpowers/plans/2026-09-05-specdeploy-integration.md),
[ADR 0013](../adrs/0013-specdeploy-delivery-ownership.md),
[package usage](../../../packages/delivery-model/README.md).

## Representation decisions

The first contract intentionally supports only a fixed seven-stage DAG: source
check, build receipt, staging receipt, smoke, human approval, promotion receipt,
post-deploy eval. No caller-controlled stage graph can bypass required gates.
Sidecar data contains delivery operations; canonical artifact nodes record receipts
and do not silently acquire deploy semantics. Required canonical governance role
is declared without any executable agent node or invented agent observation.

The projection embeds the exact source definition. A test caught that a prior
projection could otherwise survive a changed source revision; embedding the source
plus exact regeneration validation now rejects that mismatch. The generic DAG
validator alone is insufficient to enforce this delivery-specific fixed ordering.

Two local rehearsal destinations or ordered staging/production are allowed; fixture
source cannot enter staging/production. A null artifact digest denotes an unbuilt
release. Caller capability declarations never prove runtime support: every projection
is draft and `executable: false`, with an execution-unavailable warning.

Receipt validation binds release, destination, adapter and retry bounds. It is not
a journal, idempotency engine, signature verification or authorization. Promotion
subjects bind definition/graph/source/artifact/destination/build/smoke hashes but
explicitly report `approvalGranted: false`. Provider hashes in examples are labeled
illustrative, not actual build evidence or a real merged-source assertion.

## Local validation evidence

- 24 new delivery tests passed; whole workspace run: **297 unit tests passed**.
- All workspace builds passed, including the new TypeScript package.
- Vite in-memory ES/browser bundle of default entry point passed; checked output
  contains no Node crypto/fs or browser-external placeholders. No bundle was written.
- SpecDeploy browser regression: **2 passed**; existing 42 SpecDeploy unit tests
  passed in the workspace run. Its generator/templates/UI have no changes.
- `npm audit --audit-level=low`: zero findings.
- New CI job wired and YAML parsed locally; no new hosted Phase 10 CI run claimed.
- Tracked-change whitespace check passed; package artifacts are still uncommitted.

The browser and audit commands ran with the permissions needed for child processes
and registry access. No deployment credentials, remote writes, merges or publication.
Existing Vite deprecation/chunk warnings remain non-blocking.

## Remaining phase gates

A2 is now implemented separately: [wizard export evidence](phase-10-wizard-export.md).
Explicit opt-in adds definition/graph exports with legacy-output compatibility and
unsupported-provider warnings; it does not implement a delivery runtime.

B: actual bounded local rehearsal adapter and state machine, fail-closed dispatch,
replay/duplicate protection, actual smoke evidence and specific human approval
before local promotion. Those properties are not proven by A1 contract tests.

C: separately agreed real staging/production adapter and authority, or explicit
agreement on a bounded local acceptance boundary. No complete Phase 10 claim until
the agreed exit evidence exists. PR #3 remains unchanged and unmerged; Phase 10
work remains on its separate local branch.
