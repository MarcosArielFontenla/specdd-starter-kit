# Warp Adapter Projection Report

Source: `issue-to-draft-pr-control` `1.0.0`  
Adapter: `1.0.0`  
Warp target: `v1alpha1`  
External writes performed: **no**  
Automations enabled: **no**

## Generated files

- `agents/developer/agent.md`
- `agents/planner/agent.md`
- `agents/reviewer/agent.md`
- `agents/specdd-foreman/agent.md`
- `automations/issue-to-draft-pr/automation.md`
- `factory.yaml`

## Mapping

| Source | Target | Status | Note |
|---|---|---|---|
| adapter execution defaults: specdd-issue-to-draft-pr | factory.yaml#agentDefaults | exact | Warp model or harness selection exists only in adapter configuration. |
| adapter infrastructure: specdd-foreman | agents/specdd-foreman/agent.md | exact | Warp requires exactly one foreman; this agent is not a canonical role. |
| adapter repositories: specdd-issue-to-draft-pr | factory.yaml#repositories | exact | Repository coordinates exist only in adapter configuration. |
| agent role: developer | agents/developer/agent.md | instruction-only | Role identity maps directly; Harness, capability, and policy behavior remains referenced canonical content. |
| agent role: planner | agents/planner/agent.md | instruction-only | Role identity maps directly; Harness, capability, and policy behavior remains referenced canonical content. |
| agent role: reviewer | agents/reviewer/agent.md | instruction-only | Role identity maps directly; Harness, capability, and policy behavior remains referenced canonical content. |
| control graph: issue-to-draft-pr-graph | agents/specdd-foreman/agent.md | instruction-only | Nodes and edges are rendered as foreman instructions, not as a first-class static Warp graph. |
| control-plane: issue-to-draft-pr-control | factory.yaml | exact | Identity is projected; the canonical definition remains authoritative. |
| workflow event trigger: issue-to-draft-pr | automations/issue-to-draft-pr/automation.md | exact | Explicit event bindings map to a disabled Warp automation. |

## Unsupported or non-equivalent semantics

| Code | Canonical source | Impact | Deferred to |
|---|---|---|---|
| WARP_APPROVAL_INSTRUCTIONS_ONLY | /approvals/0 | The foreman is instructed to stop and wait, but this compiler does not provision or verify a runtime approval gate. | Phase 5 human-gate validation |
| WARP_ARTIFACT_VALIDATION_UNSUPPORTED | /artifactContracts/0 | Paths and requirements appear in instructions, but the compiler does not validate runtime artifact creation or schemas. | Phase 5 artifact evidence |
| WARP_ARTIFACT_VALIDATION_UNSUPPORTED | /artifactContracts/1 | Paths and requirements appear in instructions, but the compiler does not validate runtime artifact creation or schemas. | Phase 5 artifact evidence |
| WARP_ARTIFACT_VALIDATION_UNSUPPORTED | /artifactContracts/2 | Paths and requirements appear in instructions, but the compiler does not validate runtime artifact creation or schemas. | Phase 5 artifact evidence |
| WARP_ARTIFACT_VALIDATION_UNSUPPORTED | /artifactContracts/3 | Paths and requirements appear in instructions, but the compiler does not validate runtime artifact creation or schemas. | Phase 5 artifact evidence |
| WARP_ARTIFACT_VALIDATION_UNSUPPORTED | /artifactContracts/4 | Paths and requirements appear in instructions, but the compiler does not validate runtime artifact creation or schemas. | Phase 5 artifact evidence |
| WARP_ARTIFACT_VALIDATION_UNSUPPORTED | /artifactContracts/5 | Paths and requirements appear in instructions, but the compiler does not validate runtime artifact creation or schemas. | Phase 5 artifact evidence |
| WARP_EVAL_GATE_UNSUPPORTED | /evalGates/0 | No Warp scorer is generated; required eval nodes instruct the foreman to stop for an external canonical evaluator. | Phase 6 eval runtime adapters |
| WARP_FAILURE_ROUTE_INSTRUCTIONS_ONLY | /failureRoutes/0 | The route is visible to the foreman but has no equivalent static Factory configuration resource. | Phase 5 execution validation |
| WARP_FAILURE_ROUTE_INSTRUCTIONS_ONLY | /failureRoutes/1 | The route is visible to the foreman but has no equivalent static Factory configuration resource. | Phase 5 execution validation |
| WARP_GRAPH_INSTRUCTIONS_ONLY | /graphs/0 | Ordering and outcomes are prompt instructions; Phase 4 cannot prove runtime graph enforcement. | Phase 5 execution validation |
| WARP_POLICY_INSTRUCTIONS_ONLY | /policies/0 | The policy remains canonical and is referenced in agent instructions; the adapter does not execute its enforcement mechanism. | Future policy runtime adapter |
| WARP_POLICY_INSTRUCTIONS_ONLY | /policies/1 | The policy remains canonical and is referenced in agent instructions; the adapter does not execute its enforcement mechanism. | Phase 5 human-gate validation |
| WARP_RUNTIME_POLICY_UNSUPPORTED | /policies/2 | The adapter cannot claim target-runtime enforcement and only exposes the constraint to agents. | Future policy runtime adapter |
| WARP_RUNTIME_POLICY_UNSUPPORTED | /policies/3 | The adapter cannot claim target-runtime enforcement and only exposes the constraint to agents. | Future policy runtime adapter |
| WARP_RETRY_UNSUPPORTED | /retries/0 | Attempt limits and backoff are documented in instructions but not configured as enforceable Factory resources. | Future runtime capability after Phase 5 |
| WARP_RUNTIME_HINT_NOT_ENFORCED | /runtimeHints/0 | Portable execution, isolation, network, and interactivity hints do not select Warp environment IDs or runners automatically. | Explicit adapter/runtime configuration |

This report describes compilation fidelity only. It is not evidence of a Warp run, approval, eval result, or pull request.
