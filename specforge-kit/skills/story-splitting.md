---
name: story-splitting
description: Split large stories along workflow/data/interface boundaries
persona: BA
---

# Story Splitting

## Purpose
Break a story that is too large to deliver in one iteration into smaller stories that each remain independently valuable, testable, and estimable.

## When to use
When a story's acceptance criteria list grows unwieldy, its estimate is disproportionately large, or it bundles more than one user goal.

## How
1. Re-read the story and its acceptance criteria to identify why it is large: multiple workflow steps, multiple data variations, or multiple interfaces/channels.
2. Split along workflow boundaries first (e.g., "create" vs. "edit" vs. "delete") if the story spans a multi-step process.
3. If still large, split along data boundaries (e.g., one data type/rule variant per story) or interface boundaries (e.g., web vs. API vs. admin).
4. Rewrite each resulting piece as its own INVEST story with its own acceptance criteria; avoid splitting by technical layer (e.g., "backend" vs. "frontend") since neither half is independently valuable.
5. Record the parent story as the epic/reference so traceability is preserved.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
