# SpecForge Workspace Evolution — Agentic Role & Artifact Platform Roadmap

## 0. Mission

You are working as a Senior Software Architect / Product Engineer / Agentic Systems Engineer on the evolution of the existing **SpecForge** component inside:

`https://github.com/MarcosArielFontenla/specdd-starter-kit`

SpecForge currently generates portable Capability Packs for roles such as:

- Business Analyst
- QA
- Developer
- UX

These packs integrate with the existing SpecDD Harness through:

- skills
- playbooks
- workflows
- eval rubrics
- capability manifests
- subagent seeds
- human-approved installation tasks

Your task is NOT to replace that functionality.

Your task is to evolve SpecForge into the foundation of a:

# Agentic Role Workspace + Artifact Platform

The new direction should allow both technical and non-technical software roles to participate naturally in agentic software development without requiring them to:

- open an IDE
- understand `AGENTS.md`
- edit `.agents/`
- edit YAML
- use Git directly
- understand Harness internals
- interact with runtime-specific configuration

The user experience must be role-oriented and artifact-oriented.

The underlying architecture must remain:

- compatible with SpecDD
- vendor-neutral
- model-neutral
- runtime-neutral
- repository-compatible
- human-governed
- traceable
- artifact-first
- role-aware
- extensible
- incremental
- simple enough to avoid over-engineering

---

# 1. Existing System Must Be Preserved

Before proposing code:

1. Inspect the entire repository.
2. Inspect the latest `README.md`.
3. Inspect `specforge-kit`.
4. Inspect `packages/capability-model`.
5. Inspect SpecForge tests.
6. Inspect generated Capability Packs.
7. Inspect current role skills and playbooks.
8. Inspect SpecDD Project Definition.
9. Inspect SpecControl.
10. Inspect existing eval contracts.
11. Inspect current telemetry/run-history contracts.
12. Inspect current platform UI.
13. Inspect all current ADRs relevant to capabilities and roles.
14. Inspect Brownfield/Greenfield integration behavior.
15. Inspect role-pack backward compatibility.

The repository is the source of truth for the current implementation.

Do not redesign existing working behavior based only on this prompt.

---

# 2. Current SpecForge Responsibility

Current conceptual model:

```text
SpecForge Wizard
      │
      ▼
Select Role
      │
      ▼
Capability Pack
      │
      ├── capability.json
      ├── skill
      ├── playbooks
      ├── workflows
      ├── eval rubrics
      └── subagent seed
      │
      ▼
Install into SpecDD Harness
```

This existing behavior must remain available.

It represents the:

# Capability Builder

side of SpecForge.

The evolution must add a second major responsibility:

# Role Workspace

---

# 3. Product Evolution

Target conceptual model:

```text
                      SPECFORGE

                         Core
                          │
              Capability + Artifact Model
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
      Capability Builder         Role Workspace
       technical setup           daily role work
              │                       │
              ▼                       ▼
         Harness Packs          Structured Artifacts
                                      │
                                      ▼
                                  SpecDD
```

The existing capability generator is NOT removed.

SpecForge becomes a broader product consisting of:

```text
SpecForge
│
├── Capability Builder
│
└── Role Workspace
```

---

# 4. Primary Product Goal

Non-technical roles must be able to perform real day-to-day work through a role-specific agentic workspace.

Examples:

## Business Analyst

Should work with:

- requirements
- business rules
- user stories
- acceptance criteria
- open questions
- assumptions
- impact analysis
- stakeholder decisions

Not with:

- `.agents`
- Git
- YAML
- Markdown contracts
- runtime configuration

---

## QA

Should work with:

- test scenarios
- test cases
- acceptance coverage
- regression impact
- exploratory testing notes
- defects
- test evidence
- quality risks

---

## Product Manager / Product Owner

Should work with:

- initiatives
- features
- backlog
- priorities
- risks
- dependencies
- release readiness
- blocked items
- unresolved decisions

---

## UI / UX

Should work with:

- UX briefs
- user journeys
- flows
- screens
- UI states
- interaction rules
- accessibility expectations
- design decisions
- Figma references

---

## Developer

May continue interacting through repositories and IDEs, but should also benefit from:

- technical plans
- implementation artifacts
- architecture decisions
- cross-role context
- traceability to BA / QA / UX artifacts

---

# 5. Critical Product Principle

Do NOT build a generic AI chat application.

This is NOT the goal:

```text
User
 ↓
Chat box
 ↓
LLM
```

Chat may exist as a supporting interaction.

The primary interaction model must be:

```text
Role
 +
Project Context
 +
Structured Artifact
 +
Agent Workflow
 +
Human Review
 +
Traceability
```

Users should perform meaningful actions such as:

```text
Create Requirement
Refine Requirement
Analyze Missing Rules
Generate Test Scenarios
Review Coverage
Perform Impact Analysis
Create UX Flow
Review Release Risks
Approve Specification
Resolve Open Question
```

not simply:

```text
Ask AI anything
```

---

# 6. Artifact-Centric Architecture

Introduce a canonical concept:

# Artifact

An artifact is a structured, versioned, traceable unit of work produced or reviewed by humans and agents.

Potential conceptual structure:

```yaml
artifact:
  id:
  type:
  title:
  projectRef:
  ownerRole:
  status:
  version:
  source:
  createdBy:
  updatedBy:

  content:

  relationships:

  approvals:

  evidence:

  provenance:
```

Do NOT adopt this exact schema blindly.

First inspect existing SpecDD artifact, spec, eval and Project Definition contracts.

Avoid duplicating concepts already present.

---

# 7. Initial Artifact Families

The model should initially support a small number of high-value artifact families.

Do not create dozens of types.

Start conceptually with:

## BA

```text
Requirement
BusinessRule
UserStory
AcceptanceCriteria
OpenQuestion
Decision
```

## QA

```text
TestScenario
TestCase
Defect
CoverageAssessment
QualityRisk
```

## PM

```text
Feature
Initiative
Risk
Dependency
Decision
ReleaseAssessment
```

## UX

```text
UXBrief
UserFlow
DesignDecision
InteractionContract
AccessibilityRequirement
```

## Development

```text
TechnicalPlan
ArchitectureDecision
ImplementationNote
```

Not every concept necessarily needs its own schema.

Prefer a bounded artifact taxonomy plus typed content.

---

# 8. Artifact Graph

Artifacts must be able to reference one another.

This is essential.

Example:

```text
Requirement R-18
      │
      ├── Business Rule BR-7
      │
      ├── User Story US-34
      │
      ├── UX Flow UX-11
      │
      ├── Test Plan QA-19
      │
      └── Implementation DEV-42
```

The platform should eventually allow traceability like:

```text
Requirement
   ↓
Specification
   ↓
UX
   ↓
Implementation
   ↓
Tests
   ↓
Eval
   ↓
Release
```

This relationship model is more important than building complex dashboards.

---

# 9. Artifact Lifecycle

Artifacts must have explicit lifecycle states.

Conceptually:

```text
draft
  ↓
under-review
  ↓
approved
  ↓
active
  ↓
superseded
```

Additional states may be role-specific where justified.

Human review must remain explicit.

Agents may propose modifications.

Agents must not silently convert critical artifacts to approved state.

---

# 10. Human Governance

Important artifacts require governed transitions.

Examples:

```text
Agent creates Requirement draft
        ↓
BA reviews
        ↓
BA approves
        ↓
Canonical Spec may be generated
```

QA:

```text
Agent proposes Test Cases
        ↓
QA edits/reviews
        ↓
QA approves
```

UX:

```text
Agent proposes Design Contract
        ↓
UX reviews
        ↓
UX approves
```

Human approval should be bound to an exact artifact revision where practical.

Reuse existing SpecDD / SpecControl approval concepts where possible.

Do NOT invent a separate approval architecture unnecessarily.

---

# 11. Artifact → SpecDD Boundary

SpecForge must not become the source of truth for software specifications by accident.

Use this separation:

```text
SpecForge Artifact
        │
        ▼
Human-approved transformation
        │
        ▼
Canonical SpecDD Spec
```

For example:

```text
BA Requirement
      +
Business Rules
      +
Acceptance Criteria
      ↓
Approved projection
      ↓
SpecDD Feature / Entity Spec
```

The transformation must be:

- explicit
- traceable
- versioned
- reviewable

Never silently rewrite canonical specs.

---

# 12. Capability Packs Remain Important

The existing Capability Packs continue to define:

```text
What expertise the agent has
How the role agent behaves
Which playbooks it can use
Which workflows it understands
Which evals apply
```

The Role Workspace should consume those capabilities.

Target:

```text
QA Workspace
    │
    ▼
QA Capability Pack
    │
    ├── Skill
    ├── Playbooks
    ├── Workflows
    └── Evals
```

Therefore the existing capability architecture becomes the behavioral engine behind the user-facing workspace.

This is important:

# Do not duplicate role knowledge in the UI.

The workspace should reference the same canonical capability definitions.

---

# 13. Role Workspace Architecture

Conceptually:

```text
SpecForge Workspace
│
├── Project Context
│
├── Artifact Explorer
│
├── Work Queue
│
├── Role Actions
│
├── Agent Suggestions
│
├── Reviews
│
├── Approvals
│
└── Traceability
```

Role changes which surfaces/actions are emphasized.

Example:

```text
BA Workspace

Requirements
Business Rules
Stories
Open Questions
Decisions
Impact
Approvals
```

QA Workspace:

```text
Test Scenarios
Coverage
Regression
Defects
Risks
Approvals
```

Do NOT create completely separate applications per role unless evidence later justifies it.

Prefer one workspace with role-aware views.

---

# 14. BA Workspace — First Pilot

BA should be the FIRST Role Workspace implemented.

Do not implement QA / PM / UX simultaneously.

The BA pilot should validate whether the new product model is useful.

Minimum BA workflow:

```text
Idea / Request
      ↓
Create Requirement
      ↓
BA Agent Analysis
      ↓
Open Questions
      ↓
Business Rules
      ↓
Acceptance Criteria
      ↓
Impact Analysis
      ↓
Human Review
      ↓
Approved Requirement
      ↓
Canonical Spec Proposal
```

The agent may detect:

- ambiguity
- missing actors
- missing states
- missing failure paths
- missing business constraints
- contradictory requirements

But it must not fabricate answers.

Unknowns remain explicit open questions.

---

# 15. BA Agent Behavior

The BA agent should help the user think, not replace domain authority.

It may:

- rewrite unclear requirements
- identify ambiguity
- generate clarification questions
- discover missing scenarios
- suggest business rules
- identify dependencies
- propose acceptance criteria
- summarize stakeholder input
- perform impact analysis
- compare artifact revisions

It may NOT:

- invent business decisions
- approve requirements
- silently close open questions
- assign stakeholder intent without evidence
- alter canonical specs without explicit transition

---

# 16. QA Workspace — Second Pilot

Only after BA Workspace is validated.

Target workflow:

```text
Approved Spec
      ↓
QA Analysis
      ↓
Test Scenarios
      ↓
Edge Cases
      ↓
Coverage Assessment
      ↓
Regression Impact
      ↓
Human Review
      ↓
Approved QA Artifacts
```

QA Agent may assist with:

- positive cases
- negative cases
- boundaries
- state transitions
- concurrency scenarios
- validation cases
- regression risks
- requirements coverage

QA artifacts should later map naturally to:

```text
Acceptance Checks
Canonical Evals
Automated Tests
Manual Test Evidence
```

but these mappings must remain explicit.

---

# 17. PM Workspace — Later Phase

Do not implement initially.

Potential future workspace:

```text
Initiatives
Features
Dependencies
Risks
Decisions
Roadmap
Release Readiness
```

PM agent may synthesize information from:

```text
Specs
Implementation status
QA artifacts
Evals
Approvals
Dependencies
```

Example result:

```text
Release Readiness

Implementation: ready
QA: partial
UX: approved
Security: failed
Open business questions: 2
```

This must come from evidence.

Never fabricate status.

---

# 18. UX Workspace — Later Phase

Potential future workflow:

```text
Requirement
      ↓
UX Brief
      ↓
User Journey
      ↓
Flow
      ↓
Interaction Contract
      ↓
Accessibility Review
      ↓
Human Approval
```

Potential integrations may include Figma later.

Do NOT make Figma integration foundational.

The canonical artifact model must remain usable without Figma.

---

# 19. Work Queue Concept

Non-technical users need an operational view.

Introduce a bounded concept such as:

```text
My Work
```

or:

```text
Role Queue
```

Examples:

```text
Needs my review
Agent proposal ready
Open question
Approval required
Artifact changed
Dependency unresolved
```

This should be derived from artifact state and workflow state.

Avoid building a generic task management system.

Do not compete with Jira.

Where external task systems exist, integrate rather than replace.

---

# 20. Project Context

Every Role Workspace must operate in a project context.

Project context should derive from existing SpecDD contracts when available:

```text
Project Definition
Domains
Entities
Features
Architecture
Existing Specs
Capabilities
```

SpecForge must NOT introduce a second Project model.

Use the existing canonical SpecDD Project Definition.

---

# 21. Agentic Actions

Each role should expose bounded actions.

Example BA actions:

```text
Analyze Requirement
Refine Wording
Find Ambiguities
Generate Questions
Suggest Acceptance Criteria
Impact Analysis
Compare Versions
Prepare Spec Proposal
```

QA:

```text
Generate Scenarios
Find Missing Coverage
Analyze Regression Impact
Review Acceptance Criteria
Prepare Test Plan
```

UX:

```text
Create UX Brief
Analyze User Journey
Find Missing States
Prepare Interaction Contract
```

Actions should map to canonical workflows/capabilities.

Do not hardcode long prompts inside UI components.

---

# 22. Workflow Model

Role actions should eventually map to explicit workflows.

Example:

```text
BA Requirement Analysis Graph

Requirement Draft
       ↓
Ambiguity Analysis
       ↓
Open Questions
       ↓
Business Rules
       ↓
Acceptance Criteria
       ↓
Impact Analysis
       ↓
Review
       ↓
Approved
```

The role workflow may later be represented using SpecControl.

Do not prematurely require SpecControl runtime for the first UI prototype.

Keep the domain portable.

---

# 23. Relationship with SpecControl

Long term:

```text
SpecForge
  ↓
Artifacts
  ↓
Role Workflow
  ↓
SpecControl
  ↓
Runtime
```

But avoid unnecessary coupling.

The Workspace should be usable locally even if no remote runtime is configured.

A future runtime may be:

```text
Local Reference Runtime
Warp
Codex
Other
```

SpecForge must not depend directly on Warp.

---

# 24. Relationship with SpecDD

SpecForge produces knowledge and structured work.

SpecDD owns canonical software intent and Harness integration.

Target:

```text
User
  ↓
SpecForge Workspace
  ↓
Artifacts
  ↓
Approval
  ↓
SpecDD projection
  ↓
Specs / Harness
  ↓
SpecControl
```

This boundary must remain explicit.

---

# 25. Traceability

Traceability is a primary product feature.

Every important artifact should eventually answer:

```text
Why does this exist?
Who created it?
Was AI involved?
Who approved it?
Which artifact led to it?
Which spec does it influence?
Which implementation fulfills it?
Which tests verify it?
```

Conceptual provenance:

```text
Source
  ↓
Artifact
  ↓
Agent Proposal
  ↓
Human Revision
  ↓
Approval
  ↓
Projection
```

Do not claim authorship or approval that cannot be evidenced.

---

# 26. AI Contribution Transparency

Users should be able to distinguish:

```text
Human-authored
Agent-proposed
Human-edited agent proposal
Imported
Generated from another artifact
```

Do not hide AI provenance.

Do not imply a human authored text that was fully agent-generated.

---

# 27. Persistence

The Role Workspace now introduces application state.

Do not choose a complex distributed architecture initially.

For the first pilot, evaluate simple approaches such as:

```text
Local database
SQLite
Local project state
Repository-backed structured files
```

Consider the needs of non-technical users.

Do not force Git as the only persistence mechanism.

At the same time, ensure approved canonical exports can remain repository-compatible.

---

# 28. Workspace vs Repository

Important distinction:

```text
Workspace
=
human-friendly operational surface

Repository
=
engineering/source-of-truth integration surface
```

A BA should be able to work without seeing the repository.

But approved artifacts should be exportable / projectable into repository-compatible canonical formats.

---

# 29. Multi-User Considerations

Do not build full multi-tenant collaboration initially.

The first workspace may assume:

```text
single user
single project
local state
```

But architecture should avoid preventing future:

- multiple roles
- authenticated users
- shared reviews
- stakeholder approvals

Do not implement enterprise identity yet.

---

# 30. Notifications

Do not prioritize notifications before the artifact workflow works.

Future notification examples:

```text
Requirement needs review
QA coverage ready
UX decision blocked
Approval requested
Artifact superseded
```

These should derive from workflow state.

---

# 31. Search and Context Retrieval

Role users will eventually need:

```text
Find all requirements related to payment
Show unresolved questions
Which test cases cover requirement R-17?
Which decisions affect checkout?
```

Design artifact IDs and relationships to support retrieval.

Do not introduce a vector database until real need is demonstrated.

Structured relationships come first.

---

# 32. External Tool Integrations

Potential future integrations include:

```text
Jira
Azure DevOps
GitHub Issues
Linear
Figma
Slack
Google Docs
Confluence
```

These are adapters.

They must NOT become the canonical artifact model.

For example:

```text
SpecForge Requirement
       ↓
Jira Adapter
       ↓
Jira Story
```

not:

```text
Jira Story schema
       ↓
SpecForge core
```

---

# 33. Artifact Model Design Rules

Artifact model should support at minimum:

```text
identity
type
status
version
project
role ownership
content
relationships
provenance
approval
timestamps
extensions
```

Prefer strict schemas.

Use semantic validation beyond JSON syntax where needed.

Version schemas explicitly.

Provide migrations.

---

# 34. Do Not Create One Giant Artifact Schema

Avoid:

```text
artifact.content: any
```

as the only model.

Also avoid dozens of unrelated schemas.

Prefer:

```text
ArtifactEnvelope
      +
TypedPayload
```

For example:

```text
ArtifactEnvelope<RequirementContent>
ArtifactEnvelope<TestScenarioContent>
```

or equivalent.

Choose the most natural approach after repository analysis.

---

# 35. Product UI Principles

The UI should prioritize:

- clarity
- low cognitive load
- role vocabulary
- project context
- structured forms
- readable documents
- review workflows
- agent suggestions
- explicit actions
- traceability

Avoid exposing infrastructure jargon.

For a BA, never show:

```text
Harness Ref
Runtime Hint
Eval Gate ID
Graph Node Ref
```

unless in an advanced diagnostics view.

---

# 36. First UI Scope

Do NOT redesign the whole platform.

Initial BA workspace should have only the minimum screens needed.

Potentially:

```text
Projects
  ↓
BA Workspace
  ├── Requirements
  ├── Open Questions
  ├── Reviews
  └── Artifact Detail
```

Artifact Detail could include:

```text
Content
Relationships
Agent Suggestions
History
Approval
```

Do not build complex dashboards initially.

---

# 37. Anti-Goals

Do NOT turn SpecForge into:

- Jira replacement
- Confluence replacement
- Figma replacement
- generic document editor
- generic chat application
- generic project management SaaS
- generic workflow engine
- AI meeting assistant
- AI note-taking product
- repository IDE
- Git client
- multi-agent swarm UI
- full enterprise collaboration platform

Its differentiator is:

# Structured role artifacts integrated with an agentic software lifecycle.

---

# 38. Architectural Target

Long-term conceptual architecture:

```text
                 SPECDD PLATFORM

                      PROJECT
                         │
                         ▼
                   Artifact Graph
                         │
       ┌─────────┬───────┼───────┬─────────┐
       │         │       │       │         │
       ▼         ▼       ▼       ▼         ▼
      BA        PM      UX      DEV       QA
       │         │       │       │         │
       ▼         ▼       ▼       ▼         ▼
    Workspace Workspace Workspace IDE   Workspace
       │         │       │       │         │
       └─────────┴───────┼───────┴─────────┘
                         ▼
                  Human Decisions
                         │
                         ▼
                Canonical Artifacts
                         │
                         ▼
                       SpecDD
                         │
                         ▼
                     Harness
                         │
                         ▼
                    SpecControl
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
           Local        Warp        Future
          Runtime      Runtime      Runtime
                         │
                         ▼
                 Evals / Evidence
                         │
                         ▼
                      Delivery
```

---

# 39. Evolution Roadmap

Implement incrementally.

Do not jump ahead.

---

## PHASE 0 — SpecForge Baseline and Product Boundary

Goal:

Understand current SpecForge deeply.

Deliverables:

- current architecture map
- existing Capability Pack contract
- role knowledge inventory
- current workflow inventory
- existing SpecDD integration map
- current limitations for non-technical users
- product boundary document
- gap analysis

Answer:

```text
What does SpecForge currently solve?
Who is its current real user?
What requires repository knowledge?
What value is inaccessible to BA/QA/UX/PM?
```

Do not code a Workspace yet.

---

## PHASE 1 — Canonical Artifact Model

Goal:

Define the minimum artifact contract.

Focus on:

```text
ArtifactEnvelope
Requirement
OpenQuestion
Decision
AcceptanceCriteria
relationships
versioning
provenance
approval
```

Do NOT model every role.

Deliverables:

- package/schema if justified
- TypeScript types
- validation
- relationships
- examples
- migrations
- ADR
- tests

This is the foundation.

---

## PHASE 2 — Artifact Graph and Traceability

Goal:

Allow artifacts to form meaningful relationships.

Implement bounded relation semantics such as:

```text
derives-from
depends-on
refines
validates
implements
supersedes
blocks
relates-to
```

Deliverables:

- relation model
- semantic validation
- graph traversal utilities where justified
- traceability queries
- tests
- ADR

Do not build graph visualization yet unless trivial.

---

## PHASE 3 — BA Workspace Domain

Goal:

Model BA daily work.

Implement:

```text
Requirement
Business Rule
Open Question
Acceptance Criteria
Decision
Impact Analysis
```

Define BA workflows and actions.

Deliverables:

- BA artifact payloads
- BA workflow definitions
- integration with existing BA Capability Pack
- agent action contracts
- approval rules
- tests
- ADR

Still no large UI.

---

## PHASE 4 — BA Workspace MVP

Goal:

Deliver the first usable non-technical Role Workspace.

Minimum user flow:

```text
Create Project / Select Project
        ↓
Create Requirement
        ↓
Run BA Analysis
        ↓
Review Questions
        ↓
Review Business Rules
        ↓
Review Acceptance Criteria
        ↓
Approve Requirement
```

Must be usable without Git or IDE.

Deliverables:

- minimal UI
- local persistence
- role-aware BA view
- artifact history
- human approval
- agent proposal visibility
- tests

---

## PHASE 5 — SpecDD Projection

Goal:

Convert approved BA artifacts into explicit SpecDD proposals.

Flow:

```text
Approved BA Artifacts
        ↓
Spec Proposal
        ↓
Human Review
        ↓
Canonical SpecDD Artifact
```

Deliverables:

- projection contract
- deterministic mapping where possible
- unsupported/incomplete mapping report
- diff/review surface
- human approval
- traceability link
- tests
- ADR

Never overwrite canonical specs silently.

---

## PHASE 6 — QA Workspace Domain

Goal:

Introduce QA artifacts and workflows.

Initial artifacts:

```text
Test Scenario
Test Case
Coverage Assessment
Quality Risk
Defect
```

Flow:

```text
Approved Spec
      ↓
QA Analysis
      ↓
Scenarios
      ↓
Coverage
      ↓
Review
      ↓
Approved QA Artifacts
```

Deliverables:

- schemas
- capability integration
- relation to requirements/specs
- tests
- ADR

---

## PHASE 7 — QA Workspace MVP

Goal:

Give QA users a usable daily workspace.

Include:

- assigned/related specs
- test scenarios
- agent suggestions
- coverage
- review
- defects
- approval

Avoid full test management platform scope.

---

## PHASE 8 — PM Read Model

Goal:

Do NOT build full PM authoring yet.

First build evidence-backed read views:

```text
Feature readiness
Open questions
Blocked artifacts
QA status
Pending approvals
Risks
Dependencies
```

PM value should initially come from aggregation.

Deliverables:

- Project Health / Release Readiness view
- evidence links
- status semantics
- no invented completion state
- tests

This phase validates PM usefulness before adding more authoring capabilities.

---

## PHASE 9 — UX Workspace Domain

Goal:

Introduce minimum UX artifact contracts.

Potential initial artifacts:

```text
UX Brief
User Flow
Interaction Contract
Accessibility Requirement
Design Decision
```

No mandatory Figma integration.

Deliverables:

- UX schemas
- workflow
- capability integration
- SpecDD projection possibilities
- tests

---

## PHASE 10 — Cross-Role Workflow

Goal:

Prove collaboration across roles.

Example:

```text
Requirement
   ↓
BA
   ↓
Approved Requirement
   ├─────────► UX
   │
   └─────────► QA
          │
          ▼
      Canonical Spec
          │
          ▼
        DEV
          │
          ▼
        QA
          │
          ▼
      Release Readiness
```

Deliverables:

- cross-role artifact relationships
- role handoffs
- work queue
- approvals
- traceability
- tests

No distributed runtime required.

---

# 40. Later Optional Tracks

Only after Phases 0–10 demonstrate value.

Possible later tracks:

```text
External integrations
Multi-user collaboration
Authentication
Notifications
Figma adapter
Jira adapter
Confluence adapter
Warp runtime
Shared stakeholder review portal
Artifact search
Role dashboards
Analytics
```

Do not commit to these now.

---

# 41. Persistence Strategy

During early phases favor simplicity.

Evaluate:

```text
SQLite
local app storage
local service
structured project files
```

Choose based on repository constraints.

Requirements:

- deterministic IDs
- migration support
- artifact revision history
- approval history
- relationships
- no hidden destructive updates

Avoid cloud backend unless necessary.

---

# 42. Agent Runtime Strategy

Do not couple Role Workspace to one LLM provider.

Use an abstraction such as:

```text
RoleAction
   ↓
Agent Execution Boundary
   ↓
Runtime Adapter
```

Potential implementations later:

```text
Codex
Warp
OpenAI
Claude
Local
```

For MVP, choose the smallest existing execution path available in the repository.

Do not create a full orchestration platform.

---

# 43. Security and Trust

Role artifacts may contain business-sensitive information.

Design for:

- explicit project boundaries
- no automatic external publishing
- sanitized logs
- no secrets in artifacts
- bounded runtime access
- human approval before canonical publication

Do not introduce remote integrations without explicit authorization.

---

# 44. Testing Strategy

Every phase must include:

```text
schema validation
semantic validation
migration tests
artifact lifecycle tests
approval tests
relationship integrity
projection determinism
UI workflow tests where applicable
```

Negative cases matter.

Examples:

```text
Cannot approve unknown revision
Cannot link nonexistent artifact
Cannot silently overwrite canonical spec
Cannot mark AI proposal human-authored
Cannot project unresolved requirement as approved spec
```

---

# 45. ADR Requirements

Create ADRs for substantial decisions.

Likely ADRs include:

```text
Artifact model boundary
Artifact relationship model
SpecForge vs SpecDD ownership
Role Workspace persistence
Agent execution boundary
BA → SpecDD projection
QA coverage semantics
Cross-role handoff model
```

---

# 46. Documentation Structure

Extend existing documentation conventions.

Potential structure:

```text
docs/specforge-workspace/

architecture.md
roadmap.md

concepts/
  artifact.md
  role-workspace.md
  artifact-graph.md
  provenance.md
  approvals.md

roles/
  ba.md
  qa.md
  pm.md
  ux.md

adrs/

phases/
  phase-0.md
  phase-1.md
  ...
```

Do not duplicate existing control-plane documentation.

Reference existing contracts when appropriate.

---

# 47. Roadmap Tracking

Create an evidence-based phase tracker.

Example:

```text
| Phase | Status | Spec | Implementation | Tests | Acceptance |
```

Use:

```text
Planned
In Progress
Partial
Accepted
Deferred
```

Do not mark phases complete merely because scaffolding exists.

---

# 48. Required Work Method

For every phase:

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

Do not immediately generate code for all phases.

---

# 49. Success Criteria for the Entire Evolution

SpecForge succeeds when a non-technical BA can:

```text
Open SpecForge
      ↓
Select project
      ↓
Create requirement
      ↓
Use BA agent
      ↓
Resolve questions
      ↓
Approve artifact
      ↓
Generate Spec proposal
      ↓
Hand off to engineering
```

without ever needing to understand:

```text
Git
AGENTS.md
Harness
YAML
Runtime adapters
SpecControl schemas
```

And when QA can later:

```text
Open approved requirement/spec
      ↓
Generate scenarios
      ↓
Review coverage
      ↓
Approve QA artifacts
```

with complete traceability back to the original requirement.

---

# 50. Architectural Guardrail

Use this decision rule constantly:

```text
Would a BA / QA / PM / UX user care about this concept?
```

If NO:

It probably belongs behind the Workspace boundary.

Examples:

```text
Requirement               → visible
Acceptance Criteria       → visible
Open Question             → visible
Approval                   → visible
Artifact history           → visible

HarnessRef                 → hidden
RuntimeHint                → hidden
GraphNodeRef               → hidden
Warp runner                → hidden
Eval adapter internals     → hidden
```

---

# 51. Another Critical Guardrail

SpecForge should NOT duplicate source-of-truth responsibilities.

Use:

```text
SpecForge
=
Human work + structured artifacts + role workflows

SpecDD
=
Canonical software intent + Harness

SpecControl
=
Execution control

Runtime
=
Agent execution
```

If an implementation blurs these boundaries, stop and document the design conflict before proceeding.

---

# 52. Initial Task

START ONLY WITH PHASE 0.

Do NOT create the BA Workspace yet.

First perform repository-wide discovery focused specifically on SpecForge and the non-technical-user problem.

Produce:

## A. Current SpecForge Architecture

Document:

- current package responsibilities
- Capability Pack structure
- role knowledge sources
- current wizard workflow
- current SpecDD integration
- current storage/generation model
- current tests

## B. User Experience Gap Analysis

For each role:

```text
BA
QA
PM
UX
DEV
```

identify:

- current value
- current friction
- repo/IDE dependency
- missing day-to-day workflow
- potential high-value artifacts

## C. Ownership Boundary

Define clearly what belongs to:

```text
SpecForge
SpecDD
SpecControl
Runtime
External tools
```

## D. Existing Artifact Concept Inventory

Find every existing concept in the repository related to:

```text
specs
artifacts
approvals
evals
telemetry
project definitions
capabilities
workflows
```

Determine what can be reused.

Avoid duplicate models.

## E. Proposed Artifact Model Questions

Do not implement it yet.

List unresolved design questions such as:

- one envelope vs separate schemas
- storage model
- revision model
- artifact IDs
- approval semantics
- relationship semantics
- provenance
- SpecDD projection
- role ownership

## F. BA Pilot Definition

Define the smallest useful BA vertical slice.

No coding yet.

## G. Roadmap Validation

Review this roadmap against the real repository.

Propose modifications only when supported by evidence.

---

# 53. Final Product Vision

Long term, SpecForge should transform from:

```text
Capability Pack Generator
```

into:

```text
Agentic Role Workspace
+
Capability Platform
+
Artifact Graph
```

while preserving:

```text
SpecDD = Canonical Engineering Source of Truth
```

The final product should make agentic software development accessible to the entire software lifecycle, not only developers.

The user should experience:

```text
My role
My project
My artifacts
My decisions
My agent
```

while the underlying system manages:

```text
Capabilities
Harness
Specs
Graphs
Evals
Runtimes
Traceability
```

without exposing unnecessary infrastructure complexity.

---

# 54. Start

Inspect the repository thoroughly.

Do not modify production architecture yet.

Begin:

# PHASE 0 — SpecForge Baseline and Product Boundary

Produce the current-state analysis, user-role gap analysis, artifact inventory, ownership boundaries, BA pilot proposal and recommended Phase 1 boundaries before implementation.