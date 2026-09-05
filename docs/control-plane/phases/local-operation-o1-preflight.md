# Operación local O1 — preflight y persistencia

Fecha: 2026-09-05. Estado: **aceptado para viabilidad local acotada**. No habilita
todavía ejecución sobre proyectos externos ni escritura autónoma.

## Observaciones locales

- Codex CLI 0.145.0 disponible; `app-server --stdio` expuesto por el binario.
- `codex login status` confirma ChatGPT fuera de la restricción de lectura del
  sandbox de esta tarea. La primera lectura restringida dio un falso negativo.
- Preflight real: initialize → initialized → account/read sin refresh → cierre.
  Resultado: initialized=true, authMode=chatgpt, inferenceStarted=false,
  sandboxVerified=false, processExitConfirmed=true. No se imprimieron datos de cuenta.
- Node 24.16.0 y SDK .NET 10.0.302 disponibles. Motor Docker no accesible, tampoco
  al repetir la consulta fuera del sandbox. No se inició Docker ni se instaló nada.
- `codex sandbox --help` expone sandbox Windows con token restringido; su presencia
  no prueba aislamiento de lectura, escritura/red ni compatibilidad con el adaptador.

## Pruebas reproducibles

Código: [spike](../../../scripts/speccontrol-spike/README.md).

`node --check scripts/speccontrol-spike/preflight.mjs`: exit 0.

`node --test scripts/speccontrol-spike/storage.test.mjs`: **5 passed, 0 failed**.

1. Intención committed sobrevive salida abrupta de proceso hijo.
2. Resultado sin commit vuelve al estado anterior al salir abruptamente.
3. Lock rechaza otro escritor; transición obsoleta no cambia filas; ID duplicado rechaza.
4. Intención sin recibo puede conservarse como needs-attention, no reintento implícito.
5. Binario inexistente produce fallo controlado sin filtrar detalles.

Estas pruebas usan SQLite real y procesos Node, no agentes. No prueban power-loss,
cancelación de árbol de procesos, efectos externos ni recuperación del runtime.
Sólo se eliminaron las carpetas temporales creadas por los tests; no datos del usuario.

## Selección técnica provisional

### Continuación — Docker habilitado por el usuario

Docker Engine 29.7.2 respondió tras iniciar Docker Desktop. No había contenedores
en ejecución en el inventario inicial. Se reutilizó la imagen local
`postgres:17-bookworm`, fijada durante el ensayo al ID
`sha256:051f7b7b3abdd564d5d1bd1e8c4b9c1b6e77087d1dd22020ede611c096a272e0`.
Se sustituyó el entrypoint por bash: no se inició PostgreSQL, no se descargaron
imágenes y no se conectaron servicios de Bloom.

`node scripts/speccontrol-spike/docker-isolation.mjs`: exit 0, **12 comprobaciones**:

- lectura de fixture sintético permitida;
- escritura sobre fixture y raíz bloqueada;
- escritura temporal permitida y ejecución de binario en tmpfs bloqueada;
- ausencia de sockets Docker y mounts convencionales del host;
- UID no-root, capabilities efectivas cero y no-new-privileges;
- ausencia de ruta por defecto y conexión TCP rechazada por red inaccesible;
- reconciliación del contenedor vivo por ID y label propios;
- detención de bash y su hijo sleep confirmada con Running=false/Pid=0;
- contenido del fixture del host sin cambios.

El test también inspeccionó el único bind de solo lectura, ausencia de volúmenes
anónimos/puertos publicados y límites CPU/memoria/PID. No prueba agotamiento de
recursos, todos los paths del host, escapes de contenedor o aprobación de agentes.
No se usaron secretos como canarios. El contenedor descartable se eliminó con
verificación de propiedad; no se eliminaron imágenes, datos o contenedores ajenos.

**Decisión de avance:** Docker es viable para el worker de comandos offline de este
fixture. No está demostrado que Codex App Server ejecute sus herramientas dentro
de ese worker: no hay todavía un bridge ni un runtime dentro del contenedor.
No afirmar aislamiento integrado porque dos pruebas separadas hayan pasado.

La próxima integración debe resolver el canal de inferencia autenticado separado
del acceso de los comandos a red/credenciales. No montar el home autenticado del
operador, el socket Docker ni tokens dentro del workspace del agente. Evaluar el
sandbox nativo soportado o un mecanismo documentado de inferencia y herramientas
aisladas antes de seleccionar el perfil. Cambios de autenticación, instalación o
permisos que amplíen el diseño requieren revisión explícita.

Fuente: [Docker run](https://docs.docker.com/engine/containers/run/).

**Runtime candidato:** Codex App Server sobre stdio privado. Permite preparar un
adaptador sin exponer el puerto del runtime al navegador; la API web seguirá siendo
responsabilidad de SpecControl. No se cambió modelo ni se consumió inferencia.
La autenticación existente no prueba presupuesto suficiente ni uso gratuito.

**Persistencia candidata:** SQLite para transiciones, intentos y recibos; JSONL
canónico como export. Frente a JSON mutable evita implementar transacciones/locks
propios; frente a PostgreSQL no requiere un servidor para el piloto de un operador.
El spike usa node:sqlite disponible en Node 24.16.0. No cambia el mínimo Node 22.12
del monorepo: ese mínimo requiere resolver compatibilidad/flag o un driver antes de
incorporar el servicio al workspace. No se añadió ninguna dependencia externa.

## Pendientes para aceptar O1

1. Configuración del runtime dedicada al fixture, sin plugins/hooks/MCP heredados ni
   secretos accesibles a comandos. No copiar credenciales a fixtures/publicaciones.
2. El contenedor offline pasó el ensayo acotado anterior. Falta verificar que las
   herramientas del runtime elegido hereden ese aislamiento o probar un perfil
   nativo equivalente. No se convierte Warp en requisito.
3. Turno real acotado, recibos y consumo observado; cancelación confirmada y
   reconciliación tras interrupción. No usar terminar el preflight como esa evidencia.
4. Ensayar el contrato persistente unido al runtime, con IDs y estado incierto;
   escoger driver/versiones soportadas y actualizar ADR con aceptación real.

No hay todavía servicio HTTP, UI SpecControl ni runner de workflows. Bloom no fue
clonado, modificado o ejecutado. Sin commit/push, PR, merge ni deploy en esta etapa.

### Cierre del spike de runtime

El App Server instalado declaró los perfiles `:read-only`, `:workspace` y
`:danger-full-access` permitidos, y los modelos gpt-5.6 disponibles. El modelo por
defecto de la cuenta, `gpt-6-astra`, fue rechazado porque Codex CLI 0.145.0 requiere
una versión más nueva para usarlo. No se actualizó el CLI: el canario fijó localmente
`gpt-5.6-luna`, sin convertirlo en parte del contrato canónico.

Se observaron tres resultados reales sobre el fixture sintético:

1. **Completado:** un turno con perfil `:read-only` leyó el canario mediante un
   comando local, devolvió JSON estructurado correcto tras normalizar únicamente el
   fin de línea, conservó SHA-256 y bytes del archivo y terminó `completed`/exit 0.
   Hubo eventos de uso y razonamiento; no se capturó ni publicó contenido privado.
2. **Cancelado:** el cliente esperó `turn/started` antes de `turn/interrupt`. Terminó
   `interrupted`/exit 0 y el fixture no cambió. Un primer intento prematuro fue
   rechazado con `no active turn`; se conserva como hallazgo de carrera del protocolo.
3. **Recuperado:** se persistió `remote-accepted` en SQLite, se terminó el proceso
   App Server después de aceptar el turno, se inició otro servidor, se hizo
   `thread/resume` + `thread/read` y se observó `interrupted`. La operación quedó
   `needs-attention`, sin retry automático; el DB temporal verificado fue eliminado.
   Las referencias de hilo/turno sólo se emitieron como hashes en esta prueba.

Los hilos de los canarios terminados se archivaron desde el cliente. Dos hilos que
quedaron creados durante fallos de configuración previos también se archivaron
explícitamente para no ensuciar la lista local. Archivar es reversible y no elimina
historial.

**Aceptación O1 acotada:** existen transporte autenticado, agente real, salida
estructurada, cancelación y reconciliación sin retry ciego; SQLite y Docker son
viables para los roles definidos. Esto no demuestra un Developer aislado de punta
a punta: el agente read-only usó el sandbox nativo, mientras el worker Docker offline
se probó separadamente. Unir ambos sin exponer credenciales es trabajo de O2/O3.

## Próximo incremento — O2

Crear el paquete del servicio local y una pausa persistente hasta spec/plan:
registro explícito de una raíz fixture, estado versionado, un solo writer/run,
token/origin/host para la API loopback, hash de aprobación y UI mínima. Inicialmente
el Planner será read-only; no se habilitará Developer ni Bloom. Antes de cruzar la
pausa se requerirá aprobación del artefacto exacto.

## Fuentes oficiales consultadas

- [App Server](https://learn.chatgpt.com/docs/app-server): handshake, turnos,
  interrupción, lectura/reanudación y autenticación.
- [Sandbox Windows](https://learn.chatgpt.com/docs/windows/windows-sandbox): referencia
  para la siguiente prueba, no evidencia de la configuración local.
- [Node SQLite](https://nodejs.org/api/sqlite.html): API y diferencias de versiones;
  los resultados anteriores corresponden al binario local indicado, no al último Node.
