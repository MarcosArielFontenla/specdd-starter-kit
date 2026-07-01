---
applyTo: "**/*.{ts,html}"
description: Angular component, service, and template guidance
---

# Angular Instructions

## When this applies
When writing or editing Angular `.ts` (components, services, directives) or `.html` template files.

## Guidelines
- Keep components thin: move business logic and data access into injectable services rather than component classes.
- Use the `OnPush` change detection strategy for presentational components and pass immutable inputs to keep change detection predictable and fast.
- Unsubscribe from long-lived `Observable` subscriptions (use the `async` pipe, `takeUntilDestroyed`, or a `Subscription` teardown) to avoid memory leaks.
- Use reactive forms (`FormGroup`/`FormControl`) with explicit validators for non-trivial forms instead of template-driven forms with ad-hoc validation logic.
- Type dependency-injected services and `@Input`/`@Output` properties explicitly; avoid `any` in component and service signatures.

## Anti-patterns
- Subscribing to an `Observable` in a component without ever unsubscribing or using the `async` pipe.
- Putting HTTP calls or business logic directly in a component instead of a service.
- Using two-way binding (`[(ngModel)]`) on complex forms instead of reactive forms with validation.
