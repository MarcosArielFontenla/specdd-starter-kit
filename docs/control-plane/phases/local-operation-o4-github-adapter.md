# Operación local O4-C1 — adaptador GitHub y reconciliación offline

Fecha: 2026-09-05. Estado: **O4-C1 implementado y validado offline**. Su runtime
acotado continúa en [O4-C2-A](local-operation-o4-github-runtime.md).

## Alcance implementado

- `GitHubDraftPublisher` separa la preparación de la rama, la observación remota y
  la creación de la draft PR mediante interfaces inyectadas. No crea procesos ni
  posee credenciales.
- El commit head esperado se valida y persiste mediante `prepared(...)` antes de
  cualquier posible push o creación de PR.
- `GitHubCliGateway` construye invocaciones estructuradas para observar la rama y
  las PR, y para solicitar una única draft PR. Recibe un transporte; C1 no aporta
  un transporte de proceso y por eso no puede ejecutar `gh` por sí solo.
- La identidad exacta incluye owner/repository, base, head, SHA del head, estado
  `OPEN`, `isDraft: true` y un marcador body ligado a `operationId` y al hash del
  subject. Una rama discordante, PR cerrada/no draft, respuestas adicionales o
  datos inválidos fallan cerrados.
- Una draft PR exacta se reutiliza sin repetir push/create. Después de un resultado
  incierto, la reconciliación distingue `published`, `absent` y `conflict`.
- `absent` devuelve la publicación a `approved` para una nueva acción explícita;
  `published` registra el recibo; `conflict` conserva el estado detenido para
  intervención humana. Todas las transiciones están ligadas al `operationId`.

## Evidencia offline

`npm run speccontrol:test`: **34/34 aprobadas**.

Las pruebas usan transports y preparadores de rama en memoria. Cubren publicación,
pin previo del SHA, draft PR existente idempotente, los tres resultados de
reconciliación, PR cerrada/no draft, SHA remoto incorrecto, PRs adicionales, JSON
malformado o sobredimensionado, URL de PR discordante y el endpoint HTTP de
reconciliación. También comprueban que los argumentos construidos no contienen
tokens, secretos ni passwords.

No se invocó `gh`, no se abrió red, no se accedió a GitHub y no se creó commit,
push remoto ni PR real durante esta validación.

## Gate siguiente

O4-C2-A ya implementó y validó offline el transporte y la preparación Git; B1
comprobó autenticación y destino en modo lectura. El push y la draft PR reales
requieren un run ligado al proyecto y una autorización separada. Merge, cierre de
PR y deploy siguen fuera de alcance.
