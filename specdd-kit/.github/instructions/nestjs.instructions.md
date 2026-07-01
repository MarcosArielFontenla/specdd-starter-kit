---
applyTo: "**/*.ts"
description: NestJS module, controller, and provider guidance
---

# NestJS Instructions

## When this applies
When writing or editing `.ts` files in a NestJS application (modules, controllers, providers, guards, pipes).

## Guidelines
- Keep controllers thin: delegate business logic to injectable services and use controllers only for routing, validation wiring, and response shaping.
- Validate incoming requests with DTOs and `class-validator` decorators plus a global `ValidationPipe`, rather than manually checking `req.body` fields.
- Use guards for authentication/authorization and interceptors for cross-cutting concerns (logging, response transformation) instead of duplicating that logic in every controller method.
- Organize code by feature module (each with its own controller, service, and DTOs) rather than one giant module for the whole app.
- Use constructor-based dependency injection with typed providers; avoid manually instantiating services with `new`.

## Anti-patterns
- Writing business logic and database queries directly in a controller method.
- Skipping DTO validation and trusting raw `req.body` shapes.
- Manually `new`-ing up services instead of relying on Nest's DI container, which breaks testability and scoping.
