# Phase 10 and evolution closure — publication scope

The user authorized the next publication step on 2026-09-05. Scope: reviewed commit,
push and a draft pull request, not merge, adoption, pipeline activation or deployment.
This is the publication scope record; the PR and its checks are the authoritative
remote outcome, not an assumption of success made before dispatch.

## Review topology

- Head branch: `codex/phase10-specdeploy-design`.
- Base branch: `codex/phase9-proposal-pilot`, the head of still-draft PR #3.
- Starting commit: `debc4447a944796bd2c7a5990912a0a5dd3f20fb`.
- Main remains separate. The stacked PR excludes Phase 9 changes from its diff.
- CI permits this exact stacked base in addition to main. No automerge is enabled.
- After separate authorization and resolution of PR #3, review/retarget the Phase 10
  PR against main and verify its diff and CI again. Do not merge the stacked PR into
  the pilot branch merely to bypass main review. PR #2 remains untouched.

## Contents and limits

Delivery contracts/compiler, opt-in wizard export, bounded local B1/B2 rehearsal,
tests, CI wiring, accepted local Phase 10 scope, cross-phase audit and the unified
usage guide. Infrastructure-specific SpecDeploy remains future work. There is no
general graph executor, cloud deployment, authenticated reviewer service or automatic
Harness adoption in this publication.

Private `.phase5`, `.specdd-runs`, `.specdd-benchmarks`, `.specdd-delivery`, local
permission settings, dependencies and generated build/test outputs are excluded.
Reviewed documents retain non-secret hashes and summaries, not raw private run data.

## Local validation supplied for review

[Closure audit](2026-09-05-evolution-closure.md): 351 workspace tests, 28 supplemental
tests, 12 browser E2E, all builds and online npm audit with zero reported advisories.
The [usage guide](../../GUIA_DE_USO.md) has four verified read-only examples.
The local delivery pilot retains its exact approved hash and successful post-deploy.

Hosted CI must run for the new PR on Node 22/Linux. Phase 9 CI is not evidence for
this change. Any failure must be reported and investigated, never reclassified as
success based on local Node 24/Windows results. Publication is not release/merge.
