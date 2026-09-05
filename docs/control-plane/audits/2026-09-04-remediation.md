# Roadmap audit remediation

Date: 2026-09-04
Scope: F01–F07 from the [alignment audit](2026-09-04-roadmap-alignment.md).

| Finding | Resolution | Verification |
|---|---|---|
| F01 | Accepted ADR-0008; root roadmap explicitly supersedes mandatory-Warp wording; tracker/status preserve Phase 5's real-run gate | Phase 5 stays in progress, Phase 6 blocked; no simulated completion |
| F02 | Project, Capability and Control Plane public validators now execute their actual published JSON Schemas through AJV 2020-12 before adding semantic diagnostics; no coercion/defaulting/removal | Nested unknown properties and wrong types rejected; canonical examples and wizard regressions pass |
| F03 | Both node-kind and edge-outcome lookups use own-key membership | Adversarial kinds with graph edges return diagnostics; original representative audit probe no longer throws |
| F04 | Execution fields use property-presence XOR and explicit value validation | Invalid defaults and per-agent overrides reject without output files |
| F05 | Referenced disabled Harness/capability bindings are rejected | Both binding types tested independently; no generated consumption instructions |
| F06 | Foreman output contains complete declarative retry, failure, artifact, policy, approval, eval and runtime-hint contracts | Retry mutation changes output; emitted contract JSON equals source; deterministic snapshot updated |
| F07 | Portal builds only the canonical capability/project dependency chain | Portal dev/build/browser tests succeed; optional Warp workspace retains its own CI/tests |

The adapter still does not enforce runtime gates. Including complete canonical
contracts makes instruction-level preservation inspectable, not equivalent to
execution. Approval/eval wording now follows explicit decisions and declared gate
modes rather than unconditionally treating every gate as approved/pass-only.

## Checks executed

- All workspace unit suites: **185 passed**, exit 0 (12 + 8 + 11 + 14 + 71 + 27 + 42).
- All workspace builds: exit 0.
- Four Playwright suites: **11 passed**, exit 0 (4 + 3 + 2 + 2).
- Original audit probes rerun: F02/F04/F05 reject; F03 returns diagnostics; F06 output changes.
- Phase 5 preparation test: verifies real generated contracts, hashes, no fake draft
  PR, and refusal to overwrite an existing sandbox.
- The first node-kind fix exposed a second inherited-key path in edge validation;
  that path was also fixed and retested with a graph containing edges, not just a
  one-node fixture.

AJV was added as a Project Model dependency and the lockfile updated. The shared
structural helper is used by all three canonical packages. Browser builds and tests
exercise the same validators; JSON Schema checking is not a Node-only test harness.

## Phase 5 progress, not completion

- Actual generated sandbox: `.phase5/pilot-001` (ignored), 89 files plus preparation inventory.
- Status is explicitly `prepared-not-executed`; Role Pack wiring remains draft.
- Actual [pilot issue #1](https://github.com/MarcosArielFontenla/specdd-starter-kit/issues/1) created.
- [Pilot specification v1](../specs/phase5-pilot-spec.md) and [runbook](../phases/phase-5-minimum-factory.md) prepared.
- Generated planner artifacts were inspected during preparation. This is not
  claimed as a fully wired, accepted multi-role execution.
- GitHub authentication, PowerShell 7 and powershell-yaml are available. The first
  restricted-network authentication failure was not an actual credential failure.
- No pilot implementation, approval, independent review, eval pass, draft PR,
  merge or deployment has been manufactured. The next gate is explicit human
  approval of the pilot spec and installation plan; independent review must be authorized.

Existing unrelated uncommitted work was preserved. No commits, pushes or PRs were
made during remediation. The issue is the sole external write so far.
