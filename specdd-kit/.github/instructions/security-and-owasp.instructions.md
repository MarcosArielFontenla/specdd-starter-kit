---
applyTo: "all"
description: Baseline application security guidance aligned with OWASP Top 10
---

# Security and OWASP Instructions

## When this applies
Always, especially when writing code that handles user input, authentication, authorization, data storage, or external requests.

## Guidelines
- Validate and sanitize all external input (query params, form bodies, headers, file uploads) at the trust boundary; never trust client-supplied data.
- Use parameterized queries or an ORM's safe query builder; never build SQL/NoSQL queries via string concatenation (OWASP A03: Injection).
- Enforce authorization checks on every server-side endpoint, not just in the UI; default to deny and check object-level ownership (OWASP A01: Broken Access Control).
- Store secrets in environment variables or a secret manager, never in source control; hash passwords with a modern algorithm (bcrypt/argon2), never plaintext or fast general-purpose hashes (OWASP A02/A07).
- Set secure HTTP response headers (CSP, `X-Content-Type-Options`, `Strict-Transport-Security`) and use HTTPS everywhere.

## Anti-patterns
- Concatenating user input directly into SQL, shell commands, or HTML output.
- Rolling a custom crypto or auth scheme instead of using vetted libraries.
- Returning verbose stack traces or internal error details to end users.
