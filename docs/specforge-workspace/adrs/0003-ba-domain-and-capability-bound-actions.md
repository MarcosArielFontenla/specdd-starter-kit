# ADR SF-0003 — Dominio BA y acciones vinculadas a capacidades

Fecha: 2026-09-07. Implementación autorizada de Phase 3.

## Decisión

Extender el envelope mediante versión 1.1.0, conservando 1.0.0 sin reinterpretar
hashes ni journals. Componer schema nuevo desde el anterior y payloads BA; exponer
el schema compuesto para validadores externos. Evitar guardar reglas de negocio
como extensions sin validación o crear un segundo envelope/proyecto.

Conservar conocimiento en skills y generadores del Capability Builder. El dominio
recibe manifest y contenido resuelto por el host, más atestaciones explícitas de
dependencias. Un catálogo declarativo referencia ese conocimiento y limita acciones.
No instalar ni ejecutar workflows Markdown. La prosa legacy referencia Harness y
specs: en modo Workspace es contexto de especialidad, no permiso para escribirlas.
La futura proyección conserva un gate separado. Si falta contexto requerido,
informar indisponibilidad; no fabricar un proyecto/spec para habilitar acciones.

Separar propuestas de agente de artefactos canónicos. Las sugerencias se validan
contra acción, solicitud y fuentes exactas; no se aplican automáticamente. Fase 4
deberá registrar aceptación/edición humana y proveniencia al materializarlas.
El análisis de impacto estructural es cálculo determinista del grafo, no requiere
LLM y no demuestra impacto de negocio fuera de relaciones conocidas.

## Aprobación

El gate BA envuelve el journal existente con identidad del grafo antes/después.
Su receipt permite comprobar que la aprobación conserva el contexto analizado;
no convierte el API directo de Phase 1 en un gate transitivo silenciosamente.
No permite aprobación con preguntas bloqueantes transitivas o reglas/decisiones
causales draft. Las asociaciones no se convierten en dependencias de aprobación.

El modelo puro no garantiza autenticación, firma criptográfica de participantes,
persistencia ni compare-and-swap. El host debe guardar artefacto y receipt juntos,
conservar el grafo anterior y rechazar escrituras concurrentes con el hash previo.
No se afirma ejecución real BA hasta integrar y aceptar el piloto de Phase 4.
