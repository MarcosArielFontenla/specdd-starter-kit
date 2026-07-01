# Contracts

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Explain how machine-readable interface contracts (OpenAPI specs, JSON Schema, protobuf, etc.) live
alongside this feature's human-readable `api.md`.

## Inputs
- `api.md` for this feature (the human-readable source of truth for intent)
- Any existing contract files for related features, for consistency

## Content

### What goes here
Place one contract file per interface this feature exposes or consumes, for example:
- `openapi.yaml` — REST API contract (OpenAPI 3.x)
- `<entity>.schema.json` — JSON Schema for a payload or data structure
- `<service>.proto` — protobuf contract for RPC services

### Conventions
- Contract files are generated or hand-written to match `api.md` — if they disagree, `api.md` is
  wrong and should be updated first (specs are the source of truth), then regenerate the contract.
- Name files after the interface they describe, not the feature (e.g., `orders-api.openapi.yaml`,
  not `spec.openapi.yaml`), so contracts stay meaningful if reused elsewhere.
- Keep contracts versioned alongside the feature; do not silently break a contract without a new
  spec documenting the breaking change.

### Validation
- Lint/validate contract files with the appropriate tool for their format (e.g., an OpenAPI linter)
  before merging.
- Where possible, generate contract tests from these files so the implementation can't drift silently.

## Definition of Done
- [ ] Every interface documented in `api.md` has a matching contract file here (or a note explaining why not)
- [ ] Contract files validate against their format's spec
- [ ] No secrets or real environment values appear in example/default values
