# Phase 10 — SpecDeploy integration design

Status: A1 contracts/compiler and A2 opt-in wizard export implemented locally;
B1 fixed local staging/smoke and B2 exact human approval, local same-artifact promotion
and post-deploy are implemented and observed. Gate C is satisfied by explicit user
acceptance of bounded local scope: Phase 10 is closed locally. Cloud adapters and
real delivery validation are deferred, not implemented or validated; see
`docs/control-plane/phases/phase-10-acceptance.md`.
Date: 2026-09-05. This specification authorizes no remote deployment, PR merge,
credential use or production environment change.

## 1. Entry evidence and discovery

Phase 9 reached the human-reviewed draft-PR boundary in PR #3. Final head
`debc4447a944796bd2c7a5990912a0a5dd3f20fb` passed CI run `33965393351`.
PR #3 remains draft/unmerged. Phase 10 design is on a separate local branch based
on that head; it must not silently enter the Phase 9 PR or assume main contains it.

Inspected sources:

- Root evolution roadmap sections 12 and Phase 10: SpecDeploy owns delivery
  knowledge; SpecControl determines when delivery stages occur.
- `specdeploy-kit/website/src/components/generators.js`: pure template rendering,
  `specdeploy.json` receipt and secret-name-only `.env.example` generation.
- Six provider descriptors plus templates; supported GitHub Actions/Azure Pipelines
  combinations; wizard accepts `prod` or `dev+prod`, not a canonical environment model.
- `approvalGate` emits an environment reference in GitHub templates. This code
  does not provision or verify remote environment approval settings.
- On-prem template builds and pushes an image; that alone is not proof of an
  application deployed to a running server. Existing templates are not a complete
  build → staging → smoke → approval → production → verification graph.
- Canonical graph schema 1.0.0 is a finite declarative DAG. History schema records
  observations and does not enforce runtime permissions or authenticate reviewers.

Baseline check: all 42 existing SpecDeploy unit tests passed unchanged, including
provider/CI/API generation matrix. These validate rendering, not real deployment.

## 2. Ownership and bounded implementation

SpecDeploy owns provider mapping, release strategy, artifact/package preparation,
environment descriptors, smoke/post-deploy checks, rollback instructions and
adapter-specific delivery receipts. SpecControl owns prerequisites, ordering,
approval requirements, bounded retries, stop conditions and observation linkage.

New package: `@specdd/delivery-model`, separate from provider templates.
Reuses canonical graph/eval/history contracts; no Warp fields in core. Browser-safe
definition/validation entry point separated from Node-only execution and hashing.
SpecDeploy generates a draft delivery definition only through explicit opt-in.
Legacy generation without opt-in must retain identical output paths and contents.

First execution adapter: a fixed local static-fixture delivery rehearsal, using
Node and loopback only. It is not a general shell executor, cloud deployment or
Docker requirement. Actual cloud adapters remain unimplemented/unsupported until
separately scoped and authorized. No paid services or Warp account required.

## 3. Versioned contracts

`SpecDDDeliveryDefinition` 1.0.0 must have strict JSON Schema and TypeScript types:

- Identity/version/lifecycle; exact project, graph and provider references.
- Release binding: repository identity, source revision, build artifact digest;
  merged-source evidence distinct from permission to merge a PR.
- Environments with stable IDs, class (`staging`/`production`/`local-rehearsal`),
  adapter reference and destination reference. No credential values.
- Stages: merge gate, build, staging deployment, smoke eval, human promotion gate,
  production deployment and post-deploy eval. Each binds a canonical node and
  explicit input/output artifact contracts. Separate sidecar action bindings carry
  delivery operations, never embedded arbitrary commands in the canonical graph.
- Required approval subject: source revision + artifact digest + destination +
  delivery-definition fingerprint + relevant eval evidence. A boolean is not approval.
- Verification eval refs, finite retry intent and failure/rollback requirements.
- Declared adapter capabilities and unsupported-feature diagnostics.

`SpecDDDeliveryReceipt` 1.0.0 records run/stage/attempt, source release, environment,
input/output hashes, adapter, timestamps, outcome and evidence references. Receipt
origin explicitly distinguishes local observation from imported attestation.
Unknown merge/deploy/health results stay unknown; successful rendering is not delivery.

Validation must reject unknown fields, duplicate IDs, broken refs, stage cycles,
unsafe paths, unsupported operations, mismatched release/environment identities,
production routes bypassing approval and missing required evals. Schemas must not
silently infer staging from the legacy `dev+prod` flag or production permission
from legacy `approvalGate`/wizard acknowledgement.

## 4. Graph and runtime boundary

The compiler produces a draft canonical DAG and sidecar stage bindings. Reuse
approval/eval/artifact nodes where their existing semantics apply; do not fabricate
agent runs for deterministic delivery work. If a required operation cannot be
represented faithfully, fail with an unsupported diagnostic rather than repurpose
a node silently or extend the core schema without a separate reviewed decision.

The bounded local runner accepts only the documented delivery subset and a fixed
allowlisted adapter. It must validate the graph, bindings, release and recorded
state before dispatching any side effect. It cannot claim to execute arbitrary
SpecControl graphs. External imported receipts never trigger dispatch automatically.

Sequence:

1. Verify release/merge evidence; never merge as part of this runner.
2. Build an immutable release once.
3. Materialize that artifact in staging; record what actually ran.
4. Run the required smoke eval against that release/environment.
5. Stop for explicit human approval of the exact promotion subject.
6. Promote the same artifact without rebuilding, only to an authorized destination.
7. Run post-deploy verification. Report failure truthfully; do not reinterpret a
   deployed-but-unhealthy result as either success or an untouched environment.

Retries are bounded and cannot repeat a successful side effect on replay. Resume
must reject conflicting or stale stage evidence. Failure stops dependent stages.
Rollback is an explicit separately governed operation, not an unbounded implicit
loop. Cancellation cleans up only resources owned by that run.

## 5. Safe local rehearsal

Use a checked-in static fixture and create-only output directories owned by one run.
Pin fixture bytes, definition, eval and adapter implementation before execution.
Use safe regular-file/path handling and refuse symlinks, traversal and overwrites.
Expose only an ephemeral loopback endpoint, with timeout/output limits and cleanup.
No arbitrary URL fetch, arbitrary project build command, registry push or cloud SDK.

Exercise a real local artifact materialization and HTTP smoke check. Stop at the
human gate; after a specific rehearsal approval, promote the same bytes to a
second **local rehearsal slot**, not a real production environment, and verify.
Label receipts `local-rehearsal`; do not call this a cloud or production deployment.

The local rehearsal may use an explicit fixture-source gate instead of authentic
merged-PR evidence. That mode must be impossible for a production adapter. Missing
real merge evidence from draft PR #3 must never be converted into a merged receipt.

## 6. Compatibility, evidence and acceptance

Implementation acceptance requires:

- Deterministic strict definitions, examples, valid graph projection and diagnostics.
- Existing SpecDeploy generation matrix unchanged when delivery opt-in is absent.
- Supported opt-in outputs contain draft graph/definition and explicit limitations;
  unsupported providers/stages cannot appear ready to execute.
- Unit coverage for gate bypass, missing/failed smoke, stale approval, changed
  artifact/destination, mixed releases, duplicate/replayed receipts, bounded retries,
  malformed inputs, unsafe paths and unsupported adapter dispatch.
- Local positive and negative rehearsal evidence, including failed smoke → no
  promotion and changed artifact → approval invalidated. Synthetic journal tests
  stay clearly separate from actual human decisions and observed local actions.
- Workspace tests/builds, SpecDeploy browser regression, dependency audit and CI.
- Usage/runbook and phase evidence explicitly state which adapters actually execute.

Phase 10 must not be labeled fully complete based only on a generated graph or
local simulation. Separate gates: A contracts/compiler; B actual bounded local
rehearsal; C real staging/production adapter validation, if selected and authorized.
Whether bounded local acceptance closes this phase must be explicitly agreed;
otherwise real delivery validation remains pending, not silently deferred as done.

Gate C resolution (2026-09-05): that explicit agreement was obtained after the
successful local pilot. Local scope closes Phase 10; cloud adapter implementation
and real deployment validation remain future work, not completed capabilities.

## 7. Risks and open authorization

Remote destinations, accounts, protected-environment settings, credentials, production
scope and deployment cost have not been selected or authorized. No need for those
choices to implement contracts or local rehearsal, but they are mandatory before
any real deployment. Provider templates with legacy runtime/action versions need
a separate compatibility review before enabling execution; do not blindly activate
generated pipelines as the new controlled-delivery path.

No publication, merge of PR #3, deployment, secret configuration or cloud resource
creation is included in this specification turn.
