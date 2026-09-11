# Evidencia — Phase 8 PM Read Model

Fecha: 2026-09-11
Estado: **Accepted locally — human gate completed**

## Implementación local

- read model PM puro, derivado y sin persistencia;
- Project Health / Release Readiness y detalle por feature;
- preguntas, bloqueos, estado QA, aprobaciones, riesgos, defectos y dependencias;
- evidence links con ID, revisión y SHA-256;
- estados honestos `unknown|partial|blocked`, sin `ready` ni pass/fail;
- vista responsive de sólo lectura integrada al selector de roles.

## Verificación automatizada

- `npm run specforge:test`: **29/29 PASS**.
- `npm run specforge:test:ui`: **PASS**, Chromium desktop/mobile, cero page errors.
- El test prueba estados desconocido, bloqueado y parcial, exactitud de hashes, no
  mutación al leer, ausencia de `passed`, navegación PM y ausencia de formularios.

El runtime del E2E es **SIMULADO**. Las capturas y pruebas no sustituyen el gate
humano ni demuestran readiness real.

## Gate humano completado

El usuario recorrió Product Management en la instancia real y verificó una feature
con readiness `partial`, cobertura QA aprobada `1/1` bajo
`declared-design-only`, ejecución desconocida, cero preguntas, cero bloqueos, una
aprobación fuera de vigencia, un riesgo y un defecto. Inspeccionó los evidence links
revision-bound del Requirement, CoverageAssessment, Defect, QualityRisk, TestCase y
TestScenario.

Después de F5 y de volver a seleccionar la feature, confirmó que el estado, los
contadores y los enlaces permanecieron iguales. La vista no afirmó pass/fail ni
release ready. No se hizo commit, push o deploy de Phase 8 ni se inició Phase 9.
