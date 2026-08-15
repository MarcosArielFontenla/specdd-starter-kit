# Estado de implementación — SpecDD Harness

**Actualizado:** 2026-08-15
**Estado:** Nivel 1 completo; Nivel 2 planificado

Este documento deja asentado qué está implementado y cuál es el siguiente incremento
del proyecto para poder retomarlo en una sesión futura sin perder contexto.

## Objetivo del producto

`SPECDDSTARTERKIT` genera scaffolds de un **SpecDD Harness** para proyectos nuevos o
existentes. El Harness es vendor-neutral y organiza contexto, gobernanza, routing,
skills, specs, workflows, validadores, evals y telemetría para que distintos agentes
de coding trabajen sobre la misma fuente de verdad.

Los escenarios del wizard son:

- **Greenfield:** proyecto nuevo, configurado mediante las respuestas del usuario.
- **Brownfield:** proyecto existente, analizado localmente y reconciliado de forma
  segura con el Harness generado.

Los escenarios y la profundidad del análisis son decisiones separadas. La profundidad
solo aplica al escenario Brownfield.

## Implementado

### Greenfield

- Wizard de configuración del proyecto, stack, dominios, entidades, features,
  principios, MCP, herramientas de agentes y seguridad.
- Generación client-side de un ZIP con el SpecDD Harness.
- `AGENTS.md` como primer punto de entrada y `.agents/` como núcleo vendor-neutral.
- Adaptadores opcionales para Claude, Gemini y GitHub Copilot, además de soporte para
  Cursor y Codex mediante `AGENTS.md`.
- Specs, skills, routing, workflows, templates, validadores, evals y telemetría de
  scaffold.

### Brownfield — Nivel 1: Bootstrap estructural

Este nivel está disponible y es el modo predeterminado.

- El análisis ocurre completamente en el navegador.
- Solo se lee el contenido de manifests conocidos (`package.json`, `pom.xml`,
  `requirements.txt`, `pyproject.toml`, `Gemfile`, `composer.json`, entre otros).
- El resto del proyecto aporta únicamente su inventario de paths.
- Detecta lenguajes, frontend, backend, testing y base de datos mediante reglas
  declarativas.
- Sugiere dominios por estructura de carpetas y entidades por patrones de nombres.
- Detecta Harnesses previos y separa mecanismo de conocimiento reutilizable.
- Prellena los pasos posteriores del wizard.
- Genera `context/brownfield-analysis.md` con detecciones, sugerencias, kickoff y
  colisiones.
- Omite archivos existentes por defecto y nunca los sobrescribe silenciosamente.
- Genera `spec-converge` para medir el delta contra las specs.
- Si existe un Harness anterior y el usuario lo reconoce, genera tareas de migración
  en estado draft y permite reemplazar únicamente paths propios del Harness.

### Explicitación de niveles

El contrato de análisis está centralizado en:

- `specdd-kit/website/src/components/analysis.js`
- `analysisDepth: 'structural' | 'semantic'`

El wizard muestra actualmente:

1. **Level 1 — Structural bootstrap:** disponible y ejecutable.
2. **Level 2 — Assisted semantic analysis:** visible como capacidad futura, pero
   deshabilitado porque todavía no existe el analizador semántico.

El nivel seleccionado también queda registrado en el reporte Brownfield.

## Verificación realizada

La implementación actual fue validada con:

- 56 tests unitarios del wizard SpecDD.
- 3 pruebas E2E del wizard: Greenfield, Brownfield y Brownfield con Harness legacy.
- Build de `sdd-kit-wizard`.
- Build del portal unificado `specdd-platform`.

## Pendiente — Nivel 2: Análisis semántico asistido

El Nivel 2 no debe implementarse como una inferencia opaca ni como una aprobación
automática. Su diseño aprobado es el siguiente:

- Será **opt-in** desde el flujo Brownfield.
- Será completamente **local**; ningún archivo debe abandonar la máquina del usuario.
- Podrá leer selectivamente código fuente, rutas, modelos, tests, configuración,
  Docker, CI/CD e infraestructura según parsers disponibles.
- Deberá producir evidencia concreta para cada inferencia.
- Deberá incluir un nivel de confianza por detección.
- Las sugerencias seguirán siendo editables y requerirán validación humana.
- No inventará reglas de negocio.
- No aprobará specs ni tasks automáticamente.
- No modificará código existente.

### Resultado esperado del Nivel 2

El reporte Brownfield debería poder incluir, cuando exista evidencia suficiente:

- mapa de módulos y dependencias;
- rutas y contratos API detectados;
- modelos y relaciones de datos candidatas;
- cobertura y ubicación de tests;
- configuración de build, CI/CD, Docker e infraestructura;
- relación entre módulos técnicos y dominios sugeridos;
- tareas de convergencia con paths, evidencia y confianza.

### Criterios de aceptación del Nivel 2

- El usuario puede elegir el análisis semántico explícitamente.
- El sistema informa qué categorías analiza y cuáles no.
- Cada detección tiene evidencia y confianza.
- El análisis degrada con gracia cuando un parser no aplica o un archivo no puede
  leerse.
- El reporte distingue hechos detectados, inferencias y elementos pendientes de
  validación.
- El modo estructural sigue funcionando igual aunque el Nivel 2 falle o no esté
  disponible.
- Se agregan tests unitarios por parser y E2E para al menos un proyecto Node/TS y un
  proyecto Python o .NET.

## Archivos de referencia para retomar

- `README.md` — mapa general del producto.
- `docs/CAPACIDADES_DEL_HARNESS.md` — descripción detallada del Harness y sus límites.
- `specdd-kit/website/src/components/analysis.js` — niveles de análisis.
- `specdd-kit/website/src/components/analyzer.js` — analizador estructural actual.
- `specdd-kit/website/src/components/IngestStep.jsx` — selección e ingesta Brownfield.
- `specdd-kit/website/src/components/generators.js` — generación del scaffold y reporte.
- `specdd-kit/docs/greenfield-vs-brownfield.md` — guía de escenarios y niveles.

## Regla de continuidad

La siguiente sesión debe comenzar revisando este documento y decidir si se implementa
el Nivel 2 completo o una primera rebanada vertical, por ejemplo: detección de rutas
API y modelos para un único stack, con evidencia, confianza, reporte y tests antes de
ampliar la matriz de parsers.
