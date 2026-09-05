# Phase 4 — Warp Adapter

Status: complete  
Date: 2026-09-04

Audit follow-up: [remediation](../audits/2026-09-04-remediation.md) corrects the
validation and projection findings below. This remains a compilation milestone,
not live execution evidence. Warp is optional under ADR-0008.

## Entry criteria

- Phase 3 provides a validated `SpecDDControlPlane` `1.0.0` boundary.
- Warp remains absent from canonical Project, Capability, and Control Plane schemas.
- Current Warp Factory definition syntax and runtime separation were researched from
  official documentation.

## Outcome

The repository now has a replaceable, side-effect-free Warp compiler. It turns a
validated canonical control definition plus separate target bindings into a
deterministic Warp Factory `v1alpha1` file set. Known unsupported enforcement
semantics are reported; generated automations cannot be enabled by the Phase 4 contract.

## Deliverables

- `@specdd/warp-adapter` strict TypeScript workspace package;
- adapter config types and fail-closed semantic validation;
- deterministic `factory.yaml`, agent, foreman, and automation rendering;
- exact/instruction-only/unsupported structured mapping;
- deterministic Markdown unsupported-feature report;
- representative canonical Issue → draft PR source and Warp binding config;
- checked-in generated Factory example with one foreman and a disabled GitHub issue
  automation;
- official-architecture mapping and explicit limitations;
- ADR-0007 and 11 adapter tests;
- workspace, CI, and platform prebuild integration.

## Acceptance and exit evidence

| Check | Result |
|---|---|
| Adapter tests | 11 passed, including byte-identical generated snapshots |
| Total unit tests | 179 passed |
| E2E assertions | 11 passed across portal, SpecDD, SpecForge, and SpecDeploy |
| Workspace builds | Four architecture packages, platform, and wizard workspaces passed |
| Automation safety | Every generated automation is explicitly `enabled: false` |
| Foreman invariant | Exactly one adapter-owned `FOREMAN` |
| Eval boundary | No scorer output; required eval stops and reports Phase 6 deferral |
| External effects | No Warp/GitHub API, CLI, run, PR, merge, or deployment |
| Runtime neutrality | Existing canonical neutrality tests and adapter boundary checks passed |
| Diff whitespace | Passed; only repository line-ending notices were emitted |

All four Playwright suites completed with exit code 0 by reusing explicitly controlled
local dev servers; all servers were stopped after validation.

## Accepted ADR

- [ADR-0007 — Warp as a Replaceable Projection](../adrs/0007-warp-as-replaceable-projection.md)

## Deferred work

- applying or enabling a Factory definition;
- Warp/GitHub authentication, secrets, environment provisioning, and API/CLI use;
- executing and tracing the minimum workflow (Phase 5);
- canonical eval to Warp scorer translation (Phase 6);
- run telemetry, benchmarks, improvement, merge, and deployment;
- additional trigger providers/events, filters, schedules, runners, webhooks, and
  self-hosted execution.

## Risks

- Warp Factories and `v1alpha1` are evolving; a target-schema change may require a new
  adapter version.
- Graph and approval instructions are not proof of runtime enforcement. Phase 5 must
  test stop/resume behavior with a real human checkpoint.
- A generated Factory definition can become operational only after external setup and
  explicit application; the checked-in example intentionally does neither.
