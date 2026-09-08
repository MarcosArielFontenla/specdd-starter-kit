# Phase 1 — Canonical Artifact Model

Fecha: 2026-09-07. Implementación local terminada y aceptada al autorizar Phase 2.
Autorización: «vamos con la siguiente Phase 1» después de la entrega de Phase 0.
El usuario pidió detenerse al finalizar cada fase y explicar cómo continuar.

## Resultado

Nuevo [package artifact-model](../../../packages/artifact-model/README.md),
[spec](../specs/phase-1.md) y [ADR SF-0001](../adrs/0001-artifact-revisions-and-ownership.md).
Requisitos con criterios, preguntas abiertas y decisiones tienen payloads estrictos.
Identidad, proyecto fijado por hash, revisión, proveniencia acumulativa y journal
permiten revisar contenido exacto y crear revisiones posteriores sin heredar una
aprobación obsoleta. Se mantiene Project Definition como contexto canónico.

El estado se comprueba mediante replay del journal. Aprobar/activar/retirar exige
actor humano atestado por el host; editar conserva origen del agente. Relaciones
directas fijan ID/revisión/hash y se verifican contra contexto explícito. Preguntas
bloqueantes abiertas impiden aprobación. El consumo de un artefacto aprobado
revalida también contexto y targets actuales.

## Evidencia

| Validación | Resultado |
|---|---|
| Build TypeScript estricto de artifact-model y project-model | Correcto |
| Suite artifact-model | 25/25 |
| Regresión SpecForge | 27/27 |
| Capability Model | 8/8 |
| Project Model | 12/12 |
| Bundle de artifact-model con esbuild, `platform: browser`, en memoria | Correcto, 0 warnings, sin Node imports en el entry point |
| `npm ci --dry-run --offline --ignore-scripts --no-audit --no-fund` | Exit 0; comprobación del lockfile sin instalar paquetes |
| E2E SpecForge | 2/2 |
| Enlaces de los nueve documentos de evolución/package | 68 referencias, 0 destinos inexistentes |
| Lockfile vs HEAD | Ninguna entrada de dependencia preexistente cambió; sólo registro del nuevo workspace |
| Whitespace | `git diff --check` sin errores; archivos nuevos comprobados separadamente |

Los tests incluyen fecha imposible, payload cruzado, propiedad desconocida,
criterios duplicados, JSON no portable, source refs ausentes, manipulación de
contenido/journal, aprobación obsoleta/no humana, replay, pérdida de proveniencia,
referencia inexistente/duplicada/desactualizada/otro proyecto, pregunta sin resolver,
autor falso de respuesta, copia defensiva y cadena de revisiones. SHA-256 se
contrasta con implementación Node independiente; orden de claves es indiferente,
pero arrays, CRLF/LF y BOM dentro de strings no se normalizan.

Los tres ejemplos son sintéticos y draft. Las decisiones de tests no son
aprobaciones del usuario. La primera corrida detectó un fixture de prueba que
compartía objetos; se corrigió el aislamiento del fixture y pasó la suite completa.

## Integración y compatibilidad

Registrado el workspace en package.json y lockfile, sin nuevas versiones de
dependencias externas. Se añadió job `artifact-model` al CI existente; su ejecución
remota queda pendiente de una futura publicación. README principal y de SpecForge
apuntan a la evolución y sus límites. Los renderers, packs, schemas previos,
conocimiento de roles y servicio SpecControl siguen sin modificaciones.

La validación browser prueba compilación, no un nuevo Workspace UI. El modelo no
implementa persistencia ni runtime; necesita store transaccional para compare-and-swap
y un host que conserve revisiones/journal y ateste identidades. No garantiza
autenticación, exclusión entre procesos ni una única aplicación global. Migración
1.0.0 es reconocimiento sin pérdida; formatos desconocidos se rechazan y no hay
conversión automática de documentos legacy.

## Pausa y siguiente fase

Al entregar Phase 1 se hizo la pausa para aceptación humana. El usuario aceptó
al indicar «perfecto, sigamos con Phase 2». El siguiente alcance acordado fue definir
semántica de relaciones, consultas de trazabilidad y reglas del grafo de artefactos,
sin reutilizar el DAG de ejecución como si fuera un grafo de conocimiento.
Antes de extenderlo habrá que especificar ciclos permitidos/prohibidos, relaciones
entre tipos, supersesión y propagación de cambios; no se implementaron en Phase 1.
El resultado posterior está en el [cierre de Phase 2](phase-2.md).
