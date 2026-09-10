# Phase 5 — Proyección gobernada a SpecDD

Autorizado: «excelente vamos por la Phase 5 entonces». Implementar una frontera
explícita entre artefactos BA aprobados y una spec SpecDD; detenerse antes de Phase 6.

## Contrato y destino

El destino concreto es `specs/<feature-slug>/spec.md`, compatible con el Harness.
La proyección produce primero `SpecDDProjectionProposal`: source BA revisionado,
receipt BA, snapshot del grafo, contenido completo, hash, base canónica, diff y
reporte de mapping. No escribe archivos ni repositorios.

El mapping determinista cubre summary, requisito funcional, criterios
Dado/Cuando/Entonces, preguntas directas resueltas, reglas/decisiones directas
aprobadas, datos disponibles del Project Definition y trazabilidad. Personas,
outcomes, NFR u out-of-scope ausentes permanecen como gaps explícitos; no se
inventan. Tipos relacionados sin mapping aparecen en `unsupported`.

## Gate humano y persistencia

La UI muestra contenido, diff, gaps, unsupported y subject exacto. Sólo la
confirmación de un humano local crea `SpecDDCanonicalSpec` dentro del store. El
receipt liga subject, source artifact, BA approval, graph snapshot, path, hash
anterior, hash aplicado, revisión, actor y hora.

Reemplazar un artefacto exige que el hash canónico actual coincida con
`baseContentSha256`; cualquier drift falla cerrado. Replay y subject incorrecto se
rechazan. Una propuesta puede descartarse, conservando evidencia. Editar el BA no
reescribe el artefacto canónico existente ni vuelve válida una propuesta anterior.

El estado 1.0.0 de Phase 4 sigue siendo legible y sólo se eleva a 1.1.0 ante una
mutación Phase 5. La carpeta SQLite continúa siendo privada y de un solo proceso.

## Límites

- El artefacto canónico es portable pero permanece en el store local; todavía no
  existe adaptador de filesystem, descarga, Git, PR ni publicación.
- `partial` significa mapping incompleto, no fallo ni permiso para implementar.
- El grafo provisto limita la trazabilidad; no prueba completitud del negocio.
- La identidad es localmente declarada, no autenticación ni firma.
- La proyección es una transformación mecánica; no invoca un agente.

## Acceptance

Probar contrato/schema, determinismo, mapping parcial, tipos unsupported, subject,
drift, replacement, tampering, receipt, migración, descarte, replay, persistencia,
recarga y UI desktop/móvil. La aceptación humana debe observar propuesta, diff,
gaps, confirmación y artefacto canónico sin repo/IDE. Phase 6 requiere autorización
separada.
