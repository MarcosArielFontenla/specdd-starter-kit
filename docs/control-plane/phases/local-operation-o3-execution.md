# Operación local O3 — ejecución aislada

Fecha: 2026-09-05. Estado: **O3 aceptado localmente de punta a punta**.

## Implementado

- Binding `SpecControlExecutionBinding` 1.0.0 validado al arrancar, con modelos,
  presupuestos de fuente/tiempo y checks estructurados. El navegador no puede
  modificarlo. `$NODE` es el único alias portable y resuelve al Node del servicio.
- Copia controlada `baseline/` + `worktree/` debajo del estado privado. Se excluyen
  `.git`, dependencias/builds y archivos típicos de secretos; se rechazan links,
  archivos especiales, exceso de archivos/bytes, drift durante la copia y creación
  posterior de rutas excluidas.
- Developer Codex con permiso `:workspace`, cwd limitado al worktree y salida
  estructurada. El host calcula el diff real y rechaza discrepancias con los paths
  declarados por el agente.
- Reviewer Codex de lectura en una sesión/thread diferente. Puede comparar baseline
  y worktree; un finding bloqueante detiene el flujo antes de checks.
- Checks secuenciales desde binding confiable: ejecutable absoluto, argumentos sin
  shell, cwd del worktree, entorno acotado, timeout, salida máxima y recibo con hash;
  primer fallo detiene el flujo.
- Journal SQLite separado para `preparing → developing → reviewing → checking →
  completed`, con intents persistidos, compare-and-set, cancelación y reconciliación
  de crash a `needs-attention` sin retry silencioso. Un retry explícito archiva el
  intento anterior y crea un workspace nuevo, manteniendo el mismo binding aprobado.
- Consola con estados y recibos resumidos de Developer, diff, Reviewer, checks y
  evidencia final. Sigue renderizando contenido agente mediante `textContent`.

## Pruebas actuales

`npm run speccontrol:test`: 12/12 aprobadas, incluyendo O2 y:

- implementación en copia aislada, Reviewer distinto y check Node real;
- proyecto fuente byte-idéntico después de ejecutar;
- revisión fallida bloquea checks;
- receipt de Developer distinto al diff bloquea antes de Reviewer;
- crash de ejecución se reconcilia sin retry;
- directorio `.git` vacío creado por el runtime no contamina el diff, pero contenido
  dentro de una ruta excluida se bloquea;
- retry explícito preserva el intento fallido y completa desde un workspace nuevo;
- el adaptador usa los valores `sandbox: read-only` y `sandbox: workspace-write`
  aceptados por App Server 0.145.0 y no deja una promesa de cierre sin manejar;
- `windows.sandbox` se fija por proceso (`elevated` o `unelevated`), queda reflejado
  en el recibo y O3 en Windows rechaza arrancar si falta;
- el estado y el proyecto deben ser roots no solapados en ambas direcciones;
- binding rechaza ejecutable relativo y caracteres de control.
- directorios generados `bin` se omiten del source snapshot; una regresión mantiene
  `obj` disponible para checks .NET explícitos con `--no-restore`.
- el entorno de checks conserva sólo las variables básicas de lanzamiento y las de
  ubicación del perfil (`HOME` en Unix; `USERPROFILE`, `HOMEDRIVE`, `HOMEPATH`,
  `APPDATA` y `LOCALAPPDATA` en Windows). Una prueba de proceso hijo confirma que
  esta familia cruza el boundary y una variable centinela no autorizada no lo hace.

## Ejecución real

El Planner real leyó únicamente `fixtures/o3-project`, cuyo contrato está completo,
y generó el plan visible en la consola:

- run: `run-7eb4f8d8-3f8e-4320-9651-a5382c21efd2`;
- aprobación humana exacta: registrada, estado/version del plan `approved` / `3`;
- artefacto SHA-256:
  `76a13fbf9e1feaf05ef2cb7e12426285c6ec8946e2c0d8b24920c36f6c64871b`;
- runtime/model: `codex-app-server` / `gpt-5.6-luna`;
- thread ref SHA-256:
  `2b6b0bceda423190835630cce553d1f4073e7dea56c0fe7ca44be85da69c2839`;
- turn ref SHA-256:
  `ace5df6d347229dd25e42ce780bd9e0226e563f07e0f1795ab363e601bd9e1aa`.

El intento 1 fue autorizado y se detuvo antes del Reviewer y los checks con
`WORKSPACE_EXCLUDED_PATH_CREATED`. La inspección confirmó que el agente no modificó
el proyecto fuente; el bloqueo lo produjo un directorio `.git` vacío creado por el
runtime dentro de la copia. La política fue afinada para tolerar únicamente esa ruta
vacía y seguir rechazándola si contiene archivos.

El intento 2 fue autorizado, archivó el intento 1 y se detuvo con
`DEVELOPER_EMPTY_DIFF`: Developer devolvió el recibo sin modificar su copia. El
rollout local demostró que sí intentó editar, pero tanto `apply_patch` como la shell
fallaron con `windows sandbox failed: CreateProcessWithLogonW failed: 2`.

El intento 3 fue autorizado, archivó el intento 2 y se detuvo con
`EXECUTION_FAILED` porque App Server 0.145.0 rechazó el valor camelCase
`workspaceWrite` de la documentación actual; esta versión espera
`workspace-write`. Ese contrato ya fue corregido y el cierre temprano ya no puede
derribar el host por una promesa rechazada sin observador.

El operador autorizó `windowsSandbox/setupStart` en modo `elevated`. App Server emitió
`setupCompleted { success: true }`, pero dos validaciones posteriores fallaron
cerradas antes de iniciar Node. La primera detectó una ACL cuyo propietario era el
usuario offline; al repetir con carpetas creadas por el usuario host, la ACL se pudo
preparar pero persistió `CreateProcessWithLogonW failed: 2`. No se creó ningún archivo
fuera del root permitido. El modo elevado queda clasificado como instalado pero no
operativo en este host.

El operador autorizó luego el setup `unelevated`. App Server emitió
`setupCompleted { success: true }`. La API directa `command/exec` se negó de forma
segura a representar dos roots de escritura separados; no ejecutó el comando sin
aislamiento. La validación equivalente mediante un turno real de agente, con dos
directorios hermanos bajo `%LOCALAPPDATA%\SpecDD\validation-unelevated`, completó con
`allowedCreated: true` y `deniedCreated: false`. Por tanto `unelevated` queda aceptado
como fallback local sandboxed; `danger-full-access` continúa prohibido.

La prueba también reveló que alojar el estado O3 dentro del repositorio hace que App
Server infiera el checkout Git completo como workspace. El arranque ahora rechaza
cualquier solapamiento entre `--state-dir` y `--project-root`. El estado persistente
del piloto fue copiado, con autorización independiente, desde
`.specdd-control/o3-acceptance` a
`%LOCALAPPDATA%\SpecDD\o3-acceptance`. El original permanece preservado. La
comparación registró 21/21 archivos, 26/26 directorios y cero diferencias de ruta,
tamaño o SHA-256. La copia no contiene `service.lock`; `PRAGMA integrity_check`
devolvió `ok`, `foreign_key_check` no encontró violaciones y se conservaron el
schema 3, el run, la aprobación exacta, el intento 3 y los intentos 1–2 archivados.
El intento 4 fue autorizado de forma independiente y ejecutado con el estado externo
y `windows.sandbox = "unelevated"`. Completó
`preparing → developing → reviewing → checking → completed`:

- intento/version final: `4` / `5`;
- el Developer modificó únicamente `src/appointment.mjs` dentro del worktree;
- el proyecto fuente conservó SHA-256
  `79d69af39e7d0426f38f77450439f2bf06448de4a0ec0e6d581541f876b4ea61`;
- recibos Developer y Reviewer registran `codex-app-server/windows-unelevated`;
- Reviewer: `pass`, cero findings;
- check `appointment-unit`: `passed`, exit 0, 180 ms;
- diff SHA-256:
  `acebee7503989ea9807477465d7a303ba9828fee049ba79f6d46d537ecad6017`;
- evidencia SHA-256:
  `8d0514379a2ddbc96c343a5e19581e97a31b13c0df2f917bdab7e3b172f610fd`.

Después del cierre, `service.lock` quedó ausente, `PRAGMA integrity_check` devolvió
`ok`, `foreign_key_check` no encontró violaciones y los intentos fallidos 1–3 siguen
archivados con sus errores originales. La suite `npm run speccontrol:test` volvió a
aprobar 12/12. El fixture fuente no recibió la implementación: O3 conserva el
resultado dentro de su workspace aislado para una futura decisión de promoción.

## Límites

Los checks son configuración confiable del operador pero ejecutan código en el host;
no constituyen sandbox multi-tenant. O3 no toca Bloom, GitHub, branches, PR, merge,
credenciales externas ni deploy. El piloto externo y el aislamiento específico de
sus checks siguen siendo gates posteriores.
