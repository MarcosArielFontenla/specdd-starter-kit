# Evidencia — Phase 7 QA Workspace MVP

Fecha: 2026-09-10
Estado: **Accepted locally — human gate completed**

## Entregado

- selector BA/QA en el portal local y lectura de specs aprobadas/asignables;
- registro de TestScenario, TestCase, QualityRisk y Defect con contratos Phase 6;
- propuestas QA separadas, consentimiento por acción, adopción o descarte humano;
- CoverageAssessment determinista y etiqueta visible `declared-design-only`;
- review y aprobación QA exacta con receipt vigente/fuera de vigencia;
- persistencia schema 1.2, binding QA exacto y reinscripción fail-closed;
- continuidad de sesión loopback, CAS, journal, recuperación y sanitización.

## Verificación automatizada local

- `npm run test:unit -w @specdd/specforge-workspace`: **28/28 PASS**.
- `node --experimental-sqlite packages/specforge-workspace/scripts/verify-ui.mjs`:
  **PASS**, Chromium desktop/mobile, cero page errors. Runtime **SIMULADO**.
- El E2E cubre BA, proyección SpecDD y QA: asignar, sugerir, adoptar, revisar,
  aprobar, crear caso, recalcular cobertura, registrar defecto, recargar, además de
  fallo, cancelación y renderizado XSS seguro.
- La regresión del defecto visual comprueba que el ID y la descripción del criterio
  conservan nodos separados, no se superponen y permanecen separados después de F5.

Esto no demuestra una ejecución real de tests ni una acción QA con modelo real. Las
capturas locales son evidencia de regresión, no aceptación humana.

## Gate humano completado

El usuario completó el recorrido observado el 2026-09-10 con el operador local
`Marcos Ariel Fontenla`: creó y aprobó un Requirement sintético, aplicó su proyección
SpecDD, asignó la spec a QA y registró TestScenario, TestCase, QualityRisk y Defect.
El defecto se respaldó con una captura preservada en el estado privado y SHA-256
`bd15d68bef53c8e80fd508978ed29cbc86e725f6c7dc3e1b1542f0a08f74e354`.

CoverageAssessment enumeró el criterio
`ac-30073af6-5eeb-44d2-a561-b4f4806582c8`, enlazó el TestCase revisión 1 y mantuvo
`scope: declared-design-only`. El humano revisó y aprobó el subject exacto
`bcb26b968338cedf0f91b4e20d2f9b7fc4c4daa7e19a31c53a9546be7a6cf731`.
Después de F5, la UI mostró `Aprobado · revisión 1 · aprobación vigente`; el journal
conservó `qa-request-review` versión 14 y `qa-approve` versión 15.

El recorrido descubrió un defecto visual real de severidad baja: el ID del criterio
y la palabra `Dado` aparecían concatenados. Quedó registrado como Defect borrador con
evidencia. La causa —aplanar las tarjetas a `textContent` al renderizar el detalle—
se corrigió localmente conservando la estructura semántica y separación visual. La
regresión E2E desktop/mobile, incluida la recarga, pasó; el registro original se
conserva como evidencia histórica. Después de reiniciar el servidor local —que
carga los assets UI en memoria al arrancar—, el usuario confirmó visualmente en la
instancia real que el ID y `Dado` aparecen en bloques separados.

No se realizó commit, push o deploy ni se inició Phase 8.
