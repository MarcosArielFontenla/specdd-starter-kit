# Phase 6 — QA Workspace Domain

Autorización: «si comenza con la Phase 6 tranquilamente». Alcance local y portable;
sin UI QA, persistencia QA, test runner, browser, repositorio, integración externa,
Phase 7 ni deploy.

## Contratos

Agregar Artifact `1.2.0` de forma aditiva sobre 1.0/1.1, sin reinterpretar hashes:
TestScenario, TestCase, CoverageAssessment, QualityRisk y Defect. Todo contenido es
estricto y revisionado. Defect exige reproducción y evidencia con hash; no puede
nacer de un actor agent.

Habilitar `validates` exclusivamente desde TestScenario, TestCase o
CoverageAssessment hacia Requirement. Mantener `implements` cerrado. Escenarios y
casos referencian IDs reales de criterios del único Requirement aprobado enlazado.
Riesgos y defectos deben relacionarse con al menos un Requirement vigente aprobado.

CoverageAssessment enumera cada criterio del Requirement y sus TestCases declarados,
incluidos los vacíos. Su alcance `declared-design-only` no significa ejecución,
resultado, cobertura de código ni sign-off.

## Acciones y capability

Resolver el Capability Pack `role-qa`, workflow `specforge-testcases`, playbooks,
rubric y contexto desde bytes provistos por el host. Playwright es conocimiento
condicional; su presencia no autoriza herramientas. Vincular request a run, proyecto,
requirement aprobado, grafo y capability exactos.

Acciones agent: analizar spec aprobada, sugerir escenarios, sugerir casos y evaluar
riesgos. Las salidas son propuestas tipadas. No admitir defectos, evidencia,
resultados, aprobaciones, automatización afirmada ni referencias inventadas.
Coverage es cálculo determinista local.

## Gate y aceptación

Gate exacto humano para artefactos QA under-review, con subject de artefacto+grafo,
receipt before/after y replay. Rechazar drift, actores no humanos, blockers, links
ausentes, criterios desconocidos, requirements no aprobados y defectos sin evidencia.

Acceptance de Phase 6: schemas, API portable, integración con capability real,
relación a requirements, cobertura honesta, regresiones positivas/negativas, ADR,
documentación y pausa antes de Phase 7.
