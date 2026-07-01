# Workflow

Spec-Driven Development in this kit follows one loop, run once per feature:

```
constitution → specify → plan → tasks → implement
```

Specifications are the source of truth; code is the output. If code and spec ever
disagree, update the spec first, then the code — never the other way around
silently.

## The core loop

### 1. `constitution` — `/specdd-constitution`
Draft or update the project's constitution: the non-negotiable principles every
spec, plan, and implementation must follow. Run once per project, then only for
deliberate, documented amendments — never as a silent side effect of another task.
Output: `context/constitution.md` (working copy), mirrored into
`governance/constitution.md` (canonical) when principles genuinely change.

### 2. `specify` — `/specdd-specify`
Turn a feature idea into a formal specification, grounded in `context/` and any
existing specs. Output: `specs/<feature-slug>/spec.md`, from
`templates/spec-template.md`.

### 3. `plan` — `/specdd-plan`
Produce an implementation plan from an **approved** spec — the technical approach,
components, and sequencing. Output: `specs/<feature-slug>/plan.md`, from
`templates/plan-template.md`.

### 4. `tasks` — `/specdd-tasks`
Break the approved plan into small, independently testable, shippable tasks.
Output: `specs/<feature-slug>/tasks.md`, from `templates/tasks-template.md`.

### 5. `implement` — `/specdd-implement`
Implement the tasks TDD-style, following the plan. This is the final step of the
loop — code is written only after specify → plan → tasks are approved.

## Supporting prompts

These run inside or around the core loop, not in place of it:

| Prompt | When to use |
|---|---|
| `/specdd-clarify` | A spec has open questions — ask targeted questions instead of guessing. |
| `/specdd-analyze` | Check for gaps between the current codebase and a spec/plan, before or mid-implementation. |
| `/specdd-spike` | Time-box a research spike to resolve a technical unknown before planning proceeds; captures findings in `research.md`. |
| `/specdd-adr` | Record an architecture decision so future readers know why, not just what. |
| `/specdd-checklist` | Generate or verify the pre-merge checklist — the last gate before a feature merges. |
| `/specdd-code-review` | Review a diff/PR against its spec and the project constitution. |
| `/specdd-issues-from-spec` | Derive tracker issues directly from a spec's requirements. |
| `/specdd-issues-from-plan` | Derive tracker issues from an approved plan's components/steps. |
| `/specdd-issues-from-unmet` | Derive tracker issues from acceptance criteria that review or checklist verification found unmet. |
| `/specdd-create-llms` | Create a repository-root `llms.txt` from `templates/llms-txt-template.md`. |
| `/specdd-update-llms` | Refresh an existing `llms.txt` as `context/` and active specs change. |
| `/conventional-commit` | Write a Conventional Commits-style commit message for staged changes. |

## Where things live

```
specs/<feature-slug>/
├── spec.md          # from /specdd-specify
├── plan.md          # from /specdd-plan
├── tasks.md          # from /specdd-tasks
├── research.md        # from /specdd-spike, if a spike was needed
├── data-model.md       # optional, filled in during plan/tasks
├── api.md               # optional, filled in during plan/tasks
├── checklist.md          # from /specdd-checklist
└── contracts/              # optional interface contracts
```

Each generated file starts from the matching template in `templates/` (or
`specs/_template/` for the full per-feature skeleton), so structure stays
consistent across features and across agents.

## Loop diagram

```
 ┌──────────────┐
 │ constitution  │  (once per project, amend deliberately)
 └──────┬────────┘
        ▼
 ┌──────────────┐   /specdd-clarify (if needed)
 │   specify     │◄───────────────────────┐
 └──────┬────────┘                        │
        ▼                                 │
 ┌──────────────┐   /specdd-spike (if a technical unknown blocks planning)
 │    plan       │◄───────────────────────┘
 └──────┬────────┘
        ▼
 ┌──────────────┐
 │    tasks      │
 └──────┬────────┘
        ▼
 ┌──────────────┐   /specdd-analyze, /specdd-code-review, /specdd-checklist
 │  implement    │──────────────────────────────────────────────────────► merge
 └───────────────┘
```

Every prompt is agent-agnostic Markdown under `.github/prompts/`; it works the same
way regardless of whether GitHub Copilot, Claude Code, Cursor, or Gemini is driving
it. See `docs/specdd-methodology.md` for how multi-agent support works in practice.
