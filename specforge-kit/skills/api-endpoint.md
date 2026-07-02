---
name: api-endpoint
description: Implement a REST endpoint with validation and error handling
persona: Dev
---

# API Endpoint

## Purpose
Implement a REST endpoint that validates its input, handles errors consistently, and matches the contract defined in the story/spec, so callers get predictable behavior on both success and failure paths.

## When to use
When a story or implementation plan calls for a new REST endpoint, or an existing endpoint's request/response contract needs to change.

## How
1. Confirm the contract before coding: method, path, request shape, response shape (success and error), and status codes — from the spec/plan, or write it down explicitly if undocumented.
2. Validate all input at the boundary: required fields, types, formats, and ranges; reject invalid requests with `400`-class responses before any business logic runs, never trusting client-supplied data downstream.
3. Enforce authentication/authorization before touching data — confirm the caller is who they claim and is allowed to perform this action on this resource, not just that a token is present.
4. Use precise status codes and a consistent error response shape (matching the codebase's existing error envelope) — `400` invalid input, `401` unauthenticated, `403` unauthorized, `404` not found, `409` conflict, `422` semantic validation failure, `500` only for unexpected server faults.
5. Keep the handler thin: parse/validate input, delegate to service/domain logic, map the result to a response — business logic belongs in a testable service layer, not inline in the route handler.
6. Handle downstream failures explicitly (database errors, timeouts, dependent service failures) and translate them to an appropriate client-safe error, never leaking internal stack traces, queries, or credentials in the response body.
7. Make the endpoint idempotent where the HTTP method implies it (GET, PUT, DELETE) and document/design explicitly when it isn't (POST side effects, retries).
8. Write tests for the happy path, each validation failure, each auth failure, and at least one downstream-failure scenario before considering the endpoint done; verify against the documented contract, not just against the implementation.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
