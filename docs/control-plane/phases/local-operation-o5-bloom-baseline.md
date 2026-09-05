# Operación local O5-A — baseline y propuesta para Bloom

Fecha: 2026-09-05. Estado: **O5-D aceptado; cierre operativo acotado**.

## Identidad local

- Repositorio: `MarcosArielFontenla/bloom-appointments-app`.
- Clone autorizado: `D:\AgenticProjects\bloom-appointments-app`.
- Rama: `master`.
- HEAD: `60558d82a52f1e324037fa6e8c2a25295bd6654a`, igual al preflight remoto.
- Remote: `https://github.com/MarcosArielFontenla/bloom-appointments-app.git`.
- Working tree: limpio después del clone y después de la inspección.
- 195 archivos tracked; no existe `AGENTS.md` ni `.agents/`.

## Stack y checks observados

- Backend .NET 10 con solución `backend/Bloom.slnx`, tests xUnit de dominio y tests
  de integración con Testcontainers/PostgreSQL.
- Frontend Angular 21/Node 22 con lock npm y build en CI, pero sin archivos de test
  frontend ni target `test` declarado en `angular.json`.
- CI actual: restore/build/test del backend y `npm ci`/build del frontend.
- Los tests de integración requieren Docker y configuran datos sintéticos; el primer
  piloto no necesita ejecutarlos.
- El repositorio sólo trackea `.env.example`; no se observó un archivo de secretos
  versionado por nombre. No se leyeron user-secrets ni variables reales.

## Tarea piloto propuesta

**Título:** Rechazar teléfonos que no normalizan a exactamente 10 dígitos.

**Problema observado:** `PhoneNormalizer` documenta que la identidad canónica es un
número argentino de 10 dígitos, pero después de quitar formato no valida longitud.
Entradas no vacías como `abc`, `123` o un número de 11 dígitos pueden retornar una
clave vacía/corta/larga. `BookingService` y `AdminAppointmentsService` ya capturan
`ArgumentException` y la traducen a `InvalidPhone`/validación, por lo que falta el
invariante en el punto central.

**Cambio exacto propuesto:** únicamente:

1. en `backend/src/Bloom.Domain/PhoneNormalizer.cs`, después de normalizar prefijos,
   exigir exactamente 10 dígitos y lanzar `ArgumentException` asociada a `phone` si
   no se cumple;
2. en `backend/tests/Bloom.Domain.Tests/PhoneNormalizerTests.cs`, conservar todos los
   casos válidos actuales y agregar casos inválidos sin dígitos, cortos y largos.

No se cambia API, base de datos, migraciones, frontend, auth, notificaciones,
infraestructura ni dependencias.

## Checks propuestos para el run

Primero, con autorización separada, restaurar exclusivamente el proyecto de tests
de dominio. Luego registrar en O3 un check estructurado equivalente a:

```text
dotnet test backend/tests/Bloom.Domain.Tests/Bloom.Domain.Tests.csproj --configuration Release --no-restore
```

El check no necesita Docker, PostgreSQL, navegador, correo, Telegram ni Railway.
Antes de ejecutar el Developer debe volver a comprobarse que el source sigue limpio
y en el HEAD indicado.

## Baseline O5-B1 observado

- SDK: .NET `10.0.302`.
- Restore limitado a `Bloom.Domain.Tests.csproj`; por sus referencias también
  restauró Domain, Application e Infrastructure. No restauró/ejecutó integración.
- Comando de baseline: `dotnet test backend/tests/Bloom.Domain.Tests/Bloom.Domain.Tests.csproj --configuration Release --no-restore`.
- Resultado: **63/63 correctas**, 0 fallidas, 0 omitidas.
- Git permaneció limpio y en `60558d82a52f1e324037fa6e8c2a25295bd6654a`.
- Sólo se crearon outputs ignorados `bin/obj`; no se modificó código.

## Pausa O5-B2 observada

- Run: `run-ab92cedb-bec9-4150-9cd1-4e238014fc0f`.
- Estado: `awaiting-approval`; error: ninguno.
- Artefacto SHA-256:
  `a8c209af29e574886addcfe80c0cd7eb48b6dfa7258b4069735a3668897da9f8`.
- Runtime: `codex-app-server/windows-unelevated`; modelo Planner:
  `gpt-5.6-luna`.
- El spec conserva las normalizaciones argentinas existentes, exige exactamente 10
  dígitos al final y limita cambios a los dos archivos propuestos.
- El plan agrega la validación después de normalizar y casos parametrizados sin
  dígitos, de 9 dígitos y de 11 dígitos.
- Receipt del Planner: thread
  `127240c0420b2879e7e0ed20f81345fb729edce410ecfac2ab3625f4cbb30abe`,
  turn `2cc51b212e36dbf6d8f32f69bb9e8d50cc8fbd0284becc5d231f69badd04364a`.
- El servicio se cerró limpiamente después de persistir la pausa; el lock fue
  retirado. Al reiniciar conservará `awaiting-approval` sin repetir el Planner. No
  se ejecutó Developer, Reviewer ni el check.

### Preflight requerido antes de O5-B3

El baseline dejó outputs ignorados de .NET en `bin/obj`. El snapshot candidato de
O3 suma 420 archivos y 26.168.644 bytes; 225 archivos y 25.197.583 bytes pertenecen
a esos outputs. Como el binding limita el source a 10 MiB, aprobar el artefacto en
este estado produciría `WORKSPACE_SOURCE_LIMIT` antes de ejecutar al Developer.

O5-B3-A debe corregir primero el límite operativo: excluir `bin` del snapshot con
una prueba de regresión y conservar `obj` como metadata del baseline restaurado para
que el check pueda seguir usando `--no-restore` dentro del workspace aislado. Este
hallazgo no altera el artefacto aprobado ni el source de Bloom.

## Validación O5-B3-A observada

- SpecControl ahora excluye todo directorio llamado `bin` del source snapshot y
  mantiene `obj` elegible.
- La regresión construye un source sintético donde copiar `bin` excedería tanto el
  máximo de archivos como el de bytes; verificó que `bin` no existe en el worktree
  y que `obj/project.assets.json` sí fue copiado.
- Suite completa de SpecControl: **40/40 correctas**, 0 fallidas.
- Snapshot real temporal de Bloom: **274 archivos, 2.624.959 bytes**, por debajo de
  500 archivos y 10 MiB; `bin`: 0 archivos; `obj`: 80 archivos.
- Baseline SHA-256 aislado:
  `4af467f978782b93d5dbdeea2fc4d6b2c2bb6b91cc0c216eb5dfcd6b806214a8`.
- Check ejecutado dentro de la copia con `--no-restore`: **63/63 correctas**, 0
  fallidas, 0 omitidas. No usó red, Docker ni el repositorio original como cwd.
- El run continúa en `awaiting-approval`: no se ejecutó Developer ni Reviewer y no
  se produjo ningún efecto de publicación.

## Ejecución O5-B3-B observada

- Se aprobó exactamente el artefacto
  `a8c209af29e574886addcfe80c0cd7eb48b6dfa7258b4069735a3668897da9f8`
  del run `run-ab92cedb-bec9-4150-9cd1-4e238014fc0f`.
- Intento: 1. El baseline real coincidió con el preflight:
  `4af467f978782b93d5dbdeea2fc4d6b2c2bb6b91cc0c216eb5dfcd6b806214a8`.
- Developer modificó únicamente `PhoneNormalizer.cs` y
  `PhoneNormalizerTests.cs`. El diff host-computed fue
  `2a1c18d9c721ce35445480340cacb7160125060a8672fc6d0995beb524291b27`.
- Reviewer independiente: `pass`, sin findings. Confirmó alcance, normalizaciones
  preservadas, validación final de diez dígitos y los tres casos inválidos.
- El check estructurado falló con exit code 1 y dejó el run en `needs-attention`
  con `CHECK_FAILED`. Evidencia:
  `ea5d724fd2b2428d6389e9b109ab50f5802e86374527c23edac7cc5261787d5b`;
  output: `8a5a7d0479e3f0eeb5d569ea861b87d35fc4b9d456c4829e99be8e0a4d195726`.
- La reproducción con el mismo entorno mínimo mostró `NETSDK1060`: NuGet no pudo
  resolver una ruta base al leer `obj/project.assets.json`. El runner conserva sólo
  variables de proceso básicas y elimina las variables estándar de ubicación del
  perfil requeridas por el SDK.
- Una comprobación diagnóstica en el mismo workspace, agregando sólo la familia de
  ubicación `USERPROFILE`, `HOMEDRIVE`, `HOMEPATH`, `APPDATA` y `LOCALAPPDATA`, pasó
  **66/66 tests**, sin restore ni red. Esto separa un defecto del runner de un
  defecto del cambio funcional.
- No hubo retry. El servicio se cerró y retiró su lock. Los cambios permanecen sólo
  en el workspace privado del intento; Bloom y GitHub no fueron modificados.

## Corrección O5-B3-C1 observada

- `StructuredCheckRunner` ahora hereda únicamente `HOME` en Unix o
  `USERPROFILE`, `HOMEDRIVE`, `HOMEPATH`, `APPDATA` y `LOCALAPPDATA` en Windows,
  además de sus variables básicas de lanzamiento existentes.
- Una regresión con proceso hijo comprobó que todas las ubicaciones disponibles
  llegan al check y que `SPECCONTROL_UNAUTHORIZED_ENV_SENTINEL` queda excluida.
- Suite completa de SpecControl: **41/41 correctas**, 0 fallidas.
- El runner compilado ejecutó el check real sobre el workspace aislado del intento:
  `passed`, exit code 0, 3.605 ms, 1.277 bytes de salida y SHA-256
  `68a545eae653e14f9f916ca6867b06980afe01169d20449d4367563b34d5cf75`.
  La ejecución diagnóstica anterior ya confirmó **66/66 tests**.
- Esta comprobación no llamó `retryExecution` ni alteró el journal. El intento 1
  permanece en `needs-attention` con su evidencia fallida original, listo para una
  autorización exacta de intento 2.

## Reintento O5-B3-C2 observado

- Se reabrió el mismo run y artefacto aprobado; `retryExecution` archivó el intento
  1 con estado `needs-attention`, error `CHECK_FAILED`, diff
  `2a1c18d9c721ce35445480340cacb7160125060a8672fc6d0995beb524291b27`
  y evidencia `ea5d724fd2b2428d6389e9b109ab50f5802e86374527c23edac7cc5261787d5b`.
- El intento 2 usó un workspace nuevo y el mismo baseline
  `4af467f978782b93d5dbdeea2fc4d6b2c2bb6b91cc0c216eb5dfcd6b806214a8`.
- Developer cambió únicamente los dos archivos aprobados. Añadió la validación
  final `digits.Length != 10` y tres casos inválidos: sin dígitos, 9 dígitos y 11
  dígitos. Diff SHA-256:
  `4bbbad41b3a918cd6877ceb0cd022a8953647b469705507145c0d6e9810833ec`.
- Reviewer independiente: `pass`, sin findings; su sesión fue distinta de la del
  Developer.
- Check `bloom-domain-tests`: `passed`, exit code 0, 6.749 ms, 1.327 bytes de
  salida, SHA-256
  `b2d3f4b2b8b238dde5ea6c2b7e651729612fba23672a00914741aa25ca884d8e`.
  El conjunto contiene **66/66 tests correctos**.
- Estado terminal: `completed`. Evidencia final:
  `a0d807d996c4eae01e9b3a7cc9d7a4c8c97ae24abacf452aafe6a921634b973d`.
- El servicio se cerró y retiró su lock. El candidato continúa sólo en el workspace
  privado; no se promovió a Bloom ni se habilitó publicación.

## Preparación O5-C1 observada

- Binding privado: `%LOCALAPPDATA%\SpecDD\bloom-pilot\github-publication-binding.json`;
  SHA-256 de archivo
  `7E008E44A9C348037E7B66BFE9528AA2644D2A512C3F56C285BCCD0C424A0BEC`.
- Target exacto: `github.com/MarcosArielFontenla/bloom-appointments-app`, remote
  `origin`, base `master`, prefijo `codex/speccontrol/`, siempre `draft: true`.
- SpecControl arrancó con `O4-A: enabled` y `O4 publisher: disabled`; no se le
  proporcionó GitHub CLI ni root de publicación.
- La inspección Git local verificó source limpio, base revision
  `60558d82a52f1e324037fa6e8c2a25295bd6654a` y remote URL exacta.
- Subject SHA-256:
  `5e6552e53d179f13d0d8cd3c6fc050935d54ec608bdd5a1aff6cf19a01e81593`.
- El subject liga artefacto, intento 2, binding de ejecución, baseline, diff,
  evidencia final, project root, binding de publicación, target y base revision.
- Rama propuesta:
  `codex/speccontrol/run-ab92cedb-bec9-4150-9cd1-4e238014fc0f-a2`.
- Estado persistido: `awaiting-approval`; approval, operationId, expected head,
  provider ref y receipt permanecen nulos.
- El servicio se cerró y retiró su lock. No se creó rama, commit, push ni PR y no
  se modificó el source de Bloom.

## Aprobación O5-C2 observada

- SpecControl reinició con `O4-A: enabled`, `O4 publisher: disabled` y cero
  reconciliaciones pendientes.
- Antes de aprobar, el gate confirmó el intento 2 `completed`, subject
  `5e6552e53d179f13d0d8cd3c6fc050935d54ec608bdd5a1aff6cf19a01e81593`
  y base `master@60558d82a52f1e324037fa6e8c2a25295bd6654a`.
- La reinspección Git exigida por `approve-publication` pasó sin drift.
- Estado persistido: `approved`, versión 2; actor `local-operator`; timestamp
  `2026-09-05T20:40:54.521Z`.
- `operationId`, expected head revision, provider ref y receipt SHA-256 continúan
  nulos. No se ejecutó ningún adaptador de publicación.
- El servicio se cerró y retiró su lock; Bloom continúa limpio y sin una rama local
  bajo `codex/speccontrol/`.

## Publicación O5-C3 observada

- Se habilitó el publicador GitHub exclusivamente para el subject aprobado y se
  inició una sola operación:
  `publish-5c3c1fbf-56d2-4dec-9638-cfd705080c31`.
- La operación se detuvo en `needs-attention`, versión 4, con
  `PUBLICATION_OUTCOME_UNKNOWN`; no hubo retry automático.
- El fallo ocurrió antes de `publicationHeadPrepared`: `expectedHeadRevision`,
  provider ref y receipt SHA-256 permanecen nulos.
- El clone privado existe bajo el root autorizado, pero quedó en detached HEAD con
  19 archivos tracked ausentes. Son paths profundos de
  `Bloom.Infrastructure/Persistence/Configurations` y `Migrations`; el checkout no
  tiene `core.longpaths` configurado y sus rutas más largas llegan a 239 caracteres.
- Una consulta GitHub read-only de la rama exacta devolvió `[]`; la consulta de PRs
  exactas también devolvió `[]`. Por tanto no se creó rama remota, push ni draft PR.
- El hallazgo expone dos gaps locales: Git debe habilitar `core.longpaths=true` sólo
  en el checkout privado, y la reconciliación debe poder demostrar ausencia cuando
  el fallo precede al cálculo de `expectedHeadRevision`. Con cualquier rama o PR
  observada, esa reconciliación debe fallar cerrada como conflicto.
- El servicio se cerró y retiró su lock. Bloom original permanece limpio en
  `master@60558d82a52f1e324037fa6e8c2a25295bd6654a`; el workspace fallido se preserva
  como evidencia privada.

## Corrección O5-C3-R1 observada

- `GitHubBranchPreparer` configura `core.longpaths=true` sólo dentro del clone
  privado, inmediatamente después de `clone --no-checkout` y antes de materializar
  la revisión base. No cambia configuración global ni el source.
- La regresión Git crea un path profundo representativo de Bloom, comprueba la
  configuración local y verifica que el archivo existe en el checkout preparado.
- El contrato `Publisher.reconcile` admite `expectedHeadRevision: null`. En ese
  estado, el adaptador GitHub devuelve `absent` únicamente si rama y PRs exactas
  están ambas ausentes; rama presente o PR presente devuelven `conflict`.
- Una regresión HTTP simula un fallo anterior al head y confirma la transición
  `needs-attention → approved` sólo tras observación `absent`.
- Suite completa de SpecControl: **46/46 correctas**, 0 fallidas. GitHub CLI fue un
  proceso fake local; no se usó red ni `gh` real.
- El journal real no se abrió para escritura ni se reconcilió: conserva operación
  `publish-5c3c1fbf-56d2-4dec-9638-cfd705080c31`, estado `needs-attention`, error
  `PUBLICATION_OUTCOME_UNKNOWN` y expected head nulo. El workspace fallido permanece
  preservado.

## Reconciliación O5-C3-R2 observada

- SpecControl reinició con el publicador GitHub y cero reconciliaciones automáticas.
- El gate verificó estado `needs-attention`, error `PUBLICATION_OUTCOME_UNKNOWN`,
  subject aprobado, operationId exacta y `expectedHeadRevision: null` antes de
  consultar el remoto.
- El adaptador observó ausencia exacta de la rama
  `codex/speccontrol/run-ab92cedb-bec9-4150-9cd1-4e238014fc0f-a2` y cero PRs exactas.
- Resultado: `absent`; el journal pasó a `approved`, versión 5, y limpió operationId
  y error. Expected head, provider ref y receipt SHA-256 continúan nulos.
- No se llamó al flujo `publish`, no se preparó otro clone, commit, rama, push o PR.
  El workspace fallido original permanece preservado.
- El servicio se cerró y retiró su lock; Bloom permanece limpio en el mismo HEAD.

## Publicación O5-C3-R3 observada

- Desde el estado `approved` versión 5 se inició exactamente una nueva operación:
  `publish-414b3b23-5e29-4ba5-af89-08fc87d72e70`.
- El nuevo clone privado configuró `core.longpaths=true`, materializó el source
  completo, aplicó sólo el diff aprobado y creó el commit
  `37ac7312eb9c32b046b0c248ed67a9e81989e50a`.
- El push create-only creó la rama
  `codex/speccontrol/run-ab92cedb-bec9-4150-9cd1-4e238014fc0f-a2`; no reemplazó una
  rama existente.
- GitHub creó [draft PR #1](https://github.com/MarcosArielFontenla/bloom-appointments-app/pull/1)
  contra `master`. La observación posterior confirmó `OPEN`, `isDraft: true`, base,
  head branch y head OID exactos.
- La PR contiene únicamente `backend/src/Bloom.Domain/PhoneNormalizer.cs` (+3) y
  `backend/tests/Bloom.Domain.Tests/PhoneNormalizerTests.cs` (+9), ambos modificados
  y sin eliminaciones.
- Estado final: `published`, versión 8; receipt SHA-256
  `874efb48dba1fcb569c65367da1acb5e5fad7722acc835ccfc24d59850424277`.
- El workspace del primer fallo y el de la publicación exitosa permanecen privados.
  Bloom original continúa limpio; no hubo merge ni deploy.

## Aceptación O5-D observada

- GitHub reconfirmó en modo read-only la PR #1 `OPEN` y draft, base `master` en
  `60558d82a52f1e324037fa6e8c2a25295bd6654a`, head branch exacta y commit
  `37ac7312eb9c32b046b0c248ed67a9e81989e50a`. La rama remota resuelve al mismo OID.
- El contenido remoto continúa limitado a los dos archivos aprobados: normalizador
  +3 y tests +9, sin eliminaciones ni commits adicionales.
- GitHub Actions informa frontend `SUCCESS` y backend `FAILURE`. Dentro del backend,
  los 66 tests de dominio —incluidos los tres casos nuevos— pasan; fallan 18 tests de
  integración por `401 Unauthorized`. El run de la base `master@60558d8` ya falla con
  el mismo patrón 401, por lo que no se atribuye ese baseline rojo al parche y la PR
  tampoco se presenta como mergeable en verde.
- La regresión de SPECDDSTARTERKIT pasó 397/397 unit tests, todos los builds de
  paquetes/portal/wizards, 12/12 E2E, Phase 5 y las 27 regresiones suplementarias de
  propuestas. `npm audit --offline --audit-level=low` informó 0 vulnerabilidades en
  767 entradas; es una consulta al cache de advisories, no un pentest ni un refresh
  online.
- La verificación read-only del rehearsal histórico de Phase 10 se detuvo correctamente
  por drift en `packages/delivery-model/fixtures/static/index.html`. No se reescribió
  ni repitió aquella promoción: la evidencia histórica conserva su hash aprobado y
  el source actual tiene SHA-256
  `356db4a4c16f6b5694f8e1044b8b08599cfc3e359ebd9c65f55c53fb11525738`.
- La evidencia de cancelación, crash/recovery, check fallido, retry explícito,
  publicación incierta y reconciliación fail-closed quedó contrastada con los tests
  y journals conservados. No se modificó Bloom ni la PR, y no hubo merge o deploy.

Decisión: SpecControl queda aceptado como **software factory local, monoperador y de
flujo fijo hasta draft PR**. No queda certificado como scheduler universal,
servicio multiusuario, sandbox de código no confiable, sistema de auto-merge o motor
de deploy. El CI integral rojo de Bloom debe resolverse en el proyecto destino antes
de considerar merge; no invalida la fidelidad del piloto de dominio.

## Efectos de O5-A

Se creó el clone local solicitado, se restauró el proyecto de tests de dominio y se
ejecutó exclusivamente su baseline. No se usó Docker, base de datos, API, frontend,
notificaciones o GitHub; no se modificaron archivos tracked, ramas ni estado remoto.
Luego el Planner leyó Bloom bajo el sandbox `unelevated` y persistió el artefacto
anterior sin modificar el source.
