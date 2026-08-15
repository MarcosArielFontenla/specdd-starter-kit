# Capacidades del SpecDD Harness

## Propósito de esta guía

Este documento explica qué es el **SpecDD Harness**, qué capacidades incorpora el
scaffold generado por **SpecDD Platform**, qué responsabilidad tiene cada capa y
cómo se relacionan sus artefactos durante el trabajo diario.

La explicación describe el comportamiento implementado actualmente en este
repositorio. Distingue entre:

- lo que hace la plataforma al generar el ZIP;
- lo que queda instalado en el repositorio destino;
- lo que un agente debe ejecutar después;
- lo que está preparado, pero permanece deliberadamente inactivo o vacío.

## 1. Qué es este repositorio y dónde encaja el Harness

SPECDDSTARTERKIT es un monorepo de generadores client-side orientados a
Spec-Driven Development. La aplicación no aloja agentes ni ejecuta cambios sobre
un proyecto remoto: presenta wizards, compone archivos y descarga ZIPs desde el
navegador.

Sus piezas principales son:

| Workspace | Responsabilidad |
|---|---|
| `platform/` | Portal Astro unificado. Monta los wizards en `/specdd`, `/specforge` y `/specdeploy`. |
| `specdd-kit/` | Genera el scaffold SDD y el SpecDD Harness para proyectos Greenfield o Brownfield. |
| `specforge-kit/` | Genera Role Packs de BA, QA, Dev y UX que extienden un Harness existente. |
| `specdeploy-kit/` | Genera CI/CD, IaC y runbooks. Es una capacidad adyacente, no una capa del Harness. |
| `packages/ui/` | Design System Boreal compartido por los wizards. No forma parte del ZIP operativo del Harness. |

El **Harness** propiamente dicho es el conjunto formado por:

```text
AGENTS.md
.agents/
adaptadores de herramienta: CLAUDE.md, GEMINI.md o
.github/copilot-instructions.md, según corresponda
```

El ZIP también incluye contexto, gobernanza, templates, documentación y, si se
selecciona GitHub Copilot, una proyección específica bajo `.github/`. Esos
artefactos rodean y alimentan al Harness, aunque no todos pertenecen a su núcleo
vendor-neutral.

## 2. Cómo se genera

El flujo de generación es el siguiente:

```text
Archivos reales de specdd-kit/
        +
Respuestas del wizard
        |
        v
bundle-kit.js crea un snapshot JSON en build time
        |
        v
generators.js personaliza y filtra archivos en el navegador
        |
        v
JSZip produce el ZIP localmente
        |
        v
El usuario extrae el scaffold en el repositorio destino
        |
        v
El agente entra por AGENTS.md y carga contexto bajo demanda
```

La generación no requiere backend. En Brownfield, el análisis también ocurre en
el navegador. La plataforma genera artefactos; no implementa features, no activa
CI y no despliega por sí misma.

## 3. Vista general de las capas

| Capa o sistema | Problema que resuelve | Artefactos principales |
|---|---|---|
| Entrada y portabilidad | Hace que distintas herramientas comiencen desde las mismas reglas. | `AGENTS.md`, adaptadores por herramienta |
| Contexto del proyecto | Evita que el agente improvise producto, stack o restricciones. | `context/project.md`, `context/tech-stack.md`, `context/constitution.md` |
| Gobernanza | Define principios no negociables y el proceso para cambiarlos. | `governance/constitution.md`, constitución de contexto |
| Routing | Decide qué conocimiento cargar para cada tipo de tarea. | `.agents/orchestration/ROUTING.md` |
| Skills | Encapsula reglas y verificaciones específicas por dominio. | `.agents/skills/<domain>/SKILL.md` |
| Especificaciones ejecutables | Convierte intención aprobada en contratos y checks verificables. | `.agents/specs/<entity>.spec.yaml` |
| Flujo SDD | Ordena el paso de idea a implementación con gates humanos. | workflows, prompts y templates |
| Validación mecánica | Convierte reglas críticas en exit codes utilizables por CI. | `.agents/scripts/*.ps1` |
| Cold-start y presupuesto | Reduce contexto inicial y evita inyectar conocimiento irrelevante. | primer, manifest y snapshots |
| Evals y drift | Detecta degradación sostenida en el cumplimiento de skills. | rubrics, scores, baselines, reports, `run-eval.ps1` |
| Telemetría | Define observabilidad local y vendor-neutral de sesiones. | `.agents/telemetry/EVENTS.md`, JSONL local |
| Seguridad y herramientas | Agrega guardrails y conexiones MCP sin secretos embebidos. | instrucciones, `.vscode/mcp.json` |
| Adopción Brownfield | Integra el Harness sin destruir archivos existentes y mide el delta contra specs. | análisis, `spec-converge`, tareas de migración |
| Extensión por roles | Añade capacidades BA/QA/Dev/UX sin reescribir el núcleo. | Role Packs de SpecForge |

## 4. Capa de entrada y portabilidad entre agentes

### Qué aporta

Proporciona un único punto de entrada para GitHub Copilot, Claude Code, Cursor,
Codex y Gemini. La intención es que las reglas del proyecto no se dupliquen ni
diverjan entre archivos propietarios de cada herramienta.

### Cómo funciona

El archivo raíz `AGENTS.md` es un **session primer** versionado. Se mantiene en un
máximo de 40 líneas y contiene solamente lo necesario para arrancar:

- resumen breve del proyecto y del stack;
- orden obligatorio de carga;
- tabla rápida de clasificación por dominio;
- límite de contexto de 500 líneas;
- instrucción de telemetría de cierre, en modo best effort;
- enlace al registro completo, que no debe cargarse en sesiones comunes.

Cada herramienta que necesita un archivo propio recibe un adaptador de cinco
líneas o menos:

| Herramienta | Adaptador generado |
|---|---|
| GitHub Copilot | `.github/copilot-instructions.md` |
| Claude Code | `CLAUDE.md` |
| Gemini | `GEMINI.md` |
| Cursor | Ninguno; consume `AGENTS.md` directamente. |
| Codex | Ninguno; consume `AGENTS.md` directamente. |

Los adaptadores contienen solamente un puntero a `AGENTS.md`. Agregar reglas en
ellos se considera drift arquitectónico: esas reglas deben vivir en el núcleo
vendor-neutral.

### Registro del Harness

`.agents/REGISTRY.md` es el inventario exhaustivo de artefactos y estados de
sistemas. Se carga únicamente cuando la tarea modifica el Harness. Registra, entre
otras cosas, qué skills, specs, rubrics, workflows y adaptadores existen y si los
sistemas de Portability, Cold-Start, Evals, Spec-First, Multi-Agent y Telemetry
están activos, scaffolded, en fallback o inactivos.

## 5. Capa de contexto

### Qué aporta

Concentra el entendimiento compartido sobre producto y tecnología. Su objetivo es
que especificaciones, planes y decisiones partan de información explícita en vez
de inferencias casuales del agente.

### Artefactos

| Archivo | Contenido generado |
|---|---|
| `context/project.md` | Nombre, descripción, problema, personas, outcomes de usuario y negocio, restricciones técnicas y de negocio. |
| `context/tech-stack.md` | Lenguajes, frontend, backend, testing, base de datos, infraestructura, Swagger/OpenAPI y accesibilidad. |
| `context/constitution.md` | Flujo SDD, principios elegidos, clasificación de datos y foco OWASP. |

### Cómo se usa

El contexto se lee antes de escribir o modificar una spec. Las instrucciones de
context engineering promueven carga selectiva: apuntar al archivo o sección
relevante, documentar non-goals y resumir decisiones en vez de volcar todo el
repositorio al prompt.

Estos documentos son código operativo del equipo, no una salida descartable del
wizard. Deben evolucionar cuando cambien el producto, el stack o las restricciones.
Un contexto obsoleto produce planes coherentes con una realidad que ya no existe.

## 6. Capa de gobernanza

### Qué aporta

Define el marco no negociable dentro del cual se escriben specs, planes, tareas y
código. El modelo es deliberadamente plano: no hay niveles L1-L4 ni un proceso
distinto según madurez del equipo.

### Principios incorporados

La constitución canónica inicial establece:

1. specs antes que código;
2. incrementos pequeños, testeables y revisables;
3. acceptance criteria vinculados a tests;
4. prohibición de inventar requisitos;
5. trazabilidad desde tareas hacia spec y plan;
6. ausencia de secretos y datos reales sensibles en el repositorio.

También define clasificación de datos y exige una justificación escrita para
cualquier amendment.

### Dos copias con responsabilidades distintas

- `governance/constitution.md` es la baseline canónica incluida por el kit.
- `context/constitution.md` es la copia de trabajo personalizada por las respuestas
  del wizard.

El generador personaliza la copia de contexto, pero no reescribe automáticamente
la canónica. Si el equipo adopta una enmienda como principio compartido debe
sincronizar deliberadamente ambas copias; no debe ocurrir como efecto lateral de
otra tarea.

## 7. Capa de routing y orquestación de contexto

### Qué aporta

Transforma la naturaleza de la tarea en una decisión explícita de carga. Esto
reduce ruido, costo de tokens y contradicciones causadas por cargar todas las
reglas para todas las tareas.

### Cómo funciona

El wizard exige entre uno y ocho dominios. Por cada dominio genera una fila en:

```text
.agents/orchestration/ROUTING.md
```

Cada fila vincula:

```text
patrón de tarea -> skill de dominio -> spec de entidad opcional
```

El orden normal de una sesión es:

1. leer `AGENTS.md`;
2. clasificar la tarea con `ROUTING.md`;
3. cargar solamente las secciones always-load de la skill seleccionada;
4. cargar la spec de una entidad únicamente si la tarea toca esa entidad;
5. cargar un workflow solamente cuando se está ejecutando ese workflow.

Si ninguna fila coincide, el agente usa el dominio más cercano y registra el gap
en el resumen de sesión. Ese gap es feedback estructural: puede indicar que falta
una skill o una clasificación nueva.

## 8. Capa de skills por dominio

### Qué aporta

Una skill encapsula conocimiento operativo que no debería redescubrirse en cada
sesión. Los dominios deben representar áreas de negocio o responsabilidad real,
por ejemplo `Auth` o `Billing`, no simplemente carpetas técnicas como `controllers`.

### Estructura de una skill

Cada `.agents/skills/<domain>/SKILL.md` contiene:

- frontmatter con nombre y versión;
- puntero al snapshot comprimido;
- puntero a su rubric de drift;
- scope y exclusiones;
- reglas **Must**;
- reglas **Never do**;
- comandos de verificación.

El wizard crea skeletons, no inventa reglas de dominio. El equipo los completa a
medida que aparecen convenciones reales. Al modificar una skill se incrementa su
versión y se regenera el snapshot.

Esta decisión evita un falso nivel de precisión: un scaffold nuevo no puede saber
qué reglas particulares habrá descubierto el equipo después de trabajar en ese
dominio.

## 9. Capa de especificaciones y contratos ejecutables

El scaffold maneja tres niveles de intención que cumplen funciones diferentes.

### 9.1 Specs de feature, legibles y revisables

El ciclo SDD convencional usa:

```text
specs/<feature-slug>/
  spec.md
  plan.md
  tasks.md
  research.md
  data-model.md
  api.md
  checklist.md
  contracts/
```

Estos documentos capturan problema, requisitos, enfoque técnico, desglose del
trabajo y checklist de merge. Se crean desde `templates/` o desde el esqueleto
completo en `specs/_template/`.

### 9.2 Specs YAML de entidad, usadas por los gates del Harness

Por cada entidad primaria ingresada en el wizard se genera:

```text
.agents/specs/<entity>.spec.yaml
```

La spec nace en un estado seguro:

- `designContract.status: placeholder`;
- `requirements: []`;
- `reviewedBy: null`;
- `approvedAt: null`;
- acceptance check con descripción orientativa y `command: placeholder`;
- `clarifications: []`;
- waiver nulo.

Es decir, el archivo existe para guiar el trabajo, pero no aparenta aprobación ni
ejecutabilidad que todavía no tiene.

### 9.3 Lista inicial de features

Si el usuario ingresa features en el wizard se crea `specs/features-spec.md` con
una lista sin marcar. Es captura inicial de alcance, no reemplaza la especificación
formal de cada feature.

### Relación entre los niveles

Las specs Markdown sirven para conversación, revisión y planificación. Las specs
YAML aportan contratos de diseño y acceptance checks que una máquina puede validar
y ejecutar. Una feature puede tocar varias entidades y una entidad puede aparecer
en distintas features; por eso no son duplicados uno-a-uno.

## 10. Capa de workflows SDD

### Workflow principal del Harness

`.agents/workflows/spec-first-feature.md` implementa:

```text
specify -> clarify -> approve -> tasks -> implement -> done-gate
```

Se activa para una entidad primaria nueva o una feature que toca dos o más
dominios. Un cambio de un solo archivo no entra automáticamente: el diseño evita
ceremonia sin valor.

#### Specify

Se crea o modifica la spec YAML. Las ambigüedades se expresan como
`[NEEDS CLARIFICATION: ...]`; no se resuelven por suposición. Más de cinco markers
indican que la intención todavía es demasiado incompleta.

#### Clarify

El agente formula una pregunta por vez, en orden de cobertura: scope, behavior,
data y edge cases. Cada respuesta queda registrada en `clarifications` con fecha,
pregunta, respuesta y sección afectada.

#### Approve

Es un gate humano. Para pasar de `proposed` a `approved` deben desaparecer los
placeholders o existir un waiver completo; tampoco pueden quedar markers abiertos,
y deben registrarse reviewer y fecha de aprobación.

#### Tasks

El agente genera `.agents/specs/tasks/<feature>.tasks.md`, con fases ordenadas por
dependencia, paths reales y trazabilidad a acceptance checks. Las tareas paralelas
se marcan solo cuando no comparten archivos ni dependencias. Un humano aprueba el
archivo antes de implementar.

#### Implement y done-gate

La implementación sigue el orden aprobado y escribe tests antes o junto al código.
El done-gate ejecuta los checks declarados en la spec y compara sus exit codes con
el valor esperado.

### Comandos y workflows de apoyo

Cuando se selecciona GitHub Copilot, la proyección `.github/prompts/` ofrece:

- constitución, specify, clarify, plan, tasks e implement;
- analyze, spike y ADR;
- checklist y code review;
- generación de issues desde spec, plan o requisitos incumplidos;
- creación y actualización de `llms.txt`;
- conventional commit.

Estos prompts son una interfaz conveniente. El conocimiento persistente permanece
en specs, contexto, templates y núcleo del Harness.

## 11. Capa de validación mecánica

Los scripts convierten políticas esenciales en verificaciones reproducibles con
exit code distinto de cero ante una infracción. Requieren PowerShell 7+ y el módulo
`powershell-yaml`.

### `validate-spec.ps1`

Sin `-Run`, inspecciona la estructura de las specs YAML. En una spec marcada como
`approved` verifica:

- que no existan markers `NEEDS CLARIFICATION`;
- que haya acceptance checks ejecutables o un waiver;
- que el waiver incluya razón y aprobador;
- que existan `reviewedBy` y `approvedAt`.

Las specs `placeholder` o `proposed` pueden permanecer incompletas sin bloquear el
repositorio. El gate impide específicamente que se presenten como aprobadas.

Con `-Run`, ejecuta cada comando no-placeholder de una spec aprobada y compara
`$LASTEXITCODE` con `expectedExitCode`.

### `validate-budget.ps1`

Lee el manifest de cold-start y calcula, para cada clase de tarea, el peor caso de
líneas cargadas:

```text
líneas de AGENTS.md + líneas de cada artefacto listado
```

Falla si el total supera el budget —500 líneas por defecto— o si un artefacto
referenciado no existe.

### `generate-snapshots.ps1`

- `-Scaffold` crea o refresca el esqueleto de snapshot para cada skill.
- `-Check` valida existencia, versión y hash SHA-256 abreviado contra el `SKILL.md`.

El hash detecta cambios aun cuando alguien olvida subir la versión. El contenido
comprimido de las secciones Must/Never sigue siendo trabajo editorial del agente o
del equipo; el script no lo inventa ni evalúa su calidad semántica.

### Uso en CI

El scaffold entrega los gates, pero no los conecta automáticamente a CI. El equipo
decide cuándo incorporar `validate-spec`, `validate-budget` y el chequeo de
snapshots a su pipeline.

## 12. Cold-start y presupuesto de contexto

### Qué aporta

Evita que cada sesión comience leyendo todo el repositorio y todas las skills. El
objetivo no es solamente ahorrar tokens: un contexto pequeño y pertinente reduce
la probabilidad de que reglas irrelevantes compitan entre sí.

### Componentes

| Componente | Función |
|---|---|
| `AGENTS.md` | Primer mínimo y estable. |
| `ROUTING.md` | Selecciona el dominio relevante. |
| `budget-manifest.yaml` | Declara artefactos por clase de tarea y budget máximo. |
| `cold-start/snapshots/` | Versiones comprimidas de skills maduras. |
| `validate-budget.ps1` | Verifica estáticamente el peor caso de carga. |

Los snapshots empiezan vacíos porque las skills también son skeletons. El estado
del sistema es `scaffolded` hasta que el equipo incorpora reglas reales, genera y
completa snapshots y ejecuta el check de frescura.

## 13. Evals y control de drift

### Qué aporta

Permite observar si la salida asociada a una skill empeora respecto de una baseline
real. El objetivo inicial es producir evidencia y abrir una revisión controlada, no
cambiar reglas automáticamente ni bloquear builds desde el primer día.

### Artefactos

```text
.agents/evals/
  rubrics/<skill>.yaml
  scores/
  baselines/
  reports/
  proposals/
  run-eval.ps1
```

Algunas carpetas aparecen al operar el sistema; las baselines se entregan vacías.

### Rubric inicial

Cada dominio recibe una rubric con el criterio `rule-adherence`: la salida debe
cumplir los Must y no violar los Never. Su política inicial declara:

- ventana de 7 días;
- mínimo de 5 runs recientes para evaluar tendencia;
- baseline con los primeros 10 runs reales;
- agregación por mediana;
- threshold de drift de skill de 0.10;
- threshold declarado por criterio de 0.15;
- dos ventanas consecutivas antes de un eventual fallo de CI;
- acción inicial `log_only`;
- workflow de revisión `skill-review`.

### Cómo funciona hoy el runner

`run-eval.ps1` no ejecuta un modelo ni califica una respuesta. Consume score files
ya producidos bajo `scores/`, que deben incluir al menos `runId`, `timestamp` y
`overallScore`.

1. Reúne los scores cronológicamente.
2. Al alcanzar diez runs, congela una baseline persistida; nunca fabrica datos.
3. Toma runs recientes dentro de la ventana.
4. Calcula la mediana de los últimos cinco scores recientes.
5. Compara la caída contra `skillDriftThreshold`.
6. Si hay drift, crea un reporte Markdown y, opcionalmente, incorpora el conteo de
   `rule_violation` de telemetría.
7. Con `log_only`, informa sin fallar CI ni autoejecutar un workflow.

Aunque la rubric declara `criterionDriftThreshold`, el runner actual compara el
`overallScore` a nivel skill; todavía no calcula drift independiente por criterio.

### Baselines y resets

Una baseline queda congelada. Resetearla requiere
`-ResetBaseline -Reason "..."`; la razón se conserva en el historial. Debe hacerse
solo cuando una modificación aprobada redefine la barra de calidad, no para ocultar
una regresión.

### Skill review

El workflow clasifica el drift en exactamente una de cinco causas:

1. regla incorrecta;
2. regla obsoleta;
3. regla ambigua;
4. benchmark incorrecto;
5. threshold incorrecto.

Luego exige una propuesta con diff unificado. La propuesta nunca se autoaplica:
un humano revisa, aplica el cambio, incrementa versión, regenera snapshot y decide
si corresponde resetear la baseline.

## 14. Telemetría y observabilidad

### Qué aporta

Define un contrato pequeño, local y agnóstico de proveedor para observar uso de
contexto, violaciones y finalización de tareas sin guardar conversaciones.

### Contrato JSONL

Los eventos se anexan a:

```text
.agents/telemetry/events/YYYY-MM.jsonl
```

Tipos definidos:

| Evento | Información principal |
|---|---|
| `session_start` | Proyecto y herramienta. |
| `context_injected` | Artefacto y cantidad de líneas. |
| `rule_violation` | Skill, regla y mecanismo de detección. |
| `task_completed` | Categoría de routing y minutos de sesión. |
| `session_summary` | Líneas inyectadas, skills cargadas y violaciones. |

Los archivos son append-only, están gitignored y el contrato declara retención de
90 días. El scaffold no incluye un job de purga: la retención debe materializarla
el equipo si necesita enforcement automático.

### Nivel de garantía

El modo base es best effort. El primer pide al agente un `session_summary` al
cerrar, pero una instrucción al final de un contexto largo puede perderse. Los
consumidores deben tratar estos datos como una muestra, no como un censo.

Si el runtime soporta lifecycle hooks, el equipo puede mecanizar la escritura. La
proyección Copilot incluye además un ejemplo de session logger bajo
`.github/hooks/session-logger/`; ese ejemplo registra timestamps en
`.specdd/logs/session.log` y requiere activación específica del runtime. No escribe
por sí mismo el contrato JSONL del núcleo.

## 15. Seguridad, guardrails y MCP

### Seguridad incorporada

Cuando se incluye la proyección Copilot, las instrucciones cubren:

- conducta conservadora del agente y cambios mínimos;
- confirmación antes de acciones destructivas o irreversibles;
- prohibición de exponer secretos;
- SDD obligatorio;
- context engineering;
- OWASP, validación de inputs, autorización y queries parametrizadas;
- code review, accesibilidad, performance y reglas de stacks soportados.

La constitución personalizada también registra clasificación de datos y controles
OWASP elegidos en el wizard.

### MCP

El wizard puede generar `.vscode/mcp.json` para GitHub, SonarQube, Context7,
PostgreSQL, Playwright y Figma. El archivo usa `${input:...}` para credenciales;
no almacena tokens reales.

MCP es opcional. Amplía las herramientas disponibles para el agente, pero no es
necesario para ejecutar el ciclo SDD. Los guardrails exigen usar solamente servers
autorizados, validar su output como input no confiable y no realizar escrituras
especulativas.

## 16. Escenario Greenfield

En un proyecto nuevo, las respuestas del wizard son la fuente inicial del scaffold:

| Input del wizard | Resultado |
|---|---|
| Proyecto, personas, outcomes y constraints | `context/project.md` |
| Stack | `context/tech-stack.md` |
| Principios y seguridad | `context/constitution.md` |
| Cada dominio | skill + routing row + rubric + clase de budget |
| Cada entidad | spec YAML placeholder |
| Features iniciales | `specs/features-spec.md` |
| Herramientas de agentes | adaptadores necesarios |
| MCP seleccionado | `.vscode/mcp.json` |

`spec-converge.md` se excluye porque todavía no hay código histórico que alinear.
Snapshots, baselines, scores y eventos no se inventan.

## 17. Escenario Brownfield

### Análisis local y acotado

El usuario selecciona una carpeta mediante File System Access API. El analizador:

El análisis Brownfield se expresa mediante dos niveles separados del escenario:

- **Nivel 1 — Bootstrap estructural (disponible):** lee manifests conocidos y paths
  de archivos. Detecta stack, sugiere dominios/entidades y detecta Harnesses previos.
- **Nivel 2 — Análisis semántico asistido (planificado):** será opt-in y local;
  podrá inspeccionar código, tests, modelos, rutas y configuración, siempre con
  evidencia, confianza y aprobación humana. El wizard lo muestra como capacidad
  futura, pero todavía no lo ejecuta.

Ningún nivel inventa reglas de negocio, aprueba specs automáticamente ni modifica
el código existente.

El analizador actual implementa Nivel 1:

- lee contenido únicamente de manifests conocidos;
- usa solamente paths para el resto de los archivos;
- ignora dependencias, builds, coverage, virtual environments y otras carpetas de
  ruido;
- toma el manifest más cercano a la raíz;
- detecta stack por dependencias o textos de manifests;
- sugiere hasta ocho dominios por estructura de carpetas;
- sugiere hasta doce entidades por nombres y ubicación de archivos;
- limita el análisis visible a 20.000 paths y reporta truncamiento.

Las sugerencias son leads editables, no hechos. Especialmente los dominios pueden
salir como capas técnicas y deben convertirse en áreas de negocio significativas.

### Política de colisiones

Por defecto, cualquier archivo ya existente en el proyecto destino se omite y se
lista en `context/brownfield-analysis.md`. No se fusiona ni se sobrescribe
silenciosamente.

El reporte de análisis se genera siempre para dejar kickoff, detecciones y lista de
skips. Luego el workflow `spec-converge` guía la reconciliación.

### Spec Converge

`spec-converge.md`:

1. aborta si no existen checks ejecutables;
2. ejecuta la spec para medir el delta;
3. audita gaps sin cobertura y propone nuevos checks para aprobación humana;
4. agrega trabajo pendiente al tasks file sin reescribir ni desmarcar historia;
5. exige revisión humana antes de retomar implementación.

Converge nunca aprueba retroactivamente un design contract y su salida son tareas,
no cambios directos de código.

### Migración de un harness previo

El analizador busca archivos raíz y carpetas típicas de harnesses anteriores. Los
clasifica en:

- **mechanism**: configuración y archivos de arranque a deprecar;
- **knowledge**: skills, patterns y ADRs cuyo contenido puede seguir siendo útil.

Si el usuario reconoce explícitamente la detección, una colisión con un path de
salida del nuevo Harness —`AGENTS.md`, adaptadores o cualquier archivo generado
bajo `.agents/`— se clasifica como `replaced` en vez de `skipped`. Las colisiones
fuera de ese conjunto conservan la regla de skip. El inventario
mechanism/knowledge determina qué debe archivar o rescatar el plan de migración;
no es el criterio técnico usado por el generador para decidir `replaced`.

También se genera `.agents/specs/tasks/harness-migration.tasks.md` en estado draft.
Un humano debe aprobarlo. El plan archiva mecanismos en `.agents/_archive/`, exige
triage individual de conocimiento, vuelve a cablear Routing/Registry/Budget y corre
los gates. No retroaprueba contratos ni crea snapshots ficticios.

## 18. Proyección específica de GitHub Copilot

La carpeta `.github/` se incluye únicamente si el usuario selecciona GitHub
Copilot. Contiene:

- prompts `/specdd-*`;
- instrucciones generales, de seguridad, SDD, MCP y stack;
- definiciones de agentes de specify, implement, orchestrator, TDD y reviewers;
- hooks de ejemplo.

Esta proyección mejora la experiencia nativa de Copilot, pero no sustituye al
núcleo. Si Copilot no se selecciona, todo `.github/` se filtra del ZIP y el Harness
vendor-neutral continúa funcionando mediante `AGENTS.md`, `.agents/`, contexto y
templates.

## 19. Extensión mediante SpecForge Role Packs

SpecForge no crea un segundo Harness. Genera módulos que se enchufan al existente
para BA, QA, Dev y UX.

Cada rol puede aportar:

```text
.agents/skills/role-<role>/SKILL.md
.agents/skills/role-<role>/assets/*.md
.agents/evals/rubrics/role-<role>.yaml
.agents/workflows/role-<role>/*.md
.agents/subagents/role-<role>.agent.md
```

Las capacidades principales son:

| Rol | Enfoque |
|---|---|
| BA | Discovery, stories, acceptance criteria, splitting y trazabilidad. |
| QA | Test cases, AC validation, Gherkin, Playwright, regresión, defects y QA evals. |
| Dev | Story-to-code, componentes, APIs, estado, errores, refactor, performance, review y PR. |
| UX | Flows, copy, design system, prototipos, screen specs y contexto Figma. |

El pack no modifica `ROUTING.md`, `REGISTRY.md` ni el budget manifest por su cuenta.
Genera `role-pack-install.tasks.md` en draft para que un agente, después de
aprobación humana, haga ese wiring y ejecute los gates.

Los archivos de subagent son seeds canónicos. El sistema Multi-Agent permanece
inactivo hasta que el proyecto defina un workflow real con subagentes nombrados.
Seleccionar Role Packs no lo activa implícitamente.

SpecForge también aplica collision skipping y produce
`context/role-pack-report.md`. Puede agregar placeholders MCP para Figma o
Playwright según las opciones UX/QA.

## 20. Límites deliberados y estado real

El Harness no debe interpretarse como una plataforma autónoma de ejecución.

- No escribe código por sí mismo; guía a humanos y agentes.
- No aprueba specs, tasks ni cambios de skills sin intervención humana.
- No genera datos falsos para snapshots, scores, baselines o telemetría.
- No produce scores de eval automáticamente; analiza scores provistos.
- No activa Multi-Agent solamente porque existan seeds.
- No conecta gates a CI automáticamente.
- No garantiza telemetría completa en modo instrucción.
- No despliega. SpecDeploy es otro wizard y genera artefactos de despliegue, no una
  capa del SpecDD Harness.
- No integra un issue tracker específico. Los prompts producen texto portable.
- No necesita MCP ni GitHub Copilot para operar el ciclo SDD central.

## 21. Ciclo de maduración recomendado

### Al generar el scaffold

1. Revisar `context/` y corregir cualquier valor genérico.
2. Confirmar que los dominios representan negocio y no carpetas técnicas.
3. Revisar la constitución y acordar el proceso de amendments.
4. Mantener specs YAML en placeholder hasta contar con requisitos y checks reales.

### En las primeras features

1. Clasificar cada tarea por Routing.
2. Ejecutar specify, clarify y aprobación humana.
3. Crear plan y tareas trazables.
4. Implementar con tests.
5. Ejecutar el done-gate.
6. Registrar reglas reales descubiertas en las skills.

### Cuando las skills se estabilizan

1. Incrementar sus versiones.
2. Generar y completar snapshots comprimidos.
3. Ejecutar `generate-snapshots.ps1 -Check`.
4. Validar el budget de contexto.

### Cuando hay suficiente evidencia

1. Alimentar scores reales de eval.
2. Congelar baselines después del mínimo configurado.
3. Revisar reportes de drift sin autoaplicar cambios.
4. Decidir si la política debe permanecer `log_only`, disparar workflow o fallar CI.
5. Conectar validadores y retención de telemetría a la automatización del equipo.

## 22. Resumen conceptual

El valor del Harness no proviene de un único prompt. Proviene de separar
responsabilidades:

- **Context** dice qué proyecto es este.
- **Governance** dice qué principios no pueden violarse.
- **Routing** decide qué conocimiento hace falta ahora.
- **Skills** dicen cómo se trabaja correctamente en cada dominio.
- **Specs** dicen qué comportamiento fue acordado.
- **Workflows** ordenan cómo pasar de intención a código.
- **Validators** convierten acuerdos críticos en gates reproducibles.
- **Cold-Start** limita cuánto contexto se inyecta.
- **Evals** miden si las reglas siguen produciendo resultados consistentes.
- **Telemetry** aporta señales operativas sin capturar conversaciones.
- **Adapters** permiten que distintas herramientas consuman el mismo núcleo.
- **Brownfield** agrega convergencia y migración segura.
- **SpecForge** extiende el núcleo con capacidades de roles sin tomar control del
  Harness existente.

En conjunto, estas capas convierten un conjunto de instrucciones para agentes en
un sistema versionado, revisable, portable y progresivamente verificable.

## 23. Fuentes de implementación dentro del repositorio

Los comportamientos descritos se pueden rastrear principalmente en:

- `README.md`;
- `specdd-kit/website/src/components/generators.js`;
- `specdd-kit/website/src/components/analyzer.js`;
- `specdd-kit/.agents/workflows/`;
- `specdd-kit/.agents/scripts/`;
- `specdd-kit/.agents/evals/run-eval.ps1`;
- `specdd-kit/.agents/telemetry/EVENTS.md`;
- `specdd-kit/governance/constitution.md`;
- `specdd-kit/templates/` y `specdd-kit/.github/`;
- `specforge-kit/website/src/components/generators.js`;
- `specforge-kit/website/src/components/roles.js`;
- tests unitarios y E2E de ambos wizards.
