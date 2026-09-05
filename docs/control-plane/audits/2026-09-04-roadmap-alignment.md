# Roadmap alignment audit — Phases 0–5

Date: 2026-09-04

Follow-up: the findings below are the historical audit observations. See
[remediation and current gate](2026-09-04-remediation.md) for the implemented fixes.
Phase 5 live acceptance remains pending; Phase 6 is not opened by the remediation.

## Decision

**Do not advance to Phase 6.** Phase 5 is not demonstrated, and the implemented Phase 1–4 contracts have reproducible defects. The existing phase completion records describe previously delivered scope; they are not sufficient evidence that the current phase gates are satisfied without qualification.

This is an audit of the current, uncommitted working tree, not a release certification. Production code and the original roadmap were not changed by this audit. Existing user changes were preserved. No external runtime, issue, PR, merge, or deployment was invoked.

## Authority and runtime interpretation

The root roadmap states that Warp is a reference architecture and *may* become the first backend (line 38), but its detailed Phase 4 explicitly specifies a Warp adapter and Phase 5 lists Warp as the execution backend (lines 1289–1356). These are different levels of commitment, not evidence that the product must depend on a paid Warp account.

The user's subsequent direction is authoritative: evolve SPECDDSTARTERKIT using Warp as architectural/functional reference, without requiring Warp. The secondary tracker already describes optional runtimes, but the root phase-specific acceptance criteria have not been reconciled through an explicit amendment/ADR. Choosing a vendor-independent acceptance path must not silently replace real execution with mock success.

An optional Warp compiler is compatible with a neutral core. It is neither a completed software factory nor a requirement to buy credits. A real agent-assisted workflow can use an available execution tool; this audit does not assume that another hosted provider is free or available. Do not introduce a generic custom orchestration engine as a workaround.

## Phase-by-phase comparison

| Phase | Located evidence | Audit assessment |
|---|---|---|
| 0 — Baseline | `phases/phase-0-baseline.md`; architecture, compatibility, migration and risk analysis | Baseline exists. Runtime acceptance interpretation needs reconciliation (F01). |
| 1 — Canonical project | `packages/project-model/{src,schema,examples}`; ADRs 0001–0003; SpecDD generator emits `context/project-definition.json` separately from the scaffold receipt | Structurally implemented; validator does not enforce its published schema (F02). |
| 2 — Capability packs | `packages/capability-model/{src,schema,examples}`; ADR 0004; SpecForge emits independent role manifests, artifact references and human-reviewed installation tasks | Structurally implemented; nested validation gap (F02). Draft/manual installation is intentional, not missing automatic execution. |
| 3 — Control Plane | `packages/control-plane-model/{src,schema,examples}`; graph/policy concepts; ADRs 0005–0006; finite graph, references, retries, approval/eval/artifact contracts | Declarative model implemented; invalid node kinds can crash validation (F03). It is not a runtime or a proof of gate enforcement. |
| 4 — Adapter | `packages/warp-adapter`; mapping/limitations documents; ADR 0007; deterministic Factory example and disabled automation | Compiler implemented, but fail-closed validation and complete semantic-loss reporting claims are not met (F04–F06). Optional adapter is coupled to portal prebuild (F07). |
| 5 — Minimum viable factory | Canonical issue-to-draft-PR **example** exists inside the adapter. Tracker says “Ready for specification.” Phase 4 evidence explicitly defers execution to Phase 5. | **Not implemented/validated as an end-to-end acceptance flow.** No Phase 5 spec, acceptance run or complete run evidence was found. Do not mark complete. |

The older “Harness Fases 1–6” in `docs/IMPLEMENTATION_STATUS.md` is a different sequence from Control Plane Phases 0–10. It must not be read as evidence that Control Plane Phase 5 or 6 is complete.

## Findings

### F01 — Blocking: acceptance and progress claims have diverged

Sources: root roadmap Phase 5; `docs/control-plane/roadmap.md`; `docs/control-plane/phases/phase-4-warp-adapter.md`.

The tracker makes external runtimes optional but lists a “Validated runtime-neutral conformance flow” as the entry condition for the phase meant to prove that flow. The original success criterion naming Warp has not been explicitly amended. There is no evidence that the minimum factory was executed.

Required resolution: document the user's no-Warp-dependency decision, specify the actual execution path and preserve all substantive acceptance criteria. Distinguish fixture validation, dry runs and mocks from an actual run. Reconcile the root roadmap, tracker and implementation status without inventing completed evidence.

### F02 — High: Project and Capability validators accept schema-invalid objects

Sources: `packages/project-model/src/validate.ts` (top-level key check at line 42), `packages/capability-model/src/validate.ts` (line 36), and their published schemas.

Reproduction: add `metadata.vendor = "warp"` and `metadata.labels = 42` to the minimal Project example; validation returns `{ valid: true, diagnostics: [] }`. Add `role.vendor = "warp"` to the minimal Capability example; same result. The schemas prohibit those unknown nested properties; Project labels must be an array.

Impact: callers of the public validators can accept documents rejected by a schema consumer, including vendor-specific fields outside the designated extension boundary. Existing neutral fixtures do not establish that arbitrary inputs stay neutral.

Required resolution: align recursive structural validation with JSON Schema and retain semantic checks; add negative conformance cases for nested types, properties and schema constraints across the canonical packages.

### F03 — High: invalid graph node kind throws instead of returning diagnostics

Source: `packages/control-plane-model/src/validate.ts:295–305`.

Reproduction: set the first example graph node's `kind` to `"constructor"`. The `in` check accepts an inherited object property, then destructuring throws `function is not iterable`. This affects the public validation boundary and callers such as the compiler.

Required resolution: use an own-key/explicit enum lookup and add adversarial node-kind tests. Invalid JSON input must return invalid diagnostics, not escape as an exception.

### F04 — High: adapter execution validation accepts malformed exclusive fields

Source: `packages/warp-adapter/src/validate.ts`, `validateExecution`.

Reproduction: `agentDefaults = { model: 42, harness: { type: "codex" } }` passes validation. Compilation emits `model: 42` and drops the supplied harness. The exclusivity check counts well-typed values instead of rejecting malformed present fields, while rendering selects the present model property.

Required resolution: validate property presence, mutual exclusion and each supplied value consistently before rendering. Add negative defaults and per-agent execution cases.

### F05 — High: disabled canonical bindings still generate active instructions

Source: `packages/warp-adapter/src/compiler.ts`, `renderRole`.

Reproduction: set the referenced Harness binding and first capability binding to `enabled: false`. Compilation remains valid and produces byte-identical files and unsupported-feature report. Planner instructions still tell the agent to read and follow both bindings.

Impact: the projection ignores declared enablement without a specific diagnostic. Generated automations remain disabled, so this audit did not execute those instructions; the defect concerns future consumption of the output.

Required resolution: reject referenced disabled bindings or explicitly implement and report their semantics. Never silently turn disabled canonical intent into consumption instructions.

### F06 — Medium: unsupported-feature report overstates preserved retry semantics

Source: `packages/warp-adapter/src/compiler.ts`, retry report item and `renderControls`.

Reproduction: change `retries[0].maxAttempts` from 2 to 3. Generated files and report remain identical. The report says attempt limits and backoff are documented in instructions, but rendering only includes the retry identifier, not those values.

Required resolution: include the actual parameters or accurately state that they are omitted and unavailable from the generated instructions. Audit other instruction-only mappings using semantic mutation tests; a stable snapshot alone does not prove preservation. Runtime enforcement itself remains outside Phase 4.

### F07 — Medium: optional adapter is a required portal build step

Source: `platform/package.json:9`, `prebundle-all`.

Both portal development and build invoke `@specdd/warp-adapter` compilation through lifecycle scripts, although the portal's wizard UI does not consume that adapter. An adapter compiler failure therefore blocks local portal use.

This is local build coupling, **not a Warp account, service, payment or network dependency**. Required resolution: build only the canonical packages actually consumed by the portal and keep optional adapter verification in its own workspace/CI path.

## Validation evidence

- `npm run test:unit --workspaces --if-present`: exit 0, **179 passing** (Project 11, Capability 7, Control Plane 10, Warp 11, SpecDD 71, SpecForge 27, SpecDeploy 42).
- `npm run build --workspaces --if-present`: exit 0; architecture packages, portal and standalone wizards built.
- `node docs/control-plane/audits/2026-09-04-roadmap-probes.mjs`: exit 0, reproduced F02–F06. This diagnostic script prints expected versus observed behavior; its exit status is **not** an acceptance pass.
- `npm run test -w specdd-platform -w sdd-kit-wizard -w specforge-wizard -w specdeploy-wizard`: exit 0, **11 browser tests passing** (portal 4, SpecDD 3, SpecForge 2, SpecDeploy 2). These cover wizard behavior, not a software factory execution.

The probes use clones of checked-in JSON examples and do not modify production files or call external services. They import compiled packages, so rebuild before repeating them after code changes. No external Warp schema compatibility or live runtime enforcement was certified here.

## Required Phase 5 evidence after remediation

| Acceptance criterion | Current evidence | Evidence still required |
|---|---|---|
| GitHub Issue → Planner → Spec | Declared example graph | Actual issue identifier, planner execution and generated specification |
| Generated Harness and canonical skills consumed | Generated artifacts and instruction references | Recorded consumption by the participating agents |
| Graph outside the runtime | Canonical JSON exists | Same graph identity/version bound to the run |
| Human gate works | Stop instruction in generated prompt | Real human decision; proof no developer action occurs before approval; rejection path |
| Developer → Reviewer | Declared agent roles | Implementation and independent review evidence |
| Canonical eval runs | Eval reference and unsupported-runtime warning | Executed canonical evaluator, result and evidence; Phase 6 scorer integration is not a substitute |
| Telemetry and traceability | Canonical identities and pre-existing Harness conventions | Linked run/artifact/decision/eval events for the same execution |
| Draft PR, no deployment | Draft PR record contract | Actual draft PR linked to issue/spec/run; no merge or deployment |

Recommended sequence: resolve F01–F07 with regression tests; rerun audit; specify and implement Phase 5 on an available runtime without making Warp mandatory; execute positive and negative acceptance cases; only then open Phase 6. Mock fixtures can prepare those tests but cannot close the real-run gate.
