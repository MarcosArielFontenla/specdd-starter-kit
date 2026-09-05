# ADR-0002 — JSON Schema and TypeScript Contract

**Status:** Accepted  
**Date:** 2026-09-03

## Context

The browser applications are JavaScript/TypeScript-compatible, generated artifacts already use JSON/YAML/Markdown, and future adapters need a language-neutral serialization.

## Decision

Use JSON as the canonical serialization, JSON Schema draft 2020-12 as the portable structural contract, and strict TypeScript types plus semantic validation in `@specdd/project-model`.

Project Definition schema versions use SemVer strings. Version `1.0.0` uses one root aggregate with stable scoped IDs and explicit namespaced extension points.

## Consequences

- Browser, CLI, CI, and future service implementations share one portable format.
- Structural schema and semantic reference validation remain distinct layers.
- The initial implementation has no runtime dependency on an external schema library; consumers may use the published schema with their validator of choice.
- Schema/type/validator parity is protected by examples, strict compilation, and tests and must remain part of future migrations.
