# Estado de implementación — SpecDD Harness

**Actualizado:** 2026-09-05
**Estado:** Harness Fases 1–6 implementadas; Control Plane Phases 1–4 remediadas, Phase 5 validada mediante piloto documental humano-asistido y Phases 6–8 implementadas con aceptación local. Warp sigue opcional y sin ejecución alojada. Phase 9 implementada con aceptación local; piloto aprobado y publicado en PR #3 draft; cierre hasta PR, sin merge ni deployment. Evidencia y límites: [Phase 9](control-plane/phases/phase-9-improvement-proposals.md). Los 8 hallazgos de dependencias fueron corregidos; la auditoría offline B1 conserva 0 hallazgos, sin consultar avisos nuevos. Evidencia previa: [remediación de seguridad](control-plane/audits/2026-09-04-dependency-security.md). Workspace: Node 22.12+. Phase 10 cerrada con aceptación local explícita: A1/A2 contratos, grafo y exportación opcional; B1/B2 entrega local con aprobación humana, promoción del mismo artefacto y post-deploy aprobado. Gate C satisfecho; adaptadores cloud diferidos, no implementados ni validados. [Cierre de Phase 10](control-plane/phases/phase-10-acceptance.md).

Este documento deja asentado qué está implementado y cuál es el siguiente incremento
del proyecto para poder retomarlo en una sesión futura sin perder contexto.

Actualización Phase 10 B2: piloto local completo desde fixture/build/staging/smoke,
aprobación explícita del usuario, promoción sin rebuild y verificación HTTP posterior.
No consume grafos cloud del wizard. El usuario aceptó explícitamente este alcance
para cerrar Phase 10; cloud queda como trabajo futuro. Publicación y CI alojada
siguen separadas y no fueron autorizadas por este cierre.
Decisión y límites: [aceptación local](control-plane/phases/phase-10-acceptance.md).

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

### Project Definition canónico — Control Plane Phase 1

- `@specdd/project-model` define el IR neutral de runtime con schema `1.0.0`, JSON
  Schema 2020-12, tipos TypeScript estrictos y diagnósticos estables.
- El wizard materializa `context/project-definition.json` antes de compilar Harness v1.
- `context/scaffold-manifest.json` continúa siendo un receipt separado de cada generación.
- La migración explícita acepta receipts schema 1/2, exige identidad aportada por el
  usuario y declara la pérdida de cualquier intención que el receipt histórico nunca capturó.
- El contexto de compilación Brownfield conserva análisis, paths y acknowledgement fuera
  del IR portable.
- Warp, grafos ejecutables y loops permanecen fuera de alcance.

### Capability Packs — Control Plane Phase 2

- `@specdd/capability-model` define el contrato portable `1.0.0` con JSON Schema
  2020-12, tipos TypeScript estrictos y validación semántica.
- Cada rol seleccionado en SpecForge genera un manifiesto independiente bajo
  `.agents/capabilities/role-<role>/capability.json`.
- El manifiesto representa rol, skills, playbooks, workflows, policies, evals,
  contexto, subagente inactivo, routing y dependencias sin duplicar el contenido.
- Todas las rutas históricas de Role Pack, prompts condicionales, MCP y nombre del ZIP
  conservan compatibilidad.
- La instalación sigue en tareas draft con aprobación humana. El binding al Project
  Definition se agrega solo si existe; Harnesses anteriores conservan ROUTING,
  REGISTRY y budget.
- La migración legacy genera un draft con warning `INFERRED_LEGACY_ROLE_PACK`; nunca
  infiere activación desde la presencia de archivos.
- Grafos, runtime, activación multi-agent y Warp permanecen fuera de alcance.

### SpecControl Domain Model — Control Plane Phase 3

- `@specdd/control-plane-model` define `SpecDDControlPlane` schema `1.0.0` y sub-schemas
  reutilizables para grafos y políticas.
- Representa workflows, DAGs, nodos tipados, roles, capability bindings, approvals
  humanos, policies, failure routes, retries finitos, eval gates, artifact contracts y
  runtime hints portables.
- El validador comprueba referencias, outcomes por tipo de nodo, alcanzabilidad,
  terminales, ciclos, ownership de fallos, límites de retry y extensiones namespaced.
- El modelo es declarativo: no ejecuta grafos, no concede permisos, no aprueba trabajo
  y no afirma que existan artifacts o resultados de eval.
- No se creó un nuevo wizard/servicio/CLI porque todavía no existe un flujo de autoría o
  compilación que lo justifique.
- Warp continúa completamente fuera del contrato canónico.

### Warp Adapter — Control Plane Phase 4

- `@specdd/warp-adapter` compila `SpecDDControlPlane` `1.0.0` a archivos Warp Factory
  `v1alpha1` sin invocar APIs, CLI, modelos ni servicios externos.
- La configuración Warp vive en un contrato separado: repositorios, modelo/harness,
  tipos de agentes, environment IDs opcionales y binding GitHub `issue_created`.
- Genera `factory.yaml`, un único foreman de infraestructura, un archivo por rol
  canónico y automatizaciones explícitas siempre desactivadas.
- El foreman conserva nodos, edges y gates como instrucciones; no afirma que eso sea
  enforcement equivalente del runtime.
- Evals requeridos detienen el flujo y no generan scorers; esa traducción pertenece a
  Phase 6.
- El compilador produce un reporte estructurado y Markdown con códigos estables para
  graph, approvals, policies, retries, failure routes, artifacts, evals y runtime hints
  no equivalentes.
- El ejemplo Issue → Spec → aprobación humana → Developer → Reviewer → Eval → registro
  de draft PR es un artefacto generado y revisable; todavía no crea un PR ni ejecuta
  Warp.

### Historial y observabilidad — Control Plane Phase 7

- `@specdd/run-history` define eventos neutrales versionados, validación de identidad,
  referencias al grafo y reconstrucción de estado/duración con cobertura explícita.
- Normaliza resultados canónicos de Phase 6 sin inventar eventos faltantes ni asumir
  formatos privados de proveedores. Actor, modelo y runtime desconocidos no se deducen.
- Exporta JSONL local inmutable, rechaza duplicados/sobrescrituras y permite inspección
  de solo lectura. Incluye límites de tamaño y comprobaciones de paths/junctions.
- El run real `phase7-local-001` registra un eval local aprobado en 459 ms, con hash de
  evidencia y lectura posterior; el workflow queda honestamente `unknown / partial`.
- No modifica Harness v1, el piloto aislado ni PR #2. No implementa dashboard, collector
  alojado, streaming, benchmarking, autenticación ni enforcement del grafo.
- Diseño, ADR, uso y evidencia: [Phase 7](control-plane/phases/phase-7-run-history.md).

### Benchmarking — Control Plane Phase 8

- `@specdd/benchmarks` compara slices de eval con tarea/evaluador, configuración y
  repeticiones fijados de antemano. Reutiliza los contratos de Phases 6–7.
- Valida identidad, cobertura, referencias, puntajes y procedencia de costos; rechaza
  duplicados, monedas mezcladas y reintentos posteriores a un resultado aprobado.
- Reporta conteos esperados/observados, estadísticas descriptivas y diferencias contra
  baseline sólo con métricas completas. No rellena costos, defectos ni intervenciones.
- Experimento real: dos perfiles Node con flags identificados por hash, tres repeticiones
  cada uno sobre fixtures fijados; seis aprobaciones y reporte exactamente regenerable.
- No afirma superioridad de modelos ni instrumentación completa de workflows. No crea
  propuestas ni modifica Harness, umbrales o baselines automáticamente.
- Diseño, uso y evidencia: [Phase 8](control-plane/phases/phase-8-benchmarking.md).

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

- Auditoría conjunta de cierre (2026-09-05): [resultados y límites](control-plane/audits/2026-09-05-evolution-closure.md).
  La consulta O5-D fue offline: 0 advisories cacheados; sin cambios de dependencias.
- 397 tests unitarios aprobados en O5-D: 12 Project Definition, 8 Capability Pack, 11 SpecControl contracts, 14
  Warp Adapter, 14 Eval Adapters, 26 Run History, 21 Benchmarking, 27 Improvement Proposals, 71 SpecDD,
  27 SpecForge, 58 SpecDeploy, 62 Delivery Model y 46 SpecControl Local. El comando de regresión completo
  del workspace terminó con exit 0; incluye 21 pruebas nuevas de promoción local.
- 28 pruebas adicionales de cierre aprobadas: 1 de preparación Phase 5 y 27 del
  candidato aislado Phase 9; build del candidato y reconstrucción de su historial aprobados.
- 12 pruebas E2E aprobadas: 4 del portal, 3 de SpecDD, 2 de SpecForge y 3 de SpecDeploy.
  El intento CI-mode combinado detectó el puerto 4320 ocupado; las cuatro suites se
  verificaron luego por separado y terminaron normalmente con exit 0.
- Builds reejecutados y aprobados de los nueve paquetes de arquitectura, el portal y los tres wizards.
  Persisten avisos no bloqueantes de React/Vite y tamaño de chunk ya documentados.
- 71 tests unitarios del wizard SpecDD.
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
- `docs/control-plane/warp/architecture-mapping.md` — mapping oficial estudiado entre
  SpecControl y Warp Factory.
- `packages/warp-adapter/examples/unsupported-features.md` — reporte reproducible de
  fidelidad y límites del primer adapter.

## Regla de continuidad

Phase 9 alcanzó el cierre práctico hasta PR: propuesta aprobada, evidencia medida,
publicación autorizada y PR #3 abierto en borrador. Sus checks finales pasaron;
Phase 10 ya cerró con aceptación local explícita. No se hizo merge ni deployment
remoto. La entrega local B1/B2 no equivale a desplegar un proyecto en producción.
Evidencia: [Phase 9](control-plane/phases/phase-9-improvement-proposals.md).
La auditoría/regresión conjunta y la [guía única de uso](GUIA_DE_USO.md) están completas.
O5-E publicó SpecControl en `main` mediante
`49bc05cae91c98d0a730a5220740202ab14e1e6c`; todos los jobs del
[CI alojado](https://github.com/MarcosArielFontenla/specdd-starter-kit/actions/runs/33996093563)
pasaron. El cierre documental posterior también está integrado en `main`.
El trabajo siguiente ya es operación sobre nuevas tareas/proyectos, mantenimiento
no bloqueante de GitHub Actions o resolución del baseline de integración de Bloom.
SpecDeploy específico de infraestructura/proyecto/empresa queda como trabajo futuro; conservar
contratos y evidencia local no implica continuar desarrollando esos adaptadores.
Seguimiento: [auditoría de cierre](control-plane/audits/2026-09-05-evolution-closure.md).
Phase 8 aporta `@specdd/benchmarks`: planes/datasets fijados, cobertura de métricas y
comparaciones descriptivas de slices de eval. Sus seis observaciones locales validan
la infraestructura; no demuestran superioridad de modelos ni mejoras generales del
Harness. Toda propuesta futura necesita evidencia pertinente y revisión humana.
No modificar Harness, specs, grafos, umbrales o baselines automáticamente. Los hallazgos
de dependencias siguen resueltos y CI incluye benchmarking e improvement proposals. El backlog Brownfield
continúa separado; no hacer merge ni deployment del piloto Bloom sin una decisión nueva.
