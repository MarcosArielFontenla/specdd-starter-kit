# Phase 0 — Current-State Baseline and Architectural Decisions

Status: complete  
Date: 2026-09-03  
Scope: architecture and contracts only; no control-plane implementation

## 1. Outcome

SpecDD can evolve into a vendor-, model-, and runtime-neutral Harness Compiler Platform without replacing the current product. The existing wizards already provide a sound deterministic generation boundary, safe Brownfield ingestion, collision handling, human review, and provenance checks. Those behaviors should be preserved as the compatibility baseline.

The blocking architectural gap is the absence of a single typed, versioned, machine-readable project definition. Today the effective model is distributed across React state, JavaScript renderers, static Markdown/YAML assets, PowerShell validators, and optional tool-specific projections. Phase 1 must introduce the canonical model and compile the existing Harness v1 from it before any Warp adapter, orchestration engine, or autonomous control loop is implemented.

Decision gate: **proceed to Phase 1, limited to the canonical project model and a compatibility compiler for existing output**.

## 2. Evidence and method

The baseline followed the roadmap sequence:

1. **Discover:** repository, package, documentation, specs, plans, templates, generators, validators, and tests were inventoried.
2. **Model:** current inputs, transformations, outputs, ownership boundaries, and runtime projections were reconstructed.
3. **Spec:** the current Harness v1 contract and Phase 1 boundary are stated below.
4. **Review:** the model was compared with the target Spec/Harness/Capability/Graph/Eval/Loop/Runtime layers and with Warp's public architecture.
5. **Plan:** only Phase 1 questions and acceptance boundaries are proposed; no implementation design is selected here.
6. **Implement:** documentation only.
7. **Test:** all unit, E2E, and package builds were executed.
8. **Validate:** repository status was checked so generated build output and unrelated user files were not adopted as source changes.
9. **Document:** this baseline and the control-plane roadmap tracker were added.

Verification baseline:

| Check | Result |
|---|---|
| SpecDD unit tests | 70 passed |
| SpecForge unit tests | 23 passed |
| SpecDeploy unit tests | 42 passed |
| Platform E2E | 4 passed |
| SpecDD E2E | 3 passed |
| SpecForge E2E | 2 passed |
| SpecDeploy E2E | 2 passed |
| Workspace package builds | platform plus three standalone wizards passed |

The repository root has no aggregate `build` script. The verified command is `npm run build --workspaces --if-present`; this is a packaging fact, not a product failure.

## 3. Current architecture map

### 3.1 Product topology

| Area | Current responsibility | Current source of behavior |
|---|---|---|
| `platform/` | Static Astro portal that mounts the three wizards | Page composition and package exports |
| `packages/ui/` | Shared Stepper and visual styles | React/CSS presentation components |
| `specdd-kit/` | Project context, specifications, Harness v1 scaffold, validation, Brownfield convergence | Static kit files plus browser generator logic |
| `specforge-kit/` | Role packs, role skills, rubrics, workflows, optional agent seeds | Hard-coded role catalog, bundled skills, browser generator logic |
| `specdeploy-kit/` | Provider-specific deployment artifacts | Provider JSON descriptors, templates, schema, browser generator logic |

All three products are client-side ZIP generators. There is no control-plane service, shared persistent project definition, run database, or runtime scheduler. The platform is a unified shell, not yet a unified domain model.

### 3.2 Current generation flow

```text
User input / imported repository
            |
            v
Wizard-local React state
            |
            +--> structural/semantic Brownfield analyzer (SpecDD only)
            |          |
            |          v
            |     human context review
            |
            v
JavaScript generator functions + bundled static files/templates
            |
            +--> collision / replacement bookkeeping
            +--> fingerprints and generation receipt
            v
Downloadable ZIP
            |
            v
Repository-local Markdown, YAML, JSON, and PowerShell Harness
```

The generator functions are deterministic for a given in-memory input and bundled asset set. However, the in-memory input is not persisted as a versioned project contract, and the renderer functions currently encode part of the domain model.

### 3.3 Ownership and source-of-truth reality

The intended Harness source of truth is `.agents/`, with a short root `AGENTS.md` primer and pointer-only runtime adapters. This is correctly reflected in the generated primer, registry, routing, workflow, rubric, budget, spec, and validation artifacts.

There are five important qualifications:

1. Rules-rich `.github/instructions/*.instructions.md` files are emitted only for Copilot. They contain behavioral policy, not only pointers, so some effective Harness knowledge remains tool-specific.
2. The canonical governance constitution and its generated working copy intentionally coexist, but synchronization is manual and can drift.
3. Feature Markdown specs and entity YAML specs are separate models without a machine-readable relationship.
4. Static files and JavaScript string renderers jointly define output; neither is a complete canonical model by itself.
5. SpecForge and SpecDeploy emit independent artifact sets and receipts rather than projections of one shared project definition.

### 3.4 Contract and schema inventory

| Contract | Where it currently lives | Formal schema status |
|---|---|---|
| Wizard project inputs | `specdd-kit/website/src/components/Wizard.jsx` and helper modules | React/JavaScript object shape only |
| Scaffold generation receipt | `renderScaffoldManifest` in `specdd-kit/website/src/components/generators.js` | Renderer and PowerShell validation conventions; no JSON Schema |
| Entity specification | `renderSpec` plus generated `.agents/specs/*.spec.yaml` | Renderer and validator conventions; no formal schema |
| Skill and rubric | static Markdown/frontmatter plus SpecDD/SpecForge renderers | Convention tested in JavaScript; no shared formal schema |
| Budget and telemetry | `.agents` static YAML/Markdown and PowerShell scripts | Convention and script validation only |
| Role Pack | `specforge-kit/website/src/components/roles.js` and generators | Hard-coded JavaScript catalog; no pack manifest/schema |
| Deployment provider | `specdeploy-kit/providers/*/provider.json` | JSON Schema at `specdeploy-kit/providers/_schema/provider.schema.json` |
| Deployment generation receipt | generated `specdeploy.json` | Template-defined; no independent schema version or formal schema |

The deployment-provider schema is the only formal data schema found. The existing Harness contract otherwise lives across executable renderers, static artifacts, tests, documentation, and validators.

### 3.5 Current runtime and tool coupling

- Copilot has rules-rich scoped instructions, prompts, and agent definitions under `specdd-kit/.github/`; these are more than pointer adapters.
- `CLAUDE.md` and `GEMINI.md` are generated pointer adapters; Cursor and Codex rely on root `AGENTS.md` discovery.
- Tool and MCP selections are hard-coded independently in SpecDD and SpecForge.
- Validator execution assumes PowerShell and, for acceptance checks, invokes command strings through `pwsh -Command`.
- SpecDeploy intentionally contains provider-specific deployment knowledge; that is a projection boundary, not canonical agent-runtime semantics.
- No current component calls an external agent runtime or stores runtime run state.

## 4. Harness v1 contract

This section freezes the current behavior as a compatibility contract. It describes what exists; it does not prescribe the internal representation of the future compiler.

### 4.1 Inputs

SpecDD accepts:

- scenario: Greenfield or Brownfield;
- analysis depth: structural or bounded semantic;
- project identity, personas, outcomes, constraints, domains, entities, and features;
- architecture and stack selections;
- governance principles and security controls;
- selected tools, MCP servers, and preferred model metadata;
- for Brownfield, detected evidence plus explicit human review and approval;
- for legacy Harness migration, explicit acknowledgement before replacement.

SpecForge accepts a target repository snapshot, selected roles, optional QA/UX modes, skills, and tools. SpecDeploy accepts application, provider, provider fields, CI choices, environments, and approval-gate choices.

### 4.2 Generated core

The generated Harness includes, as applicable:

- `AGENTS.md` as a short discovery primer;
- `.agents/REGISTRY.md` and `.agents/orchestration/ROUTING.md`;
- context and governance documents;
- domain skills and rubrics;
- entity specifications and feature/task artifacts;
- workflow instructions;
- budget, telemetry, and validation assets;
- optional MCP configuration containing placeholders rather than secrets;
- optional runtime projections and Role Pack additions;
- `specdd-scaffold-manifest.json` and Brownfield/migration reports.

### 4.3 Behavioral invariants

The compatibility compiler must preserve these invariants:

- `.agents/` remains canonical for Harness behavior.
- Runtime adapters carry pointers, not a second copy of canonical rules.
- The root primer remains concise and routes agents to focused context.
- Greenfield generation is deterministic and does not include Brownfield-only convergence assets.
- Brownfield evidence never silently becomes approved project truth.
- Brownfield collisions are skipped and reported unless the user explicitly acknowledges replacement of a recognized legacy Harness mechanism.
- Existing project knowledge is preserved; migration tasks remain drafts until human approval.
- Placeholders are explicit and are never presented as verified evidence.
- Approval requires cleared clarifications, executable checks or an explicit waiver, and reviewer metadata.
- Secrets are never embedded in generated MCP or deployment configuration.
- Multi-agent behavior remains inactive unless a later phase introduces and validates it explicitly.
- Eval enforcement starts in observation mode; no quality gate is claimed before sufficient real evidence exists.

### 4.4 Current fidelity and validation semantics

`specdd-scaffold-manifest.json` schema version 2 acts as an installation and provenance receipt. It records scenario, analysis depth, context-review status, selected project data, generated/skipped/replaced paths, content fingerprints, and Brownfield baselines.

The validators currently provide:

- required-path and reference checks;
- manifest schema 1/2 acceptance;
- fingerprint and Brownfield baseline integrity checks;
- context-review readiness checks;
- YAML parsing when the parser is available;
- secret-like token detection;
- spec approval checks and optional execution of acceptance commands;
- budget validation;
- project status of VERIFIED, PARTIAL, or FAILED.

These are important compatibility behaviors. They are not yet a complete schema system or an execution policy engine.

## 5. Manifest analysis

### 5.1 What the current manifest is

The scaffold manifest is best classified as a **generation receipt with fidelity metadata**. It answers:

- what the user selected;
- what the generator wrote, skipped, or replaced;
- which mutable generated files have fingerprints;
- which Brownfield source paths and contents formed the baseline.

### 5.2 What it is not

It is not yet:

- the canonical Project Definition;
- a typed graph of agents, stages, transitions, artifacts, and approvals;
- a capability catalog with dependencies and versions;
- a deployment contract shared with SpecDeploy;
- a runtime binding contract;
- an eval, telemetry, or run schema;
- a migration-aware semantic version history.

### 5.3 Evolution constraint

Phase 1 should not inflate the receipt until it becomes the new IR by accident. The canonical project model and the generation receipt have different lifecycles:

- the project model expresses user intent and portable semantics;
- the receipt records one compiler invocation and its materialized files.

They may reference one another by stable identity and version, but should remain separate contracts.

## 6. Gap analysis by target layer

| Layer | Reusable foundation | Missing contract or behavior | Phase implication |
|---|---|---|---|
| Spec | Context, constitution, features, entity specs, review gates | One typed project/spec model; explicit links among features, entities, checks, and tasks | Define the canonical project aggregate first |
| Harness | Primer, registry, routing, workflows, validators, migration safety | Typed Harness model, artifact ownership, versioned compiler boundary, elimination of rules-rich runtime copies | Compile existing v1 output before redesigning it |
| Capability | Domain skills, Role Pack skills, MCP hints, tool lists | Capability manifest, dependencies, permissions, inputs/outputs, versions, installation receipt | Do not equate a capability with a single skill file |
| Graph | Markdown workflows and inactive agent seeds | Nodes, typed edges, conditions, retry/failure paths, approvals, artifact contracts, graph validation | No orchestration implementation in Phase 1 |
| Eval | Rubrics, threshold metadata, baseline/drift scripts | Canonical result/evidence schema, scorer adapters, per-criterion enforcement, calibration lifecycle | Preserve `log_only`; specify semantics before enforcement |
| Loop | Telemetry events, drift review, draft improvement tasks | Stable run/work-item identity, causal trace, proposal lifecycle, adoption/rejection record | No self-improving loop until evidence is traceable |
| Runtime | Pointer adapters, MCP config, provider templates | Runtime-neutral binding, environment/credential/permission model, capability negotiation, lifecycle API | Warp must remain an adapter, never canonical state |

## 7. Cross-cutting technical debt

Priority is architectural risk, not implementation order.

| Priority | Debt | Consequence |
|---|---|---|
| P0 | No persisted, typed, versioned canonical Project Definition | Every new backend risks inferring semantics from generated files or UI state |
| P0 | Rules-rich Copilot instruction projection | Canonical Harness claims can diverge by selected tool |
| P0 | No artifact ownership/dependency graph | Collisions and upgrades are path-based rather than semantic |
| P1 | Generator logic contains domain rules and rendering together | Schema evolution and alternate projections will duplicate behavior |
| P1 | SpecDD, SpecForge, and SpecDeploy have separate receipts and models | The platform cannot compile a coherent project end to end |
| P1 | Workflows are prose rather than validated graphs | Routing, failure, retry, and approval semantics are implicit |
| P1 | Rubric, MCP, tool, and Harness-detection logic is duplicated | Drift between products is already possible |
| P1 | Role Packs have no versioned installation manifest | Upgrades, removals, and provenance are not reliable |
| P1 | Eval runner consumes scores but does not define scorer/evidence contracts | Quality claims cannot be compared across runtimes |
| P1 | Telemetry is small and best-effort | Work-item-to-artifact-to-eval traceability is unavailable |
| P2 | Preferred model input is not materialized into a portable runtime contract | UI captures intent the generator cannot honor consistently |
| P2 | Version constants and schema validation are inconsistent across kits | Compatibility behavior is hard to reason about centrally |
| P2 | No root aggregate build/test scripts | Repository-wide verification is discoverable only through workspace knowledge |

## 8. Warp mapping

Warp is the first target runtime because it exposes useful factory, agent, skill, trigger, runner, scorer, benchmark, and orchestration concepts. Its configuration must be treated as a compiled projection.

Primary references:

- [Factories overview](https://docs.warp.dev/factories/)
- [How Factories work](https://docs.warp.dev/factories/how-factories-work/)
- [Factory definition as code](https://docs.warp.dev/factories/factory-as-code/)
- [Factory agents](https://docs.warp.dev/factories/factory-agents/)
- [Factory skills](https://docs.warp.dev/factories/factory-skills/)
- [Measure and improve](https://docs.warp.dev/factories/measure-and-improve/)
- [Automation Platform overview](https://docs.warp.dev/platform/overview/)
- [Cloud environments](https://docs.warp.dev/platform/environments/)
- [Multi-agent orchestration](https://docs.warp.dev/platform/orchestration/)

### 8.1 Concept mapping

| Canonical concept | Warp projection | Fidelity |
|---|---|---|
| Project | `factory.yaml` identity and repositories | Partial; Warp config is not the whole project definition |
| Harness | agent defaults, per-agent harness selection, repository instructions | Split across configuration and repository content |
| Capability | factory/agent skills, prompt, MCP, and permissions | Lossy unless composed from multiple Warp constructs |
| Agent | `agents/<name>/agent.md` | Strong structural match |
| Graph stage/node | agent types plus foreman policy | Lossy; routing is substantially prompt-driven |
| Trigger | automation definitions | Strong for supported providers; runtime-specific vocabulary |
| Runtime binding | harness/model, runner, environment, worker host | Strong projection, not portable semantics |
| Eval | scorer definition | Partial; Warp classification scoring is narrower than the target eval model |
| Benchmark | benchmark configuration and recorded runs | Strong runtime projection |
| Loop proposal | self-improvement follow-up work and PR | Partial; governance and adoption remain canonical concerns |
| Approval | foreman instructions plus repository/provider enforcement | Split; instruction intent and actual enforcement differ |
| Run/telemetry | Warp task/run records, transcript, dashboard/API | Runtime state; must normalize into canonical evidence |

### 8.2 Reusable ideas

- Git-versioned factory definitions and skills;
- explicit separation of agent configuration, automation, runner, scorer, and environment;
- per-agent model or harness selection;
- durable parent/child run identity and mailbox-oriented coordination;
- isolated run lifecycle and cost/quality comparison;
- human review before adopting improvement proposals;
- repository permissions as an enforcement boundary distinct from agent instructions.

### 8.3 Runtime-specific ideas

- Warp's directory names and `v1alpha1` syntax;
- its default foreman/triage/spec/implement/review taxonomy;
- supported integration, harness, model, runner, and environment identifiers;
- one-level parent/child constraint and Warp run statuses;
- Warp-hosted dashboards, task state, and cloud execution behavior;
- scorer classification labels and self-improvement switches.

### 8.4 Ideas not to copy into the canonical model

- treating the foreman prompt as the only graph definition;
- assuming the factory's terminal state means merged or deployed;
- coupling canonical identities to Warp task, run, agent, or model identifiers;
- requiring cloud execution or a Warp-hosted source of truth;
- reducing evaluation to one vendor's classification scorer;
- presenting instruction-level approvals as if they enforce repository permissions;
- assuming child agents can recursively create arbitrary graph depth.

## 9. Migration constraints

The following constraints are non-negotiable for the transition:

1. Existing generated Harness v1 repositories must remain usable without regeneration.
2. A new compiler must reproduce the current output contract before intentionally changing layout or semantics.
3. Schema migrations must be explicit, versioned, testable, and reversible at the model level where possible.
4. Brownfield context remains human-reviewed; an importer cannot silently promote inferred data to canonical truth.
5. Existing collisions, legacy classification, skip/replace reporting, and source fingerprints must be preserved.
6. Canonical IDs must survive file renames and runtime changes; paths and vendor IDs are references, not identities.
7. Generated projections must carry compiler/model version and provenance without embedding secrets.
8. User-authored knowledge and generated mechanism need distinguishable ownership.
9. The existing entity YAML, feature Markdown, governance, and deployment artifacts require adapters or migrations; none may be silently discarded.
10. Warp availability or API changes must not block local/spec-only use of SpecDD.

## 10. ADR candidates

These are questions that require ADRs in Phase 1. They are deliberately **proposed**, not accepted here.

| Candidate | Decision required | Options that must be compared |
|---|---|---|
| ADR-001 Canonical serialization | Authoritative model format and schema technology | JSON + JSON Schema; YAML + JSON Schema; typed source with generated schemas |
| ADR-002 Identity and references | Stable IDs for project, artifact, capability, graph node, run, and evidence | Opaque IDs; scoped human-readable IDs; content-addressed identities |
| ADR-003 Aggregate boundaries | One document versus linked documents | Monolith; root manifest plus typed modules; event-sourced model |
| ADR-004 Compiler architecture | How semantics are separated from renderers | Functional pipeline; plugin compiler; intermediate normalized graph |
| ADR-005 Compatibility policy | Meaning of version changes and migration guarantees | SemVer profiles; schema epoch plus compiler compatibility matrix |
| ADR-006 Ownership and overlays | How generated and user-authored content coexist | Generated-only zones; three-way merge; overlays/patches; explicit protected ownership |
| ADR-007 Policy enforcement | Distinguish intended rules from enforceable controls | Declarative policy plus runtime capability report; prose-only fallback |
| ADR-008 Validation model | Syntactic, semantic, and projection validation boundaries | Single validator; layered validators; schema plus rules engine |
| ADR-009 Projection packaging | How adapters are discovered and versioned | Built-in registry; package interface; declarative templates with code hooks |
| ADR-010 Existing manifest relationship | Link between Project Definition and generation receipt | Embedded snapshot; stable reference plus digest; separate append-only receipt |

## 11. Phase 1 boundary

### 11.1 Questions Phase 1 must answer

- What is the smallest canonical project aggregate that can reproduce the current SpecDD Harness?
- Which fields express intent, and which are derived compiler metadata?
- How are unknown fields, extensions, and forward compatibility handled?
- How are IDs scoped and preserved across renames and projections?
- How are SpecDD, SpecForge, and SpecDeploy data represented without forcing a premature mega-schema?
- Which invariants can be expressed in schema and which require semantic validation?
- What is the explicit ownership model for generated versus user-authored artifacts?
- How does an existing schema-v2 scaffold receipt import into the model without claiming information it never recorded?
- What golden fixtures prove compatibility for Greenfield, clean Brownfield, collision Brownfield, and acknowledged legacy migration?
- How are compiler diagnostics represented so a UI, CLI, or future API can consume them identically?

### 11.2 Allowed implementation scope

- versioned Project Definition schema and TypeScript types;
- parser, normalizer, and semantic validator;
- stable diagnostics contract;
- compatibility compiler that emits the current SpecDD Harness v1;
- golden fixtures and determinism/migration tests;
- explicit import boundary for current wizard state and scaffold receipts.

### 11.3 Explicitly out of scope

- Warp adapter or deployment;
- runtime API calls, secrets, or hosted execution;
- graph orchestration or multi-agent activation;
- self-improvement loops;
- changing approval semantics;
- redesigning the portal UX;
- unifying all deployment providers into the first schema at the expense of the minimal slice;
- changing existing generated paths merely for cleanliness.

### 11.4 Phase 1 exit criteria

Phase 1 is complete only when:

- a documented versioned Project Definition validates independently of React;
- the canonical model contains no Warp-specific identifiers or lifecycle assumptions;
- the compiler deterministically reproduces agreed Harness v1 golden outputs;
- diagnostics distinguish schema, semantic, compatibility, and projection failures;
- Brownfield imports preserve evidence and require explicit approval for inferred context;
- migration behavior from current inputs/receipts is tested;
- unit and E2E baselines remain green;
- accepted ADRs record the decisions listed above or explicitly defer them with consequences.

## 12. Roadmap validation

The Phase 1–10 sequence is sound. Repository and Warp evidence support preserving every phase, with four refinements:

1. **Insert compatibility compilation into Phase 1.** Defining a schema without proving it can emit Harness v1 would allow model and product behavior to drift immediately.
2. **Separate Project Definition from generation receipt.** The current manifest is valuable but should not become the canonical IR through incremental field accumulation.
3. **Add policy/enforcement as a cross-cutting concern.** Runtime instructions, repository permissions, credential scope, and human approval have different enforcement loci and must not be conflated.
4. **Treat deployment as an adjacent projection until the core stabilizes.** SpecDeploy is data-driven and reusable, but forcing its full provider model into the first aggregate would violate the thin-vertical-slice rule.

| Phase | Validation | Evidence-based refinement |
|---|---|---|
| 1 — Canonical Manifest / IR | Keep | Add the Harness v1 compatibility compiler and keep the Project Definition separate from the generation receipt |
| 2 — SpecForge Capability Model | Keep | Model a capability as a composition of skills, workflow, policy, eval, context, permissions, and optional agent metadata—not as a renamed skill |
| 3 — SpecControl Domain Model | Keep | Add explicit artifact ownership and policy-enforcement location to graph and policy contracts |
| 4 — Warp Adapter | Keep | Use the researched mapping in this document as input; require a conformance/unsupported-feature report because Warp routing is partly prompt-driven |
| 5 — Minimum Viable Software Factory | Keep | Preserve the issue-to-draft-PR vertical slice and its explicit exclusion of deployment |
| 6 — Eval Runtime Adapters | Keep | Define canonical result and evidence semantics before mapping to Warp's classification-oriented scorer |
| 7 — Run History and Observability | Keep | Establish stable work-item/run/node/artifact IDs earlier as prerequisites, while still implementing the observability store here |
| 8 — Benchmarking | Keep | Require fixed task fixtures and configuration fingerprints so comparisons remain reproducible across runtimes |
| 9 — Improvement Proposals | Keep | Preserve proposal-only behavior and record adoption or rejection as auditable human decisions |
| 10 — SpecDeploy Integration | Keep | Keep delivery knowledge in SpecDeploy and expose it to SpecControl through contracts rather than merging product ownership |

No additional runtime phase is needed before Phase 10. A second backend becomes valuable after the Warp adapter and minimal factory prove the adapter contract; it can then validate portability without interrupting the roadmap's thin vertical slice.

No evidence found in Phase 0 justifies changing the core principles: SpecControl operates Harness; SpecDD manages Harness; runtimes are projections; human gates remain explicit; no evidence is fabricated.
