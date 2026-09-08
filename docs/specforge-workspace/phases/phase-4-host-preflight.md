# Phase 4 — host preflight and Windows blocker

2026-09-07. Authorization: continue the checks needed for Phase 4. Result: **needs-attention**, no model turns, no Phase 5.

## Findings and corrections

1. R3 failed at startup: CLI dotted configuration paths do not parse quoted keys as TOML keys. Quoting the MCP identifier created an invalid transport entry. A separate startup-only diagnostic reproduced the 104-byte error. The process-only overrides now use validated unquoted path segments; identifiers containing dots or quotes are rejected, not reinterpreted.
2. R4/R5 confirmed all inventoried MCP/plugins disabled, notify empty and nine tool/hook feature flags false. Typed profile responses add optional null fields. The comparator now normalizes only explicitly known null options. Unknown fields and additional non-null permission settings remain errors.
3. R6 passed production configuration/profile gates. `hooks/list` returned one directory, zero hooks and zero errors. This check did not invoke a model.
4. R7 passed configuration gates both before and after thread creation. The thread reported the exact named profile, no inheritance, the exact runtime root, `readOnly`, network disabled, approval `never`, model `gpt-5.6-luna` and zero instruction sources. The subsequent archive RPC failed with code `-32600`; the process was stopped. No successful archive is claimed and no business prompt was sent.
5. An independent local `codex sandbox` startup check using the same profile and `unelevated` backend exited 1 before the harmless Node command printed anything: `Restricted read-only access requires the elevated Windows sandbox backend`. No read/write canary enforcement test was completed. A prior help invocation inside the outer agent sandbox also failed; that failure is not used as host enforcement evidence.

`profileMatches:false` in the diagnostic reports is the raw deep comparison including serialized null fields. R6/R7's production comparator and thread assertions passed after narrow normalization; this raw field is not the final security-gate result.

## Preserved local evidence

All paths below are under `.specforge-workspace/`; reports are create-once and previous evidence is unchanged.

| Report | SHA-256 |
|---|---|
| `preflight-r3/report.json` | `3ea02ce49a57175d7adda7b1bef644061be3cb0d5addb0341141dc808f9a4d32` |
| `preflight-r4/report.json` | `a54769b3aa7c005f14727c7edf2a8ed976931002ae5684ae4dda2452f0ca9d76` |
| `preflight-r5/report.json` | `a1f8b355d7d3f857484db1a16dd36c023d14a24f3486decc0ffbeee6f96986d5` |
| `preflight-r6/report.json` | `ae4ca12b0bca9d05bbffb504e4b5e04f0a757c8050acde862bd128914b258575` |
| `preflight-r7/report.json` | `f7341fb3d6da3cd1b8d4c2f0f711bb5b5fada030cd6d95ddf2093041df097002` |
| `preflight-r7/windows-check.json` | `86a18f15a707c07724763c0189b53f69a0d82d1596f931df6eedd712f3caee46` |

User config SHA-256 remained `168e9215ac17037b97c45547c3f368de1f63280940da02ae317d60a3d0a203c6`. No global configuration edit, dependency update, Bloom change, model turn, commit or push occurred.

## Regression and next step

- SpecControl: 59/59 tests passed, including quoted/dotted identifier rejection, hooks enabled/missing rejection and narrow nullable-option normalization.
- SpecForge Workspace: 22/22 passed, TypeScript builds included.
- These tests do not establish OS-level enforcement or real model acceptance.

Next: validate availability of the elevated Windows backend and, if setup is required, obtain explicit authorization for its host changes/UAC. Preserve restricted permissions; do not fall back to broad filesystem reads. Then check OS isolation, clarify empty-thread archival behavior, execute a bounded synthetic BA pilot and obtain the user's observed UI acceptance. Phase 4 remains Partial until those gates are satisfied.

OpenAI Docs informed the explicit per-process `features.hooks=false` control: [official hooks documentation](https://learn.chatgpt.com/docs/hooks). Runtime behavior above is based on the actual installed executable, not documentation alone.
