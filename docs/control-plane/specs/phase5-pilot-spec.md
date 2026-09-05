# Phase 5 pilot specification — local validation guide

Version: 1
Status: approved by explicit user reply; implemented and independently reviewed in draft PR #2
Date: 2026-09-04

Issue: https://github.com/MarcosArielFontenla/specdd-starter-kit/issues/1

Approval: the user replied “si aprobado tranquilamente” to the exact pilot scope,
Role Pack installation and independent review request. The pre-approval v1 text is
preserved in `.phase5/pilot-001/specs/features/issue-spec.md`; its source hash and
the completed evidence chain are recorded in `../phases/phase-5-pilot-001-evidence.md`.

## User story

As a SPECDDSTARTERKIT maintainer, I want a short local validation guide so I can
check the generated platform without a Warp account and distinguish preparation
checks from a completed live software-factory run.

## Allowed implementation scope

Create exactly these two files on an isolated pilot branch:

- `docs/control-plane/local-validation.md`
- `scripts/phase5/local-validation.test.mjs`

Do not modify runtime code, schemas, dependencies, Harness/role policies, eval
thresholds, deployment, or existing user changes as part of this pilot PR.

## Acceptance criteria / canonical eval v1

Given a maintainer with the repository dependencies installed and no Warp account,
when they follow the guide, then they can identify the local checks and the separate
live-run gate. Given an incomplete guide, when its conformance test runs, then the
test must fail. Given no human approval, implementation must remain stopped.

1. The guide contains the exact commands `npm run test:unit --workspaces --if-present`,
   `npm run build --workspaces --if-present`, and
   `node --test scripts/phase5/prepare.test.mjs` with their purpose and expected result.
2. It explicitly says no Warp account or credits are required, and that green local
   tests do not prove a completed live Phase 5 run.
3. It describes the human approval, independent review, canonical eval, actual draft
   PR and no-merge/no-deployment boundaries.
4. The Node test checks those mechanical documentation requirements, rejects an
   intentionally incomplete in-memory guide, and performs no network or product writes.
5. A reviewer independently checks correctness/readability and the two-file scope.

Eval command after implementation: `node --test scripts/phase5/local-validation.test.mjs`.
This measures documentation conformance, not general agent intelligence or skill drift.
Do not report it as passing until it has actually run on the implementation.

## Approval and execution

The requested human checkpoint approves this exact scope, the generated Role Pack
installation plan, an isolated `codex/` pilot branch, and a draft-only PR containing
these two files. A separately authorized reviewer is required. No merge/deployment.
If the user rejects or changes the scope, stop and produce a revised spec before code.

The remediation work and preparation tooling already implemented are not this pilot's
implementation and must not be repackaged as evidence of passing its human gate.
