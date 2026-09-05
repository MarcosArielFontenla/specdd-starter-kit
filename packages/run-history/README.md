# @specdd/run-history

Phase 7: portable run observations and immutable JSONL exports. Node 22.12+.
No database, web service, paid account, graph executor or Warp connection required.

## Inspect the actual local acceptance run

From the repository root, after `npm ci`:

```powershell
npm run build -w @specdd/run-history
node packages/run-history/scripts/history.mjs list .specdd-runs
node packages/run-history/scripts/history.mjs show .specdd-runs phase7-local-001
```

The last two commands are read-only and require the retained local evidence. A fresh
checkout does not contain private `.specdd-runs` exports. Missing files are errors,
not successful empty runs. The retained run contains a real eval slice; workflow
status is `unknown`, coverage is `partial`, and the eval itself passed.

A reviewed copy containing only identities, timestamps and hashes is available in
`examples/run-phase7-local-001.jsonl`. For a fresh checkout, inspect it with:

```powershell
node packages/run-history/scripts/history.mjs show packages/run-history/examples phase7-local-001
```

## Record an explicitly approved local evaluation

The existing Phase 5 sandbox is required for this example. Independently verify the
test, its working tree and commit before using the input reference. Pick a new run ID:

```powershell
node packages/run-history/scripts/record-local-eval.mjs packages/eval-adapters/examples/documentation.eval.json .phase5/pilot-001/worktree/scripts/phase5/local-validation.test.mjs .phase5/pilot-001/control/definition.json issue-to-draft-pr run-canonical-eval commit:c48f8736c796736bdb7442f89f917186669b87d8 phase7-local-002 .specdd-runs passed failed
```

This executes only the supplied Node test using the Phase 6 host wrapper. It records
an eval start and canonical completed result, not invented workflow/agent/approval
events. The duration includes wrapper startup. Null agent/model/harness identity is
intentional: running a Node test does not demonstrate an LLM or Harness consumption.
The process is bounded but **not sandboxed**. The caller authorizes the test and
asserts input identity; the host does not verify a commit or prevent test side effects.
Failure/error evals are preserved and exit 1. A missing usable host result publishes
nothing. Existing exports reject before execution and at atomic publication.

## API

- `assertEvent(unknown)`: strict schema plus timestamp, context and evidence checks.
- `summarizeRun(events)`: pure ordered reconstruction, no inferred missing events.
- `controlPlaneFingerprint(definition)`: canonical sorted-key identity hash.
- `assertGraphBinding(events, definition)`: workflow/node/role/capability/harness,
  approval, eval and artifact reference consistency against that exact definition.
- `evalResultTelemetry.normalize({result, startedAt, attempt, eventId}, binding)`:
  converts any Phase 6 local or imported runtime result. `startedAt: null` preserves
  missing timing. Native provider payloads need another explicit adapter.
- `writeRun(directory, events, definition)` from `@specdd/run-history/store`:
  validates and atomically creates `run-<runId>.jsonl`, never replaces it.
- `readRun(directory, runId, definition?)`, `listRuns(directory)`: bounded read-only
  inspection. Supply the definition to recheck bindings; listing validates internal
  consistency only, not a definition fetched from elsewhere.
- `encodeRun` / `parseRun`: deterministic JSONL, required final newline, fail closed
  for malformed/truncated input. Unknown event/schema versions reject for this v1 API.

Schema export: `@specdd/run-history/schema` (JSON Schema 2020-12). Register the existing
`@specdd/eval-adapters/schema/result` schema as an external reference with your validator.

## Interpretation and limits

`reportedStatus` is the source's workflow assertion, not an authorization or gate
verdict. `coverage: observed-lifecycle` means the supplied lifecycle pairs are closed;
it does NOT mean every planned node ran or every required approval was observed.
Evaluate graph/gate enforcement separately. Missing starts/ends produce gaps and
null durations. Failure and retry observations remain visible even after a later pass.
Approval evidence identifies the reviewed subject; actorRef is caller-supplied, not
authenticated. Hashes do not prove file existence, truth or approval authority.

Events allow identifiers, refs and hashes, not arbitrary payloads/raw logs. This is
data minimization, not a universal secret detector: review identifiers, paths and
imported result text before sharing. CLI JSON output is data, never executable markup.

Limits: 16 KiB/event, 10,000 events, 8 MiB/export, 10,000 directory entries and 32 MiB
of exports per listing (use individual inspection for larger histories). Empty,
oversized or corrupt exports fail; readers never silently skip a damaged run. Paths
and symlink/junction ancestors are checked. Local atomic no-replace hard links are
required; unsupported filesystems fail. Use a trusted directory without hostile
concurrent path mutation; no distributed or adversarial multi-user storage guarantee.

One export per run, including partial traces. Accumulate observations before export;
streaming updates are not supported. `.specdd-runs/` is ignored at the repo root.
Elsewhere, explicitly configure an equivalent ignore rule. There is no automatic
pruning: review archive/delete decisions manually (Harness's 90-day guideline remains
unchanged). Tests use clearly synthetic fixtures; only the separate acceptance run
is live evidence. No existing Harness telemetry/baseline or draft PR is mutated.
