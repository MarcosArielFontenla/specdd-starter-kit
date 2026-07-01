# API: <feature name>

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Document the externally observable interface (HTTP endpoints, RPCs, or equivalent) this feature exposes.

## Inputs
- `data-model.md` for this feature
- `plan.md` architecture/components

## Content

### Endpoints

#### `<METHOD> <path>`
**Description:** <what this endpoint does>

**Request:**
```json
{
  "field": "type/example"
}
```

**Response (200):**
```json
{
  "field": "type/example"
}
```

**Errors:**
| Status | Condition | Body |
|--------|-----------|------|
| 400 | <invalid input> | `{ "error": "..." }` |
| 401 | <unauthenticated> | `{ "error": "..." }` |
| 404 | <not found> | `{ "error": "..." }` |
| 500 | <unexpected server error> | `{ "error": "..." }` |

<Repeat the endpoint block for each additional route.>

## Definition of Done
- [ ] Every endpoint used by the feature is documented with request, response, and errors
- [ ] Example payloads use placeholder data only — no real secrets or PII
- [ ] Error responses match what the implementation actually returns
