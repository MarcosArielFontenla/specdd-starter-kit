# Boreal Wizard Redesign — Design

**Fecha:** 2026-07-02
**Estado:** Aprobado (diseño). Pendiente plan de implementación.
**Alcance:** Rediseñar la UI de **ambos** wizards (`specdd-kit` y `specforge-kit`) aplicando el
**Boreal Design System** (tokens/tema) y un nuevo **layout de sidebar-stepper**. specdd-kit primero
como plantilla; specforge-kit reusa el mismo patrón.

## Contexto

Los dos wizards hoy usan un card centrado simple (`.wizard`) con una fila horizontal de pasos.
El repo incluye `Boreal Design System/` (una skill `boreal-design`) con tokens completos en
`colors_and_type.css` (paleta night-navy/glacier/ember, frosted-glass, radios, elevación, motion),
clases semánticas `.b-*`, tres fuentes (Bricolage Grotesque, Hanken Grotesk, Space Mono) y iconografía
Lucide. Este trabajo aplica ese lenguaje visual + un layout de dos columnas con stepper lateral.

Solo cambia la **presentación** (estilos + layout + un refactor menor de validación por paso).
La lógica de generación (generators, bundlers, JSZip) NO cambia.

## Decisiones tomadas (brainstorming)

| Tema | Decisión |
|------|----------|
| Wizards | Ambos; specdd-kit primero, specforge-kit reusa el patrón |
| Stepper | ✓ cuando el paso es válido; click para volver a pasos **visitados**; bloquea saltar a futuros no completados |
| Fuentes | Google Fonts vía `<link>` (Bricolage Grotesque, Hanken Grotesk, Space Mono) |
| Iconos | `lucide-react` (distribución React-nativa de Lucide); reemplaza `iconoir-react` (dep sin uso) |
| Branding | Solo estilo (paleta/glass/tipografía); sin logo Boreal; títulos SDD/SpecForge intactos; sin copy de viajes |
| Tema | Oscuro Boreal por defecto (no light) |

## Principios / restricciones

- No romper los tests: preservar TODOS los `data-testid` (`step-title`, `next-btn`, `download-btn`,
  `preview`, `error`, `project-name`, `feature-title`, `persona-BA/QA/Dev/UX`) y la señal `data-ready`.
- No tocar `generators.js`, `bundle-kit.js`, `bundle-skills.js`, ni el flujo de ZIP.
- Construir SOBRE los tokens de Boreal; no inventar colores nuevos.
- No versionar artefactos generados (`kit-files.json`, `skills.json`) ni `node_modules`.
- Tokens copiados por app (las dos webs son paquetes npm separados; no hay paquete compartido).
- Node >=20. Windows-friendly.

## Arquitectura

### Entrega del tema (por app)

Cada `website/` recibe:
- `src/styles/boreal-tokens.css` — copia de `Boreal Design System/colors_and_type.css`
  (custom properties `:root` + clases `.b-*`). Fuente única de tokens.
- `src/styles/wizard.css` — reescrito para usar los tokens y el layout de dos columnas
  (reemplaza el CSS actual del wizard).
- `src/layouts/Layout.astro` — agrega `<link>` a Google Fonts (Bricolage Grotesque 700/800,
  Hanken Grotesk 400/500/600, Space Mono 400/700) y `color-scheme: dark`.

`boreal-tokens.css` se importa antes de `wizard.css`.

### Componente `Stepper.jsx` (nuevo, uno por app, mismo patrón)

```
Stepper({ steps, current, isValid, maxVisited, onJump })
```
- `steps`: array de labels (p. ej. `['Welcome','Project',...]`).
- `current`: índice del paso activo.
- `isValid(i) -> boolean`: si el paso i cumple sus requeridos (para el ✓).
- `maxVisited`: índice máximo alcanzado (define qué es clickeable).
- `onJump(i)`: navega al paso i; el componente solo invoca `onJump` cuando `i <= maxVisited`.

Estados visuales por item (glass sidebar):
- **done** (`✓`, icono Lucide `check`, color aurora/glacier) — `isValid(i) && i !== current`.
- **active** (`●`, ember, resaltado) — `i === current`.
- **upcoming** (`○`, `circle`, muted) — `i > maxVisited`.
- **visited-invalid** (numerado, clickeable) — `i <= maxVisited && !isValid(i) && i !== current`.
- Items con `i > maxVisited` van deshabilitados (no clickeables).
- Cada item con `data-testid="step-nav-<i>"` para pruebas/navegación.

### Refactor de `Wizard.jsx` (ambas apps)

- Extraer la lógica de validación actual de `validate()` a una función pura
  `isStepValid(step, data)` reutilizada por `next()` y por `Stepper`.
- Añadir `maxVisited` al estado (se actualiza en `next()` y al saltar).
- Envolver el render en un shell de 2 columnas:
  ```
  <div class="b-shell" data-ready={...}>
    <aside class="b-sidebar"><Stepper .../></aside>
    <main class="b-main">
      <header eyebrow + step-title/>
      <section>{contenido del paso}</section>
      <footer>Back / Next (o Download en el último)</footer>
    </main>
  </div>
  ```
- El `data-ready` y el `data-testid="step-title"` migran al nuevo shell/header intactos.
- Botones: **Next/Download = CTA ember** (primario), **Back = ghost glass**. Focus ring glacier.
- El contenido de cada paso (inputs, checkboxes, preview) se mantiene igual — solo se re-estiliza
  con tokens (inputs glass, labels body, eyebrow mono).

### Iconos

- Añadir `lucide-react` a `dependencies`; **quitar** `iconoir-react`.
- Usar `Check`, `ChevronRight`, `ChevronLeft`, `Circle` (thin stroke ~1.75–2px, `currentColor`).

## Layout objetivo (referencia)

```
◈ SDD Kit Wizard                                   [glass header]
┌────────────────────┬─────────────────────────────────────┐
│ STEP 03 / 08       │  STEP 03 · TECH STACK                │
│ ✓ Welcome          │  Frontend *  [ React            ]    │
│ ✓ Project          │  Backend     [ NestJS           ]    │
│ ● Tech Stack       │                                      │
│ ○ Principles       │                                      │
│ ○ ...              │        [ Back ]     [ Next → ]       │
└────────────────────┴─────────────────────────────────────┘
```
Responsive: en viewport angosto el sidebar colapsa arriba como barra de progreso horizontal
(mismo componente, `.b-sidebar--collapsed`).

## Error handling / bordes

- `onJump` ignora clicks a pasos `> maxVisited` (no navega).
- `isStepValid` es pura y no muta estado; Next sigue bloqueando con el mismo mensaje de error.
- Si Google Fonts/Lucide no cargan, el tema degrada a system fonts vía la cadena de fallback de
  `--font-*` (los `font-family` de Boreal ya incluyen fallbacks); el layout no depende de los iconos.

## Testing

- e2e existentes deben seguir pasando sin cambios de aserción (usan `data-testid`, que se preserva).
- Añadir 1 aserción e2e por app: tras completar el paso 2, el item del stepper correspondiente
  muestra estado ✓ (via `data-testid="step-nav-1"` con clase/aria `data-state="done"`), y click en
  un paso visitado navega a él.
- Unit tests (generators/bundlers) no se tocan (sin cambios de lógica).
- Validación por app: `npm run build` + `npm run test:unit` + `npm test` (e2e).

## Criterios de aceptación

- Ambos wizards renderizan con el tema Boreal (glass, glacier/ember, tipografía) y el layout
  sidebar-stepper.
- El stepper marca ✓ los pasos válidos, resalta el actual y permite volver a pasos visitados.
- CTA Next/Download en ember; focus rings glacier; oscuro por defecto.
- `data-testid` y `data-ready` intactos; e2e y unit verdes; builds verdes en ambas apps.
- Sin secretos; `iconoir-react` removido; `lucide-react` agregado; sin cambios en generators/bundlers.

## Fuera de alcance

- Tema claro / toggle de tema.
- Copy de marca Boreal (viajes) o logo Boreal en el wizard.
- Cambios en la lógica de generación, prompts, skills o el contenido del ZIP.
- Adherencia automatizada al linter del DS (`_adherence.oxlintrc.json`) — opcional, futura.
- Un paquete de tema compartido entre las dos webs (se copian tokens por app).
