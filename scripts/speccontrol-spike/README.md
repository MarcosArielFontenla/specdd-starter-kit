# O1 — transport preflight (not a runtime adapter)

Run from a trusted directory after resolving the installed binary explicitly:

```powershell
$runtimeBinary = (Get-Command codex -ErrorAction Stop).Source
node scripts/speccontrol-spike/preflight.mjs $runtimeBinary
```

This starts an owned `app-server --stdio` process, initializes its connection and
reads auth mode without token refresh. It starts no thread, inference or command.
It never prints raw account responses, stderr or credentials. The installed runtime
can read its normal user configuration; this probe is not an isolated execution
environment. Run it only against a trusted binary and trusted user configuration.

Output is capped, requests have a timeout and successful return requires observed
process exit. Timeout cleanup targets only this owned no-turn process. This is not
evidence of cancelling an agent process tree or recovering a workflow.

The probe is deliberately outside the workspace package graph, with no external
dependencies. Do not expose it as a web endpoint. An O1 runtime adapter still needs
versioned protocol validation, sandbox tests, actual turn receipts/cancel/recovery,
and a persistence spike. A successful handshake does not satisfy those gates.

Source checked 2026-09-05: [official App Server documentation](https://learn.chatgpt.com/docs/app-server).

## Persistence experiment

On the tested Node 24.16.0 host:

```powershell
node --test scripts/speccontrol-spike/storage.test.mjs
```

Uses real SQLite and short-lived Node children in dedicated temporary directories,
removed after each test. It tests transactions and a candidate recovery policy, not
an implemented workflow service. node:sqlite compatibility with the monorepo minimum
Node 22.12 must be resolved before package integration; no engine change is implied.

## Explicit Docker isolation experiment

With Docker Desktop running and the existing `postgres:17-bookworm` image present:

```powershell
node scripts/speccontrol-spike/docker-isolation.mjs
```

No pull, database entrypoint, credentials or real project is used. The local tag is
resolved to an immutable image ID for the run. The shell-only fixture runs as UID
65534 with no capabilities, no network, a read-only root and fixture bind, restricted
tmpfs mounts, resource limits and no published ports or Docker socket.

Twelve assertions cover fixture access, denied writes, ephemeral writes, noexec,
privileges, no default route, actual no-route TCP failure, owned-ID reconciliation,
container/child termination and unchanged input. CPU/memory/PID limits are inspected
configuration, not stress-tested exhaustion. tmpfs noexec is not a prohibition on
interpreting scripts; resource isolation is not a general proof against escapes.

Cleanup targets only the unique ID bearing this run's ownership label and removes
its disposable filesystem. No prune, image deletion or user-container cleanup.
The bounded command probe is not a coding-agent run or a crash-recovered workflow.

## App Server turn and recovery probes

Resolve the binary explicitly, then run only against the synthetic fixture:

```powershell
$runtimeBinary = (Get-Command codex -ErrorAction Stop).Source
node scripts/speccontrol-spike/permission-profiles.mjs $runtimeBinary
node scripts/speccontrol-spike/app-server-turn.mjs $runtimeBinary complete
node scripts/speccontrol-spike/app-server-turn.mjs $runtimeBinary interrupt
node scripts/speccontrol-spike/app-server-recovery.mjs $runtimeBinary
```

The turn probe fixes `gpt-5.6-luna` only for this low-cost canary because CLI 0.145.0
cannot run the account's newer default model. It denies server-initiated requests,
uses the permitted `:read-only` profile, disables configured MCP servers for the
process, bounds output/time and archives completed probe threads. The success check
compares normalized text because a PowerShell read surfaces CRLF; file bytes and hash
are checked independently and must remain unchanged.

The recovery probe commits remote acceptance in temporary SQLite, terminates its
owned App Server process, resumes/reads the thread through a fresh process, and marks
the operation `needs-attention` without retry. It emits hashes rather than raw thread
references and removes only its validated temporary database. These probes consume
ChatGPT Codex usage. They do not validate a write-capable project worker.
