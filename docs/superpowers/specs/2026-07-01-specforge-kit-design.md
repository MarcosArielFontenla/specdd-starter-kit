# specforge-kit — Design (Iteración 2)

**Fecha:** 2026-07-01
**Estado:** Aprobado (diseño). Pendiente plan de implementación.
**Alcance:** `specforge-kit` — wizard de scaffolds agénticos **por rol/persona** (BA/QA/Dev/UX).
Sub-proyecto independiente; `specdd-kit` (Iteración 1) ya está funcional y completo.

## Contexto

Segundo kit del repositorio SPECDDSTARTERKIT. Reutiliza el patrón probado de `specdd-kit`
(Astro 5 + React 18 + JSZip; flujo build-time snapshot → wizard → generador overlay → ZIP),
adaptado para recolectar inputs **por persona** y generar un scaffold Copilot-ready con
instrucciones, prompts, skills, contexto y configuraciones opcionales de MCP.

Fuente de requisitos: `PROMPT_SPECDDSTARTERKIT.md` (Fase 3), recortada a las decisiones tomadas.

## Decisiones tomadas (brainstorming)

| Tema | Decisión |
|------|----------|
| Personas | BA, QA, Dev, UX (las 4) |
| Skills | Set completo (~36): 4 paraguas + individuales |
| Azure DevOps | **Omitido** — sin prompts `publishspecs`/`setupadomcp` ni config ADO ni PAT |
| MCP | **Figma** (UX) y **Playwright** (QA) opcionales; placeholders `${input:...}`, nunca secretos |
| Fuente de skills | Local por defecto; **remoto opt-in con fallback local** |
| Gobernanza | Governance-lite (paso de review, sin niveles L1–L4) |
| Branding | Neutro/configurable |
| Agente | Multi-agente (Copilot/Claude/Cursor/Gemini) |
| Tests/CI | Básicos: unit (bundle-skills + generators) + 1 e2e; job CI dedicado |

## Principios no negociables

- Sin secretos/PATs/tokens/valores reales. PAT de ADO no aplica (ADO omitido).
- `mcp.json` generado usa solo `${input:...}`.
- No versionar `node_modules/`, `.astro/`, `dist/`, `skills.json` (bundle generado).
- Windows-friendly. Comandos `specforge-*`. Frontmatter de prompts `agent: agent` + `description:`.
- Sin gobernanza L1–L4, sin Azure DevOps, sin deploy, sin Motif.

## Arquitectura

```
specforge-kit/
├── SETUP.md
├── docs/Agentify_Wizard_Structural_Spec.md
├── skills/                         # ~36 skills .md (fuente que bundle-skills empaqueta)
├── skills.config.json              # { source: "local" | "remote", remote?: {...} }
├── website/
│   ├── package.json                # specforge-wizard (Astro+React+JSZip)
│   ├── astro.config.mjs
│   ├── playwright.config.js
│   ├── scripts/bundle-skills.js    # skills/*.md -> src/data/skills.json (+ remoto/fallback)
│   ├── scripts/bundle-skills.test.js
│   ├── src/data/.gitkeep
│   ├── src/components/Wizard.jsx    # dinámico por persona
│   ├── src/components/generators.js
│   ├── src/components/generators.test.js
│   ├── src/pages/index.astro
│   ├── src/layouts/Layout.astro
│   ├── src/styles/wizard.css
│   └── e2e/wizard.spec.js
└── .github/
    ├── copilot-instructions.md
    └── prompts/specforge-launch.prompt.md
```

### Flujo de datos (idéntico en espíritu a specdd-kit)

```
bundle-skills.js (prebuild)
  fuente local (skills/*.md) — o remota (manifest.json) con fallback local
        └─► src/data/skills.json
Wizard.jsx (dinámico por persona) ─► inputs
generators.js  base=skills.json  +  overlay por persona/skills
JSZip ─► ZIP descargable (preview + copy-to-clipboard)
```

### `bundle-skills.js`

- Empaqueta `skills/*.md` → `website/src/data/skills.json` (mapa `{ "<slug>": "<contenido>" }`).
- Lee `skills.config.json`:
  - `source: "local"` (default): usa `../skills/*.md`.
  - `source: "remote"`: descarga `manifest.json` + cada skill desde `remote.baseUrl`; **si falla la descarga → fallback local** (log del fallback, nunca silencioso).
- `skills.json` git-ignored.

### `Wizard.jsx` (dinámico por persona)

- Pasos comunes: **Welcome → Persona → Context → Governance-lite → Review → Download**.
- Ramas por persona (paso extra entre Persona y Context/Review):
  - **BA:** feature title, business POC, strategy (555 / custom / skip), objetivo/actores/in-scope/out-of-scope/acceptance philosophy, feature file (paste/upload), story hierarchy (Epic→Feature→Story / Feature→Story / Flat), sizing (Fibonacci / T-shirt / none), style (Gherkin / narrative / hybrid), skills BA.
  - **QA:** test approach (manual / automated / both), app base URL, gherkin framework, test plans flag, min tests per AC, evidence required, skills QA.
  - **Dev:** architecture (component-based / MVC / clean / monorepo / microservices / serverless / modular monolith / N-tier), framework, comment level, test approach, coding conventions, skills Dev.
  - **UX:** design system name/URL, Figma enabled, Figma file URL, skills UX.
- Inputs comunes: context file, quality checks, regulatory sensitivity, data classification.
- Validación por paso; preview de archivos; descarga ZIP. Señal de hidratación (`data-ready`)
  como en specdd-kit para e2e determinista.

### `generators.js` (pure, `generateFiles(baseSkills, input)`)

Genera/overlay:
- `README.md` del scaffold.
- `.github/copilot-instructions.md` (según agente/persona).
- `.github/instructions/*.instructions.md` según persona + skills seleccionadas.
- `.github/prompts/specforge-*.prompt.md` según persona (lista abajo).
- `context/<feature-slug>.md` (y `context/uploaded_context.md` si se sube archivo).
- `templates/` para QA/Dev/UX.
- `.vscode/mcp.json` **solo** si Figma (UX) o Playwright (QA) habilitados — placeholders únicamente.
- **No** genera `tools/ado_publishing_config.md` ni config ADO (omitido).

### Prompts por persona (sin ADO)

- **BA:** `/specforge-requirements`, `/specforge-stories`, `/specforge-new-feature`, `/specforge-reset-feature`
- **QA:** `/specforge-testcases`, `/specforge-validate`, `/specforge-playwright` (si automatización)
- **Dev:** `/specforge-implement`, `/specforge-review`, `/specforge-createpr`
- **UX:** `/specforge-uxflow`, `/specforge-screenspec`, `/specforge-copy`, `/specforge-setupfigmamcp` (si Figma)
- **Omitidos:** `/specforge-publishspecs`, `/specforge-setupadomcp`.

### Skills (`skills/`) — set completo (~36)

Paraguas: `specforge-ba`, `specforge-qa`, `specforge-dev`, `specforge-ux`.
BA: `story-writing`, `acceptance-criteria`, `story-splitting`, `requirements-traceability`, `context-analysis`, `miro-collaboration`.
QA: `test-case-generation`, `ac-validation`, `regression-testing`, `bug-reporting`, `playwright-testing`, `gherkin-automation`, `qa-evals`, `qa-guardrails`.
Dev: `code-review`, `component-creation`, `testing`, `refactoring`, `documentation`, `api-endpoint`, `state-management`, `error-handling`, `performance-optimization`, `accessibility`, `story-to-code`, `pr-creation`.
UX: `ux-flow-designer`, `ux-stage-generator`, `ux-copywriter`, `ux-design-system-enforcer`, `ux-prototype`, `figma-design-context`.

Cada skill: frontmatter (`name`, `description`, `persona`) + cuerpo (Purpose / When to use / How / Guardrails).

### Raíz, CI, tests

- `.github/prompts/specforge-launch.prompt.md`: launcher (Node 20+, `cd specforge-kit/website`, install, bundle-skills, dev, abrir Edge, reportar URL/errores).
- CI (`.github/workflows/ci.yml`): agregar job `specforge-kit-build` (Node 20; trigger en `specforge-kit/**`): `npm install → npm run bundle-skills → npm run test:unit → npm run build`.
- Tests:
  - `bundle-skills.test.js`: fuente local empaqueta; fuente remota simulada; **fallback local** cuando la remota falla.
  - `generators.test.js`: por persona genera prompts/instrucciones correctos; `mcp.json` solo con Figma/Playwright; nunca ADO; placeholders only.
  - `e2e/wizard.spec.js`: walkthrough de una persona (p. ej. BA) → descarga ZIP; usa `data-ready`.

## Error handling / bordes

- `bundle-skills` remoto: fallo de red → fallback local con log; nunca escribe skills.json vacío en silencio.
- Wizard: no avanzar con requeridos vacíos; `mcp.json` no se genera sin Figma/Playwright.
- `mcp.json`: solo placeholders `${input:...}`.

## Criterios de aceptación

- `specforge-kit/website` levanta el wizard por rol y descarga un ZIP con scaffold BA/QA/Dev/UX
  según persona y skills.
- `bundle-skills` empaqueta local y hace fallback cuando el remoto falla.
- `.vscode/mcp.json` se genera solo para Figma/Playwright, con placeholders; sin ADO.
- `/specforge-launch` documentado y funcional desde Copilot Chat.
- Sin secretos en fuentes/ejemplos. CI corre para `specforge-kit/**`.
- Build y tests básicos pasan.

## Fuera de alcance

- Azure DevOps (publishspecs/setupadomcp/config ADO), PAT flows.
- `specdeploy-kit`, snapshot de awesome-copilot, gobernanza L1–L4, Motif.
- Publicación real a Miro/Figma (solo skills/prompts que lo describen; sin credenciales).
