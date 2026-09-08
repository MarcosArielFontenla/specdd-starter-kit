# Phase 4 — BA subprocess configuration isolation

Status: offline implementation; live acceptance pending. No model execution or real preflight retry is covered by this change.

## Provenance and scope

Read-only inspection of the host user configuration found one MCP server, fourteen plugin entries and a two-element notify command. Its SHA-256 was `168e9215ac17037b97c45547c3f368de1f63280940da02ae317d60a3d0a203c6`. No command arguments, environment values or credentials are reproduced here. The previous preflight reports remain unchanged.

An empty TOML table does not remove inherited table entries. BA now takes an explicit operator inventory of MCP and plugin identifiers, sends an individual `enabled=false` override for each identifier, and sends `notify=[]` as process arguments. It does not edit user configuration, copy authentication or change CODEX_HOME. SpecControl default transport arguments remain unchanged.

## Operator inventory

When enabling the real BA runtime, `--isolation-inventory <absolute-json-path>` is required. Example shape (replace identifiers with the inspected host inventory):

```json
{"mcpServerIds":["example_server"],"pluginIds":["example@local"]}
```

Use empty arrays only when the host inventory is empty. Identifiers are bounded and validated, duplicate or additional fields rejected. This inventory is an isolation input, not authorization to execute a model and not proof of host-wide configuration discovery.

Before thread creation and again before sending a business prompt, the effective configuration must contain exactly the inventoried MCP/plugin entries, each explicitly disabled. Missing entries, new entries, enabled entries, nonempty notify or inline hooks fail closed. Permission-profile and thread-receipt checks remain mandatory. No automatic retry or automatic acceptance of a changed inventory.

## Limits and next gate

Offline validation on 2026-09-07:

- `npm run speccontrol:test`: 58/58 passed, including inventoried override transport, malformed inventory, missing/enabled/unexpected entries and unchanged SpecControl defaults.
- `npm run specforge:test`: 22/22 passed.
- TypeScript builds, JavaScript syntax checks and `git diff --check`: passed (Git emitted line-ending warnings only).
- Initial sandboxed test invocation was blocked by Windows `spawn EPERM`; the authorized local test invocation outside that sandbox passed. This is not a runtime sandbox acceptance test.
- User configuration and both historical preflight report hashes were rechecked unchanged. No model, dependency update, Bloom edit, commit or push occurred.

Offline tests cannot prove that the installed runtime honors plugin overrides, external hook isolation or Windows filesystem enforcement. Those remain live preflight acceptance requirements. Do not consider Phase 4 closed or enable a business turn based on these tests alone. The next separately authorized step is a model-free host preflight, preserving both previous reports, with an exact host inventory and checks of effective configuration and external hooks.

The OpenAI Docs skill informed the process-only overrides and the distinction between configured entries and enabled entries. Reference: [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference). Plugin override behavior must still be attested on the installed runtime; presence of an `enabled=false` field in a synthetic reply alone is not runtime enforcement evidence.
