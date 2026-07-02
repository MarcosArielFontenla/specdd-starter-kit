# SpecDD Platform — Design (Iteración 5)

**Fecha:** 2026-07-02
**Estado:** Diseño aprobado en conversación; pendiente revisión del spec y plan de implementación.
**Alcance:** Portal unificado "SpecDD Platform" (landing + los 3 wizards como rutas) sobre
npm workspaces, extrayendo `@specdd/ui` y de-duplicando los assets Boreal de los 3 kits
(salda ROADMAP #1 y #4). Los kits siguen funcionando standalone.

## Contexto

Hoy los 3 wizards (`specdd-kit`, `specforge-kit`, `specdeploy-kit`) son sitios Astro
independientes (puertos 4321/4322/4323) con `Stepper.jsx`, `boreal-tokens.css` y
`wizard.css` triplicados byte a byte (duplicación deliberada del spec Boreal, marcada como
deuda). Para presentar el producto, tres `npm run dev` separados no cuentan la historia de
plataforma. Este sub-proyecto crea el shell único y elimina la triplicación.

## Decisiones tomadas (brainstorming)

| Tema | Decisión |
|------|----------|
| Arquitectura | **npm workspaces**: nueva app `platform/` que importa los `Wizard.jsx` existentes como packages del workspace |
| De-dup UI | `@specdd/ui` (Stepper + tokens + wizard.css); **los 3 kits también lo consumen** — se borran las 3 copias |
| Branding | Neutro: **"SpecDD Platform"** |
| Standalone | Los 3 sites por kit siguen corriendo (`npm run dev` por workspace) |
| Lockfiles | **Uno solo en la raíz** (requisito de workspaces); desaparecen los 3 por kit |
| Puerto del portal | **4320** |

## Principios no negociables

- Cero cambios de comportamiento en los wizards: los e2e y unit existentes de los 3 kits
  quedan verdes **sin tocar sus asserts**.
- Sin secretos; sin nuevas dependencias de runtime (React/Astro/JSZip/lucide ya existen).
- Windows-friendly; Node >= 20; convenciones de prompts/launchers del repo.
- `@specdd/ui` es la única fuente de Stepper/tokens/css tras la migración (cero copias).

## Arquitectura

```
package.json                        # raíz: private:true, workspaces, lockfile único
packages/ui/                        # @specdd/ui
├── package.json                    # exports: "./stepper", "./styles/boreal-tokens.css", "./styles/wizard.css"
├── src/Stepper.jsx                 # única copia (idéntico al actual)
└── styles/
    ├── boreal-tokens.css
    └── wizard.css                  # incluye .b-help (hoy solo en specdeploy; inocuo en los demás)
platform/                           # specdd-platform (Astro, puerto 4320)
├── package.json                    # predev/prebuild: corre los 3 bundlers vía workspaces
├── astro.config.mjs
├── playwright.config.js
├── src/layouts/Layout.astro        # head Boreal + top bar (brand "SpecDD Platform" + back-to-home)
├── src/pages/index.astro           # landing
├── src/pages/specdd.astro          # <Wizard client:load /> del kit
├── src/pages/specforge.astro
├── src/pages/specdeploy.astro
├── src/styles/landing.css          # estilos solo de la landing (tokens de @specdd/ui)
└── e2e/platform.spec.js
specdd-kit/website                  # pasan a ser workspace packages;
specforge-kit/website               # pierden sus copias de Stepper/tokens/css
specdeploy-kit/website              # y sus package-lock.json individuales
```

### Workspaces (raíz `package.json`)

```json
{
  "name": "specddstarterkit",
  "private": true,
  "workspaces": [
    "packages/ui",
    "platform",
    "specdd-kit/website",
    "specforge-kit/website",
    "specdeploy-kit/website"
  ]
}
```

`npm install` en la raíz instala todo; `npm run dev -w <pkg>` corre cada site standalone.

### `@specdd/ui`

- `package.json`: `name: "@specdd/ui"`, `exports`: `"./stepper" → src/Stepper.jsx`,
  `"./styles/boreal-tokens.css"`, `"./styles/wizard.css"`. `peerDependencies`: react,
  lucide-react (los hosts ya las tienen).
- `wizard.css` mantiene su `@import './boreal-tokens.css'` (relativo dentro del package).
- Migración por kit: `import Stepper from '@specdd/ui/stepper'` en Wizard.jsx;
  `import '@specdd/ui/styles/wizard.css'` en index.astro; borrar copias locales.

### Cómo el portal monta los wizards

- Cada kit website agrega a su `package.json` un export:
  `"./wizard": "./src/components/Wizard.jsx"`.
- `platform/src/pages/specdd.astro`: `import Wizard from 'sdd-kit-wizard/wizard'` +
  `<Wizard client:load />` dentro del Layout del portal. Ídem specforge/specdeploy.
- Los imports internos del Wizard (generators, `../data/*.json`, css nada — el css lo
  importa la página) resuelven dentro de su propio package: cero forks.
- `platform` declara dependencias de workspace: `sdd-kit-wizard`, `specforge-wizard`,
  `specdeploy-wizard`, `@specdd/ui` (versión `*`).
- `predev`/`prebuild` del portal: `npm run bundle-kit -w sdd-kit-wizard &&
  npm run bundle-skills -w specforge-wizard && npm run bundle-providers -w specdeploy-wizard`.

### Landing (`index.astro`, Astro puro, sin isla React)

1. **Hero**: "SpecDD Platform" + lema "Specifications are the source of truth. Code is
   the output." + CTA a los wizards.
2. **3 cards** (glass Boreal): SpecDD Kit (scaffold SDD → ZIP), SpecForge (scaffold por
   rol BA/QA/Dev/UX → ZIP), SpecDeploy (artefactos de deploy por provider → ZIP); cada
   una linkea a su ruta.
3. **Tira del flujo SDD**: constitution → specify → plan → tasks → implement.
4. Footer: link al repo/docs. Todo con tokens de `@specdd/ui`; estilos propios en
   `landing.css` (clases `p-*` para no chocar con `b-*`).

### Layout del portal

`Layout.astro` replica el head Boreal actual (fonts Google, color-scheme dark) y agrega
una top bar mínima: brand "SpecDD Platform" (link a `/`) — visible también en las páginas
de wizard para volver a la landing. Sin tocar el `b-shell` interno de los wizards.

## CI / launchers / docs

- **`ci.yml`**: los 3 jobs existentes migran a: checkout → setup-node 20 → `npm ci`
  (raíz) → `npm run <bundle> -w <pkg>` → `npm run test:unit -w <pkg>` → `npm run build
  -w <pkg>`. Nuevo job `platform-build`: `npm ci` → bundlers (3) → `npm run build -w
  specdd-platform`. Paths: agregar `platform/**`, `packages/**`, `package.json`,
  `package-lock.json`.
- **Launcher**: `.github/prompts/platform-launch.prompt.md` (Node 20+, `npm install` en
  raíz, `npm run dev -w specdd-platform`, abrir `http://localhost:4320`, reportar errores
  verbatim).
- **README raíz**: el portal pasa a ser el quick start recomendado (una instalación, un
  dev server); quick starts por kit siguen documentados con la nota del install en raíz.
  Nota de demo (dogfooding): el pipeline de deploy del portal puede generarse con el
  propio SpecDeploy wizard.
- **READMEs/SETUPs de kits**: actualizar comandos (`npm install` en raíz o
  `npm install -w`).

## Testing

- **Platform e2e** (`platform/e2e/platform.spec.js`, Playwright, webServer 4320):
  1. Landing renderiza el hero y las 3 cards con links correctos.
  2. Por cada ruta (`/specdd`, `/specforge`, `/specdeploy`): el wizard hidrata
     (`.b-shell[data-ready="true"]`) y muestra su primer paso (`step-title` = "Welcome").
- **Regresión**: las suites actuales pasan sin modificar asserts — unit: specdd 5,
  specforge 7, specdeploy 42; e2e: specdd 1, specforge 1, specdeploy 2. Solo se permiten
  cambios de imports en sus fuentes.
- Build de los 4 sites (3 kits + portal) en verde.

## Error handling / bordes

- Bundler de un kit falla → el `predev` del portal falla con el error del kit (no se
  arranca con datos viejos/incompletos en build; en dev el predev corre antes).
- Ruta de wizard sin datos generados: no puede ocurrir en flujo normal (predev/prebuild);
  si se importa el JSON sin bundle previo el build falla explícito (comportamiento actual).
- Colisión de CSS: los wizards usan clases `b-*` y la landing `p-*`; `wizard.css` se
  importa solo en las páginas de wizard, `landing.css` solo en la landing.

## Criterios de aceptación

- `npm install` (raíz) + `npm run dev -w specdd-platform` levanta el portal en 4320 con
  landing y los 3 wizards funcionando en sus rutas (descarga de ZIP incluida).
- Cada kit sigue corriendo standalone: `npm run dev -w <pkg>` en 4321/4322/4323.
- Cero copias de Stepper/tokens/wizard.css fuera de `packages/ui` (verificable por búsqueda).
- Suites existentes de los 3 kits verdes sin cambios de asserts; e2e del portal verde;
  4 builds verdes; CI actualizado y en verde.
- Un solo `package-lock.json` (raíz).
- `/platform-launch` documentado; README raíz actualizado.

## Fuera de alcance

- Org profiles (siguiente iteración natural; el portal es su punto de integración).
- Branding configurable, deploy en vivo del portal, SSR/backend.
- Cambios de comportamiento o UI interna de los wizards.
