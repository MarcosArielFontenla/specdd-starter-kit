# Operación local O4-C2-A — runtime GitHub acotado, validado offline

Fecha: 2026-09-05. Estado: **O4-C2-A implementado y validado offline**. El preflight
read-only B1 está registrado [aquí](local-operation-o4-github-preflight.md).

## Implementado

- `BoundedGitHubCliTransport` acepta un ejecutable absoluto y sólo permite las tres
  formas estructuradas que usa el adaptador: observar ref, listar PRs y crear una
  draft PR. Rechaza cualquier otro subcomando o combinación.
- Los procesos se ejecutan con `shell: false`, entorno mínimo, stdin/salida acotados,
  timeout, cancelación y sin imprimir argumentos, cuerpo, stderr ni credenciales.
- `GitHubBranchPreparer` reinspecciona top-level, limpieza, rama base, HEAD y remote;
  clona localmente el proyecto, reconstruye exclusivamente el diff O3, compara los
  paths staged y crea el commit con hooks y firma deshabilitados.
- Cada clone privado configura `core.longpaths=true` localmente antes del primer
  checkout. Esto soporta repositorios Windows con paths profundos sin modificar la
  configuración Git global.
- La validación de bytes anteriores usa el working tree fuente limpio y aprobado.
  Esto evita divergencias artificiales causadas por `core.autocrlf` en un clon nuevo.
- `GitHubGitPusher` sólo construye un push a la URL GitHub ligada al subject y usa
  `--force-with-lease=refs/heads/<head>:`: la lease vacía exige que la rama no exista
  y evita sobrescribir o avanzar una rama creada en una carrera.
- El arranque conecta estos componentes únicamente con el binding `github` y los
  flags explícitos `--github-cli` y `--github-publication-root`. Es mutuamente
  excluyente con el publicador `local-git`.
- Una operación ambigua anterior a `publicationHeadPrepared` también es
  reconciliable. Sin expected head, sólo rama ausente y cero PRs exactas retornan a
  `approved`; cualquier rama o PR observada produce conflicto fail-closed.

## Evidencia

`npm run speccontrol:test`: **46/46 aprobadas** en O5-C3-R1.

Las nuevas pruebas ejecutan un script Node local como CLI GitHub falso, validan la
allowlist, stdin, timeout y límite de salida. Un repositorio Git temporal real prueba
la preparación exacta, un pusher inyectado publica sólo a un bare remote temporal y
confirma que el source queda intacto; otro ejecutable falso verifica la forma exacta
del push create-only. También se rechaza source drift antes de preparar.
Un smoke adicional arranca el servicio con todos los flags GitHub y un CLI falso,
confirma `O4 publisher: github` y termina sin invocar dicho CLI.
La regresión de paths largos confirma configuración local antes del checkout. Tres
casos pre-head cubren remoto vacío, rama presente y PR presente, y una prueba HTTP
confirma la transición a `approved` únicamente para ausencia exacta.

No se resolvió ni invocó `gh`, no hubo red, credenciales GitHub, push a GitHub, commit
en el proyecto fuente ni PR real.

## Configuración disponible, todavía no aceptada en vivo

Una futura prueba C2-B usaría, además de los argumentos O1–O4 existentes:

```powershell
--publication-binding D:\ruta\confiable\github-publication-binding.json `
--git C:\ruta\absoluta\git.exe `
--github-cli C:\ruta\absoluta\gh.exe `
--github-publication-root C:\ruta\privada\SpecDD\github-publications
```

Estos flags habilitan efectos reales al presionar publicar. No deben usarse hasta
aprobar la publicación final, verificar autenticación/destino y seleccionar un run exacto. El paso final debe
crear como máximo una rama y una draft PR, verificar la reconciliación y detenerse
sin merge, cierre de PR ni deploy.
