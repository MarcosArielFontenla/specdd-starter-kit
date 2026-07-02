---
name: accessibility
description: Meet WCAG basics in UI components
persona: Dev
---

# Accessibility

## Purpose
Meet baseline WCAG accessibility requirements in UI components so the product is usable by people relying on assistive technology, keyboard navigation, or with visual/motor impairments — not as a retrofit, but as part of building the component.

## When to use
During `component-creation` and any UI work, and whenever reviewing a UI diff via `code-review` — accessibility is checked alongside functionality, not in a separate later pass.

## How
1. Use semantic HTML elements for their intended purpose (`button`, `nav`, `label`, headings in order) before reaching for ARIA — ARIA supplements semantics, it doesn't replace them.
2. Ensure every interactive element is keyboard-operable: reachable via Tab in a logical order, actionable via Enter/Space, with a visible focus indicator that isn't suppressed by default styling.
3. Give every meaningful image, icon-only button, and form input an accessible name (`alt` text, `aria-label`, or associated `label`) — decorative images should be marked so assistive tech skips them.
4. Meet minimum color contrast (WCAG AA: 4.5:1 for normal text, 3:1 for large text/UI components) and never convey information (errors, required fields, status) through color alone — pair it with text or an icon.
5. Manage focus explicitly for dynamic UI: move focus into opened modals/dialogs, return it to the trigger on close, and announce dynamic content changes to screen readers via `aria-live` where appropriate.
6. Label form inputs and validation errors programmatically (`label`/`aria-describedby`), not just visually adjacent, so screen reader users get the same information sighted users do.
7. Ensure the component works at 200% browser zoom and with reduced motion preferences respected (`prefers-reduced-motion`) rather than assuming a fixed viewport and animation are always acceptable.
8. Verify with both automated tooling (axe or equivalent) and a manual keyboard-only pass before considering the component done — automated tools catch a minority of real issues.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
