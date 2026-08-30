# Estado de implementación — SpecDD Harness

**Actualizado:** 2026-08-29
**Estado:** Fases 1–6 completadas; mejoras semánticas avanzadas y convergencia siguen siendo trabajo del agente

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

### Brownfield — Nivel 2: Análisis semántico asistido

Este nivel está disponible como opt-in y permanece completamente local.

- Lee una allowlist segura de documentación, manifests, modelos, rutas y tests.
- Excluye secretos, archivos de entorno, certificados, claves, binarios y directorios
  generados o de dependencias.
- Aplica límites de 96 archivos, 120.000 caracteres por archivo y 500.000 caracteres
  totales.
- Devuelve archivos leídos, archivos omitidos, evidencia, confianza y señales de
  arquitectura.
- Detecta actualmente señales acotadas de ASP.NET Core/.NET, React, TypeScript,
  xUnit, PostgreSQL/Neon, Modular monolith, SSR y Entity Framework Core.
- No intenta comprender todo el código ni inventa reglas de negocio.

### Fase 3 — Revisión humana del contexto

Brownfield inserta `Review Context` antes de los pasos de personalización.

- Permite editar, conservar o excluir lenguajes, tecnologías, arquitectura,
  dominios, entidades y features.
- Permite clasificar cada hallazgo como `implemented`, `architectural`, `planned` o
  `unknown`.
- Exige aprobación explícita para continuar.
- Mantiene la evidencia y la confianza en `context/brownfield-analysis.md`.

### Fase 4 — Generación desde contexto aprobado

- `generators.js` reaplica defensivamente el review aprobado antes de generar.
- Los valores excluidos no generan skills, specs YAML ni features.
- Skills y specs conservan la clasificación y procedencia del hallazgo.
- Las specs de entidad continúan con `designContract.status: placeholder`; aprobar
  el contexto no equivale a aprobar requisitos o contratos.
- `context/tech-stack.md`, registry, features y reporte Brownfield reflejan el
  contexto seleccionado.
- Colisiones siguen siendo skip/report, sin overwrite; `spec-converge` conserva la
  reconciliación para el agente.

### Fase 6 — Validación post-extracción

- El scaffold genera `context/scaffold-manifest.json` de esquema 2 con paths generados,
  colisiones, reemplazos, selección aprobada y fingerprints de integridad/fidelidad.
- También genera `context/project-validation.json` como contrato explícito para los
  comandos de test/build/lint que el proyecto quiera ejecutar.
- `pwsh .agents/scripts/validate-harness.ps1` valida la instalación sin escribir en
  el proyecto destino.
- El gate comprueba estructura, artefactos seleccionados, referencias internas,
  bookkeeping de colisiones, YAML cuando `powershell-yaml` está disponible y tokens
  con apariencia de secreto.
- `pwsh .agents/scripts/validate-project.ps1` es el run único recomendado: agrega el
  gate estructural, integridad de archivos, baseline Brownfield, specs ejecutables,
  budget y checks declarados; escribe reporte Markdown/JSON.
- Sus códigos distinguen `VERIFIED` (0), `PARTIAL` (2) y `FAILED` (1), por lo que no
  confunde un scaffold instalable con un proyecto semánticamente ya especificado.
- Se probó una extracción física temporal de un scaffold Greenfield y el validador
  terminó correctamente.

### Explicitación de niveles

El contrato de análisis está centralizado en:

- `specdd-kit/website/src/components/analysis.js`
- `analysisDepth: 'structural' | 'semantic'`

El wizard muestra actualmente:

1. **Level 1 — Structural bootstrap:** disponible y ejecutable.
2. **Level 2 — Assisted semantic analysis:** disponible y ejecutable como opt-in,
   con allowlist y límites de seguridad.

3. **Review Context:** disponible únicamente para Brownfield; bloquea el avance hasta
   que el usuario aprueba el contexto editado.

El nivel seleccionado y la revisión humana quedan registrados en el reporte
Brownfield.

## Verificación realizada

La implementación actual fue validada con:

- 70 tests unitarios del wizard SpecDD.
- 3 pruebas E2E del wizard: Greenfield, Brownfield y Brownfield con Harness legacy.
- Build de `sdd-kit-wizard`.
- `git diff --check` sin errores de whitespace.
- Scaffold temporal Greenfield materializado y aceptado por `validate-harness.ps1`.
- Round-trip temporal Brownfield validado con el run único `validate-project.ps1`:
  estructura, fingerprints, baseline de paths fuente y reporte Markdown/JSON; también
  se verificó que una modificación posterior de un archivo generado produce `FAILED`.
- Round-trip real Brownfield generación → ZIP → extracción: 116 archivos, 194.320
  bytes y `validate-harness.ps1` aceptó el resultado.
- Validación local de solo lectura contra `D:/product-projects/tactical-arg-store-app`:
  351 paths visibles, Level 2 con 96 archivos leídos, confianza alta, 11 evidencias,
  stack React + TypeScript + ASP.NET Core + .NET + xUnit + PostgreSQL (Neon), seis
  dominios y nueve features.
- Generación en memoria del scaffold Brownfield real: 70 archivos resultantes, 65
  colisiones omitidas y reporte aprobado generado sin modificar el proyecto destino.

## Pendiente — límites conocidos y siguiente evolución

La implementación actual es una primera rebanada vertical segura, no un parser
universal ni una comprensión 100% automática del proyecto.

- Extender parsers para rutas y contratos API, relaciones de modelos, cobertura de
  tests, CI/CD, Docker e infraestructura.
- Conectar el reporte con un análisis de convergencia más detallado por path y
  acceptance check. `spec-converge` ya existe, pero su ejecución corresponde al
  agente en el proyecto destino.
- Ampliar la validación round-trip Brownfield con fixtures de más stacks, monorepos y
  proyectos con múltiples aplicaciones, conservando el baseline de paths y el reporte
  de fidelidad.
- Mantener revisión humana de reglas de negocio, contratos, skills y specs; el wizard
  no puede deducir ni aprobar esos artefactos de forma segura.
- Completar la configuración de `context/project-validation.json` por proyecto para
  pasar de la señal honesta `PARTIAL` a checks funcionales `VERIFIED`.
- Añadir más fixtures reales para Python, Java, Go y monorepos con múltiples apps.

## Archivos de referencia para retomar

- `README.md` — mapa general del producto.
- `docs/CAPACIDADES_DEL_HARNESS.md` — descripción detallada del Harness y sus límites.
- `specdd-kit/website/src/components/analysis.js` — niveles de análisis.
- `specdd-kit/website/src/components/analyzer.js` — análisis estructural y semántico acotado.
- `specdd-kit/website/src/components/IngestStep.jsx` — selección e ingesta Brownfield.
- `specdd-kit/website/src/components/ContextReviewStep.jsx` y `review.js` — revisión
  y aprobación del contexto detectado.
- `specdd-kit/website/src/components/generators.js` — generación del scaffold y reporte.
- `specdd-kit/.agents/scripts/validate-harness.ps1` — gate post-extracción de solo lectura.
- `specdd-kit/.agents/scripts/validate-project.ps1` — orquestador único post-extracción
  con reporte Markdown/JSON y códigos `VERIFIED`/`PARTIAL`/`FAILED`.
- `specdd-kit/docs/greenfield-vs-brownfield.md` — guía de escenarios y niveles.

## Regla de continuidad

La siguiente sesión debe comenzar revisando este documento y elegir una de las
evoluciones pendientes: ampliar parsers semánticos por stack, enriquecer la convergencia
por path y acceptance check, o ampliar fixtures y cobertura de CI. La validación
post-extracción ya está consolidada en `validate-project.ps1`. Cualquier ampliación
debe conservar los límites locales, la evidencia, la confianza y la aprobación humana.
