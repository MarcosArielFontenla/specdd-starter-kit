# SpecDD Platform Evolution — Agentic Control Plane Roadmap

## 0. Mission

You are working as a Senior Software Architect / Agentic Systems Engineer on the evolution of the existing **SpecDD Starter Kit** repository:

Repository:

`https://github.com/MarcosArielFontenla/specdd-starter-kit`

Your task is NOT to redesign the project from scratch.

Your task is to evolve the existing SpecDD ecosystem from a **Harness generation platform** into the foundation of a **vendor-neutral Agentic Software Factory / Control Plane architecture**.

The architectural direction is influenced by modern agentic development platforms such as **Warp**, particularly:

- Warp Agentic Development Environment
- Warp Agents
- Warp Factories
- agent pipelines
- multi-agent orchestration
- configurable harnesses
- evals
- benchmarks
- observability
- human checkpoints
- self-improvement loops
- software factories

Primary conceptual reference:

`https://www.warp.dev/`

Also study Warp documentation and current Factory architecture when necessary.

IMPORTANT:

Warp is a reference architecture and may become the FIRST execution backend.

Warp must NOT become the source of truth of SpecDD.

### Accepted clarification — 2026-09-04

Per the project owner's explicit direction, Warp is an architectural and functional
reference, not a required service, account, credit balance, terminal, or paid plan.
The existing Phase 4 adapter is an optional projection. Phase 5 may use an available
agent execution tool with human-operated checkpoints; it must still prove the real
Issue → Planner → Spec → Human Approval → Developer → Reviewer → Eval → Draft PR flow.
Mocks and local conformance tests are preparation, not completion evidence.
Phase 6's Warp scorer is an optional target, not a prerequisite to canonical evals.
This clarification supersedes mandatory-Warp wording elsewhere in this roadmap.
See `docs/control-plane/adrs/0008-runtime-optional-real-execution-required.md`.

The target architecture must remain:

- vendor-neutral
- model-neutral
- runtime-neutral
- portable
- versionable
- deterministic where possible
- repository-first
- human-governed
- extensible through adapters

The intellectual property and architectural center of SpecDD must remain the:

- Specs
- Harness
- Capabilities
- Policies
- Canonical Evals
- Workflow / Graph definitions

Warp, Codex, Claude Code, LangGraph or future engines are execution technologies behind adapters.

---

# 1. Existing System

Before making any architectural proposal or code change:

1. Inspect the complete repository.
2. Read its README.
3. Read current architecture documentation.
4. Read implementation status.
5. Read the roadmap.
6. Inspect all existing schemas.
7. Inspect the current scaffold manifest.
8. Inspect generated Harness files.
9. Inspect SpecDD.
10. Inspect SpecForge.
11. Inspect SpecDeploy.
12. Inspect shared packages.
13. Inspect current tests.
14. Inspect current Superpowers specs/plans if present.

Do NOT assume the current implementation based solely on this prompt.

The repository is the source of truth for current state.

---

# 2. Current Product Model

The project currently consists conceptually of:

```text
SpecDD Platform
│
├── SpecDD
│   ├── Greenfield Wizard
│   └── Brownfield Wizard
│
├── SpecForge
│   └── Role Pack / Harness Capability generation
│
├── SpecDeploy
│   └── CI/CD + IaC + deployment scaffolding
│
└── Platform
    └── unified portal / UI
```

The current Harness is built around a vendor-neutral core such as:

```text
AGENTS.md

.agents/
├── REGISTRY.md
├── orchestration/
├── skills/
├── specs/
├── evals/
├── workflows/
├── telemetry/
├── scripts/
├── cold-start/
└── subagents/

context/
specs/
templates/
docs/
```

Tool-specific files such as:

```text
CLAUDE.md
GEMINI.md
.github/
.vscode/
```

must remain thin adapters/pointers.

They must NOT become independent sources of business rules or Harness logic.

The `.agents/` architecture should remain the canonical Harness core unless repository analysis demonstrates a justified evolution.

---

# 3. Current Philosophy

The existing design already follows important principles that must be preserved:

## Source of Truth

Specifications define intended behavior.

Code is an output.

The Harness defines how AI agents should operate against that source of truth.

## Vendor Neutrality

The Harness must be consumable by multiple tools:

- Codex
- Claude Code
- Cursor
- GitHub Copilot
- Gemini
- Warp
- future agent runtimes

## Human Governance

Agents may:

- inspect
- propose
- plan
- implement
- evaluate
- generate artifacts

But important architectural or lifecycle changes must have explicit gates.

## Brownfield Safety

Existing projects must not be silently modified or overwritten.

Detection does not equal approval.

Context detection does not equal specification approval.

## Evidence over Fabrication

Do not invent:

- acceptance criteria
- baselines
- architecture facts
- business rules
- passing eval evidence

Unknown information must remain unknown, partial or explicitly unresolved.

---

# 4. Architectural Goal

The project should evolve toward:

```text
                      SpecDD PLATFORM

                             │
                     Project Definition
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
         SpecDD          SpecForge        SpecDeploy
       Foundation       Capabilities       Delivery
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
                             ▼
                        Harness IR
                             │
                             ▼
                         SpecControl
                             │
                    Workflow / Graph
                             │
              ┌──────────────┼───────────────┐
              ▼              ▼               ▼
            Warp           Codex          Future
          Factory          Local          Runtime
              │
              ▼
             Runs
              │
              ▼
             Evals
              │
              ▼
          Telemetry
              │
              ▼
          Benchmarks
              │
              ▼
       Improvement Loop
```

The key transformation is:

```text
FROM

Wizard
  ↓
Files


TO

Wizard / Project Definition
  ↓
Canonical Intermediate Representation
  ↓
Compilers / Generators
  ↓
Harness + Runtime Adapters + Execution Definitions
```

SpecDD should gradually evolve from a file generator into something closer to a:

# Harness Compiler Platform

---

# 5. Core Architectural Contracts

Maintain a strong separation between these concepts.

## SPEC

Defines:

> What should exist?

Examples:

- requirements
- behavior
- acceptance conditions
- design contracts
- business constraints

---

## HARNESS

Defines:

> How should the agent work?

Examples:

- rules
- context loading
- routing
- skills
- architectural boundaries
- verification expectations
- context budgets
- operational procedures

---

## CAPABILITY

Defines:

> What specialized ability can an agent use?

Examples:

- QA
- Business Analysis
- Development
- UX
- Security
- Architecture
- DevOps

A capability may include:

```text
Skill
Playbooks
Workflows
Role policies
Evals
Subagent definition
Context requirements
```

SpecForge should evolve toward this model.

---

## GRAPH

Defines:

> Who runs, when and after whom?

Examples:

```text
Triage
  ↓
Specification
  ↓
Implementation
  ↓
Review
  ↓
Verification
```

Graph definitions must remain canonical inside SpecDD / SpecControl.

They must NOT exist only as Warp-specific Factory definitions.

---

## EVAL

Defines:

> Was the result good enough?

Canonical eval definitions belong to SpecDD.

Runtime-specific scorers are adapters.

---

## LOOP

Defines:

> How does the system improve based on evidence?

Example:

```text
Runs
 ↓
Evals
 ↓
Failure patterns
 ↓
Improvement proposal
 ↓
Benchmark
 ↓
Human approval
 ↓
Harness / Graph PR
```

Automatic self-modification without governance is NOT allowed.

---

## RUNTIME

Defines:

> Where and how does execution happen?

Possible runtimes:

- Warp
- Codex
- Claude Code
- LangGraph
- custom runtime
- future platforms

Runtime must remain replaceable.

---

# 6. Control Plane vs Harness

This distinction is foundational.

## Harness responsibility

The Harness defines:

```text
How the agent works
What rules it follows
What context it reads
What capabilities it can use
How it validates work
What architectural constraints exist
```

## Control Plane responsibility

The Control Plane defines:

```text
Who runs
When they run
Why they run
Which stage follows another
Which model / harness / runtime executes
Which permissions exist
Which human gates are required
How failures route
Which evals execute
How run history is observed
```

Therefore:

```text
SpecDD creates / manages the Harness.

SpecControl operates the Harness.
```

Do not merge these responsibilities.

---

# 7. Proposed New Component — SpecControl

Introduce the concept of:

```text
SpecControl
```

The name is provisional and should be validated against repository naming conventions.

Its responsibility:

> Define and compile agentic execution workflows for a project while remaining independent from execution runtimes.

Potential structure:

```text
speccontrol-kit/
```

and/or generated project artifacts similar to:

```text
.control/
├── manifest.yaml
│
├── agents/
│   ├── planner.yaml
│   ├── developer.yaml
│   ├── reviewer.yaml
│   └── verifier.yaml
│
├── graphs/
│   └── feature-delivery.yaml
│
├── policies/
│   ├── approvals.yaml
│   ├── permissions.yaml
│   └── risk.yaml
│
├── evals/
│   └── scorecards.yaml
│
├── environments/
│   ├── local.yaml
│   └── warp.yaml
│
└── adapters/
```

Do NOT implement this exact structure blindly.

First determine how this should fit naturally with the existing `.agents/` model and monorepo.

Avoid duplicate sources of truth.

---

# 8. Intermediate Representation — Critical Evolution

One of the highest priority architectural changes is to formalize a canonical machine-readable representation.

The repository currently has a scaffold manifest.

Study it carefully.

Determine whether it can evolve into a true:

```text
Harness Manifest
```

or:

```text
SpecDD Project Manifest
```

The exact name must be decided through architecture analysis.

Conceptually it should eventually describe:

```yaml
project:

harness:
  version:
  schema:

architecture:

capabilities:

agents:

specs:

workflows:

graphs:

evals:

policies:

telemetry:

deployment:

runtime:
```

This becomes an Intermediate Representation.

Target compiler flow:

```text
Wizard
   │
   ▼
Project Definition
   │
   ▼
Canonical IR
   │
   ├── Harness generator
   ├── AGENTS.md generator
   ├── Codex adapter
   ├── Claude adapter
   ├── Warp adapter
   ├── Eval adapters
   ├── CI integration
   └── Deployment generation
```

The canonical IR must not become a monolithic dumping ground.

Design bounded sub-schemas where appropriate.

---

# 9. Warp Integration Strategy

Warp is the first candidate Control Plane runtime.

Study current Warp documentation before implementing anything.

Focus particularly on:

- Warp Factories
- factory-as-code
- stages
- harness selection
- model selection
- triggers
- environments
- human checkpoints
- evals
- scorers
- benchmarks
- execution logs
- telemetry
- self-improvement / observer patterns
- API / CLI / SDK
- self-hosting options if relevant

Do NOT copy Warp's domain model into SpecDD.

Instead:

```text
Canonical SpecDD Definition
             │
             ▼
        Warp Adapter
             │
             ▼
      Warp Factory Definition
             │
             ▼
        Warp Runtime
```

Warp is an execution backend.

It is NOT the canonical architecture.

---

# 10. First Warp Adapter Goal

The first Warp integration must remain deliberately small.

Do NOT automate the entire SDLC.

Initial workflow:

```text
GitHub Issue
      ↓
Planner Agent
      ↓
Specification Artifact
      ↓
Human Approval
      ↓
Developer Agent
      ↓
Reviewer Agent
      ↓
Canonical Evals
      ↓
Draft Pull Request
```

Explicitly out of scope initially:

- automatic merge
- production deployment
- autonomous architecture changes
- autonomous Harness modification
- complex swarm behavior
- dozens of subagents
- security automation beyond basic gates
- full SpecDeploy integration
- self-improvement writes
- dynamic model optimization
- distributed orchestration
- custom execution infrastructure

Prove the smallest vertical slice first.

---

# 11. SpecForge Evolution

SpecForge currently works around role packs.

Its next conceptual evolution should be:

```text
Role Pack
   ↓
Capability Pack
```

Example:

```text
QA Capability

├── Skill
│
├── Playbooks
│
├── Workflows
│
├── Policies
│
├── Evals
│
├── Context requirements
│
└── Agent role seed
```

A graph should then reference capabilities rather than duplicate role behavior.

Example:

```yaml
implementation:
  capabilities:
    - development

verification:
  capabilities:
    - qa
```

The execution graph answers:

```text
WHO / WHEN
```

The capability answers:

```text
HOW / WITH WHAT EXPERTISE
```

Do not mix those concerns.

---

# 12. SpecDeploy Position

SpecDeploy currently generates deployment-oriented artifacts.

Do NOT prioritize completing SpecDeploy before the Control Plane vertical slice.

Its future responsibility should eventually include:

```text
Delivery Capability

CI
CD
IaC
Environments
Release strategy
Rollback
Smoke tests
Deployment verification
Security gates
Runtime health
Observability
```

SpecDeploy should join the Control Plane only after:

```text
Issue
→ Spec
→ Implement
→ Review
→ Eval
→ PR
```

works reliably.

---

# 13. Canonical Evals

Existing `.agents/evals/` and SpecForge role rubrics must remain canonical.

Runtime implementations should adapt them.

Target model:

```text
Canonical Eval
      │
      ├── local evaluator
      ├── CI evaluator
      ├── Warp scorer
      └── future runtime scorer
```

Potential eval dimensions:

```yaml
id: architecture-compliance

dimensions:
  boundaries:
  dependencies:
  patterns:
  testing:
  security:

threshold:
```

Do not allow Warp scorer definitions to become the only source of eval semantics.

---

# 14. Telemetry Architecture

The project already has a vendor-neutral telemetry concept.

Preserve and evolve it.

Target conceptual events:

```text
workflow.started
workflow.completed

agent.run.started
agent.run.completed
agent.run.failed

eval.started
eval.completed

approval.requested
approval.granted
approval.rejected

artifact.created
artifact.updated

benchmark.completed

improvement.proposed
```

Potential event envelope:

```json
{
  "event": "agent.run.completed",
  "timestamp": "...",
  "runId": "...",
  "workflow": "feature-delivery",
  "node": "implementation",
  "role": "developer",
  "capabilities": ["development"],
  "runtime": "warp",
  "harness": "codex",
  "model": "...",
  "durationMs": 0,
  "result": "success"
}
```

Runtime telemetry should be translated through adapters.

Do not make Warp's telemetry schema canonical.

---

# 15. Improvement Loop

Self-improvement is a later phase.

Desired model:

```text
Runs
  ↓
Telemetry
  ↓
Evals
  ↓
Failure Pattern Detection
  ↓
Improvement Agent
  ↓
Proposal
  ↓
Benchmark
  ↓
Human Approval
  ↓
PR
```

Critical rule:

```text
Observer → Proposal
```

NOT:

```text
Observer → Direct Harness Mutation
```

The system can recommend changes.

Humans govern changes to:

- Harness
- Specs
- architecture
- graph
- policies
- eval thresholds
- production delivery

---

# 16. Architectural Layers

Use this mental model:

```text
┌─────────────────────────────────────┐
│               PRODUCT               │
│ Requirements / Specs / Domains      │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│               HARNESS               │
│ Rules / Context / Skills / Routing  │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│             CAPABILITIES            │
│ BA / QA / DEV / UX / Security       │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│          CONTROL PLANE / GRAPH      │
│ Stages / Agents / Gates / Policies  │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│              RUNTIMES               │
│ Warp / Codex / Claude / Future      │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│          OBSERVABILITY + EVALS      │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│                LOOPS                │
└─────────────────────────────────────┘
```

Preserve separation between layers.

---

# 17. Target Repository Direction

The current monorepo should probably remain the home of this evolution unless strong architectural evidence suggests otherwise.

Potential future direction:

```text
specdd-starter-kit/
│
├── platform/
│
├── packages/
│   ├── ui/
│   ├── manifest/
│   ├── schemas/
│   ├── telemetry/
│   └── control-plane/
│
├── specdd-kit/
├── specforge-kit/
├── specdeploy-kit/
└── speccontrol-kit/
```

Do NOT create all these packages immediately.

First determine which abstractions genuinely need independent packages.

Avoid premature modularization.

---

# 18. Development Principles

Throughout the evolution apply:

## YAGNI

Do not build speculative infrastructure.

## KISS

Prefer explicit contracts over clever abstractions.

## Separation of Concerns

Especially:

```text
Harness != Runtime
Capability != Agent Graph
Canonical Eval != Runtime Scorer
Spec != Implementation
Control Plane != Execution Backend
```

## Portability

The canonical SpecDD model must survive replacing Warp.

## Explicit Versioning

Schemas must be versioned.

## Determinism

Generation should be reproducible where possible.

## Human-in-the-loop

Important transitions require explicit approval.

## Traceability

A run should be traceable:

```text
Requirement
→ Spec
→ Workflow
→ Agent
→ Code
→ Eval
→ PR
```

## Backwards Compatibility

Greenfield and Brownfield flows already exist and must not be casually broken.

Any Harness schema evolution must include migration strategy.

---

# 19. Anti-Goals

Do NOT turn SpecDD into:

- a Warp configuration generator only
- a LangGraph wrapper
- a model-specific product
- a Claude-only Harness
- a Codex-only Harness
- an orchestration engine built from scratch
- an agent swarm experiment
- an autonomous self-modifying system
- a huge distributed platform
- a Kubernetes platform
- a generic workflow engine
- a replacement for GitHub Actions
- a replacement for Warp

The differentiating layer is the portable architecture and governance around agents.

---

# 20. Evolution Roadmap

Work through the following roadmap.

Do not implement future phases prematurely.

---

## PHASE 0 — Baseline and Architecture Freeze

Goal:

Understand and stabilize the current Harness v1 contract.

Tasks:

- inspect existing architecture
- inventory generated artifacts
- inventory schemas
- inventory adapters
- inventory validation gates
- inventory telemetry
- inventory evals
- inventory SpecForge integration points
- inventory SpecDeploy contracts
- identify accidental coupling
- identify duplicated sources of truth

Deliverables:

```text
Current Architecture Map
Harness v1 Contract
Architecture Decision Records
Known Technical Debt
Migration Constraints
```

Do NOT modify architecture until this analysis is complete.

---

## PHASE 1 — Canonical Manifest / IR

Goal:

Create a stable machine-readable representation of a SpecDD project.

Investigate whether the current scaffold manifest should:

- evolve
- split
- be wrapped
- remain separate from runtime manifest

Define:

```text
Project
Harness
Architecture
Capabilities
Specs
Workflows
Evals
Policies
Telemetry
Deployment
Runtime metadata
```

Deliverables:

- schema
- TypeScript types
- validator
- migration from current manifest schema
- tests
- ADR
- examples

This phase is foundational.

Do not build SpecControl before the IR is sufficiently stable.

---

## PHASE 2 — SpecForge Capability Model

Goal:

Evolve Role Packs toward composable Capability Packs.

Create a capability contract that can represent:

- role
- skills
- playbooks
- workflows
- policies
- evals
- context
- subagent metadata

Maintain backward compatibility where practical.

Deliverables:

- capability schema
- migration strategy
- generated examples
- routing integration
- tests
- ADR

---

## PHASE 3 — SpecControl Domain Model

Goal:

Introduce the portable Control Plane definition.

Define canonical concepts such as:

```text
Workflow
Graph
Node
Edge
Agent Role
Capability Binding
Approval
Policy
Failure Route
Retry
Eval Gate
Artifact Contract
Runtime Hint
```

Deliverables:

- graph schema
- policy schema
- examples
- validator
- TypeScript model
- initial SpecControl package/kit if justified
- ADRs
- tests

Do not integrate Warp deeply yet.

---

## PHASE 4 — Warp Adapter

Goal:

Use Warp as the first external execution backend.

Implement:

```text
SpecControl Definition
        ↓
Warp Adapter / Compiler
        ↓
Warp Factory Configuration
```

Study current Warp APIs/configuration before implementing.

The adapter must be replaceable.

Deliverables:

- mapping document
- unsupported feature report
- Warp adapter
- generated Factory example
- adapter tests
- ADR

---

## PHASE 5 — Minimum Viable Software Factory

Goal:

Prove one end-to-end workflow.

Target:

```text
GitHub Issue
      ↓
Planner
      ↓
Spec
      ↓
Human Approval
      ↓
Developer
      ↓
Reviewer
      ↓
Eval
      ↓
Draft PR
```

Success criteria:

- uses generated Harness
- agents consume canonical skills
- graph is defined outside Warp
- an available execution tool runs the workflow; Warp is optional
- human gate works
- canonical eval runs
- telemetry exists
- execution can be traced

Do not add deployment.

---

## PHASE 6 — Eval Runtime Adapters

Goal:

Bridge canonical eval definitions to runtime evaluators/scorers.

Implement first:

```text
Canonical Eval
    ↓
Warp Scorer
```

Potential future:

```text
Canonical Eval
├── local
├── CI
├── Warp
└── future
```

Deliverables:

- eval adapter contract
- Warp implementation
- score normalization
- evidence capture
- tests
- ADR

---

## PHASE 7 — Run History and Observability

Goal:

Create vendor-neutral run observability.

Capture:

- workflow
- graph node
- agent
- capability
- runtime
- model
- duration
- status
- artifacts
- evals
- approvals
- failures

Normalize external runtime events into SpecDD telemetry.

Do not build a large observability platform.

Start with structured artifacts/logs.

---

## PHASE 8 — Benchmarking

Goal:

Compare execution configurations.

Dimensions may include:

```text
Harness
Model
Runtime
Prompt strategy
Capability composition
Graph configuration
```

Metrics:

```text
Quality
Eval score
Cost
Latency
Retries
Human interventions
Defect rate
```

Benchmarks must use reproducible tasks where possible.

---

## PHASE 9 — Improvement Proposals

Goal:

Introduce controlled Loop Engineering.

Implement:

```text
Run History
   ↓
Failure Analysis
   ↓
Improvement Proposal
   ↓
Benchmark
   ↓
Human Review
   ↓
PR
```

No direct automatic Harness mutation.

---

## PHASE 10 — SpecDeploy Integration

Goal:

Extend graph execution into controlled delivery.

Potential flow:

```text
Issue
 ↓
Spec
 ↓
Implement
 ↓
Review
 ↓
Verify
 ↓
PR
 ↓
Merge Gate
 ↓
Build
 ↓
Deploy Staging
 ↓
Smoke Test
 ↓
Approval
 ↓
Production
 ↓
Post-deploy Verification
```

SpecDeploy remains responsible for delivery knowledge.

SpecControl orchestrates when it happens.

---

# 21. Required Work Method

For every phase follow:

```text
DISCOVER
   ↓
MODEL
   ↓
SPEC
   ↓
REVIEW
   ↓
PLAN
   ↓
IMPLEMENT
   ↓
TEST
   ↓
VALIDATE
   ↓
DOCUMENT
```

Do not jump directly into implementation.

For any substantial architectural change create:

```text
ADR
```

covering at minimum:

- context
- problem
- options considered
- decision
- consequences
- migration impact

---

# 22. Phase Boundaries

Each phase must have explicit:

```text
Entry Criteria
Deliverables
Acceptance Criteria
Exit Criteria
Deferred Work
Risks
```

A phase may NOT silently absorb future roadmap work.

Example:

Phase 3 must not accidentally implement:

- benchmarking
- self-improvement
- deploy orchestration

unless required as minimal enabling infrastructure.

---

# 23. Documentation to Produce

Create a dedicated evolution documentation area.

Suggested concept:

```text
docs/control-plane/
```

Potential documents:

```text
architecture.md
roadmap.md

concepts/
  harness-vs-control-plane.md
  spec.md
  capability.md
  graph.md
  eval.md
  loop.md
  runtime.md

adrs/

schemas/

warp/
  architecture-mapping.md
  adapter-design.md
  limitations.md

phases/
  phase-0.md
  phase-1.md
  ...
```

Adapt this structure to existing repository conventions.

Do not duplicate existing documentation unnecessarily.

---

# 24. Roadmap Tracking

Maintain an explicit status table.

Example:

```text
| Phase | Status | Spec | Plan | Implementation | Validation |
|-------|--------|------|------|----------------|------------|
| 0 | ... | ... | ... | ... | ... |
| 1 | ... | ... | ... | ... | ... |
```

Statuses should be evidence-based.

Never mark something completed because files merely exist.

---

# 25. Initial Task

START ONLY WITH PHASE 0.

Do not begin coding the Control Plane yet.

Perform a repository-wide architectural discovery.

Then produce:

## A. Current-State Architecture

Explain:

- what SpecDD currently owns
- what SpecForge currently owns
- what SpecDeploy currently owns
- what Platform owns
- what shared packages own
- where the current Harness contract lives
- where schemas live
- where runtime/tool coupling exists

## B. Harness v1 Contract

Document the current canonical Harness.

## C. Current Manifest Analysis

Explain what the current manifest represents and what it does NOT represent.

## D. Gap Analysis

Compare the current architecture against the desired:

```text
Spec
Harness
Capability
Graph
Eval
Loop
Runtime
```

Identify missing abstractions.

## E. Warp Mapping

Research current Warp architecture and map:

```text
SpecDD Concept
↕
Warp Concept
```

Clearly distinguish:

```text
Reusable idea
Runtime integration opportunity
Warp-specific feature
Feature we should NOT copy
```

## F. Proposed Phase 1 Design Questions

Do not implement Phase 1 yet.

List the architectural questions that must be resolved before formalizing the IR.

## G. Roadmap Validation

Review the 10-phase roadmap and propose modifications only when justified by evidence found in the repository or current Warp architecture.

---

# 26. Important Decision Rule

When deciding whether something belongs in SpecDD or Warp, use:

```text
Would this concept still need to exist if Warp disappeared tomorrow?
```

If YES:

It probably belongs in the canonical SpecDD architecture.

If NO:

It may belong in the Warp adapter/runtime layer.

Examples:

```text
Specification            → SpecDD
Capability                → SpecDD
Architecture policies     → SpecDD
Canonical Eval            → SpecDD
Agent graph               → SpecDD
Human approval semantics  → SpecDD

Warp Factory syntax       → Warp Adapter
Warp scorer config        → Warp Adapter
Warp environment IDs      → Warp Adapter
Warp execution metadata   → Warp Adapter
```

---

# 27. Final Architectural Objective

The long-term product should become:

```text
            ┌─────────────────────────────────┐
            │          SpecDD Platform         │
            └────────────────┬────────────────┘
                             │
                      Project Definition
                             │
            ┌────────────────┼─────────────────┐
            │                │                 │
          SpecDD         SpecForge        SpecDeploy
            │                │                 │
            └────────────────┼─────────────────┘
                             │
                             ▼
                       Canonical IR
                             │
                             ▼
                    Harness + Capabilities
                             │
                             ▼
                       SpecControl
                             │
                      Agentic Graph
                             │
           ┌─────────────────┼──────────────────┐
           │                 │                  │
          Warp             Codex             Future
        Runtime            Runtime            Runtime
           │
           └─────────────────┼──────────────────┘
                             ▼
                            Runs
                             │
                             ▼
                            Evals
                             │
                             ▼
                         Telemetry
                             │
                             ▼
                        Benchmarks
                             │
                             ▼
                   Improvement Proposals
                             │
                             ▼
                       Human Approval
                             │
                             └──────────────► Evolution
```

The desired maturity progression is:

```text
Prompt Engineering
        ↓
Context Engineering
        ↓
Harness Engineering
        ↓
Graph Engineering
        ↓
Loop Engineering
        ↓
Agentic Software Factory
```

SpecDD should provide the portable architecture that makes this possible.

Warp is initially the execution accelerator.

It must never become the architectural owner.

---

# 28. Operating Constraint

Do not over-engineer.

The most important principle for this roadmap is:

> Add the smallest architectural abstraction necessary to unlock the next proven capability.

The system must evolve through validated vertical slices.

Do not design the final enterprise platform in one iteration.

---

# 29. Start

Now inspect the repository thoroughly.

Research current Warp documentation where necessary.

Do not modify code yet.

Begin **PHASE 0 — Baseline and Architecture Freeze**.

Produce the Phase 0 architectural analysis, gap analysis, Warp mapping, ADR candidates and recommended Phase 1 boundaries before proposing implementation.
