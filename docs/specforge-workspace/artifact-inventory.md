# Inventario de contratos reutilizables

Fecha: 2026-09-07. Descubrimiento Phase 0, no definición de un nuevo schema.

| Concepto existente y fuente | Reutilización | Lo que falta / lo que no debe confundirse |
|---|---|---|
| [ProjectDefinition y SpecArtifact](../../packages/project-model/src/types.ts) | Identidad de proyecto, dominio/entidad/feature, bindings y referencias a specs | `SpecArtifact` es referencia con path/status/targets; no contenido versionado de requisitos ni prueba de aprobación. El proyecto exige contexto y Harness. |
| [IDs](../../packages/project-model/src/ids.ts), [validación estructural](../../packages/project-model/src/structural.ts) | Convención de IDs y diagnósticos; JSON Schema 2020-12 + Ajv, sin coerción de datos | `componentId` normaliza nombres, no garantiza unicidad ni estabilidad tras renombrar. Usar IDs persistidos y control de colisiones. |
| [CapabilityPack](../../packages/capability-model/src/types.ts), [factory](../../packages/capability-model/src/factory.ts) | Role, policies, skills, playbooks, workflows, eval/context refs y migración legacy | Comportamiento, no instancia de trabajo. Los packs de fábrica requieren `specdd-harness ^1.0.0` y contextos por path. La proyección para workspace necesita diseño explícito. |
| [Entity spec generada](../../specdd-kit/website/src/components/generators.js), [validador](../../specdd-kit/.agents/scripts/validate-spec.ps1) | `requirements`, `designContract`, reviewer/timestamp, acceptanceChecks o waiver revisado | Criterio Given/When/Then no equivale a comando ejecutable; status de contexto detectado no equivale a contrato aprobado. |
| [Feature spec template](../../specdd-kit/specs/_template/spec.md), [templates](../../specdd-kit/templates/spec-template.md) | Formatos de ingeniería para requisitos, criterios, preguntas y alcance | Hay templates Markdown y contrato de entidad YAML: Phase 5 debe elegir destino concreto, no asumir un único schema universal de specs. |
| [Convergencia Brownfield](../../specdd-kit/.agents/scripts/converge-contracts.ps1), [candidato](../../specdd-kit/templates/brownfield/entity-contract-candidate.json) | Patrón propose/apply, subject de candidatos+preimages+Project Definition, reviewer, receipt y rechazo de replay/drift | Está acotado a reemplazar placeholders de entidad y alinear estados; no sirve directamente para revisar una spec aprobada ni para publicar un requisito BA arbitrario. |
| [Rebaseline](../../specdd-kit/.agents/scripts/rebaseline-source.ps1) | Referencia de approval exacta y validación de preimages | Gestiona fingerprints de fuentes modificadas; no es editor ni aprobación de requisitos. |
| [ControlPlaneDefinition](../../packages/control-plane-model/src/types.ts) | Referencias a proyecto/capacidad, contratos declarativos de approval y artifact, gates | `ArtifactContract` describe entrada/salida/evidencia por path. No es `ArtifactEnvelope` de negocio; `ApprovalContract` declara necesidad, no decisión observada. |
| [Grafos](../../docs/control-plane/adrs/0006-finite-declarative-control-graphs.md) | Convenciones de referencias y validación semántica | DAG de ejecución con rutas por outcome; no reutilizar sus aristas como relaciones de conocimiento. `relates-to`/`depends-on` tienen otras reglas y posibles ciclos. |
| [PlanArtifact y RunRecord](../../packages/local-control-service/src/types.ts), [store](../../packages/local-control-service/src/store.ts) | Experiencia probada en hash de contenido, aprobación exacta, exclusión concurrente, SQLite y restart | Plan contiene Markdown técnico y pertenece a un run; tabla de approvals ligada a runId. No API genérica de revisión editorial. ProjectRecord registra root del operador, no reemplaza Project Definition. |
| [Eval adapters](../../packages/eval-adapters/README.md) | Definiciones/resultados versionados, identidad de input/eval, evidence hashes, error vs pass/fail | Rúbricas `log_only` del pack no generan resultados automáticamente. Una valoración del agente no prueba cumplimiento de negocio ni cobertura ejecutada. |
| [Harness telemetry](../../specdd-kit/.agents/telemetry/EVENTS.md) | Referencia de minimización y eventos best-effort | Los eventos son deliberadamente incompletos; no usarlos como historial de revisiones o autoridad de aprobación. |
| [Run history](../../packages/run-history/src/types.ts), [store](../../packages/run-history/README.md) | Observaciones y gaps, proveniencia de ejecución, exportación inmutable | Requiere run/workflow/graph binding; no inventar runs para representar edición humana. No es store transaccional de documentos. |
| [Improvement proposals](../../packages/improvement-proposals/README.md) | Separación propuesta/evidencia/decisión, journal de revisión con hashes | Dominio de benchmarks y mejoras; su ciclo requested/pr-recorded/adopted no encaja directamente con requisitos BA. Identidad local atestada no es autenticación empresarial. |
| [Benchmarks](../../packages/benchmarks/README.md) | Deltas con alcance, cobertura y datos no medidos explícitos | Comparación de evaluaciones; no leerlo como readiness general del producto. |
| [Delivery model](../../packages/delivery-model/README.md) | Proyección explícita, reporte de límites, receipts y separación browser/Node | Dominio de entrega; no ampliar SpecDeploy ni convertir receipt de entrega en artefacto BA. |
| [Scaffold receipt y validación](../../specdd-kit/README.md) | Referencias a contexto y evidencia de extracción/readiness | Fingerprints no prueban verdad de negocio; no almacenar ediciones de workspace en el manifest. |

## ADRs y compatibilidad

Se contrastaron ADRs de control-plane
[0001](../control-plane/adrs/0001-separate-project-definition-from-generation-receipt.md),
[0002](../control-plane/adrs/0002-json-schema-and-typescript-contract.md),
[0003](../control-plane/adrs/0003-harness-v1-compatibility-boundary.md),
[0004](../control-plane/adrs/0004-one-role-one-capability-pack.md),
[0005](../control-plane/adrs/0005-separate-harness-from-control-plane.md),
[0006](../control-plane/adrs/0006-finite-declarative-control-graphs.md),
[0009](../control-plane/adrs/0009-canonical-eval-runtime-boundary.md),
[0010](../control-plane/adrs/0010-immutable-run-observation-artifacts.md),
[0012](../control-plane/adrs/0012-human-governed-improvement-proposals.md) y
[0014](../control-plane/adrs/0014-local-operation-boundary.md), además del
[diseño de Capability Packs](../superpowers/specs/2026-09-03-specforge-capability-packs-design.md).

El principio de contrato separado sigue siendo apropiado. La mención histórica
del ADR-0002 a ausencia de dependencia de schema validator no describe el código
actual: `structural.ts` usa Ajv. Las decisiones nuevas deben apoyarse en ese código.
No se modifican ADRs históricos para aparentar que anticipaban el Workspace.

## Preguntas de diseño para Phase 1

Las siguientes son recomendaciones a revisar en la spec/ADR, no contratos aprobados.

| Pregunta | Recomendación inicial | Evidencia/condición de cierre |
|---|---|---|
| ¿Envelope o schemas separados? | Envelope estricto con payload discriminado; empezar Requirement, OpenQuestion y Decision. Criterios tipados dentro del requisito con IDs propios. | Evita `content:any` y demasiados tipos; decidir necesidad de aprobación independiente de criterios. |
| ¿Un package nuevo? | Evaluar `@specdd/artifact-model` browser-safe con dependencia mínima de project-model; separar persistencia/crypto Node. | Ninguno de los contratos inventariados representa trabajo editorial por rol. No extender silenciosamente CapabilityPack o PlanArtifact. |
| ¿Identidad? | ID inmutable por proyecto, separado de título/path; revisión monotónica y hash determinista del snapshot. | Resolver creación offline y colisiones: igualdad de contenido no debe fusionar requisitos independientes. |
| ¿Versiones y migraciones? | Separar schemaVersion de revisión de instancia. Mantener versiones previas; rechazar schema desconocido. | No existe formato legacy de requisito que se pueda migrar automáticamente. Tests de round-trip y rechazo; futuras migraciones explícitas, nunca aprobar por importación. |
| ¿Qué se aprueba? | Snapshot exacto con proyecto, ID, revisión y vínculos relevantes fijados; editar genera nueva revisión pendiente. | Cambio de criterio, pregunta resuelta, relación o contexto material debe invalidar elegibilidad de una proyección anterior. |
| ¿Actor y proveniencia? | Distinguir humano, agente, humano editando propuesta, importación y proyección; conservar origen al editar. | Roles no son identidades autenticadas. Registrar actor real disponible sin inventar stakeholder ni firma. |
| ¿Relaciones? | Referencias tipadas a proyecto/artifact/revisión; integridad local mínima en Phase 1, semántica y consultas en Phase 2. | Definir relaciones que fijan revisión y reglas por tipo; no imponer DAG de ejecución al grafo de conocimiento. |
| ¿Guardar dónde? | Contrato de repositorio de artefactos independiente del backend; evaluar SQLite para MVP local y archivos para intercambio. | SQLite ya existe pero store de SpecControl es específico. Elegir antes de Phase 4 mediante prueba de restart, atomicidad y migración. No decidir DB distribuida. |
| ¿Proyecto sin configuración técnica? | Seleccionar contexto canónico preparado por operador en el primer piloto. | Project Definition exige Harness y dominios; diseño posterior de onboarding debe reutilizarlo sin inventar campos ni crear otro Project model. |
| ¿Conocimiento sin repositorio? | Resolver packs y contenido canónico desde distribución local; explicitar el binding de contexto de cada acción. | Dependencia Harness, paths y referencias cruzadas actuales requieren adaptación versionada o proyección justificada en Phase 3. |
| ¿Approval de requisito o spec? | Mantener decisiones separadas y enlazadas; preview de destino y preimage al proyectar. | BA puede aprobar intención sin elegir comando shell. Mapping incompleto se reporta y bloquea aprobación canónica que no satisface el contrato. |

La reutilización de patrones no significa que el sistema nuevo ya hereda enforcement,
autenticación o garantías de recuperación. Esas garantías necesitan implementación
y pruebas propias en la capa que haga la transición.
