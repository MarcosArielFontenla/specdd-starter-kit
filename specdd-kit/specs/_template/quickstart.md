# Quickstart: <feature name>

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Let a developer or reviewer get this feature running and verify it works, without reading the whole plan.

## Inputs
- Completed implementation (or a specific task's output)
- `context/tech-stack.md` for base tooling requirements

## Content

### Prerequisites
- <runtime/tool + version, e.g., Node.js 22>
- <required environment variables or config, without real secret values>
- <any services that must be running>

### Setup steps
1. `<command>` — <what it does>
2. `<command>` — <what it does>

### Run / verify
1. `<command to run the feature>`
2. <manual check or automated test command, e.g., `npm test`>
3. Expected result: <what "it works" looks like>

### Troubleshooting
- <common failure> → <fix>

## Definition of Done
- [ ] A developer unfamiliar with the feature can follow these steps and see it working
- [ ] Every command listed actually runs in a clean checkout
- [ ] No secrets or environment-specific values are hardcoded
