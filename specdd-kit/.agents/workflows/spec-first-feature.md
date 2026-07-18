# Spec-First Feature Workflow

Pipeline: **specify → clarify → approve → tasks → implement → done-gate**

Trigger: a new primary entity OR a feature touching ≥2 domains. A single-file change
never enters this workflow — that is ceremony, not engineering.

## 1. Specify
Author or amend the entity's `.agents/specs/[entity].spec.yaml`. Draft
`acceptanceChecks` with `command: placeholder` — derive each `description` from the
spec's own requirements; never invent commands. Mark every genuine ambiguity inline as
`[NEEDS CLARIFICATION: question]` — never resolve one by assumption. Maximum 5 markers
per spec; more means the intent is underspecified — go back to the human first.

## 2. Clarify
Ask ONE question at a time, coverage-ordered: scope → behavior → data → edge cases.
Log each answer in the spec's `clarifications` list and remove the marker in the same
edit:

```yaml
clarifications:
  - date: "YYYY-MM-DD"
    question: "[the marker's question, verbatim]"
    answer: "[the human's answer, condensed]"
    affects: "[section or acceptanceCheck id it changed]"
```

## 3. Approve (human gate)
`proposed → approved` requires: zero placeholder commands (or a complete
`checksWaiver` with reason/approvedBy/date), zero `[NEEDS CLARIFICATION]` markers,
`reviewedBy` and `approvedAt` set. Mechanically enforced:
`pwsh .agents/scripts/validate-spec.ps1`

## 4. Tasks
Create `.agents/specs/tasks/[feature-slug].tasks.md`: dependency-ordered phases, `[P]`
only on tasks with different target files and no dependency edge, every task names its
real target path(s), every phase maps to ≥1 acceptanceCheck id. The agent drafts; the
human approves BEFORE implementation starts.

## 5. Implement
Work the tasks in dependency order. Tests are written before or alongside the code
they verify — never after the done-gate.

## 6. Done-gate
`pwsh .agents/scripts/validate-spec.ps1 -Run -SpecPath .agents/specs/[entity].spec.yaml`
Every acceptanceCheck must return its expected exit code. Archive or delete the tasks
file after the gate passes (history lives in git).
