# Operación local O2 — servicio y pausa persistente

Fecha: 2026-09-05. Estado: **completo y aprobado por el usuario**.

## Alcance implementado

- Nuevo workspace `@specdd/local-control-service` con servicio HTTP ligado sólo a
  `127.0.0.1`, proyecto registrado por argumentos de arranque y un run activo.
- Bootstrap de sesión de un solo uso, cookie `HttpOnly`/`SameSite=Strict`, `Host` y
  `Origin` exactos, CSRF para escrituras, CSP restrictiva y sin CORS.
- SQLite `STRICT` con WAL, `synchronous=FULL`, lock exclusivo, transiciones con
  compare-and-set y reconciliación de `planning` interrumpido a
  `needs-attention`, sin retry automático.
- Planner Codex App Server por stdio privado, MCP desactivado, entorno mínimo,
  `approvalPolicy: never`, permisos `:read-only`, modelo local de binding
  `gpt-5.6-luna` y límites de tiempo/salida.
- Salida estructurada validada, rutas repo-relative, serialización canónica,
  SHA-256 persistido y aprobación de un solo uso sobre ese hash exacto.
- UI mínima que usa `textContent` para todo contenido del agente y sólo expone
  crear, cancelar, aprobar o rechazar; no acepta roots, comandos, permisos ni
  modelos desde el navegador.

## Evidencia automática

`npm run speccontrol:test` aprobó 5/5 casos:

1. sesión loopback, bootstrap de un uso, CSRF y aprobación exacta end-to-end;
2. cancelación del operador conservada como fallo;
3. hash canónico y rechazo de rutas inseguras;
4. pausa persistida, hash incorrecto rechazado y replay rechazado;
5. crash durante `planning` reconciliado sin relanzamiento.

La regresión adicional aprobó:

- `npm run build --workspaces --if-present` para todos los workspaces;
- `npm run test --workspaces --if-present`, incluidos 12 E2E de los portales;
- `npm run test:unit --workspaces --if-present`: 356 pruebas unitarias, 0 fallos;
- lockfile actualizado sin dependencias nuevas de runtime; auditoría npm: 0
  vulnerabilidades conocidas en el lockfile disponible.

Las advertencias existentes de Vite sobre opciones `esbuild` deprecadas y tamaño
de chunks no fallaron la compilación y no fueron introducidas por el servicio O2.

## Aceptación con runtime real

Se ejecutó el servicio contra el fixture público y sintético
`packages/local-control-service/fixtures/project`; no se abrió ni ejecutó Bloom.
El App Server leyó el fixture y produjo un artefacto estructurado real:

- run: `run-1384c1ff-573b-4b9f-8b07-73d909a93281`;
- estado/version: `awaiting-approval` / `2`;
- artefacto SHA-256:
  `f90bf6b265b2f4dd26db269f9d23693dc649430e0ee4c6651e508831fea6f5f9`;
- runtime/model: `codex-app-server` / `gpt-5.6-luna`;
- thread ref SHA-256:
  `f5b7ed5454bbb63018271f8b4d04fde4fd8ea8fb6b6869bd6d86611dbe7491bc`;
- turn ref SHA-256:
  `a092859c402f52b57c3e75865ec1001418da1fcdffe289943d1abd3baf1ce81b`.

El servicio fue detenido limpiamente y reiniciado sobre la misma base. La UI
volvió a mostrar el mismo run, versión, contenido y hash en
`awaiting-approval`; no hubo reconciliación ni inferencia adicional.

Tres intentos previos quedaron visibles como `needs-attention` en la evidencia
privada. El primero demostró el bloqueo de red del sandbox. Los siguientes
permitieron detectar que el protocolo puede emitir commentary antes del
`final_answer` y que la UI construía incorrectamente el contenedor de acciones.
Ambos defectos fueron corregidos; ningún intento fallido se reetiquetó como éxito.

## Gate humano cerrado

El usuario respondió «excelente sigamos con esa O3» después de recibir el hash y el
pedido explícito de decisión. Esa instrucción se registró mediante el endpoint de
aprobación de la consola: el run pasó a `approved`, versión `3`, con actor
`local-operator` y el mismo hash exacto. La acción desapareció de la UI y el replay
sigue cubierto por la prueba negativa. La autorización incluye comenzar O3; no
autoriza Bloom, GitHub, merge o deploy.

## Límite restante

O2 termina en plan aprobado. O3 debe agregar workspace aislado, Developer,
Reviewer separado, comandos/checks estructurados con allowlist, presupuestos,
recibos y bloqueo de avance ante fallos. Hasta entonces SpecControl no es todavía
una Software Factory completa.
