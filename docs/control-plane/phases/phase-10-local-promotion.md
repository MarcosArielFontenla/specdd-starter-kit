# Phase 10 B2 — exact local approval, promotion and post-deploy

Date: 2026-09-05. Scope: complete the fixed local rehearsal only, not cloud delivery,
Git publication or PR merge. The B2 execution approval was separate from the later
[explicit Phase 10 local acceptance](phase-10-acceptance.md), which now closes gate C.

The user answered `si aprobado` to the explicit request to implement and promote
the same `phase10-local-001` artifact into a second exclusively local slot and run
post-deploy verification. This authorizes B2, not a different artifact/destination.

## Continuation design

B1's implementation and evidence are pinned by the approved subject. B2 therefore
adds `scripts/promotion.mjs` and `scripts/promote.mjs` without modifying B1's pinned
files. It records its own implementation hashes before dispatch. The original
definition, projection, pause, build, staging bytes and historical JSONL stay intact.

Logical destination `slot-b` maps to the run-owned physical path
`promotion/slot-b/index.html`. This nested continuation keeps B1's pause inspectable
without removing or hiding a slot to circumvent its checks. B1 `status` is a
historical pause view; B2 `status` is the continuation's authoritative observation.
The original `approvalGranted: false` and `promotionEnabled: false` are historical
B1 outputs, not mutated into a grant. The new decision and history record the grant.

Before any promotion output, the runner validates the exact decision, successful B1
evidence, current artifact and code pins, fixture-only source, local adapter and two
local destinations. It exclusively creates `promotion/`: existing, partial and
concurrent invocations cannot replay effects. It revalidates B1 before dispatch,
copies the build's exact bytes without rebuilding, and performs a real bounded
HTTP/hash check using B1's loopback probe. The server closes after the check.

Canonical receipts cover `approve-promotion`, `deploy-production` and `post-deploy`.
The canonical stage name `deploy-production` still refers to **local-rehearsal**,
never a production deployment. The continued canonical JSONL includes the original
events followed by one approval grant, materialization, eval and workflow completion.
Each write is create-only; no B1 history is overwritten or appended in place.

Unhealthy post-deploy reports `deployed-unhealthy`, preserves the copied artifact
and reports failed workflow, rather than claiming nothing deployed. Other interrupted
states retain failure evidence and distinguish pre-materialization failure from
partial/unverified materialization. There is no automatic retry, rebuild, rollback
or deletion. A second `start` never repairs or reruns an existing continuation.

## Operator record and commands

After a real human decision, the trusted operator records `approval.json` in the
run root. Strict fields: kind `SpecDDLocalPromotionDecision`, schemaVersion `1.0.0`,
runId, decision `approved`, exact subject/artifact hashes, destinationRef `slot-b`,
environmentClass `local-rehearsal`, actorRef, recordedAt, origin
`operator-recorded-human-decision`, and the message. Missing/extra fields, rejected
decisions, mismatched identity/destination, dates before the pause or future dates fail.
`recordedAt` is the operator's recording time, not a fabricated message timestamp.

From repository root:

```powershell
node packages/delivery-model/scripts/promote.mjs start phase10-local-001
node packages/delivery-model/scripts/promote.mjs status phase10-local-001
```

No approval boolean, arbitrary destination, command, URL or cloud provider is accepted
on the command line. The decision is copied create-only into `promotion/decision.json`.
After execution, use only `status`; never repeat `start` to retry or repair this run.

The approval JSON is an operator's record of the human decision, **not cryptographic
reviewer authentication**. Anyone controlling the trusted checkout could forge such
a record or rewrite a whole hash journal. This is not a multi-user authorization
service or hostile-filesystem sandbox. Imported telemetry never triggers execution.

## Validation scope

21 new B2 tests use clearly labeled synthetic decisions in isolated temporary runs,
not the real user's approval. They exercise real same-byte copying and HTTP, missing/
rejected/stale/wrong-scope decisions, changed artifacts, exclusive concurrent dispatch,
successful/partial replay rejection, linked paths, result drift, and post-deploy
infrastructure failure. The last failure is synthetic and must not be described as
a real production outage. The actual authorized pilot is recorded separately below.

Gate C was subsequently closed by explicit acceptance of this bounded local scope.
Cloud adapters and real delivery remain deferred future work, not validated here.
Warp remains optional; this flow requires no credits, cloud credentials or paid plan.

## Observed result — B2 completed locally

Actual run: `phase10-local-001`, continuing the previously reviewed B1 subject.
The user decision was recorded at `2026-09-05T13:42:48.000Z`; acceptance was observed
at `2026-09-05T13:47:00.717Z`. Post-deploy completed at `2026-09-05T13:47:00.781Z`:
HTTP 200, 180 bytes, exact artifact digest, closed server. The 13-event continued
history ends in `workflow.completed` / `success` at `2026-09-05T13:47:00.791Z`.

- Artifact SHA-256: `a1300429b1b202fd736e915588e4f3ebfd30afe33dcc62e1e9bdfc154b81a7cb`.
- Approved subject SHA-256: `470245a25ee3d516b60043cf2a706c3d87c34961601d7b5d2ddb8bc6cd418add`.
- Local destination: `.specdd-delivery/phase10-local-001/promotion/slot-b/index.html`.
- Full history: `.specdd-delivery/phase10-local-001/promotion/history/run-phase10-local-001.jsonl`.
- Completion index: `.specdd-delivery/phase10-local-001/promotion/completed.json`.
- State: `success`, `postDeploy: pass`, `serverRunning: false`.

Both original B1 pins and new B2 evidence/code hashes validate. No rebuild, B1
overwrite, remote deployment, merge, commit or push was performed for this run.
Raw records stay ignored locally; this document retains the reviewed non-secret facts.

Verification this increment: full workspace unit command exited 0, **351 tests**,
including 62 Delivery Model tests (24 contracts, 17 B1 and 21 B2). Its prerequisite
TypeScript package builds also passed. Full portal/wizard builds and browser suites
were not rerun in B2: their B1 evidence remains applicable to unchanged UI code,
not newly claimed executions. No external dependencies or CI workflow changes were
needed; the existing Delivery Model CI test glob includes B2. Hosted CI remains
pending publication, which this approval did not authorize.
