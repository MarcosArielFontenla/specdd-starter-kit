# SpecForge Workspace — seguimiento independiente

Actualizado: 2026-09-10. Este tracker corresponde al
[roadmap de SpecForge](../../SpecForge%20Workspace%20Evolution%20%E2%80%94%20Agentic%20Role%20%26%20Artifact%20Platform%20Roadmap.md),
no a las fases ya aceptadas del control plane. No reinicia ni cambia su aceptación.

Estados: Planned, In Progress, Partial, Accepted, Deferred. Una entrega documental
preparada para revisión no implica aceptación humana del diseño ni autorización de
todas las fases posteriores.

| Phase | Estado | Spec / alcance | Implementación | Tests | Acceptance |
|---|---|---|---|---|---|
| 0 — Baseline y límites | Accepted | [Auditoría](phases/phase-0.md) | Descubrimiento entregado | Baseline registrado | Aceptación del usuario al indicar continuar Phase 1, 2026-09-07 |
| 1 — Artifact Model | Accepted | [Spec](specs/phase-1.md) y [ADR](adrs/0001-artifact-revisions-and-ownership.md) | Implementación local terminada | [Evidencia](phases/phase-1.md) | Aceptación del usuario al indicar continuar Phase 2, 2026-09-07 |
| 2 — Graph y traceability | Accepted | [Spec](specs/phase-2.md) y [ADR](adrs/0002-revision-bound-artifact-graph.md) | Implementación local terminada | [Evidencia](phases/phase-2.md) | Aceptación del usuario al indicar continuar Phase 3, 2026-09-07 |
| 3 — Dominio BA | Accepted | [Spec](specs/phase-3.md) y [ADR](adrs/0003-ba-domain-and-capability-bound-actions.md) | Implementación local terminada | [Evidencia](phases/phase-3.md) | Aceptación del usuario al indicar continuar Phase 4, 2026-09-07 |
| 4 — MVP BA | Accepted | [Spec](specs/phase-4.md) y [ADR](adrs/0004-local-ba-workspace.md) | UI local, SQLite y adaptador opt-in implementados | [Evidencia](phases/phase-4.md), piloto real y E2E simulado | Piloto real más aprobación humana observada, 2026-09-08 |
| 5 — Proyección SpecDD | Accepted | [Spec](specs/phase-5.md) y [ADR](adrs/0005-governed-specdd-projection.md) | Contrato, mapping, diff, gate y canonical local implementados | [Evidencia](phases/phase-5.md) | Aceptación humana observada y persistencia tras F5 verificadas; pausar antes de Phase 6 |
| 6 — Dominio QA | Accepted | [Spec](specs/phase-6.md) y [ADR](adrs/0006-qa-domain-and-evidence-boundaries.md) | Contratos, capability, coverage y gate publicados en `main` | [Evidencia](phases/phase-6.md) | Aceptación humana, commit `bfb2914` y CI 18/18 verde, 2026-09-10; Phase 7 no iniciada |
| 7 — MVP QA | Planned | Flujo QA operativo | No iniciada | Pendientes | Validación con usuario QA |
| 8 — Lectura PM | Planned | Readiness derivada de evidencia | No iniciada | Pendientes | Desconocido/parcial/bloqueado explícitos |
| 9 — Dominio UX | Planned | Brief/flow/interacción/accesibilidad/decisión | No iniciada | Pendientes | Contratos y capacidad, sin Figma obligatorio |
| 10 — Cross-role | Planned | Handoffs, queue, decisiones y relaciones | No iniciada | Pendientes | Recorrido trazable entre roles |
| Integraciones y colaboración avanzada | Deferred | Tracks opcionales del roadmap | No iniciada | No aplica aún | Dependen de valor demostrado |

## Ajustes recomendados con evidencia

Los preflights de Phase 4 del 2026-09-07 se detuvieron antes del modelo por contrato
de permisos y configuración heredada. Se conservan como evidencia histórica en
[primer preflight](phases/phase-4-preflight.md) y
[segundo preflight](phases/phase-4-preflight-r2.md). La corrección, el aislamiento
por proceso y el backend elevado fueron validados después; el piloto real y la
aceptación humana del 2026-09-08 reemplazan aquel estado operativo, no su evidencia.

1. **Onboarding:** para Phase 4 seleccionar un Project Definition preparado. La
   creación desde cero necesita resolver campos de Harness/dominios exigidos por
   el modelo actual; no rellenarlos con hechos ficticios. Mantenerlo como decisión
   explícita antes de prometer «crear proyecto» a un BA.
2. **Taxonomía:** Phase 1 define contrato mínimo y Phase 3 profundiza reglas BA;
   evitar implementar dos veces Requirement/AcceptanceCriteria. La división de
   payloads propuesta está en [piloto](ba-pilot.md).
3. **Capacidades:** resolver en Phase 3 el conocimiento alojado en `roles.js`, paths,
   dependencias de contexto y referencias cruzadas de playbooks. Mantener los
   packs existentes y sus subagentes inactivos compatibles.
4. **Grafos:** separar relaciones de artefactos del DAG de ejecución SpecControl.
   Una relación semántica no es una transición que ejecuta un agente.
5. **Approval:** reutilizar patrones de hash/preimage/journal; los stores actuales
   tienen dominios específicos. La identidad local atestada debe declararse como
   tal y la edición posterior debe producir revisión nueva.
6. **Proyección:** elegir un destino SpecDD concreto en Phase 5. Los criterios BA
   no generan por sí mismos comandos de aceptación; los faltantes deben verse
   como mapping parcial, sin promoverlos silenciosamente a spec aprobada.
7. **Piloto real:** mock útil para pruebas, pero la aceptación de Phase 4 requiere
   acción BA real. No exigir ejecutar el workflow de implementación de SpecControl.
8. **UX:** Phase 9 entrega dominio, no un MVP UX completo. Phase 10 debe definir si
   su handoff UX se prueba con artefactos importados o requiere una superficie UI
   pequeña; no declarar un workspace UX completo por haber creado schemas.
9. **Tests por fase:** aplicar schema/lifecycle/migration/graph/projection/UI según
   el alcance real. Phase 0 aporta inventario y baseline; no inventar tests de
   migración o proyección de componentes todavía inexistentes.

El orden 0–10 se conserva. Estos ajustes precisan alcance y criterios de salida,
sin agregar plataforma multiusuario, integraciones externas ni ejecución de deploy.

Estado operativo Phase 4: **Accepted**. Los preflights fallidos se conservan como
evidencia histórica; el backend elevado, aislamiento, contrato y receipt fueron
verificados en el intento real exitoso. El usuario completó después el recorrido
selectivo y la aprobación exacta documentados en
[Phase 4 real pilot](phases/phase-4-real-pilot.md).

Actualización Phase 5: destino concreto `specs/<slug>/spec.md`, propuesta portable,
mapping parcial explícito, diff/base hash, descarte y canonicalización local ya
implementados. Falta la aceptación humana observada antes de marcarla Accepted.
