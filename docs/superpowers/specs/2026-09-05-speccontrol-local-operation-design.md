# SpecControl — operación local, primer incremento

Fecha: 2026-09-05. Estado: **implementado y aceptado con alcance local acotado**.
O1–O5 y O5-D completaron el flujo hasta una draft PR real autorizada; merge y deploy
permanecen fuera de alcance.

## Contexto y objetivo

Las Phases 0–10 tienen aceptación acotada. El portal actual genera archivos; no
opera una fábrica. El usuario autorizó comenzar la siguiente evolución y ofreció
un proyecto privado como candidato al piloto. Esto no convierte pilotos anteriores
en ejecuciones del nuevo servicio ni autoriza producción, publicación o merge.

Objetivo de producto: operar desde la web un flujo real y recuperable, con un solo
proyecto, una ejecución activa por proyecto y un runtime reemplazable. El primer
resultado útil termina en una draft PR autorizada, no en deployment.

## Descubrimiento confirmado

- `platform/src/pages/` contiene index y los tres wizards, sin consola SpecControl.
- `@specdd/control-plane-model` valida definiciones; no ejecuta grafos ni políticas.
- `@specdd/run-history` aporta eventos y exports inmutables. `writeRun` publica un
  historial completo, no es un journal transaccional vivo ni un scheduler.
- El host local de evals ejecuta tests Node acotados, no comandos de cualquier stack
  ni agentes de coding; no constituye un sandbox.
- Los paquetes de benchmarks/propuestas se reutilizan después de obtener evidencia
  real. No son prerrequisitos para iniciar la primera tarea.
- El adaptador Warp genera configuración opcional; no proporciona ejecución local.

## Flujo propuesto

Tarea manual → Planner/spec y plan → aprobación humana → Developer → Reviewer
separado → checks/eval → aprobación de publicación → draft PR.

El plan forma parte del artefacto aprobado antes de implementar. Una revisión en
otra sesión no se presenta como auditoría humana independiente ni garantiza calidad.
Una devolución o un fallo detiene el incremento inicial: no se agrega un loop de
reparación autónoma. Una revisión nueva produce un intento explícito, con evidencia
y aprobaciones nuevas cuando cambia el objeto aprobado.

## Componentes y responsabilidades

1. **Consola `/speccontrol`:** proyecto registrado, tarea, estado de etapas,
   artefactos/diff, aprobación/rechazo, cancelación y evidencia. Renderizar contenido
   del repositorio como datos no confiables, nunca HTML o instrucciones de control.
2. **Servicio local separado:** coordina este flujo fijo, verifica gates y persiste
   transiciones. No convierte el servidor de desarrollo Astro en ejecutor de shell.
3. **Adaptador de ejecución:** recibe cwd permitido, rol, contexto aprobado, límites
   y referencias; expone start/status/cancel y recibos. Selección de proveedor fuera
   del contrato canónico. Rechaza políticas que no pueda hacer cumplir.
4. **Workspace y checks:** copia aislada, revisión Brownfield y Harness instalado,
   comandos estructurados/allowlist, datos sintéticos, sin secretos heredados.
5. **Publicación GitHub:** componente separado y autorizado por acción. Verifica
   destino, base, diff y commit; no concede credenciales de publicación al Developer.

Reutilizar contratos de proyecto, capabilities, grafo, evals e historial. Agregar
bindings operativos separados con versiones, sin reinterpretar un artifact node
como comando ejecutable. Admitir solamente el perfil documentado del workflow;
cualquier grafo, condición o política no soportada falla antes de ejecutar.

## Seguridad y persistencia mínimas

- API ligada a loopback; token efímero de sesión, Origin/Host estrictos, protección
  CSRF y sin CORS abierto. Loopback solo no autentica peticiones del navegador.
- Registro de raíz realizado por el operador; no aceptar cwd o shell arbitrario
  desde un formulario. Rechazar traversal, symlinks/junctions y raíces fuera de scope.
- Un worktree protege organización de cambios, no archivos del host ni red. El
  adaptador debe declarar y demostrar su aislamiento antes de código no confiable.
- Entorno de proceso mínimo; no heredar tokens GitHub, DB, correo o mensajería. La
  autorización de inferencia no concede red libre a los comandos del agente.
- Aprobación ligada a run, etapa, intento, commit base y hashes de spec/plan/diff,
  según la etapa. Rechazar replay, estado viejo y cambios posteriores.
- Persistir intención antes de lanzar un efecto; almacenar recibo y transición de
  forma consistente. Excluir escritores concurrentes. Elegir almacenamiento tras
  un spike de recuperación, no usar el export JSONL como base mutable.
- Tras un crash, reconciliar con el runtime. Si no se puede saber si una acción
  ocurrió, marcar `interrupted/needs-attention`: jamás relanzarla silenciosamente.
- PR y push con identificador de operación y reconciliación remota. Un timeout no
  demuestra que GitHub no recibió la operación. No prometer exactly-once externo.
- Cancelar debe comprobar que el proceso terminó; si no se puede, mostrar estado
  incierto y bloquear nuevos efectos. Los fallos y rechazos no se borran.
- Logs privados, acotados y con revisión/redacción antes de exportar. Nunca incluir
  código, identidad o recibos del proyecto privado en fixtures públicos por defecto.

## Incrementos y aceptación

| Incremento | Entrega | Gate verificable |
|---|---|---|
| O0 — diseño | Esta spec, ADR y plan | Revisión del alcance antes de código |
| O1 — viabilidad runtime | Spike aislado, protocolo y selección de almacenamiento/runtime | Proceso real, cancelación, límites y recuperación demostrados; mocks no cuentan como agente |
| O2 — pausa persistente | Servicio fijo hasta spec/plan y aprobación | Reiniciar no pierde la pausa; aprobación obsoleta/repetida rechaza |
| O3 — flujo local | Implementación, revisión y checks integrados | Cambio real aislado, fallo bloquea avance, evidencia completa y diff acotado |
| O4 — consola y draft PR | Operación desde web y publicación separada | E2E web, aprobación exacta y PR real autorizada sin merge/deploy |
| O5 — aceptación piloto | Repetición en proyecto externo autorizado | Baseline medido, recovery/cancel/fallo probados y limitaciones documentadas |

La UI se integra progresivamente desde O2; O4 no debe esconder una cadena operada
manualmente por el asistente. Se puede empezar con una tarea manual sin webhooks.

## Piloto externo y evidencia

El relevamiento del candidato queda en un archivo local ignorado para no publicar
información de un repositorio privado. No se clonó ni ejecutó el proyecto todavía.
Su documentación y manifests muestran checks utilizables, pero no demuestran que
pasen ni que el entorno local esté listo. Seleccionar tarea después del baseline:
un cambio pequeño, verificable y sin modificar auth, datos reales o infraestructura.

El piloto requiere revisión de scripts/dependencias y efectos de tests, SDKs reales,
base local descartable cuando aplique y bloqueo de notificaciones externas. Tests
omitidos por falta de infraestructura se registran como omitidos, no como aprobados.

## Decisiones pendientes antes de ejecución real

- Herramienta local disponible y método soportado de invocación no interactiva;
  autenticación/licencia y costo comprobados, sin asumir que una sesión de escritorio
  equivale a un backend programable o que la inferencia es gratuita.
- Mecanismo real de aislamiento compatible con esa herramienta y Windows.
- Almacenamiento y contrato de recuperación, elegidos en O1 con pruebas de crash.
- Copia/base del piloto, tarea concreta, checks y permisos mínimos revisados.

## Fuera de alcance

Deploy y adaptadores de infraestructura; acceso a servicios/datos de producción;
auto-merge; auto-modificación del Harness; multiusuario/multitenancy; scheduler
distribuido; editor universal de grafos; reemplazar Warp, GitHub Actions o construir
un motor genérico desde cero. Reutilizar un runtime existente detrás del adaptador.

## Cierre

O0 aprobado no implica software implementado. O1 demostró un agente de lectura,
cancelación y reconciliación; O2 convirtió esa base en un servicio local con pausa
persistente y aprobación exacta. O3 demostró implementación aislada, revisión
independiente, checks y evidencia real bajo el sandbox Windows validado. O4-A agregó
el gate exacto sin efectos remotos; O4-B probó el recorrido web contra un bare remote
local temporal. O4-C1 agregó el adaptador/reconciliación GitHub detrás de límites
inyectados y lo validó sin red; O4-C2-A agregó el runtime acotado también offline.
El preflight GitHub B1 pasó en lectura. El piloto externo O5 completó dos intentos de
ejecución, recuperación explícita de un fallo de check, reconciliación de una
publicación pre-head incierta y una draft PR exacta. O5-D reconfirmó sus hashes y
ejecutó la regresión del monorepo. El check de dominio de la tarea pasa; el CI backend
integral de Bloom conserva fallos 401 ya observados en su base `master`, por lo que
la PR no se declara mergeable ni se oculta esa limitación.
Referencia: [ADR 0014](../../control-plane/adrs/0014-local-operation-boundary.md)
y [plan](../plans/2026-09-05-speccontrol-local-operation.md).
