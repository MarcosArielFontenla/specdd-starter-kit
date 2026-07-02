---
name: context-analysis
description: Extract actors, scope, and constraints from raw feature notes
persona: BA
---

# Context Analysis

## Purpose
Convert raw, unstructured feature notes (meeting notes, emails, tickets) into a structured context: actors, in-scope behavior, out-of-scope behavior, and constraints.

## When to use
At the start of work on a new feature, before any story is written, whenever the input is informal or ambiguous.

## How
1. Read the raw notes fully before extracting anything, to avoid anchoring on the first sentence.
2. List every actor mentioned or implied (end users, roles, external systems) and what each one needs from the feature.
3. Separate statements into in-scope (what this feature will do) and explicitly out-of-scope (what it will not do, or is deferred).
4. Extract constraints: business rules, non-functional requirements (performance, compliance), and dependencies on other features or systems.
5. Write down every ambiguity as an open question rather than resolving it by assumption; route these back to the requester.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
