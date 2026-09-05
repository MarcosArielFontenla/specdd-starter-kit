# ADR 0012 — Evidence-bound, human-governed improvement proposals

Status: accepted for implementation; not approval of an individual improvement.

## Context / problem

Run history and benchmark reports now exist. Treating descriptive deltas as
permission to rewrite the Harness would violate the roadmap's Observer → Proposal
boundary and obscure unmeasured outcomes.

## Options and decision

Reject direct mutation and mutable approval flags. Use portable proposal artifacts,
recomputed benchmark assessments and hash-linked human-attested lifecycle records.
Require pinned source/candidate identities, explicit acceptance and quality guards.
Prepare PR metadata only after qualified evidence and matching approval; record
adoption separately from approval and PR creation.

## Consequences / migration

No Harness v1 or prior schema migration. Existing evidence is reusable, with its
original scope and unknown metrics preserved. Local journals are tamper-evident
relative to a trusted head, not signed authorization. A future hosted adapter must
authenticate reviewers and independently verify PR/merge receipts. The package
does not execute proposals, establish causation or authorize external writes.
