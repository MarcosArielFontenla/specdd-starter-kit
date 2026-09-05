# SpecControl — plan de puesta en operación local

Fecha: 2026-09-05. Estado: **completo y aceptado con alcance local acotado**.
O0–O5 y el cierre O5-D están ejecutados; la publicación real terminó en una draft PR,
sin merge ni deploy.
Evidencia: [preflight O1](../../control-plane/phases/local-operation-o1-preflight.md)
, [pausa persistente O2](../../control-plane/phases/local-operation-o2-persistent-pause.md)
y [ejecución local O3](../../control-plane/phases/local-operation-o3-execution.md).

1. **DISCOVER / MODEL / SPEC — realizado:** contrastar portal, contratos de grafo,
   eval e historial; inspeccionar el candidato externo en modo lectura. Redactar
   [spec](../specs/2026-09-05-speccontrol-local-operation-design.md) y
   [ADR](../../control-plane/adrs/0014-local-operation-boundary.md).
2. **REVIEW — aprobado:** el usuario aprobó límites, flujo fijo, seguridad mínima y
   secuencia. No confundir inicio de la evolución con aprobación de una tarea aún
   desconocida en el proyecto externo.
3. **O1 — completo (alcance acotado):** inventariar herramientas y versiones; estudiar documentación
   oficial del runtime candidato; demostrar invocación, recibos, cancelación y
   restricciones en fixture propio. Comparar almacenamiento existente adecuado
   para recuperación y elegirlo mediante ADR/evidencia, sin construir un scheduler.
4. **O2 — completo:** implementar bindings/versiones, registro explícito de
   proyecto, journal transaccional, protocolo local autenticado y UI mínima de
   estados/aprobación. Tests negativos antes de conectar permisos de escritura.
5. **O3 — completo:** conectar roles, reviewer separado, checks estructurados,
   límites de tiempo/consumo y exports canónicos. Inyectar crash y fallos; rechazar
   contratos no soportados antes de cualquier efecto.
6. **O4 — completo:** gate web exacto, contrato, inspección Git,
   publicación contra bare remote local y casos de fallo/replay validados offline.
   C1 agregó adaptador/reconciliación; C2-A agregó transporte acotado, preparación
   Git y wiring. B1 verificó acceso read-only; el piloto O5 ejerció después el
   publicador real con autorización específica y reconciliación fail-closed.
7. **O5 — completo:** Bloom recorrió Planner, aprobación exacta, Developer aislado,
   Reviewer separado, 66 tests de dominio, aprobación de publicación, recuperación
   de un fallo pre-head y una draft PR exacta. El CI integral conserva un fallo de
   integración ya presente en `master`; no hubo merge ni deployment.
8. **VALIDATE / DOCUMENT — completo:** regresión de paquetes, builds y wizards; E2E servicio/UI,
   pruebas de recuperación/seguridad y evidencia real. Actualizar guía y tracker con
   capacidades observadas y límites, nunca declarar producción por tests unitarios.

No se crea una issue, PR, push o deploy durante diseño. No se cambia el esquema ni
se instalan dependencias de runtime en O0. El proyecto piloto no necesita copiarse
dentro del monorepo ni convertirse en Node para usar el Harness.
