# Phase 5 — Proyección gobernada SpecDD: implementación y gate

Fecha: 2026-09-08. Autorización: «excelente vamos por la Phase 5 entonces».
Estado **Accepted**: implementación, regresiones y aceptación humana observada en
la UI completadas. Phase 6 no se inició automáticamente.

## Entrega

- Contrato y schema `SpecDDProjectionProposal`, `SpecDDCanonicalSpec` y
  `SpecDDProjectionReceipt` en `@specdd/artifact-model/projection`.
- Destino concreto del Harness `specs/<feature-slug>/spec.md`.
- Mapping determinista de requirement, criterios, preguntas resueltas, reglas y
  decisiones directas; gaps y tipos unsupported visibles.
- Diff de creación/reemplazo, subject exacto, graph/approval binding y base hash.
- Gate humano dentro del Workspace, canonicalización atómica, receipt, descarte y
  rechazo de replay/drift.
- Estado Workspace 1.1.0 con lectura compatible de snapshots Phase 4 1.0.0.
- UI para preparar, inspeccionar, confirmar o descartar sin escribir repositorios.

## Validación local

| Comando | Resultado |
|---|---|
| `npm run test:unit -w @specdd/artifact-model` | PASS, 86/86 |
| `npm run specforge:test` | PASS, 25/25 |
| `npm run specforge:test:ui` | PASS; flujo create/edit/analyze/adopt/resolve/approve/project/review/canonicalize/reload/fail/cancel/stale/XSS, desktop/móvil, 0 page errors |
| `npm run speccontrol:test` | PASS, 59/59 |
| `npm run build -w specdd-platform` | PASS, 5 rutas estáticas incluida `/specforge-workspace/` |

Los primeros runs dentro del sandbox que devolvieron `spawn EPERM` no son fallos
de producto; las suites se ejecutaron completas con el permiso local requerido.
El build conserva advertencias de deprecación de opciones Vite/React ya existentes,
sin errores ni impacto sobre las rutas generadas.

## Aceptación humana observada

El operador reutilizó el estado privado aprobado de Phase 4 y preparó la propuesta
`projection-828ea953-d67c-4be2-903d-0f42744b2a36`. Revisó el destino
`specs/cancelar-un-turno-piloto-sintetico/spec.md`, el diff de creación, los cinco
gaps explícitos, cero tipos no soportados y la trazabilidad completa.

El subject recalculado coincidió exactamente con
`b9db7422d403641d0d10dc2b841b100282b6436b3f65143d3406cb8559c7ca1b`.
La confirmación humana creó la revisión canónica 1 con contenido
`e3ed35bb0772cd81870cc089ed3df2682bc3893c43886024c3e3fd1d56dfc4bf`.
Después de F5 y volver a seleccionar el requisito, la propuesta siguió `Aplicada`
y el mismo canonical reapareció con igual path, revisión y hash.

La revisión humana también observó que el Summary original conserva «No conocemos
todavía…» pese a las respuestas posteriores. Esto es fidelidad al requisito
aprobado, no síntesis silenciosa. El artefacto sintético se aceptó para probar el
flujo, permanece `partial` y no se considera listo para implementación.

## Límites y próximo gate

No se creó ni modificó ninguna spec de un checkout, no se usó agente, red, Git,
GitHub, PR ni deploy. El canonical vive en SQLite y el mapping parcial no autoriza
planificación o implementación.

Phase 5 está aceptada. Se pausa aquí; Phase 6 — dominio QA — requiere autorización
independiente.
