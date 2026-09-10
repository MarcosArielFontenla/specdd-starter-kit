# ADR SF-0005 — Proyección portable antes de integración con repositorios

Fecha: 2026-09-08. Scope: Phase 5.

## Decisión

Proyectar un requirement BA aprobado a un `SpecDDProjectionProposal` puro y
portable, con destino `specs/<slug>/spec.md`. Una segunda operación humana exacta
crea `SpecDDCanonicalSpec` y su receipt dentro del Workspace. No escribir el
filesystem ni Git desde esta fase.

La propuesta fija la revisión BA, el receipt de aprobación, el snapshot completo
del grafo, el contenido base y el contenido candidato. El mapping informa por
separado lo determinístico, incompleto y no soportado. El canonical conserva todas
esas referencias y una cadena de hashes de contenido por path.

## Motivos

- Se puede revisar el resultado completo sin otorgar permisos sobre repositorios.
- El hash base hace visible el reemplazo y detecta TOCTOU/drift.
- El mapping parcial evita convertir ausencia de contexto en hechos ficticios.
- El receipt permite verificar la decisión sin confundirla con autenticación.
- El formato coincide con la spec real del Harness y no introduce otra taxonomía.

## Alternativas rechazadas

- Escribir directamente al presionar «proyectar»: omite propuesta, diff y gate.
- Generar sólo Markdown: pierde identidad, gaps y trazabilidad verificable.
- Completar gaps con un LLM: mezcla transformación con inferencia no aprobada.
- Mutar la spec externa desde el servicio local: amplía permisos y hace ambiguo el
  límite entre Workspace y repositorio.

## Consecuencias

Phase 5 entrega un canónico local portable, no una publicación. Una integración
posterior deberá verificar nuevamente base/path/subject y obtener su propia
autorización. El mapping puede quedar `partial`; QA o implementación no deben tratar
ese estado como readiness completa.
