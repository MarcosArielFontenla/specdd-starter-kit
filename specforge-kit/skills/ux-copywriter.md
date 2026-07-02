---
name: ux-copywriter
description: Write UI copy — labels, empty states, and error messages — for a stage
persona: UX
---

# UX Copywriter

## Purpose
Write clear, consistent UI copy for a stage's every state — labels, button text, empty states, validation/error messages, and confirmations — so the product reads as one voice and never leaves a user stuck without knowing what to do next.

## When to use
Once `ux-stage-generator` has produced a stage with its intent, elements, and states. Use again whenever a stage's states change (a new error case, a new empty state) or a copy inconsistency is found during `ux-design-system-enforcer` review.

## How
1. Write the primary copy first: screen title/heading and the label for the stage's primary action, both stated in terms of the user's intent (verb-led for actions, e.g., "Save changes" not "Submit").
2. Write the empty state: what the user sees before any data exists, including a one-line explanation of why it's empty and, where applicable, the action that fills it.
3. Write validation and error messages per field/action: state what went wrong in plain language, avoid blaming the user or exposing system internals (no stack traces, error codes, or field names from the database schema), and say what to do next.
4. Write the success/confirmation copy: confirm what happened, not just that "it worked" — e.g., "Invoice #1042 sent to billing@acme.com" rather than "Success."
5. Keep terminology consistent with the design system's content guidelines and with copy already used elsewhere in the product for the same concept (e.g., always "delete," never "remove" and "delete" interchangeably for the same action).
6. Keep copy short enough to fit the element it's attached to at the target viewport; if it doesn't fit, shorten the copy rather than asking Dev to resize the element.
7. Flag any copy that depends on data that might not exist yet (e.g., a user's name) and specify the fallback.

## Guardrails
- Specifications/context are the source of truth — copy should reflect the actual behavior in the spec/flow, not aspirational behavior.
- Never output secrets, and never put real user data (names, emails, IDs) into example copy — use clearly fictional placeholders.
