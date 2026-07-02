---
name: story-to-code
description: Turn a user story and acceptance criteria into an implementation plan and code
persona: Dev
---

# Story to Code

## Purpose
Turn an approved user story and its acceptance criteria into a concrete implementation plan and working code, so implementation traces cleanly back to what was actually asked for.

## When to use
When a story has passed BA `acceptance-criteria` and QA `ac-validation` and is ready to build — the entry point into Dev work for that story.

## How
1. Read the story and every acceptance criterion fully before writing any code or plan; if any AC is ambiguous or untestable, send it back rather than guessing at intent.
2. Identify the affected layers (UI component, API endpoint, state, data model) and list them as discrete implementation steps, each traceable to one or more specific ACs.
3. Sequence the plan to keep the system working at each step where possible (data layer before API, API before UI) and note any step that requires a feature flag or is unreleasable mid-sequence.
4. For each planned step, note which existing Dev skill applies (`component-creation`, `api-endpoint`, `state-management`, etc.) so implementation follows the codebase's established patterns rather than improvising.
5. Write the test for an AC before or alongside the code that satisfies it (`testing`), so each AC has a direct, demonstrable link to a passing test by the end.
6. Implement incrementally per plan step, keeping the diff reviewable — prefer several small, coherent commits over one large one covering unrelated ACs.
7. After implementation, walk each AC against the actual running behavior (not just passing tests) to confirm nothing was interpreted differently than intended.
8. Hand off via `code-review` and `pr-creation` once every AC is implemented, tested, and verified — do not open a PR with partially covered ACs without saying so explicitly in the description.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
