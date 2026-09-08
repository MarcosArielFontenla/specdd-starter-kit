# Phase 2 — Artifact Graph and Traceability

Fecha: 2026-09-07. Implementación local terminada; aceptada al autorizar Phase 3.
Autorización: «perfecto, sigamos con Phase 2». Sin commit, push ni ejecución remota.

## Resultado

Nuevo subpath `@specdd/artifact-model/graph`, con schema propio, tipos, validación,
ejemplo sintético conectado y consultas sobre revisiones exactas. Ver
[API](../../../packages/artifact-model/GRAPH.md), [spec](../specs/phase-2.md) y
[ADR SF-0002](../adrs/0002-revision-bound-artifact-graph.md).

El grafo separado evita hashes recursivos sin modificar Artifact 1.0.0. Combina
relaciones embebidas y assertions con origen explícito: las primeras no pueden
ocultarse omitiéndolas del grafo. Rechaza referencias ausentes, obsoletas o de otro
proyecto, duplicados, ciclos causales, tipos incompatibles y reemplazos conflictivos.
Las asociaciones simétricas permiten ciclos. Ninguna relación ejecuta agentes.

Las consultas deterministas cubren vecinos, recorridos, impacto transitivo,
preguntas abiertas, bloqueos y reemplazos declarados. Incluyen identidad del
snapshot y truncación explícita cuando se limita profundidad. Entradas y resultados
se copian defensivamente; el grafo no modifica artefactos ni estados de aprobación.

## Evidencia local

| Validación | Resultado |
|---|---|
| TypeScript estricto, artifact-model y project-model | Correcto |
| `npm run test:unit -w @specdd/artifact-model` | 51/51: 26 del grafo y 25 de Phase 1 |
| Bundle browser con esbuild en memoria | Correcto, 0 warnings |
| Chromium headless: ejemplo conectado y Web Crypto | Correcto; hash de snapshot, impacto y bloqueos idénticos a Node |
| Red del test Chromium | Todas las peticiones interceptadas; HTML local sintético, resto abortado |
| Enlaces Markdown del paquete y documentación de evolución | 79 referencias, 0 destinos inexistentes |
| Whitespace | 27 archivos nuevos/locales comprobados; `git diff --check` sin errores |

Regresiones: inventario incompleto/duplicado, revisión alterada, contexto ajeno,
aristas embebidas y duplicados entre orígenes, ciclos mixtos y asociaciones,
cardinalidad/tipos, preguntas resueltas/no bloqueantes, recorridos con diamantes,
truncación y opciones inválidas, identidad determinista, cambio de lifecycle,
copias defensivas, cronología, migración y límites de nodos/aristas/tamaño.
El ejemplo no representa decisiones reales ni reglas aprobadas de Bloom.

No se agregaron dependencias ni se alteraron los renderers/packs de SpecForge,
Project Definition, el servicio SpecControl o los proyectos Bloom. El job existente
de artifact-model ejecutará también las pruebas nuevas cuando se publique;
no se declara CI remoto verde para estos cambios locales.

## Límites y pausa

`validates` e `implements` se reconocen pero se rechazan explícitamente hasta
contar con payloads y semántica QA/Dev. Una assertion no prueba implementación,
fidelidad, autenticidad de identidad ni finalización de trabajo. Supersesión no
retira ni aprueba artefactos. Impacto enumera candidatos a revisión, no los modifica.

La integridad se verifica contra el inventario entregado por el host; no descubre
artefactos omitidos ni demuestra que sea el estado más reciente. Sin persistencia,
UI, runtime, autenticación o nuevo gate de aprobación. Phase 1 conserva su revisión
de dependencias directas: adoptar análisis transitivo requiere integración explícita.

Al entregar Phase 2, Phase 3 permanecía Planned: profundizar el dominio BA, sus payloads y acciones,
integración con capacidades y contexto trazable. Antes de implementarla se debe
precisar el contrato de cada acción y cómo consume el snapshot del grafo.
Se hizo la pausa. El usuario aceptó al indicar «perfecto vamos por esa Phase 3»;
el resultado posterior figura en el [cierre de Phase 3](phase-3.md).
