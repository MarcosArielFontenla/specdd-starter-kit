---
name: ux-design-system-enforcer
description: Check a flow/stage/copy set against a named design system for consistency
persona: UX
---

# UX Design System Enforcer

## Purpose
Check a flow, its stages, and its copy against the project's named design system (component library, tokens, and content guidelines) so the delivered design is consistent with the rest of the product instead of introducing one-off patterns.

## When to use
Before a set of stages or a prototype is considered ready to hand to Dev, and any time a new component or pattern is proposed that isn't obviously already in the design system.

## How
1. Confirm the design system name/version in use for this project (from `context/`); if none is named, say so explicitly rather than assuming a default (e.g., Material, Fluent, a custom system).
2. For each stage's key elements, map them to existing design-system components (buttons, inputs, cards, modals, etc.) before allowing a custom/one-off component.
3. Check spacing, typography, and color usage against the design system's tokens — flag any hardcoded value that should instead reference a token.
4. Check copy against the design system's content guidelines (tone, capitalization, terminology) in addition to `ux-copywriter`'s per-stage pass.
5. Check accessibility basics that are part of the design system's contract: color contrast on text/icons, focus order, and that every interactive element has an accessible name — hand off deeper accessibility work to Dev's `accessibility` skill at implementation time.
6. Where a stage genuinely needs something the design system doesn't have, document it as a proposed new pattern (what it is, why existing components don't cover it) rather than silently deviating.
7. Produce a short consistency report: pass/fail per stage, with the specific token/component/guideline violated for each fail, so Dev and UX can resolve items before build.

## Guardrails
- Specifications/context are the source of truth — the named design system, once confirmed, is authoritative over personal preference.
- Never output secrets.
