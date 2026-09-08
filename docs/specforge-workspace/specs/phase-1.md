# Phase 1 — Canonical Artifact Model

Fecha: 2026-09-07. Alcance autorizado: continuar Phase 1 después de revisar Phase 0.

## Contrato e implementación

Crear `@specdd/artifact-model`, independiente de UI, almacenamiento y runtime.
Reutilizar tipos de Project Definition y su validador estructural. Formato JSON
versionado 1.0.0, tipos TypeScript estrictos y validación semántica.

Un envelope representa una revisión de Requirement, OpenQuestion o Decision.
Incluye identidad estable, referencia al hash del Project Definition, ownerRole,
contenido tipado, relaciones a revisiones exactas, contribuciones de autoría,
timestamps, hash del registro anterior y journal local de lifecycle. El estado
serializado debe coincidir con el replay del journal. Los criterios Given/When/Then
son componentes identificables del requisito; no son comandos ejecutables.

Transiciones: draft → under-review → approved → active → superseded. Una revisión
puede devolverse de under-review a draft. Aprobación/activación/retiro y retorno
requieren actor humano. Una edición siempre crea revisión nueva en draft, conserva
la proveniencia anterior y deja intacto el registro previo. No se copia approval.

Un subject SHA-256 determinista fija todo el snapshot salvo estado/journal. Los
eventos fijan el subject y el hash del evento anterior. Validar una cadena de
revisiones comprueba identidad, secuencia, parent hash y continuidad de autoría.
Los hashes son control de integridad local; no autentican al reviewer ni prueban
que se suministró todo el historial. El futuro store debe preservar historia y
realizar compare-and-swap al persistir. Las APIs puras no prometen exclusión de
procesos concurrentes ni aplicación global única.

Validar relaciones en un contexto explícito: proyecto canónico válido con hash
coincidente, IDs únicos, mismo proyecto, revisión actual y hash exactos. Sólo se
aceptan relaciones a otros artefactos suministrados. Phase 1 usa `depends-on`,
`derives-from`, `relates-to`; semántica adicional/traversal queda para Phase 2.
Las preguntas bloqueantes enlazadas directamente impiden aprobar un requisito
mientras estén abiertas. No afirmar que detecta preguntas omitidas ni dependencias
transitivas. Requisito listo requiere al menos un criterio; Decision requiere
conclusión/rationale; pregunta resuelta requiere respuesta humana registrada.

Proveniencia: human-authored, agent-proposed, human-edited-agent-proposal, imported,
generated-from-artifact. No permitir cambiar una cadena con contribuciones de
agente a human-authored. Import/generated exige source refs; resolver preguntas
requiere humano y no se permite que un agente cierre una pregunta.

## Entregables y orden

1. Spec y ADR; revisar compatibilidad con inventario Phase 0.
2. Tipos, schemas y validación.
3. Funciones puras de creación, edición, lifecycle, binding y evolución de formato.
4. Ejemplos sintéticos de las tres familias y tests positivos/negativos.
5. Compilación, regresión Capability Builder y evidencia documental.

No hay formato legacy de estos artefactos. La API de migración reconoce 1.0.0 sin
transformarlo y rechaza versiones desconocidas, Role Packs o specs sin inventar
proveniencia/aprobaciones. El consumidor verifica binding antes de confiar en una
importación. Migrar formato no concede permiso de publicación.

## Acceptance

Schema/tipos rechazan payload mezclado, unknown properties, fechas inválidas,
IDs duplicados, refs incorrectas y JSON no portable. Cambiar contenido aprobado,
evento, proyecto, relación o revisión invalida integridad/binding. Hash independiente
del orden de keys; array order, CRLF/LF y BOM dentro de strings se preservan.
Approval obsoleta, actor no humano, eventos fuera de orden y replay en el mismo
registro fallan. Editar conserva evidencia y exige aprobación nueva. Unknowns no
se promueven a decisiones. Ejemplos/migración round-trip y tests de navegador
del generador existente siguen pasando. No introducir dependencias descargadas.
