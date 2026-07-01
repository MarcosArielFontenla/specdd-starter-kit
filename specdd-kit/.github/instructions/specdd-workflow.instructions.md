---
applyTo: "all"
description: Spec-Driven Development workflow guardrails
---

# SDD Workflow Instructions

## When this applies
Always. This repo follows Spec-Driven Development.

## Guidelines
- Read `context/` and the relevant `specs/<feature>/` before writing code.
- Follow the flow: constitution → specify → plan → tasks → implement.
- Treat specifications as the source of truth; code is the output.
- When a requirement is ambiguous, run `/specdd-clarify` instead of guessing.

## Anti-patterns
- Writing code before an approved spec/plan.
- Silently diverging from the spec.
