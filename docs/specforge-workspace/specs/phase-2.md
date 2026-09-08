# Phase 2 — Artifact Graph and Traceability

Fecha: 2026-09-07. Alcance autorizado: «sigamos con Phase 2».

## Problema y decisión de modelado

Los snapshots 1.0.0 incluyen sus relaciones en el subject. Un vínculo recíproco
entre dos snapshots con hashes exactos exigiría hashes recursivos. Mantener el
formato 1.0.0 y agregar un documento de grafo separado: nodos fijados por proyecto,
ID, revisión y subject; assertions relacionales con actor/fecha/fuentes explícitas.
El grafo consume contexto canónico y snapshots existentes. No reescribe ninguno.

El grafo efectivo combina relaciones embebidas de Phase 1 y assertions del nuevo
documento. Las primeras conservan su origen y no pueden ocultarse omitiéndolas
del documento. El mismo vínculo duplicado entre ambas fuentes se rechaza. El
grafo no convierte una relación afirmada en evidencia de implementación/QA.

## Semántica de relaciones

| Relación A → B | Significado | Regla inicial |
|---|---|---|
| depends-on | A necesita B | Cualquier tipo existente, orden causal A depende de B |
| derives-from | A se originó a partir de B | Cualquier tipo; no acredita fidelidad de la derivación |
| refines | A detalla B | Requirement → Requirement |
| blocks | A bloquea B | Cualquier tipo; orden causal B depende de A |
| supersedes | A se declara reemplazo de B | Mismo tipo, como máximo un reemplazante declarado por target |
| relates-to | Asociación sin dependencia | Simétrica para consulta; almacenar una sola afirmación por par |
| validates | Evidencia de verificación de B | Reconocida, rechazada como no soportada para los payloads actuales |
| implements | Implementación de B | Reconocida, rechazada como no soportada para los payloads actuales |

No se crean tipos ficticios QA/Dev para habilitar las dos últimas relaciones.
Su soporte necesita los contratos y semántica de evidencia de fases posteriores.

Prohibir self-links, duplicados, targets ausentes, otro proyecto, revisión/hash
obsoletos y ciclos en la unión causal: depends-on, derives-from, refines,
supersedes y blocks invertido. Relaciones de asociación sí admiten ciclos;
ninguna de estas aristas ejecuta agentes. Detectar conflictos de supersesión,
pero no retirar/activar artefactos automáticamente por una assertion.

## API y límites

Subpath `@specdd/artifact-model/graph`, schema separado. Validación estructural y
semántica con diagnósticos estables, binding a Project Definition y validación de
integridad de cada snapshot. Contexto contiene exactamente una revisión actual
por nodo; no se permite que el grafo oculte un artefacto extra del contexto dado.
«Actual» y «completo» se refieren al conjunto proporcionado por el host.

Vista inmutable con consultas puras y resultados ordenados: vecinos entrantes/
salientes, recorrido acotado por dirección/tipo/profundidad, impacto sobre
dependientes, preguntas abiertas transitivas, blockers declarados y reemplazos.
Las consultas rechazan nodos/opciones inválidos; un límite de profundidad expone
`truncated`, no aparenta cobertura completa. Impacto identifica candidatos a revisar,
no invalida automáticamente una aprobación ni prueba causalidad de negocio.

El fingerprint de definición fija nodos/assertions; el de snapshot agrega hashes
completos de los registros, porque el lifecycle puede cambiar sin cambiar subject.
Un reporte describe ese snapshot congelado; un cambio posterior exige reconstruir
el grafo. No hay guardado, ejecución, autenticación o nuevo gate de aprobación.
El workflow BA futuro debe consumir el análisis junto al gate de aprobación;
el API de aprobación de Phase 1 mantiene explícitamente su alcance directo.

Límites iniciales: 200 nodos, 1.000 relaciones efectivas, hasta 2 MB por documento
de entrada/contexto según canonicalJson y profundidad de consulta 0–200. Usar algoritmos iterativos.
Versiones desconocidas rechazan; 1.0.0 hace round-trip sin inferir nodos, relaciones
ni aprobaciones desde documentos incompletos.

## Acceptance y plan

1. Documentar spec/ADR y la compatibilidad sin cambio de Artifact 1.0.0.
2. Schema/tipos, compilación de relaciones embebidas y validación del grafo completo.
3. Consultas deterministas y ejemplo sintético conectado.
4. Pruebas positivas/negativas: ciclos mixtos, asociación circular, relaciones
   obsoletas/ausentes, duplicados cruzados, cardinalidad/tipos, impacto y truncación,
   origen de vínculos, revisión/contexto alterado, copia defensiva y límites.
5. Regresión Phase 1, compilación browser y documentación de cierre. Pausa antes
   de Phase 3. Sin visualización UI, runtime ni edición de proyectos externos.
