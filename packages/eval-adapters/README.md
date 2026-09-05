# @specdd/eval-adapters

Phase 6: versioned eval definitions, normalized single-run results, hashed evidence,
local process-outcome mapping and optional Warp classification configuration.
Standalone library: Node 20+. Installing this repository's workspace requires Node
22.12+ for Astro; no hosted account or runtime activation is required.

```powershell
npm run test:unit -w @specdd/eval-adapters
node packages/eval-adapters/scripts/run-local.mjs packages/eval-adapters/examples/documentation.eval.json .phase5/pilot-001/worktree/scripts/phase5/local-validation.test.mjs commit:c48f8736c796736bdb7442f89f917186669b87d8 phase6-local-001 passed failed
```

The second command requires the retained Phase 5 sandbox. It executes that explicitly
selected Node test, with shell disabled, 30-second timeout and 1 MiB output limit.
Only execute human-approved files. This is not filesystem/network isolation or a
process-tree sandbox. Output contains a canonical result and output fingerprint, not
raw logs. The input reference is a host assertion: the wrapper does not authenticate
it or certify the worktree is clean. Independently check the commit and test hash.

## API and trust boundary

- `validateEval` applies the published schema plus label/threshold checks.
- `localExitAdapter.evaluate` maps complete observed outcomes via explicit labels;
  timeout/signal/launch error yields `error`, null score. Nonzero completed exit fails.
- `normalizeScore` maps an explicit finite scale to 0–1; out-of-range data is rejected.
- `classificationResult` imports an observed declared label with evidence. It cannot
  be used for mechanical definitions. No unverified provider API shape is assumed.
- `gateSatisfied` binds run/input/eval/version/fingerprint and validates result shape.
  Required mode needs a consistent pass; advisory mode does not become a hard gate.
  This is a decision helper, not a signed attestation or a runtime enforcement engine.
- `compileWarpScorer` from `@specdd/eval-adapters/warp` supports classification only.
  Model, agents and sampling are explicit target bindings. Self-improvement is false.
  Generated files are never applied automatically; adding them to a live Factory is
  a separate authorized action. Mechanical evals are rejected, not downgraded to LLM
  opinions. The Phase 4 compiler's required-eval stop remains unchanged.

Definitions own thresholds and rubrics; results carry definition hash and evidence
hash/bytes. Neither raw logs nor secrets are persisted by the library. The caller
owns redaction, authenticity, retention and correspondence to the evaluated artifact.
Do not infer that hashed evidence is authentic merely because it has a hash.

Existing Harness `run-eval.ps1` analyzes drift history. It is not replaced, and its
rubrics/baselines are not silently converted into single-run scores. No Phase 7
history store or Phase 9 self-improvement loop is implemented here.

Warp mapping reference (checked 2026-09-04):
[official scorer file contract](https://docs.warp.dev/factories/factory-as-code/#scorersnamescorermd).
Only classification configuration compatibility is claimed, not a live Warp run.
