# Phase 4 — MVP BA local: implementación y gate de aceptación

Fecha: 2026-09-07. Autorización: «excelente, vamos con Phase 4 entonces».
Estado **Accepted** desde 2026-09-08: implementación, piloto real acotado y recorrido
humano observado completados. Phase 5 no se inició automáticamente.

Actualización posterior: [preflight real detenido](phase-4-preflight.md) por
discrepancia del protocolo de permisos, antes de ejecutar el modelo. Las pruebas
simuladas de esta entrega no acreditan enforcement del runtime instalado.

## Entrega

- [Paquete Workspace](../../../packages/specforge-workspace/README.md),
  [spec](../specs/phase-4.md), [ADR](../adrs/0004-local-ba-workspace.md) y
  [guía para operador y BA](../usage.md).
- Servicio loopback separado y UI de BA: proyecto preparado, requisitos, edición
  de criterios, análisis/refinamiento, preguntas, reglas, propuestas seleccionables,
  revisión exacta e historial. Entrada desde el portal sin sustituir el Builder.
- SQLite con CAS, snapshots históricos/hash chain, lease de proceso y escritura
  atómica de artefactos/decisión de propuesta/receipt. Reconciliación de ejecución
  interrumpida sin retry. Propuestas y revisiones intermedias de agente preservadas.
- Adaptador BA opt-in sobre transporte estructurado existente, con directorio
  vacío por ejecución, read-only restringido y configuración text-only adicional.
  El workflow Developer/Reviewer de SpecControl no se ejecuta para BA.
- Sesión bootstrap de un uso, Host exacto, cookie/Origin/CSRF, CSP, sin CORS,
  errores acotados, consentimiento por acción, timeout y cancelación terminal.
- Job CI agregado para pruebas del Workspace y E2E con runtime simulado. No corrido
  en GitHub en esta entrega: no hubo commit/push ni instalación de dependencias.

## Evidencia local

Entorno: Windows, Node 24.16.0 y dependencias/caché de Chromium ya disponibles.
Los tests que crean procesos/servidores locales necesitaron permiso fuera del
sandbox del runner. No hubo agente BA real ni acceso a Bloom.

| Validación ejecutada | Resultado |
|---|---|
| `npm run specforge:test` | 21/21; build de tipos incluido |
| `npm run specforge:test:ui` | PASS con runtime **SIMULADO**, escritorio 1440 px y móvil 390 px, sin overflow horizontal ni errores de página |
| `npm run speccontrol:test` | 46/46; defaults del transporte y flujos anteriores preservados |
| `npm run test:unit -w @specdd/artifact-model -w specforge-wizard` | 80/80 y 27/27 |
| Total tests de servicio/dominio/regresión | 174/174, más el recorrido UI |
| `npm run build -w specdd-platform` | PASS; cinco rutas, incluido `/specforge-workspace` |
| `npm ci --dry-run --offline --ignore-scripts --no-audit --no-fund` | Exit 0; simulación, no instalación |
| Enlaces Markdown locales y whitespace | 141 referencias en 22 documentos válidas; `git diff --check` correcto |

El build del portal informa deprecaciones existentes de opciones esbuild del plugin
React/Vite; no impiden compilar y no se actualizaron dependencias para ocultarlas.
No se afirma haber ejecutado toda la regresión de los otros wizards ni CI remoto.

El E2E crea pedido sintético, verifica guardado y protección de ediciones pendientes,
analiza con mock explícito, incorpora candidatos, bloquea aprobación, responde como
humano de fixture, aprueba regla/requisito, recarga, prueba error y cancelación,
rechaza interpretación HTML y demuestra invalidación tras editar. Las capturas
están en `.specforge-workspace/evidence/ba-workspace-desktop.png` y
`ba-workspace-mobile.png` (evidencia local ignorada por Git, inspeccionada visualmente).
No son una aceptación realizada por Marcos ni un resultado de un modelo real.

Las regresiones también cubren CAS concurrente, persistencia de run contra versión
obsoleta, propuesta stale, selección parcial, descarte, entradas extra, runtime sin
configurar/consentimiento, respuestas inválidas, salida tardía, timeout, reinicio,
lease, corrupción/schema desconocido y fronteras HTTP. La sincronización del
guardado/diálogo y el cierre idempotente se ajustaron durante esas pruebas; la
última corrida es la informada arriba, no las corridas fallidas intermedias.

## Límites reales

- Un operador con identidad local declarada; no SSO, usuarios concurrentes ni RBAC.
- Proyectos preparados: no onboarding autónomo del BA ni escaneo/importador de
  repositorios. El contexto no se rellena con supuestos.
- Runtime deshabilitado por defecto. Configuración efectiva, hooks heredados,
  compatibilidad del sandbox y herramientas del ejecutable instalado deben
  verificarse antes del piloto. Los mocks no validan esas fronteras del proveedor.
- Estado en texto plano y snapshots acotados a 2.000.000 bytes por valor; sin poda
  automática ni migración desde stores desconocidos. Hashes no son firmas ni
  protección frente a un atacante con escritura completa de la base.
- La UI ofrece relaciones derivadas de adopción y lectura de impacto conocido,
  no editor libre de grafo/decisiones ni afirmación de completitud del negocio.
- Approval exacto sobre contenido/contexto registrado, no verdad de negocio ni
  aprobación de una futura spec. Cambios del grafo pueden invalidar receipts.
- Sin proyección SpecDD, QA/PM/UX diarios, publicación, repositorios, PR o deploy.

## Pausa y siguiente autorización

Los gates técnicos y humanos de Phase 4 están completos. El siguiente paso es pedir
autorización separada para Phase 5 — proyección gobernada SpecDD.

Se conservaron los cambios locales de Phases 0–3. No se hizo commit/push de ninguna
fase ni se modificaron Bloom o sus workspaces privados. La consulta de documentación
oficial del runtime está justificada y referenciada en el ADR; no fue un envío de
contexto de negocio al proveedor.

Actualización de aislamiento: [overrides e inventario BA](phase-4-config-isolation.md)
implementados y probados offline tras el segundo preflight. La aceptación real sigue
pendiente; no se ejecutó un modelo ni se inició Phase 5 con esta corrección.

Preflight intermedio: [configuración y thread verificados; bloqueo del backend
Windows unelevated](phase-4-host-preflight.md). En ese punto la regresión era 59/59
SpecControl y 22/22 Workspace y aún no había turno real; el piloto y la aceptación
posteriores cerraron ese bloqueo.

Actualización final 2026-09-08: el [piloto BA real sintético](phase-4-real-pilot.md)
persistió una propuesta válida en `ready`, con request/proposal/receipt enlazados.
El usuario completó luego selección, respuestas, criterios y aprobación exacta;
Phase 4 quedó aceptada.
