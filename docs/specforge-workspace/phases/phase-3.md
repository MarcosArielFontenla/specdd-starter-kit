# Phase 3 — BA Workspace Domain

Fecha: 2026-09-07. Implementación local terminada; pausa para aceptación humana.
Actualización: aceptada al autorizar el usuario Phase 4 el 2026-09-07. El resto de
este documento conserva la evidencia y los límites al momento de esa entrega;
el avance vigente está en el [tracker](../roadmap.md).
Autorización: «perfecto vamos por esa Phase 3». Sin commit/push, publicación ni red
externa; sin modificar Bloom, los workspaces privados, Wizard o servicio SpecControl.

## Entrega

[API BA](../../../packages/artifact-model/BA.md), [spec](../specs/phase-3.md) y
[ADR SF-0003](../adrs/0003-ba-domain-and-capability-bound-actions.md).

- BusinessRule e ImpactAnalysis tipados en Artifact 1.1.0, preservando 1.0.0,
  snapshots, hashes y contratos previos. Reutiliza Requirement/criterios,
  OpenQuestion y Decision; no crea un segundo modelo de proyecto.
- Workflow declarativo y tres contratos de acciones de agente: analizar requisito,
  refinar redacción y sugerir criterios. Las salidas sólo son propuestas tipadas.
  Impact Analysis es cálculo determinista local sobre el grafo.
- Resolver del BA Capability Pack real: manifest, skill, siete playbooks,
  workflow, políticas, rúbricas y contexto. Vincula todo el contenido consumido;
  faltantes y bindings de proyecto contradictorios se rechazan.
- Gate BA de aprobación humana exacta sobre el journal existente, con bloqueos
  transitivos y receipt de contexto antes/después. Revalida al consumir.
- Ejemplos sintéticos de regla e impacto, documentación de uso y límites.

La detección de `documentation` como prosa Dev dentro del catálogo BA se resolvió
excluyéndola de las acciones Workspace sin alterar el pack legacy. El texto de Miro
es contexto opcional de colaboración, no permiso ni obligación de usar Miro.
Los siete playbooks se exigen como conjunto acotado de referencias de orientación;
no se afirma resolución recursiva de cualquier Markdown personalizado.

## Validación local

| Comprobación | Resultado |
|---|---|
| TypeScript estricto artifact-model, capability-model y project-model | Correcto |
| `npm run test:unit -w @specdd/artifact-model` | 80/80: 29 BA + 25 Phase 1 + 26 Phase 2 |
| `npm run test:unit -w specforge-wizard` | 27/27 |
| Tests compilados Capability Model / Project Model | 8/8 y 12/12 |
| Total de unit/regresiones ejecutadas | 127/127 |
| esbuild browser + Chromium headless, sin tráfico externo | Hashes de solicitud/propuesta idénticos a Node, 0 warnings |
| `node packages/artifact-model/examples/ba-impact.mjs` | Draft determinista y verificación de base correctos; sin escrituras |
| `npm ci --dry-run --offline --ignore-scripts --no-audit --no-fund` | Exit 0; sólo simulación, sin instalación |
| Enlaces de documentación/package y whitespace | 94 referencias válidas; 40 archivos comprobados; `git diff --check` correcto |

Se probaron versiones/payloads inválidos, migración, revisiones y proveniencia,
refs inventadas, scope de acciones, intento de añadir aprobaciones/respuestas,
atribución no-agente, paths inseguros, contenido/dependencias ausentes, drift del
proyecto/capacidad/grafo/lifecycle, cronología, copia defensiva, gate transitivo,
receipt alterado, regla no aprobada, prerequisito retirado y binding deshabilitado.

La corrida inicial encontró una atribución incorrecta en un fixture que resolvía
una pregunta creada por un agente; se corrigió a human-edited-agent-proposal, sin
debilitar la validación. El runner de Node encontró inicialmente `spawn EPERM` en
sandbox; las suites finales corrieron fuera de ese límite local con aprobación.
Las pruebas de fallback remoto del Wizard simulan fetch: no fueron una integración
de red. No se ejecutó CI alojado ni se declara una ejecución real del agente BA.

## Límites y siguiente paso

Dominio portable, no producto UI operativo todavía. Resolver/validar una propuesta
no la acepta como decisión humana ni demuestra su verdad. Ninguna acción responde
preguntas, aprueba, escribe specs, instala capacidades o ejecuta comandos.
Solicitudes sin binding se identifican como no registradas; todas llevan
executionAuthorized=false. Phase 4 deberá exigir registro y autoridad de ejecución.

Receipts y journals son atestaciones del host, no firmas ni autenticación. Se debe
persistir artefacto/receipt atómicamente y comparar el estado previo antes de guardar.
El gate BA sólo acepta el registro approved exacto; activar/editar o cambiar el
grafo requiere una política explícita nueva, no reutilizar el receipt obsoleto.
El inventario del grafo delimita el análisis; no prueba ausencia de reglas omitidas.

Phase 4 sigue Planned: MVP BA con selección de proyecto preparado, lista/detalle,
edición, preguntas y revisión, persistencia local, ejecución real acotada con fallos
y cancelación, y aceptación observada por el usuario sin Git/IDE. Antes de construir
se definirá spec de persistencia, identidad local, runtime y aceptación de propuestas.
La proyección a SpecDD permanece en Phase 5. Se pausa aquí antes de Phase 4.
