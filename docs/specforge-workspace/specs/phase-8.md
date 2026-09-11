# Phase 8 — PM Read Model

## Objetivo

Dar a PM una lectura agregada y verificable de Project Health / Release Readiness
sin construir autoría PM ni inventar completitud.

## Contrato de lectura

`SpecForgePMReadModel` deriva readiness por feature, preguntas abiertas, bloqueos,
estado QA, aprobaciones, riesgos, defectos, dependencias y evidence links con ID,
revisión y SHA-256.

## Semántica

- `unknown`: no existe evidencia suficiente para evaluar readiness.
- `partial`: existe evidencia de diseño, pero falta alguna señal necesaria.
- `blocked`: existe un bloqueo explícito y trazable en el grafo.

Phase 8 no emite `ready`, `passed` ni `failed`. La ejecución permanece `unknown`
porque el Workspace no ejecuta pruebas. Leer el panel tampoco cambia la versión del
proyecto ni su historial.

## Gate humano

Un humano debe abrir Product Management sobre el piloto real, contrastar los
contadores con BA/QA, inspeccionar una feature y sus evidence links, verificar que
la cobertura declarada no se presenta como ejecución y confirmar persistencia tras
F5.

Resultado: **cumplido el 2026-09-11**. El usuario confirmó readiness parcial,
cobertura aprobada 1/1 de diseño declarado, ejecución desconocida, señales y hashes
trazables, y persistencia después de recargar.
