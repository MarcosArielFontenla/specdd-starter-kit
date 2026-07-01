# Starter Guide: Your First Feature in 10 Minutes

This is a hands-on walkthrough from a fresh scaffold to a reviewed spec and plan
for one small feature. It assumes you've already extracted the wizard's ZIP at the
root of your project (see the main `README.md` if not).

## Minute 0–1: Confirm the constitution

Open `context/constitution.md`. It was generated from your wizard answers (or is
the kit's flat default if you skipped that step). In your agent's chat, run:

```
/specdd-constitution
```

Skim the output. If a principle doesn't fit your team, say so now — amending the
constitution before you've written any specs against it is cheap; amending it
after is not.

## Minute 1–3: Write the spec

Pick one small, real feature — something you could describe in two or three
sentences. Run:

```
/specdd-specify
Add a "forgot password" link to the login form that emails a reset link.
```

The agent reads `context/project.md` and `context/tech-stack.md`, then writes
`specs/forgot-password/spec.md` from `templates/spec-template.md`: problem
statement, requirements, acceptance criteria, non-functional requirements, and an
Open questions section for anything genuinely unclear.

**Read the spec before moving on.** This is the artifact you're reviewing — not
the code that doesn't exist yet.

## Minute 3–4: Clarify if needed

If the spec has entries under "Open questions" (e.g. "Should the reset link
expire?"), resolve them explicitly instead of letting the agent guess later:

```
/specdd-clarify
```

This turns each open question into a targeted question you answer directly, and
the answers get written back into the spec.

## Minute 4–6: Plan

Once the spec looks right:

```
/specdd-plan
```

This produces `specs/forgot-password/plan.md` — the technical approach: which
files change, what new components/endpoints are needed, and how the work
sequences. If your tech stack context is accurate, the plan should already match
your actual frameworks and conventions.

## Minute 6–7: Break into tasks

```
/specdd-tasks
```

This produces `specs/forgot-password/tasks.md` — small, independently testable
tasks derived from the plan. Each task should be shippable on its own and traces
back to a specific part of the plan/spec.

## Minute 7–10: Implement the first task

```
/specdd-implement
```

The agent works through `tasks.md` TDD-style: write a failing test for the first
task, make it pass, refactor, move to the next task. Stop after the first task or
two to confirm the loop feels right for your codebase — you don't need to finish
the whole feature to have validated the workflow.

## What you just did

You went constitution → specify → plan → tasks → implement without writing any
code by hand until the very last step, and every artifact along the way
(`spec.md`, `plan.md`, `tasks.md`) is a reviewable file a teammate can read without
running your code. That review-before-code property is the whole point of SDD.

## Next steps

- Run `/specdd-checklist` before you open a PR for this feature.
- Read `docs/workflow.md` for the full prompt reference (clarify, analyze, spike,
  ADR, code-review, issue generation).
- Read `docs/greenfield-vs-brownfield.md` before applying this to an existing,
  large codebase rather than a fresh feature.
