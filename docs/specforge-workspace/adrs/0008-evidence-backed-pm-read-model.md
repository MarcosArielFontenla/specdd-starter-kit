# ADR 0008 — Read model PM derivado y sin autoridad de escritura

Estado: Accepted
Fecha: 2026-09-11

## Decisión

Agregar al Workspace una vista PM de sólo lectura derivada en cada consulta desde
los artefactos, el grafo, las specs canónicas y los receipts BA/QA existentes. No se
persiste un veredicto PM ni se crea una nueva lifecycle authority.

La readiness usa únicamente `unknown`, `partial` y `blocked`. `blocked` exige un
bloqueo explícito del grafo; `unknown` expresa falta de evidencia evaluable; y
`partial` indica evidencia incompleta. Coverage `declared-design-only` nunca se
convierte en ejecución, pass/fail o autorización de release.

## Razones

El valor inicial para PM proviene de agregar evidencia de BA y QA, no de duplicarla
ni de editarla. Persistir un resumen derivado permitiría que quedara obsoleto y
agregaría una aprobación nueva que Phase 8 no autoriza.

## Consecuencias

Cada evidence link conserva proyecto, artifact ID, revisión y SHA-256. La lectura
puede cambiar cuando cambia el grafo sin mutar el journal. Aun con cobertura de
diseño completa, la readiness máxima en esta fase es parcial porque el Workspace no
dispone de evidencia de ejecución.
