# @specdd/delivery-model

Phase 10 increment A1: delivery contracts and **declarative graph generation**.
No cloud executor, secret handling, merge or pipeline activation. The separate
Node-only B1 script runs a fixed local fixture through staging and the approval pause.
SpecDeploy now optionally exports these drafts in its CI/CD step; with opt-in off,
legacy output is unchanged. Node 22.12+ for development; the default library entry
point also bundles for browsers. Node crypto is isolated behind `./node`.

## Generate and inspect a graph

From repository root after `npm ci`:

```powershell
npm run build -w @specdd/delivery-model
node --input-type=module -e "import fs from 'node:fs'; import {compileDelivery} from '@specdd/delivery-model'; const plan=JSON.parse(fs.readFileSync('packages/delivery-model/examples/local.delivery.json','utf8')); console.log(JSON.stringify(compileDelivery(plan),null,2));"
```

The command prints JSON; it does not create files or execute commands from the
plan. `examples/local.projection.json` is the exact tested output. Fixture hashes
are illustrative placeholders, not a claim of measured source, build or deployment.

The projection contains the complete delivery definition, canonical draft graph,
separate operation bindings, limitations and `executable: false`. Adapter capability
declarations permit projection; they do not prove an adapter exists or can execute.

## Fixed supported graph

Source gate → build receipt → staging receipt → smoke eval → human promotion
approval → production/promotion receipt → post-deploy eval.

Artifact nodes **record evidence**, not deploy actions. Sidecar bindings describe
what a future authorized adapter would do. No fake agent-run nodes are generated.
Canonical schema 1.0.0 requires at least one role, so a delivery-steward role is
declared only as governance context. Eval gates refer to separately supplied eval
definitions; this package does not run or authenticate them.

All gates are required; failed/rejected paths stop, eval retry intent is bounded
1–3 attempts, and side-effect stages have no automatic retry. No custom stage list
or graph edges are accepted, so generated flow cannot omit approval or smoke.
`assertDeliveryProjection` rejects changed graphs, bindings or delivery identity,
even when the altered graph would still satisfy the generic canonical DAG schema.

## Definition contract

`SpecDDDeliveryDefinition` 1.0.0 (`./schema`) requires project/Harness/provider
references, provider hash, release source revision, draft lifecycle, graph ID,
artifact root, adapter operation declarations, ordered environment destinations,
three distinct eval references, bounded retries and rollback instructions.

The two destinations must be staging then production, or two distinct local
rehearsal slots. Fixture-source mode is forbidden outside local rehearsal.
`merged-source` is a required future check, not a statement that a PR was merged.
Unbuilt artifact digest is null, never invented. Paths are portable and reject
traversal, absolute paths, Windows aliases and Git metadata targets.
Legacy `specdeploy.json`, `approvalGate`, `ack` and `dev+prod` are not execution
permission and are not silently converted to this contract.

## Receipts and approval subjects

`SpecDDDeliveryReceipt` 1.0.0 (`./schema/receipt`) records delivery/run/stage identity,
attempt, release artifact, adapter/environment, times, outcome, evidence hash/size
and explicit origin (`local-observation` or `imported-attestation`). Unknown outcomes
cannot claim terminal time or evidence; terminal outcomes require evidence. Successful
build/later observations need an artifact digest. These are observations, not grants.

Default browser-safe exports: `validateDeliveryDefinition`, `assertDeliveryDefinition`,
`validateDeliveryReceipt`, `compileDelivery`, `assertDeliveryProjection`, types and
fixed `STAGES`. Validation diagnostics have stable semantic codes and paths.

Node-only exports from `@specdd/delivery-model/node`:

- `deliveryFingerprint(definition)`: canonical SHA-256 of a validated definition.
- `assertReceiptForDelivery(receipt, definition)`: binds exact definition, release,
  adapter, destination, pinned artifact when present, and stage retry bound.
- `promotionSubject(definition, buildReceipt, smokeReceipt)`: requires successful,
  ordered observations of the same run and artifact. Includes definition/graph,
  source, artifact, destination and both receipt hashes; returns `approvalGranted:
  false`. Changing a receipt or destination changes/invalidates the subject.

These library helpers do not implement journal replay, signed reviewer identity,
smoke verification or a runtime state machine. Even imported success
receipts can only produce an **unauthenticated subject to review**, not permission
to deploy. Approval must be independently obtained and rechecked at dispatch in
the later promotion increment. Rollback remains instructions, not automatic execution.

## Local rehearsal B1: staging through approval pause

After building this workspace, from the repository root:

```powershell
npm run rehearse -w @specdd/delivery-model -- start my-local-pilot
npm run rehearse -w @specdd/delivery-model -- status my-local-pilot
```

`start` creates `.specdd-delivery/my-local-pilot` exclusively. It pins the checked-in
static HTML fixture, local implementation/contract hashes, lockfile, delivery plan
and evals. It copies one immutable build into `slot-a`, serves only that bounded
file on an ephemeral `127.0.0.1` port and checks HTTP 200 plus exact SHA-256. The
server is closed before returning. Canonical evals, receipts and run history record
real observations; no agent runs or merged-PR evidence are invented.

The resulting `paused.json` and `delivery/approval-request.json` identify the exact
artifact, destination `slot-b`, graph, definition and successful build/smoke receipts.
There is **no promote command, approval flag, remote URL or arbitrary build command**.
The second slot is not created by B1. The separate B2 continuation below accepts
an explicitly recorded human decision, promotes the same artifact and verifies it.

`status` is read-only and verifies pins, artifacts, receipts, evals and history.
Re-running `start` never overwrites or resumes any existing run. Failed/partial runs
retain evidence and require a new run ID. Changed artifacts/code invalidate a pause.
No automatic retries, rollback or cleanup of evidence is implemented.

Local hashes detect drift, **not malicious rewrites of the entire journal**. This
assumes a trusted single-user checkout, dependency installation and filesystem;
ancestor link checks are not a hostile multi-user race-proof sandbox. Source revision
is the fixture digest, not a Git merge. The requested destination is another local
rehearsal slot, never production. The wizard exports are not accepted by this runner.

See [B1 evidence and next gate](../../docs/control-plane/phases/phase-10-local-rehearsal.md).

## Local continuation B2: explicit approval through post-deploy

After reviewing the exact B1 subject and obtaining human approval, a trusted
operator records the strict `approval.json` described in the
[B2 runbook](../../docs/control-plane/phases/phase-10-local-promotion.md). Then:

```powershell
node packages/delivery-model/scripts/promote.mjs start my-local-pilot
node packages/delivery-model/scripts/promote.mjs status my-local-pilot
```

The continuation revalidates the exact subject and all B1 pins, claims a new
`promotion/` directory exclusively, and copies the unchanged build into logical
`slot-b`, physically `promotion/slot-b/index.html`. It runs a real loopback HTTP/hash
post-deploy eval and writes canonical receipts plus a complete history under
`promotion/history/`. B1 history and pause remain unchanged; use B2 status for the
current continuation outcome. B1's disabled-promotion fields are historical snapshots.

Only explicitly scoped local decisions are accepted. Rejected/stale/missing decisions
stop before output; repeated/concurrent dispatch cannot duplicate materialization.
Post-deploy failure preserves the bytes and reports `deployed-unhealthy`. Partial
execution requires manual review, never automatic replay or rollback. Operator
records are not authenticated signatures. No cloud adapter or general graph executor
is enabled. Phase 10 is [accepted with bounded local scope](../../docs/control-plane/phases/phase-10-acceptance.md);
cloud adapters remain unimplemented/unvalidated future work.

## Validation

24 contract tests include schema rejection, stable projection, required gates, unsupported
capabilities, release/destination drift, receipt chronology, retry bounds and false
approval fields. The example projection must regenerate exactly. Existing provider
templates, UI and ZIP generation remain untouched. No Warp dependency is introduced.
Another 17 rehearsal tests cover actual HTTP, failure stops, exact bytes, drift,
unsafe paths, immutable run creation, cleanup and the disabled promotion boundary.
21 B2 tests cover explicitly recorded synthetic decisions, local promotion, full
history, post-deploy errors, drift, wrong scope and exclusive/replay-safe dispatch.
