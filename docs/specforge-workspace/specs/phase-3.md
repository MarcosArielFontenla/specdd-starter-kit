# Phase 3 — BA Workspace Domain

Autorización: «perfecto vamos por esa Phase 3». Alcance local, sin UI, runtime,
persistencia, proyección SpecDD, instalación de packs ni operaciones Git remotas.

## Contratos y compatibilidad

Reutilizar Requirement, criterios anidados con ID, OpenQuestion y Decision.
Agregar BusinessRule (statement/rationale) e ImpactAnalysis (snapshot de base,
raíz y referencias afectadas, alcance explícito al contexto proporcionado).
Artifact 1.1.0 agrega estos dos tipos; preservar schema, snapshots y hashes 1.0.0.
La revisión de un artefacto existente conserva su versión. Migración reconoce
ambas versiones sin modificar ni promover registros automáticamente.

## Acciones y conocimiento

Cuatro acciones iniciales: analyze-requirement, refine-wording,
suggest-acceptance-criteria, impact-analysis. Las tres primeras producen propuestas
tipadas sin mutación; impact-analysis es cálculo local determinista, no simulación
de un agente. Define un workflow BA declarativo compartido, sin prompts en JSX.

Resolver el Capability Pack BA activo y su workflow specforge-requirements, skills,
playbooks BA, políticas, rúbricas y contexto requerido desde contenido proporcionado
por el host. Validar manifest, referencias, paths, dependencias atestadas y faltantes.
Fijar hashes del contenido consumido; no leer archivos/red ni interpretar Markdown
como autorización. Consumir la prosa canónica existente, sin copiarla a otra UI.
Si Project Definition registra el pack, exigir binding habilitado, versión exacta
y manifest coincidente. Sin binding sólo preparar propuesta de dominio identificada
como no registrada; ningún request confiere autorización de ejecución.
El conjunto inicial requiere los siete playbooks BA referenciados por su orientación;
tener el texto de Miro no requiere Miro ni permite ejecutar una integración.
El octavo del catálogo, documentation, describe APIs/módulos Dev y se excluye de
estas acciones sin eliminarlo del pack legacy. No seguir sus referencias Dev.

Cada solicitud fija run ID, acción, requisito, grafo completo validado, proyecto y
capacidad resuelta. La salida debe señalar el hash exacto de solicitud. Al consumir
se reconstruye contra los inputs actuales: cualquier drift rechaza la propuesta.
Propuestas contienen sólo redacción, preguntas sin respuesta, reglas propuestas y
criterios según acción. Sus referencias deben existir en el contexto de entrada.
No admiten decisiones, resolución de preguntas, estado aprobado ni cambios de specs.
Validar forma/referencias no prueba veracidad semántica: revisión humana pendiente.

## Gobernanza

Agregar un gate BA explícito sobre Phase 1, sin cambiar sus APIs directas:
preparar subject con hash del artefacto completo y snapshot del grafo; aplicar
aprobación humana exacta y producir receipt con el snapshot resultante. Rechazar
preguntas bloqueantes transitivas, blocks declarados, dependencias superseded y
reglas/decisiones causales aún no aprobadas. No propagar aprobación automáticamente.
Consumo revalida receipt, artefacto y grafo actuales. Cambios de lifecycle del
contexto también invalidan el receipt. Identidad atestada, no autenticada; atomicidad,
historial persistido y protección concurrente siguen siendo responsabilidad del host.

## Acceptance

1. Spec/ADR antes de implementar contratos y API.
2. Payloads, workflow, resolver y contratos de acciones con ejemplos sintéticos.
3. Gate BA, receipts y análisis de impacto reproducible.
4. Tests negativos: payload/versiones, faltantes/path/dependencias, drift,
   intento de aprobar/resolver desde agente, refs inventadas, gate transitivo,
   receipts alterados y copias defensivas; regresiones Phase 1/2 y packs existentes.
5. Build portable, documentación y pausa antes de Phase 4.
