# ADR SF-0006 — Dominio QA y límites de evidencia

Fecha: 2026-09-10. Implementación autorizada de Phase 6.

## Decisión

Extender el envelope existente con schema aditivo 1.2.0. Los cinco artefactos QA
comparten identidad, revisiones, provenance y journal con BA; no se crea un segundo
modelo ni se altera la lectura de 1.0/1.1.

Modelar `validates` como una relación semántica restringida, no como prueba de una
ejecución. TestScenario, TestCase y CoverageAssessment pueden validar Requirement;
otros pares fallan cerrados. La cobertura determinista refleja sólo diseño declarado,
con gaps visibles por criterio. No se agregan estados passed/failed hasta que una
fase con runtime defina receipts de ejecución verificables.

Separar observación de sugerencia. Un agente puede proponer diseño de prueba y
riesgos, pero no Defect ni evidencia. Defect requiere reproducción y referencias
hashadas aportadas por host/humano; su aprobación rechaza provenance agent-proposed.
La existencia y autenticidad externa de la evidencia siguen siendo responsabilidad
del host.

Consumir el Capability Pack QA existente por contenido exacto proporcionado. Los
playbooks de Playwright y testing son instrucciones de especialidad, no permisos de
ejecución. Los requests declaran `executionAuthorized: false` y todo output queda
como propuesta hasta adopción y revisión humana en una superficie futura.

## Consecuencias

Phase 7 puede construir una experiencia diaria sobre contratos estables sin prometer
un test-management suite. Aún no hay UI QA, persistencia, ejecución de tests, captura
de evidencia, integración CI/browser ni sign-off de release. Esos límites se muestran
como ausencia deliberada y no como capacidad parcial oculta.
