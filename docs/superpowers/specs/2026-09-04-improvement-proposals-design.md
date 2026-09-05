# Phase 9 — Controlled improvement proposals

## Discovery and scope

Phase 8 supplies validated eval-node evidence, not authenticated execution or full
workflow outcomes. Its six observed runs all passed. Warp remains optional.
Harness v1 generation, policies and user-authored files must remain unchanged.

## Contract and acceptance

Introduce a portable, versioned proposal with a pinned target preimage, hypothesis,
proposed change, risks, rollback, source benchmark identity, candidate benchmark
plan identity, selected candidate and explicit metric thresholds. Analysis must
recompute canonical reports from plans/datasets, distinguish failed final evals,
execution errors, retries and absent observations, and never invent root causes.
Candidate evidence must use the same task, evaluator and baseline as the source.
Unknown metrics cannot satisfy acceptance. Complete measurements are not proof
of improvement: require explicit thresholds and no eval quality regression.

An immutable hash-linked local journal records review requests, human-attested
approval/rejection, PR references and adoption receipts. Decisions bind the exact
proposal and evidence assessment. Reject stale, reordered and invalid transitions.
An approved journal can prepare a draft PR handoff manifest, but cannot execute
commands, edit targets, create PRs, merge or deploy. Adoption is distinct from
approval and requires a previously recorded PR and a merged-commit receipt.
Local actor references are attestations, not authentication or authorization.

## Validation and gate

Test valid and hostile inputs, unknown evidence, stale reviews, quality regressions,
and both rejection and adoption paths using explicitly synthetic decisions.
Replay actual Phase 8 evidence without fabricating human approval. Implementation
acceptance is separate from a live proposal review/PR pilot; Phase 10 stays gated
until a specific proposal is reviewed and its required live validation is agreed.

## Deferred / risks

No autonomous observer service, semantic patch proof, statistical significance,
authenticated identity, hosted execution, PR API adapter or automatic application.
Hashes detect changes relative to supplied artifacts, not dishonest authors.
