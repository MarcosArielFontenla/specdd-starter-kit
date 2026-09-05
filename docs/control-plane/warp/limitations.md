# Warp Adapter Phase 4 Limitations

The authoritative example-specific unsupported report is generated at
[`packages/warp-adapter/examples/unsupported-features.md`](../../../packages/warp-adapter/examples/unsupported-features.md).
It is snapshot-tested against compiler output.

## Hard limitations

- No Warp API, CLI, SDK, dashboard, GitHub App, or Factory application is invoked.
- No automation can be enabled by the Phase 4 config contract.
- Only GitHub `issue_created` is supported as an event target; filters, schedules,
  other providers, and other GitHub events are deferred.
- No runner files, managed secrets, MCP bindings, cloud providers, webhooks, or
  self-hosted worker configuration are generated.
- Canonical graphs and approvals are instructions in the target because the selected
  Factory definition surface has no equivalent first-class static graph/approval
  resource. Runtime enforcement is therefore unproven.
- Runtime policies, retry/backoff, failure routing, runtime hints, and artifact-schema
  validation are not enforceable through this compiler.
- Canonical eval gates are not Warp scorers. Required eval nodes stop for external
  evidence; scorer compilation belongs to Phase 6.
- The generated draft-PR artifact is a contract/reference, not a created GitHub pull
  request.
- No run history, event normalization, metrics, benchmark, improvement, merge, or
  deployment behavior exists.

## Operational consequence

The checked-in example is a reviewable projection artifact, not a deployable claim.
If Warp is selected for an optional conformance run, a human must review the report,
configure the Warp/GitHub environment, and explicitly choose how the disabled
definition will be applied and exercised. The canonical Phase 5 conformance path does
not require a Warp account.
