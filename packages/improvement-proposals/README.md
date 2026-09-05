# @specdd/improvement-proposals

Phase 9 local control-plane infrastructure. Node 22.12+, vendor-neutral, no Warp
account or external service required. **Observer → Proposal**, never direct mutation.

Two distinct examples are retained: the retrospective serial-profile example below
does not qualify for approval; the [reviewed Phase 9 pilot](pilot/README.md) qualified
and reached draft PR #3. Neither example claims a merged/adopted improvement.

## Reproduce the real evidence assessment

From the repository root after `npm ci`:

```powershell
npm run build -w @specdd/improvement-proposals
node packages/improvement-proposals/scripts/inspect.mjs packages/improvement-proposals/examples/serial-profile.proposal.json packages/benchmarks/examples/local/plan.json packages/benchmarks/examples/local/dataset.json packages/benchmarks/examples/local/plan.json packages/benchmarks/examples/local/dataset.json packages/improvement-proposals/examples/journal.json
```

Expected exit **2**, `eligibleForReview: false`, reason `Acceptance not met:
latencyMs`, review `draft`. The serial profile was slower by about 718.33 ms;
all six final evals passed. This retrospective example deliberately demonstrates
that valid benchmarks do not necessarily support adoption. The empty journal is
real: nobody has approved or rejected this particular proposal. No files change.
Exit 0 means evidence qualifies for review, never approval; exit 1 means invalid
input. CLI uses bounded regular-file reads and rejects symlink ancestors.

## API and lifecycle

- `assertProposal(unknown)`: strict published schema, portable target path and
  unique, direction-safe metric thresholds. Target hash pins the pre-change file.
- `analyzeHistory(plan, dataset)`: recompute canonical reports; report observed
  final failures, execution errors, retries, missing repetitions and scope limits.
  This does not infer root causes or detect failures hidden inside unobserved runs.
- `assessProposal({proposal, sourcePlan, sourceDataset, plan, dataset})`: pin source
  evidence and candidate plan; preserve task, evaluator and baseline identities;
  require complete evidence, passing candidate evals, no quality regression and
  all explicit improvements. Unknown cost is not zero. New evidence requires review.
- `reviewState(bundle, journal)`: replay strict `ReviewEvent[]`. Exported TypeScript
  types and `reviewEventSchema` describe all fields. Each event carries previous
  event hash (null initially), proposal hash and recomputed assessment hash.
  Allowed transitions: draft → requested/rejected; requested → approved/rejected; approved →
  pr-recorded/rejected; pr-recorded → adopted/rejected. Rejected/adopted are terminal.
  A revised proposal starts a new journal; keep old artifacts for audit.
- `preparePullRequest(bundle, journal, observedTargetSha256)`: only approved state
  plus matching preimage yields draft PR metadata. It does not read/write targets,
  apply patches, execute commands, contact hosts, create PRs, merge or deploy.

Review events have IDs, ISO UTC millisecond timestamps, actor references and reasons.
They cannot predate their source/candidate observations. Unqualified drafts can be
explicitly rejected without falsely marking their evidence as eligible for review.
PR recording needs an HTTPS `/pull/<number>` reference; adoption additionally needs
that same PR and a merged commit hash. References/receipts are **local attestations**,
not verified remote facts. Authenticated review, diff relevance, target TOCTOU checks
and remote PR/merge verification belong to the human-operated or future hosted adapter.
Hashes are not signatures; preserve a trusted journal head outside editable artifacts
if tamper evidence against rewriting the entire journal is required.

## Validation boundary

Tests simulate improved timings and human lifecycle events, explicitly labeled
synthetic. They prove state-machine behavior, not a live approval or adoption.
The actual example reuses unchanged Phase 8 evidence and cannot qualify for adoption.
No target content, Harness generator, policy, baseline or eval threshold is modified.
