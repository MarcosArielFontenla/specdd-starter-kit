# Phase 5 — pilot-001 evidence

Date: 2026-09-04 (America/Buenos_Aires; some recorded UTC timestamps are September 5)
Scope: human-operated, two-file documentation pilot; no merge or deployment.

Result: accepted for this bounded Phase 5 pilot. Independent final evidence review
confirmed the terminal PR artifact, original planner-consumption hashes and explicit
approval timestamp semantics, with no remaining blocker for this scoped conclusion.
Phase 6 may now be specified; it has not been started.

## External result

- [Actual issue #1](https://github.com/MarcosArielFontenla/specdd-starter-kit/issues/1).
- [Actual draft PR #2](https://github.com/MarcosArielFontenla/specdd-starter-kit/pull/2).
- Branch: `codex/phase5-local-validation`; base `12f648863f7b37596ccaf492c76af6689745c633`.
- Reviewed and published head: `c48f8736c796736bdb7442f89f917186669b87d8`.
- Verified GitHub state: OPEN, `isDraft: true`, `mergedAt: null`.
- Exactly two added files: `docs/control-plane/local-validation.md` and
  `scripts/phase5/local-validation.test.mjs`. No unrelated workspace changes published.
- GitHub returned no status checks for this isolated pilot; local results below are
  not presented as hosted CI results.

## Traceability

The immutable local evidence is retained in ignored `.phase5/pilot-001/`. Do not
delete that directory until the evidence has been deliberately archived. Raw local
transcripts/credentials are not published in the PR.

| Step | Evidence | Observed result |
|---|---|---|
| Issue and specification | `artifacts/github-issue.json`, `specs/features/issue-spec.md`, approved spec v1 | Real issue; bounded guide/test scope |
| Human checkpoint | `artifacts/approval.json` | User explicitly replied “si aprobado tranquilamente” before implementation; no invented message timestamp |
| Generated Harness | `preparation.json`, `.agents/REGISTRY.md`, `context/project-definition.json` | Real SpecDD/SpecForge output; approved BA/Dev/QA wiring; domain capability preserved |
| Agent consumption | Primary-agent reads and independent reviewer report | Generated Developer skill/playbook used; reviewer consumed QA capability/skill/playbook and context |
| Independent review | `artifacts/review.json`; agent `/root/phase5_independent_review` | PASS, no blocking findings; 16 tests independently passed |
| Canonical eval | `artifacts/eval.json`, `.agents/specs/local-validation.spec.yaml` | Approved documentation criteria v1 executed; 16 passed, exit 0; generated spec done-gate also passed |
| Other Harness gates | Executed spec, budget and snapshot checks | Specs pass; four classes at 74/500 lines; four snapshots fresh |
| Negative probes | `artifacts/check-transitions.mjs` | Missing/rejected approval and missing/failed eval have no advancing edge; positive transitions verified |
| Telemetry | `.agents/telemetry/events/2026-09.jsonl` | Explicitly retrospective, run/graph-linked observations; no fabricated exact action times or line counts |
| Draft PR | `artifacts/draft-pr.json`, `artifacts/implementation.diff` | Real verified draft and exact reviewed head |

Approved source spec SHA-256:
`08d6c5965555e4e47c564732f3bdacbc22c7f9a309c9c827dab8c336bedaa6d9`.
The local copy normalizes line endings; the source hash identifies the document
read and approved in the main workspace, not an assertion of byte-identical copies.

Graph SHA-256:
`48a01a6ee30ba088a641b78c75c89437562c2e224491a952b99f4198ab712cdc`.

Reviewed file SHA-256 hashes:

- Guide: `5589f07bdd5e92ecc744ab1dfd4ab15124a9f4ab7dd5c44de14d536426bd3c1d`.
- Test: `b0218a3b24326fe2b83554ac6622981ef2c0a76b24ea7ef3ab129e42a2a064bc`.

## Acceptance limits

This validates a human-operated documentation flow, not an autonomous factory or
remote-runtime conformance. The canonical remote/container hint was not realized;
actual isolation was a local Git worktree, explicitly recorded in `run-inputs.json`.
Graph decisions were followed by the operator; negative probes do not certify
runtime-level enforcement. Eval measures documentation conformance, not general
agent quality or skill drift. No fabricated baseline or score was used.

Role installation/evidence materialization occurred after the initial implementation
check, under the user's already-issued authorization. This is disclosed rather than
backdating the installation. Telemetry is best-effort and retrospective, with unknown
injection counts unreported. These limitations must remain visible in future phase
planning; do not reinterpret this evidence as perfect instrumentation or isolation.

The spec gate's `approvedAt` records registration of the already-observed human
decision, not a reconstructed chat-message timestamp; the YAML and approval artifact
explicitly label this. Planner telemetry was appended retrospectively from actual
preceding-turn reads, with hashes from the original preparation inventory rather
than pretending the later installed Harness was read earlier.

The architecture/preparation implementation remains in the user's uncommitted main
workspace. This PR deliberately does not ship it; the guide explains that prerequisite.
