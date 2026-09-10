# SpecForge Workspace — arquitectura y límites

Fecha del baseline: 2026-09-07. Baseline inspeccionado:
`bd7b8007b7e917317433a2c923e322561355e191`. Este documento conserva el análisis
de partida de Phase 0. Estado actual al 2026-09-08: el Workspace BA local de
Phase 4 y la proyección gobernada local de Phase 5 están aceptados. Véanse el
[roadmap vivo](roadmap.md) y la [evidencia Phase 5](phases/phase-5.md).

## Arquitectura actual

El usuario operativo actual es un desarrollador, referente técnico o persona capaz
de instalar un pack en un repositorio y dirigir un agente. BA/QA/UX son roles del
conocimiento generado; todavía no son experiencias de trabajo persistentes.

```text
skills/*.md + skills.config.json
              ↓ bundle-skills.js (build)
          src/data/skills.json
              ↓
Wizard React + roles.js + lista opcional de rutas del destino
              ↓ generatePack + @specdd/capability-model
          mapa ruta → contenido
              ↓ JSZip en navegador
          Capability / Role Pack ZIP
              ↓ extracción e instalación humana mediante tareas draft
          SpecDD Harness + binding opcional en Project Definition
```

| Componente real | Responsabilidad y límite observado |
|---|---|
| [Portal](../../platform/src/pages/specforge.astro) | Monta el mismo Wizard mediante `client:load`; no hay un Workspace alternativo. La landing ofrece tres wizards. |
| [Wizard.jsx](../../specforge-kit/website/src/components/Wizard.jsx) | Estado React en memoria, selección y descarga; no CRUD de requisitos, almacenamiento persistente ni llamadas a agentes. |
| [roles.js](../../specforge-kit/website/src/components/roles.js) | Cuatro roles, 36 playbooks asignados, políticas Must/Never, comandos y navegación condicional. Es una fuente de conocimiento fuera de los componentes JSX, aunque reside en el workspace web. |
| [skills/](../../specforge-kit/skills/) | Prosa de especialidad: orientación por rol y playbooks. El pack copia los seleccionados literalmente. |
| [bundle-skills.js](../../specforge-kit/website/scripts/bundle-skills.js) | Bundle de Markdown. Configuración actual local; modo remoto opcional durante build con fallback local. No es un runtime de acciones BA. |
| [TargetStep.jsx](../../specforge-kit/website/src/components/TargetStep.jsx), [target.js](../../specforge-kit/website/src/components/target.js) | Lee nombres/rutas, detecta señales de Harness y colisiones. No lee Project Definition ni contenido del repositorio; detección no implica validación. |
| [generators.js](../../specforge-kit/website/src/components/generators.js) | Renderers puros, validación del manifest, comprobación de referencias generadas, filtrado de colisiones e informe. |
| [capability-model](../../packages/capability-model/README.md) | Schema 1.0.0, tipos, validación semántica y migración explícita desde descriptor legacy. No instala ni ejecuta el pack. |
| [project-model](../../packages/project-model/README.md) | Proyecto canónico, referencias a specs, capacidades, workflows, evals y Harness; separado del receipt de generación. |
| [local-control-service](../../packages/local-control-service/README.md) | Servicio separado: SQLite, Planner, aprobación exacta, implementación aislada, revisión, checks y publicación opt-in. Su workflow fijo no es un motor BA. |

### Recorrido actual y compatibilidad

Welcome → Target Project opcional → Roles → Role Options si QA/UX → Skills →
Tools → Preview/Download. QA permite manual/automated/mixto; UX permite Figma.
El ZIP conserva `<targetName o specforge>-role-pack.zip`.

Por rol genera manifest, skill, assets, rúbrica `log_only`, workflows Markdown y
seed de subagente `inactive`; añade tareas draft de instalación e informe. Copilot
añade pointers; Figma/Playwright agregan configuración MCP opcional. Elegir Codex
no ejecuta Codex. `lifecycle: active` del manifest tampoco acredita instalación,
ejecución o aprobación de un artefacto de negocio.

La instalación instruye validar el manifest, registrar ROUTING/REGISTRY/budget,
añadir binding en `context/project-definition.json` si existe, preparar snapshots
y ejecutar gates. Es un procedimiento humano/agente, no una transacción del Wizard.
Sin Project Definition conserva la instalación legacy; sin Harness recomienda
generarlo; ante Harness legacy recomienda migrarlo con SpecDD Brownfield.

Las colisiones se omiten, salvo `context/role-pack-report.md`, que se regenera
deliberadamente. La comprobación de referencias se hace antes del filtrado: no
certifica el contenido de un archivo existente ni la compatibilidad del pack
mezclado con el destino. Estas excepciones deben preservarse/documentarse al
hablar de compatibilidad, sin prometer una instalación verificada por la UI.

SpecForge no distingue Greenfield/Brownfield como ramas de negocio: recibe un
destino opcional. El análisis Level 1/2 pertenece a SpecDD. Reutilizar sus resultados
requiere un importador explícito del contexto aprobado, no otro scanner paralelo.

### Conocimiento y comandos existentes

Inventario de `ROLE_SKILLS` y `commandsFor`; recuento de archivos observado al
generar cada rol por separado, con todos sus playbooks, Codex, QA manual, Figma
deshabilitado y sin colisiones (incluye los dos archivos comunes).

| Rol | Playbooks | Comandos base, prefijo `specforge-` | Archivos |
|---|---:|---|---:|
| BA | 8 | requirements, stories, new-feature, reset-feature | 18 |
| QA | 10 | testcases, validate | 18 |
| Dev | 11 | implement, review, createpr | 20 |
| UX | 7 | uxflow, screenspec, copy | 16 |

QA agrega `playwright` al seleccionar automatización; UX agrega `setupfigmamcp`
al habilitar Figma. PM/PO no tiene rol ni pack actual.

- BA: specforge-ba, story-writing, acceptance-criteria, story-splitting,
  requirements-traceability, context-analysis, miro-collaboration, documentation.
- QA: specforge-qa, test-case-generation, ac-validation, gherkin-automation,
  playwright-testing, regression-testing, bug-reporting, qa-evals, qa-guardrails, testing.
- Dev: specforge-dev, story-to-code, component-creation, api-endpoint,
  state-management, error-handling, refactoring, performance-optimization,
  code-review, pr-creation, accessibility.
- UX: specforge-ux, ux-flow-designer, ux-copywriter, ux-design-system-enforcer,
  ux-prototype, ux-stage-generator, figma-design-context.

Los workflows generados son instrucciones generales de cuatro pasos: cargar
skill/playbooks y spec, producir resultado trazable y registrar tareas. No tienen
payloads tipados ni un ejecutor para cada acción. Hay referencias cruzadas en la
prosa (por ejemplo, Dev menciona testing/documentation, asignados a QA/BA); la
resolución de esas referencias no queda probada por validar el manifest. Phase 3
debe resolver dependencias de acciones sin duplicar conocimiento en JSX.

## Brecha de experiencia por rol

| Rol | Valor actual | Fricción y dependencia repo/IDE | Trabajo diario ausente | Artefactos de mayor valor |
|---|---|---|---|---|
| BA | Guía para contexto, historias, criterios y trazabilidad | Instalar ZIP, localizar specs, dirigir agente, gestionar documentos manualmente | Registrar pedido, resolver preguntas, revisar sugerencias e historial, aprobar revisión | Requisito con reglas/criterios, preguntas y decisiones |
| QA | Guías de escenarios, regresión, defectos y evidencia | Rutas/scripts/herramienta agente; no hay vista operativa de cobertura | Revisar escenarios, adjuntar resultados, distinguir cubierto de ejecutado | Escenario, caso, cobertura, riesgo y defecto |
| PM/PO | Beneficio indirecto de documentos del equipo | No hay rol ni agregación; reunir evidencia manualmente | Ver bloqueos, decisiones pendientes y readiness | Lectura de features, riesgos, dependencias y aprobaciones |
| UX | Flujos, pantallas, copy, diseño y Figma opcional | Playbooks y archivos del repo; integración configurada por alguien técnico | Revisar decisiones, estados y accesibilidad con origen visible | Brief, flujo y contrato de interacción |
| Dev | Pack cercano a su entorno habitual | Instalación manual, contexto entre roles disperso | Recibir decisiones BA/QA/UX con revisiones y referencias estables | Plan técnico y vínculos a requisitos/checks |

## Ownership propuesto

| Dueño | Conserva | Límite |
|---|---|---|
| SpecForge Capability Builder | Definiciones de especialidad y packs portables | No confundir pack activo con trabajo aprobado |
| SpecForge Role Workspace | Artefactos de trabajo, versiones, propuestas, decisiones, revisiones y relaciones | Un requisito aprobado aquí no modifica una spec por sí mismo |
| SpecDD | Project Definition, intención canónica de ingeniería, specs y Harness | No albergar borradores operativos en el receipt del scaffold |
| SpecControl | Control de ejecución, gates, fallos y evidencias del run | No convertirse en base de requisitos o proyectos paralela |
| Runtime | Ejecutar una acción acotada según inputs y permisos | No aprobar por el humano ni fijar el modelo de dominio |
| Herramientas externas | Proyecciones/importaciones y referencias | Jira/Figma/GitHub no definen el schema canónico de SpecForge |

No se cambia producción en Phase 0. Las recomendaciones se desarrollan en
[inventario de contratos](artifact-inventory.md) y [piloto BA](ba-pilot.md).
