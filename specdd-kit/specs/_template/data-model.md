# Data Model: <feature name>

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Define the entities, fields, and relationships this feature introduces or changes.

## Inputs
- `spec.md` functional requirements that imply data
- Existing schema/models this feature touches

## Content

### Entities

#### <Entity name>
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string/uuid | yes | primary key |
| `<field>` | `<type>` | yes/no | <constraints, e.g., unique, enum values> |

### Relationships
- `<Entity A>` **has many** `<Entity B>` via `<foreign key>`
- `<Entity B>` **belongs to** `<Entity A>`

### Validation rules
- <field>: <rule, e.g., "must be a valid email">

### Data classification
- <Entity/field>: Public / Internal / Sensitive (per `context/constitution.md`)

## Definition of Done
- [ ] Every entity referenced in `spec.md` and `plan.md` is documented here
- [ ] Required vs optional fields are explicit
- [ ] Sensitive fields are labeled per the constitution's data classification
