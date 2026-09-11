# Phase 7 — QA Workspace MVP

Autorización: «Autorizo comenzar Phase 7 e implementar localmente el QA Workspace
MVP sobre el dominio QA aceptado, sin realizar deploy y deteniéndose en el gate
humano correspondiente».

## Objetivo y alcance

Dar a QA una superficie diaria local sobre requisitos aprobados: selección y
asignación, escenarios, casos, sugerencias, cobertura declarada, riesgos, defectos,
revisión y aprobación. Reutilizar SQLite, CAS, journal, sesión loopback y runtime
opt-in del Workspace BA. No construir gestión integral de pruebas.

## Reglas de verdad

- Una spec de trabajo QA es un Requirement `approved|active` con criterios reales.
- Las propuestas del agente permanecen separadas y sólo pueden aportar gaps,
  escenarios, casos o riesgos. La adopción selectiva crea borradores revisionados.
- CoverageAssessment se deriva localmente de relaciones `validates` y siempre se
  muestra como `declared-design-only`; no afirma ejecución, pass/fail ni cobertura
  de código.
- Defect sólo nace de una acción humana y exige reproducción más evidencia
  `log|screenshot|report|run` con SHA-256. El portal no fabrica el hash ni observa
  el fallo por sí mismo.
- Cada artefacto QA pasa a `under-review` y usa el subject/receipt exacto de Phase 6.
  Cualquier cambio del grafo deja fuera de vigencia el receipt anterior.

## Límite

No hay test runner, CI, browser automation, ejecución de comandos, repositorio,
publicación, asignaciones multiusuario, campañas, suites, planes, calendario,
métricas históricas, attachments gestionados ni integración externa. Las referencias
de evidencia son metadatos; la disponibilidad y retención del objeto indicado siguen
siendo responsabilidad del operador.

## Gate

Antes de aceptar Phase 7, un humano debe recorrer el piloto QA local: abrir la spec
aprobada, asignarla, revisar/adoptar una propuesta, registrar un caso, recalcular
cobertura, registrar un defecto evidenciado, revisar el subject de un artefacto QA,
aprobar y confirmar persistencia después de recargar. La regresión automatizada usa
runtime simulado y no reemplaza ese gate.

Resultado: **cumplido el 2026-09-10**. El subject QA exacto aprobado fue
`bcb26b968338cedf0f91b4e20d2f9b7fc4c4daa7e19a31c53a9546be7a6cf731`; el estado
y su aprobación vigente persistieron después de F5. Un defecto visual de severidad
baja quedó evidenciado y no afecta la integridad del flujo. Su causa fue corregida
localmente y quedó cubierta por una regresión E2E desktop/mobile con recarga.
