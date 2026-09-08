# Phase 4 — real synthetic BA pilot

Date: 2026-09-08. Status: **accepted; technical and human gates passed**.

## Runtime preparation and isolation

The official App Server `windowsSandbox/setupStart` flow completed with `mode=elevated`, `success=true`. It set the user-level non-secret configuration value `windows.sandbox = "elevated"`; the second setup was idempotent. The configured MCP identifier, fourteen plugin identifiers and two-element notify command remained present globally and were disabled only in the BA subprocess.

The BA profile now denies filesystem root access, reads only the exact empty runtime directory plus the official `:minimal` platform/runtime paths, and disables network. Effective configuration and the active thread confirmed the named profile, exact runtime root, `readOnly`, network disabled, approval `never`, zero instruction sources, zero hooks, and disabled shell/apps/browser/MCP/plugins/multi-agent/JS REPL/notifications.

An OS command canary remains inconclusive: `codex sandbox` failed before process launch with `CreateProcessWithLogonW failed: 2`; App Server `command/exec` rejected the older `readOnly.access` form and did not accept the CLI-defined profile for that standalone request. This does not authorize broader reads. BA remains text-only: all tool features are disabled and the transport terminates on any tool event. The real successful run emitted no tool event.

## Attempts and exact outcome

There were three distinct, manually started runs and no automatic retry:

1. Rejected before generation because strict structured output does not support `uniqueItems`.
2. Rejected before generation because the `schemaVersion` constant lacked an explicit string type.
3. Completed successfully after moving support-reference uniqueness to the local validator and making the provider schema compatible.

Attempt 3 journal state is `ready`, error `null`. Request SHA-256 is `d6d9b0dd306181a736c220e382b59784ee9d73c0a432cb4e741c119a9e48b52b`; proposal SHA-256 is `e5c51b447bf804a6d5d59145c8700d8582b160774c93e65209150e741e397b17`; persisted run-record SHA-256 is `0e75034d03a6f65834bb8f7255ba7323f3c1140b2a95f67731d695dee2e4f5f5`. The proposal contains three ambiguities and three questions, with no invented rule or criterion. Nothing was adopted or approved automatically.

The original attempt-3 wrapper report says `needs-attention` because its observer accessed `proposal.content` instead of `proposal.output` after persistence. The create-once report was preserved. A read-only verifier subsequently proved the journal is `ready`; the wrapper was corrected for future runs.

## Evidence

| File under `.specforge-workspace/` | SHA-256 |
|---|---|
| `preflight-elevated/report.json` | `909304116274d87c75cedd165e9b7c4b3a2fd09e0eb2631ac3392a045d77a69f` |
| `preflight-elevated/setup-r2-report.json` | `931a3f1ed68e9c081bf478a06f3910f41eff05476ac5b252e3e8d94fbf27f586` |
| `preflight-r9/report.json` | `b996156e25bfe257fe3724041af826e0c7c5514638381bb50a38101f5f2b39dd` |
| `phase-4-real-pilot/report.json` | `f1a4bc1a30eb73afe9e70baf94e3f211386a787388b2c28a859a391627be339b` |
| `phase-4-real-pilot/report-r2.json` | `932a7cfbf92a3b29ea3448ca0f1da2c742605cbd911ce3142145eb3096761f38` |
| `phase-4-real-pilot/report-r3.json` | `c1930f061f22b99b738e9ea5f5f791e7ef864a43eee95604053ed26e78813463` |
| `phase-4-real-pilot/verified-r3.json` | `c592df5e9b4a35f49d9e26aa40747d0fb57182b7ca60966a3da69840107e8803` |

Final checks: artifact model 80/80, SpecControl 59/59, Workspace 22/22, and simulated UI E2E PASS on desktop/mobile with zero page errors. No dependencies were installed or updated; no Bloom/repository/publication/deploy action occurred.

## Human gate

The user inspected the persisted attempt-3 state in the browser and confirmed that
the proposal was understandable and separate from the draft. The user explicitly
selected and incorporated its three blocking questions, saved three human answers,
and authored three Given/When/Then criteria. Each mutation appeared in the activity
journal; nothing was adopted automatically.

The exact approval review bound requirement revision 2 to graph version 11. The
approval subject SHA-256 was
`da1218d35ea11415b90bc756959b41460e2de27d15b873232b41a29f069206e5`,
with artifact SHA-256
`263772b61d0f3272e81cfbcb035c9ec8915fd1f6d5e840182130c4159a596c1a`
and graph snapshot SHA-256
`c436d4a23a73a3e5d0c6ec49acf762688d716eca857380775c37fd89ff314f2e`.
The user confirmed that exact subject as the locally declared reviewer. The UI then
showed `Aprobado` and the journal recorded `approve` at version 12. No SpecDD
projection, repository write, publication or deploy occurred.

The original problem statement deliberately remains in requirement revision 2;
the resolved policy is carried by the bound questions, human answers and acceptance
criteria. Phase 5 must project the complete approved graph snapshot rather than
reading the description in isolation.

Observed wording feedback was applied: the UI now says `identidad local declarada`
instead of `identidad atestada`, because `--operator` is not authentication. Phase 4
is accepted; Phase 5 requires separate authorization.

OpenAI Docs informed the elevated setup RPC, hook shutdown and `:minimal` runtime-path rule: [App Server](https://learn.chatgpt.com/docs/app-server), [Hooks](https://learn.chatgpt.com/docs/hooks), and [Permissions](https://learn.chatgpt.com/docs/permissions).
