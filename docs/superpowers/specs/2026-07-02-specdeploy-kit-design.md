# specdeploy-kit — Design (Iteración 3)

**Fecha:** 2026-07-02
**Estado:** Diseño escrito; pendiente de revisión del usuario y plan de implementación.
**Alcance:** `specdeploy-kit` — wizard de deploy **agnóstico de infraestructura**: genera
artefactos de despliegue (pipelines CI/CD, IaC, runbook), **no despliega en vivo**.
Sub-proyecto independiente; `specdd-kit` (It. 1) y `specforge-kit` (It. 2) ya están completos.

## Contexto

Tercer y último kit del repositorio. El prompt original (`PROMPT_SPECDDSTARTERKIT.md`, Fase 4)
planteaba un deployer en vivo a Azure Static Web Apps con backend de Azure Functions (tokens
ARM, rate limiting, extracción segura de ZIP). Ese diseño es Azure-céntrico y con superficie de
seguridad alta. Este diseño lo reemplaza por un **generador de artefactos** consistente con los
otros dos kits (wizard → ZIP), donde Azure SWA es solo el provider de referencia de una matriz
extensible. Objetivo de negocio: adaptar el kit a la infraestructura de una empresa interesada
debe ser "escribir una carpeta de provider", no un fork del wizard.

## Decisiones tomadas (brainstorming)

| Tema | Decisión |
|------|----------|
| Modo | **Generador de artefactos** — sin deploy en vivo, sin backend, sin credenciales |
| Alcance de apps v1 | Sitios estáticos + API simple opcional (Node serverless) |
| Providers v1 | `azure-swa` (referencia), `cloudflare-pages`, `aws-s3-cloudfront`, `vercel`, `netlify`, `onprem-docker` (Nginx o IIS) |
| CI/CD v1 | GitHub Actions + Azure Pipelines (filtrado por soporte del provider) |
| Extensibilidad | **Provider = datos** (descriptor `provider.json` + templates); el wizard renderiza campos dinámicamente desde el descriptor |
| UI | Boreal sidebar-stepper, mismo patrón que los otros kits |
| Mejoras enterprise (portal, org profiles, paquete UI compartido) | Fuera de alcance; documentadas en `docs/ROADMAP.md` |

## Principios no negociables

- **Cero secretos**: los artefactos generados referencian secretos **solo por nombre**
  (`${{ secrets.X }}` / variable groups); el wizard nunca captura valores. El runbook indica
  dónde crearlos.
- Sin backend: todo corre en el navegador (mismo modelo JSZip que los otros kits).
- No versionar bundles generados (`providers.json` git-ignored, como `kit-files.json`/`skills.json`).
- Windows-friendly. Frontmatter/convenciones consistentes con el resto del repo.
- Agregar un provider nuevo no debe requerir cambios en `Wizard.jsx` ni `generators.js`.

## Arquitectura

```
specdeploy-kit/
├── README.md
├── SETUP.md
├── providers/                          # ← núcleo extensible (datos, no código)
│   ├── _schema/provider.schema.json    # JSON Schema del descriptor (documentación + validación)
│   ├── azure-swa/
│   │   ├── provider.json               # descriptor: campos, CI soportados, secretos, artefactos
│   │   └── templates/
│   │       ├── github-actions.yml
│   │       ├── azure-pipelines.yml
│   │       ├── main.bicep
│   │       └── runbook.md
│   ├── cloudflare-pages/
│   ├── aws-s3-cloudfront/              # IaC: Terraform
│   ├── vercel/                         # provider fino: vercel.json + pipeline CLI
│   ├── netlify/                        # provider fino: netlify.toml + pipeline CLI
│   └── onprem-docker/                  # Dockerfile + compose + nginx.conf | IIS web.config
├── docs/
│   └── provider-authoring.md           # guía: cómo escribir un provider para un cliente nuevo
└── website/
    ├── package.json                    # specdeploy-wizard (Astro 5 + React 18 + JSZip + lucide)
    ├── astro.config.mjs
    ├── playwright.config.js
    ├── scripts/bundle-providers.js     # providers/**/ → src/data/providers.json
    ├── scripts/bundle-providers.test.js
    ├── src/data/.gitkeep
    ├── src/components/Wizard.jsx       # 6 pasos; campos de Target dinámicos por descriptor
    ├── src/components/Stepper.jsx      # copia Boreal (3.ª copia — deuda anotada en ROADMAP)
    ├── src/components/generators.js    # puro: generateFiles(providers, input) → { path: content }
    ├── src/components/generators.test.js
    ├── src/components/render-template.js  # mini-renderer {{var}} / {{#if var}}…{{/if}}
    ├── src/components/render-template.test.js
    ├── src/pages/index.astro
    ├── src/layouts/Layout.astro
    ├── src/styles/boreal-tokens.css
    ├── src/styles/wizard.css
    └── e2e/wizard.spec.js
```

### Flujo de datos

```
bundle-providers.js (predev/prebuild)
  providers/*/provider.json + templates/*  ─►  src/data/providers.json
Wizard.jsx  ─►  inputs (app + provider fields dinámicos + ci + entornos)
generators.js: selecciona artefactos por descriptor (when) + render-template
JSZip ─► ZIP descargable (preview + copy-to-clipboard, como los otros kits)
```

### Descriptor `provider.json`

```json
{
  "id": "azure-swa",
  "label": "Azure Static Web Apps",
  "description": "SWA con API opcional en Functions",
  "supportsApi": true,
  "ci": ["github-actions", "azure-pipelines"],
  "fields": [
    { "key": "appName", "label": "App name", "type": "text", "required": true,
      "pattern": "^[a-z0-9-]{2,60}$", "help": "Nombre del recurso SWA" },
    { "key": "region", "label": "Region", "type": "select",
      "options": ["westeurope", "eastus2", "centralus"], "default": "westeurope" }
  ],
  "secrets": [
    { "name": "AZURE_STATIC_WEB_APPS_API_TOKEN",
      "description": "Deployment token de la SWA",
      "where": "GitHub → Settings → Secrets / AzDO → variable group" }
  ],
  "artifacts": [
    { "template": "github-actions.yml", "output": ".github/workflows/deploy.yml",
      "when": "ci:github-actions" },
    { "template": "azure-pipelines.yml", "output": "azure-pipelines.yml",
      "when": "ci:azure-pipelines" },
    { "template": "main.bicep", "output": "infra/main.bicep" },
    { "template": "runbook.md", "output": "docs/deploy-runbook.md" }
  ]
}
```

- `fields` alimenta el paso Target: el wizard los renderiza dinámicamente
  (text/select/toggle, `required`, `pattern`, `default`, `help`).
- `when` soporta condiciones simples: `ci:<id>`, `api` (tiene API), `!api`.
- `secrets` alimenta el paso Security (checklist de nombres + dónde crearlos) y el runbook.
- `_schema/provider.schema.json` documenta el formato; `bundle-providers.js` valida cada
  descriptor contra reglas mínimas (id/label/artifacts presentes, templates existentes)
  y falla el build con mensaje claro si un provider está mal formado.

### `render-template.js` (mini-renderer, sin dependencias)

- `{{var}}` → valor del input (escape ninguno: los templates son YAML/HCL/MD controlados).
- `{{#if var}}…{{/if}}` → bloque condicional (truthy). Sin else, sin loops (YAGNI).
- Regla dura: si tras renderizar queda algún `{{`, es error (test de matriz lo verifica).

### `Wizard.jsx` — 6 pasos

1. **Welcome** — qué genera y qué NO hace (no despliega, no pide credenciales).
2. **App** — nombre del proyecto; framework/build preset (Astro, Vite, Next static export,
   Create React App, HTML plano, Custom) que precarga `buildCommand` + `outputDir`
   (editables); API opcional: none | Node serverless (`apiDir`). Requeridos: nombre, outputDir.
3. **Target** — cards de providers (desde `providers.json`); al elegir uno, se renderizan sus
   `fields`. Si el provider no soporta API (`supportsApi: false`) y el usuario eligió API en
   el paso 2, warning visible y el runbook lo refleja. Requerido: provider + sus `required`.
4. **CI/CD** — GitHub Actions y/o Azure Pipelines, **filtrado por `ci` del provider**
   (mínimo 1). Entornos: prod solo | dev+prod. Toggle "approval gate para prod"
   (environments protegidos en GHA / approvals en AzP).
5. **Security** — sin inputs de valores: checklist generada con los `secrets` del provider
   (nombre, para qué, dónde crearlo) + recordatorio de data classification. Solo lectura + ack.
6. **Preview / Download** — árbol de archivos, preview, copy-to-clipboard, ZIP.

Validación por paso, `data-ready` para e2e determinista, navegación tipo Boreal
(done/active/upcoming/visited-invalid) — todo igual a los otros dos wizards.

### `generators.js` (puro)

`generateFiles(providersBundle, input)` →
1. Resuelve el descriptor del provider elegido.
2. Filtra `artifacts` por condiciones `when` (ci seleccionados, api on/off).
3. Renderiza cada template con el contexto `{ ...app, ...providerFields, ci, envs, secrets }`.
4. Agrega artefactos comunes (independientes del provider):
   - `specdeploy.json` — manifest: versión del kit, provider, elecciones (permite regenerar).
   - `.env.example` — variables no sensibles detectadas + comentario de dónde van los secretos.
   - `docs/deploy-runbook.md` — viene del template del provider; incluye prerequisitos,
     tabla de secretos (nombres + dónde), primer deploy, verificación y rollback.

### Contenido típico del ZIP (ej. Azure SWA + GitHub Actions + dev/prod)

```
.github/workflows/deploy.yml     # referencia ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
infra/main.bicep                 # SWA + config; parámetros con defaults del wizard
docs/deploy-runbook.md
specdeploy.json
.env.example
```

Equivalentes por provider: `aws-s3-cloudfront` → `infra/*.tf`; `onprem-docker` →
`Dockerfile`, `docker-compose.yml`, `deploy/nginx.conf` **o** `deploy/web.config` (IIS)
según campo del descriptor; `vercel`/`netlify` → `vercel.json`/`netlify.toml` + pipeline CLI
(el runbook aclara que la integración Git nativa es la vía recomendada y el pipeline es
alternativa).

### `docs/provider-authoring.md`

Guía paso a paso para agregar un provider (el mecanismo de adaptación a clientes):
estructura de carpeta, schema del descriptor, sintaxis del mini-renderer, condiciones `when`,
cómo declarar secretos, cómo probarlo (el test de matriz lo recoge automáticamente),
checklist de PR. Con un provider de ejemplo mínimo comentado.

### Raíz, CI, tests

- `.github/prompts/specdeploy-launch.prompt.md`: launcher (Node 20+, install,
  bundle-providers, dev, abrir navegador, reportar URL/errores) — como los otros dos.
- CI (`.github/workflows/ci.yml`): job `specdeploy-kit-build` (trigger `specdeploy-kit/**`):
  `npm install → bundle-providers → test:unit → build`.
- Tests:
  - `bundle-providers.test.js`: empaqueta providers; falla claro ante descriptor inválido
    o template referenciado inexistente.
  - `render-template.test.js`: `{{var}}`, `{{#if}}`, placeholder sin resolver = error.
  - `generators.test.js`: por provider genera los artefactos correctos; `when` respeta
    ci/api; manifest y runbook presentes; **ningún output contiene valores con pinta de
    secreto** (regex de tokens/keys).
  - **Test de matriz** (ancla de calidad): para cada provider × cada ci soportado × api on/off:
    render completo, cero `{{` sin resolver, YAML parseable (devDependency `yaml` solo en
    tests), cero patrones de secreto. Agregar un provider mal hecho rompe CI, no producción.
  - `e2e/wizard.spec.js`: walkthrough Azure SWA + GHA → descarga ZIP (usa `data-ready`).

## Error handling / bordes

- Provider sin soporte del ci elegido: el paso CI/CD solo ofrece los soportados (nunca
  combinación inválida).
- API elegida + provider `supportsApi: false`: warning en Target + nota en runbook (no bloquea).
- Descriptor inválido: `bundle-providers` falla el build con el provider y el motivo.
- Placeholder sin resolver en render: error (nunca ZIP con `{{...}}` dentro).
- Campos `pattern` inválidos: el paso Target no avanza.

## Criterios de aceptación

- `specdeploy-kit/website` levanta el wizard y descarga un ZIP con pipeline(s), IaC,
  runbook, manifest y `.env.example` correctos para el provider + CI elegidos.
- Los 6 providers v1 funcionan con sus ci declarados; el test de matriz pasa.
- Ningún artefacto generado contiene valores de secretos; solo nombres + instrucciones.
- Agregar un provider de prueba (carpeta + descriptor + templates) lo hace aparecer en el
  wizard **sin tocar código**, y el test de matriz lo cubre automáticamente.
- `/specdeploy-launch` documentado y funcional. CI corre para `specdeploy-kit/**`.
- Build, unit y e2e básicos pasan.

## Fuera de alcance (→ `docs/ROADMAP.md`)

- Deploy en vivo (posible fase 2: botón "deploy ahora" sobre esta misma base de providers).
- Apps containerizadas como target genérico (K8s/ECS/Cloud Run) más allá de onprem-docker.
- GitLab CI y script local de deploy.
- Portal unificado de los 3 wizards, org profiles, paquete UI compartido (`@specdd/ui`),
  campos huérfanos del wizard specdd, e2e en CI.
