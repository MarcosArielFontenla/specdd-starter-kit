# SPECDDSTARTERKIT — Design (Iteración 1)

**Fecha:** 2026-07-01
**Estado:** Aprobado (diseño). Pendiente plan de implementación.
**Alcance de esta iteración:** Base del repositorio + `specdd-kit`. (`specforge-kit` es un segundo sub-proyecto con su propio spec/plan.)

## Contexto

Repositorio starter kit enterprise inspirado conceptualmente en [`github/spec-kit`](https://github.com/github/spec-kit),
adaptado a un uso interno con wizards visuales, prompts de GitHub Copilot, instrucciones y agentes.
La columna vertebral es **Spec-Driven Development (SDD)**: `constitution → specify → plan → tasks → implement`.
No es un fork de spec-kit; reimplementa la metodología con generadores visuales.

Fuente de requisitos: `PROMPT_SPECDDSTARTERKIT.md` (en la raíz). Este diseño **recorta y adapta**
ese prompt a las decisiones tomadas con el usuario (abajo).

## Decisiones tomadas (brainstorming)

| Tema | Decisión |
|------|----------|
| Kits a construir | `specdd-kit` + `specforge-kit` (sin `specdeploy-kit`) |
| Orden | Iteración 1 = base + `specdd-kit`; Iteración 2 = `specforge-kit` |
| Agente/stack | Multi-agente genérico (Copilot/Claude/Cursor/Gemini), stack configurable en el wizard |
| Integraciones | Sin Azure DevOps y sin despliegue Azure. Sí opciones de **MCP básicos** generadas por el wizard |
| Gobernanza | Flujo SDD puro, **sin** niveles L1–L4 |
| awesome-copilot | **Omitir** el snapshot; solo placeholder de referencia + atribución de licencia |
| Personas specforge | BA, QA, Dev, UX (las 4) — en Iteración 2 |
| Tests/CI | Tests básicos + verificación de build; CI simple en GitHub Actions |
| Branding | Neutro/configurable (no "Surtec" por defecto) |

## Principios no negociables (heredados del prompt)

- Sin secretos, PATs, tokens ni valores reales de Azure en archivos fuente, ejemplos o logs.
- Preservar licencias/atribuciones de cualquier contenido público referenciado.
- No versionar `node_modules`, `.astro`, `dist`, logs, `.env*`, bundles generados.
- `.vscode/settings.json` genérico: sin rutas locales ni comandos auto-aprobados personales.
- Rutas y comandos consistentes para Windows/enterprise.

## Arquitectura — Iteración 1

### 1. Base del repositorio

```
SPECDDSTARTERKIT/
├── .github/
│   ├── prompts/specdd-launch.prompt.md      # launcher Copilot Chat para specdd-kit
│   └── workflows/ci.yml                      # lint/build de specdd-kit (Node 20)
├── .vscode/settings.json                     # genérico, mínimo
├── awesome-copilot-main/README.md            # placeholder de referencia + licencia/atribución
├── docs/superpowers/specs/                    # specs de brainstorming (este archivo)
├── specdd-kit/                               # ver sección 2
├── .gitignore                                # del prompt, corregido a specdd-kit/...
└── README.md                                 # mapa de kits + filosofía SDD
```

`specdeploy-ci.yml` del prompt **no** aplica (no hay specdeploy-kit); el CI se reduce a validar specdd-kit.

### 2. `specdd-kit` — arquitectura del wizard

**Stack:** Astro 5 + React 18 + JSZip + Playwright. `package.json` según el prompt (`sdd-kit-wizard`).

**Flujo de datos (build-time → runtime):**

```
bundle-kit.js (prebuild)
   lee archivos estáticos de specdd-kit/  ──►  escribe website/src/data/kit-files.json
                                                        │
Wizard.jsx (8 pasos)  ──►  recoge inputs del usuario    │
                                                        ▼
generators.js  ──►  base = kit-files.json  +  overlay de archivos dinámicos
                                                        │
                                                        ▼
JSZip  ──►  ZIP descargable (con preview + copy-to-clipboard por archivo)
```

**`bundle-kit.js`** (`website/scripts/`):
- Lee el parent `specdd-kit/` y escribe `website/src/data/kit-files.json`.
- Omite: `website`, `node_modules`, `.git`, `.astro`, `.idea`, `dist`.
- Incluye extensiones: `.md`, `.json`, `.yml`, `.yaml`, `.txt`, `.sh`, `.gitignore`, `.gitkeep`.
- Omite los defaults que el wizard reemplaza por overlay:
  `context/project.md`, `context/tech-stack.md`, `context/constitution.md`, `.github/copilot-instructions.md`.

**`Wizard.jsx`** — 8 pasos (adaptados: sin gobernanza L1–L4):
1. Welcome
2. Project (name, description, problem statement, personas, user/business outcome, constraints)
3. Tech Stack (lenguajes, frontend, backend, testing, database, infra; flags Swagger/OpenAPI, WCAG/a11y)
4. Principles (principios SDD del proyecto)
5. MCP Tools (GitHub, SonarQube, Context7, PostgreSQL, Playwright, Figma — opcionales)
6. Agent & LLM (Copilot/Claude/Cursor/Gemini + modelo por defecto)
7. Security / Data classification (ligero: public/internal/confidential/restricted, OWASP flags)
8. Preview / Download

Cada paso valida sus campos requeridos. El paso "Governance" del prompt se **elimina**; el paso 7 queda ligero.

**`generators.js`** (`website/src/components/`):
- Base: `kit-files.json`.
- Overlay dinámico:
  - `context/project.md`, `context/tech-stack.md`, `context/constitution.md`
  - `.github/copilot-instructions.md` (y/o `AGENTS.md` según agente elegido)
  - `.vscode/mcp.json` **solo si** se seleccionan MCP tools
  - `specs/features-spec.md` si se pega una spec (sin integración ADO)
- Filtra instrucciones según stack elegido (React/Next/Angular; NestJS/Node/ASP.NET/Spring/Python; Docker/K8s; a11y, SonarQube, GitHub Actions).

### 3. Contenido empaquetado del kit

**`.github/prompts/*.prompt.md`** (frontmatter Copilot Chat: `agent`, `description`):
`specdd-specify`, `specdd-clarify`, `specdd-plan`, `specdd-tasks`, `specdd-analyze`, `specdd-implement`,
`specdd-checklist`, `specdd-code-review`, `specdd-constitution`, `specdd-adr`, `specdd-spike`,
`specdd-issues-from-spec`, `specdd-issues-from-plan`, `specdd-issues-from-unmet`,
`specdd-create-llms`, `specdd-update-llms`, `conventional-commit`.
**Omitidos** (eran de gobernanza L2/L3): `specdd-blueprint`, `specdd-domain-spec`, `specdd-context-map`, `devops-rollout-plan`.

**`.github/instructions/*.instructions.md`** (subconjunto sin gobernanza ni Azure DevOps/Motif):
`specdd-workflow`, `agent-behavior`, `agent-safety`, `mcp-tools`, `security-and-owasp`, `a11y`,
stack: `typescript-5-es2022`, `reactjs`, `angular`, `nextjs`, `nestjs`, `aspnet-rest-apis`, `springboot`, `python`,
`swagger-api-docs`, `sonarqube`, `containerization-docker-best-practices`, `kubernetes-deployment-best-practices`,
`github-actions`, `performance-optimization`, `code-review-generic`, `context-engineering`, `devops-core-principles`.
**Omitidos:** `governance`, `motif-design-system`, `azure-devops-pipelines`.

**`.github/agents/*.agent.md`:** `specdd-specify`, `specdd-implement`, `specdd-orchestrator`,
`se-security-reviewer`, `se-system-architecture-reviewer`, `se-technical-writer`,
`tdd-red`, `tdd-green`, `tdd-refactor`.

**`.github/hooks/`:** `session-logger/` (README + hooks.json + scripts .sh). **Omitido** `governance-audit/`.

**Documentación y templates:**
- `README.md` ("Specifications are the source of truth. Code is the output.")
- `SETUP.md` (prerequisites → context → first feature → MCP setup → team adoption)
- `docs/`: `starter-guide.md`, `specdd-methodology.md`, `workflow.md`, `greenfield-vs-brownfield.md`, `faq.md`, `references.md`
- `governance/constitution.md` (SDD básica, sin niveles L1–L4)
- `specs/_template/`: `spec.md`, `plan.md`, `tasks.md`, `data-model.md`, `quickstart.md`, `research.md`, `checklist.md`, `api.md`, `contracts/README.md`
- `templates/`: `spec-template.md`, `plan-template.md`, `tasks-template.md`, `checklist-template.md`,
  `constitution-template.md`, `agents-md-template.md`, `agent-file-template.md`, `llms-txt-template.md`,
  `vscode-settings.json`, `commands/*.md` (analyze, checklist, clarify, constitution, implement, plan, specify, tasks).
  **Omitidos:** `blueprint-template.md`, `domain-spec-template.md`, `taskstoissues` (gobernanza/ADO).

### 4. Testing / CI

- **Playwright:** 1–2 e2e (`e2e/wizard.spec.js`) que verifican que el wizard levanta y descarga un ZIP.
- **Verificación local:** `npm install → npm run bundle-kit → npm run build → npm run test`.
- **CI (`.github/workflows/ci.yml`):** Node 20, `npm ci`, `npm run build` de `specdd-kit/website` en push/PR a `main`
  cuando cambie `specdd-kit/**`. Playwright browsers: si faltan, reportar `npx playwright install` sin ocultar el error.

## Error handling / bordes

- Si `bundle-kit` no encuentra archivos → falla explícito con la ruta, no silencioso.
- Validación por paso del wizard: no avanzar con requeridos vacíos.
- MCP: `.vscode/mcp.json` **no** se genera si no hay selección (evita config vacía).
- Sin secretos en `mcp.json` generado: usar placeholders (`${input:...}`), nunca valores reales.

## Criterios de aceptación (Iteración 1)

- `specdd-kit/website` levanta el wizard y descarga un ZIP con contexto, prompts, instrucciones, templates y `mcp.json` según inputs.
- `/specdd-launch` documentado y funcional desde Copilot Chat.
- Sin secretos en fuentes/ejemplos.
- `awesome-copilot-main/` preserva atribución de licencia (placeholder de referencia).
- Build y tests básicos pasan; CI simple corre.
- Resumen final de archivos creados, comandos ejecutados y supuestos pendientes.

## Fuera de alcance (iteraciones futuras)

- `specforge-kit` (BA/QA/Dev/UX) — Iteración 2, spec/plan propios.
- `specdeploy-kit` (Azure SWA + Functions) — no en el roadmap actual.
- Snapshot completo de `awesome-copilot`.
- Gobernanza L1–L4, integración Azure DevOps, Motif Design System.
```