---
applyTo: "**/*.{yaml,yml,json}"
description: OpenAPI/Swagger API documentation guidance
---

# Swagger / OpenAPI Docs Instructions

## When this applies
When writing or editing OpenAPI/Swagger specification files (`.yaml`/`.yml`/`.json`) describing an HTTP API.

## Guidelines
- Keep the OpenAPI spec in sync with the actual implementation; regenerate or update it as part of the same change that alters an endpoint's request/response shape.
- Define reusable `components/schemas` for request and response bodies instead of duplicating inline object definitions across multiple paths.
- Document every response status code an endpoint can realistically return (200/201, 400, 401/403, 404, 5xx), not just the success case.
- Specify required fields, types, formats (e.g., `format: date-time`, `format: email`), and constraints (`minLength`, `enum`) so generated clients and validators are accurate.
- Version the API explicitly (path prefix or header) and note breaking changes in the spec's `info.description` or a changelog rather than silently altering an existing version.

## Anti-patterns
- Letting the spec drift out of sync with the actual API behavior.
- Documenting only the happy-path response and omitting error schemas.
- Duplicating the same schema definition inline in multiple endpoints instead of using `$ref`.
