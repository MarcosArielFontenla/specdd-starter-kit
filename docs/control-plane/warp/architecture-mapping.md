# SpecControl to Warp Factory Mapping

Status: implemented for Phase 4  
Research date: 2026-09-04  
Target: Warp Factory definition schema `v1alpha1`

## Evidence base

This mapping was checked against Warp's current official documentation:

- [Factory definition syntax](https://docs.warp.dev/factories/factory-as-code/)
- [Factory agents](https://docs.warp.dev/factories/factory-agents/)
- [How Warp Factories work](https://docs.warp.dev/factories/how-factories-work/)
- [Multi-agent orchestration](https://docs.warp.dev/platform/orchestration/)
- [Environments](https://docs.warp.dev/platform/environments/)
- [Measure and improve](https://docs.warp.dev/factories/measure-and-improve/)
- [API and SDK quickstart](https://docs.warp.dev/reference/api-and-sdk/quickstart)
- [Official Factory examples](https://github.com/warpdotdev/warp-factory-examples)

Warp documents `factory.yaml` plus agent and automation Markdown as Git-versioned
configuration. It also documents runners, scorers, skills, and webhooks, but those are
not required for the Phase 4 slice. Work items, runs, and metrics are runtime state and
do not live in these definition files.

Warp publishes unauthenticated machine-readable schema endpoints at
`https://app.warp.dev/api/v1/factory-files/schemas` and
`https://app.warp.dev/api/v1/factory-files/schemas/v1alpha1`. Phase 4 does not fetch a
mutable external schema during builds or tests; target compatibility is pinned to the
documented `v1alpha1` surface and covered by local contract tests.

## Mapping

| SpecControl source | Warp target | Fidelity | Phase 4 rule |
|---|---|---|---|
| Control Plane metadata | `factory.yaml` identity | Exact subset | Project identity stays canonical; the adapter supplies the Warp-safe Factory name. |
| Repository target | `factory.yaml.repositories` | Exact | Supplied only by adapter config as `owner`/`name` pairs. |
| Model or execution harness | `factory.yaml.agentDefaults` | Exact | Supplied only by adapter config; exactly one of `model` or `harness`. |
| Agent role | `agents/<role>/agent.md` | Instruction-only | ID, purpose, stage type, and references are projected; capability content is not copied. |
| Warp foreman requirement | `agents/specdd-foreman/agent.md` | Adapter-only exact | One foreman is synthesized as infrastructure; it is not added to the canonical graph. |
| Workflow event trigger | `automations/<workflow>/automation.md` | Exact initial subset | Only an explicit canonical event → GitHub `issue_created` binding is supported. It is emitted disabled. |
| Graph nodes and edges | Foreman Markdown | Instruction-only | Static topology and outcomes are readable instructions, not target-schema graph resources. |
| Human approval | Foreman stop/resume instruction | Instruction-only | The gate remains mandatory, but enforcement must be proven by the selected runtime conformance path in Phase 5. |
| Harness and capability bindings | Role Markdown references | Instruction-only | Agents are directed to canonical repository artifacts; rules are not duplicated. |
| Policies | Role/foreman Markdown | Non-equivalent | The adapter exposes intent but never claims validator, human, or runtime enforcement. |
| Artifact contracts | Role/foreman Markdown | Non-equivalent | Paths and required status are visible; artifact existence/schema validation is not performed. |
| Retry and backoff | Foreman Markdown reference | Non-equivalent | Bounds are visible but not compiled into an enforceable Factory resource. |
| Failure route | Foreman Markdown reference | Non-equivalent | Routes remain canonical; runtime adherence is unproven. |
| Eval gate | Foreman mandatory stop | Unsupported | No scorer is generated before the Phase 6 eval adapter. Required gates cannot silently become advisory. |
| Runtime hint | Explicit adapter binding when available | Non-equivalent | The adapter never infers Warp runner/environment IDs from portable hints. |
| Run/eval/approval telemetry | None | Out of scope | Definition files are configuration, not runtime history; normalization starts in Phase 7. |

## Target files

The compiler emits only:

```text
factory.yaml
agents/specdd-foreman/agent.md
agents/<canonical-role>/agent.md
automations/<bound-workflow>/automation.md
```

It deliberately emits no `runners/`, `scorers/`, `skills/`, `webhooks/`, secrets,
runtime state, or API payloads.

## Replacement boundary

`@specdd/warp-adapter` depends on `@specdd/control-plane-model`; the canonical model
does not depend on the adapter. Replacing Warp means implementing another compiler
against the same validated source definition and preserving the same fidelity-report
obligation.
