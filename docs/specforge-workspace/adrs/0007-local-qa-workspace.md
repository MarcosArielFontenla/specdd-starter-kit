# ADR 0007 — QA Workspace local sobre el grafo compartido

Estado: Accepted
Fecha: 2026-09-10

## Decisión

Extender el servicio local de SpecForge con una vista por rol QA y persistir los
artefactos QA de Phase 6 en el mismo proyecto, journal y grafo de artefactos que BA.
Registrar el Capability Pack QA exacto junto al BA; elegir la capacidad por acción
en el host y conservar consentimiento, CAS, aislamiento y proposal-only.

El estado `1.2.0` agrega `qaCapability`, asignaciones, receipts y decisiones de
adopción. Los estados 1.0/1.1 siguen legibles; habilitar QA exige un bundle preparado
con binding QA exacto y no se infiere una capacidad ausente.

## Razones

Un store paralelo rompería la relación revision-bound entre requisito, criterio y
diseño QA. Un test manager completo duplicaría herramientas externas antes de
validar valor. La misma superficie local permite un piloto falsable manteniendo
autoridades distintas: BA aprueba intención; QA diseña, evidencia y aprueba sus
artefactos; el agente sólo propone.

## Consecuencias

Agregar o revisar nodos puede invalidar receipts ligados al snapshot, lo cual se
muestra explícitamente. Modificar un Requirement que ya tiene referencias QA exactas
requiere en una fase futura un flujo gobernado de rebase/supersession; el MVP falla
cerrado en lugar de retargetear relaciones silenciosamente. La identidad del operador
sigue siendo local declarada, no autenticación corporativa.
