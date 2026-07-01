# Tech Stack Context

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
Record the languages, frameworks, tooling, and conventions a plan must respect so `plan.md` and `tasks.md` stay consistent with the real codebase.

## Inputs
- Primary language(s) and runtime versions
- Frameworks and major libraries
- Build, test, lint, and deploy tooling
- Coding conventions already in use

## Content

### Languages & runtimes
- Example: Node.js 22, TypeScript 5.x

### Frameworks & libraries
- Example: Astro (frontend), Vitest / `node --test` (unit tests), Playwright (e2e)

### Build & tooling
- Package manager: npm
- Build command: `npm run build`
- Dev command: `npm run dev`

### Testing
- Unit tests: `node --test` or the project's configured runner
- E2E tests: Playwright, run via `npm run test:e2e`
- Coverage/quality gates: describe any required thresholds

### Lint & format
- Formatter: describe (e.g., Prettier defaults, `editor.formatOnSave`)
- Linter: describe (e.g., ESLint config name)

### Deployment
- Target environment(s) and how deploys are triggered

### Conventions
- File/module naming conventions
- Commit message style (e.g., Conventional Commits)
- Branching model

## Definition of Done
- [ ] Every tool a plan might reference is listed with its actual command
- [ ] Versions are concrete, not "latest"
- [ ] Conventions section reflects what the codebase actually does today
