# Operación local O4-B — publicación Git offline de punta a punta

Fecha: 2026-09-05. Estado: **O4-B implementado y validado localmente**. O4-C1 está
documentado por separado; O4-C2-A y el preflight B1 también están completos, pero el efecto real permanece pendiente.

## Implementado

- Provider explícito `local-git`, distinto de `github`, con bare remote absoluto y
  no UNC ligado al subject aprobado.
- Endpoint y botón de publicación disponibles únicamente cuando el arranque incluye
  un binding `local-git` y un root de publicación separado.
- Intención y `operationId` persistidos antes del efecto. El publicador clona el
  commit base exacto, exige que la rama head no exista y crea una rama nueva.
- Aplicación independiente del diff O3 con comprobación de hashes/bytes de baseline
  y worktree. Se bloquean metadata `.git`, traversal, links y roots solapados.
- Staged paths comparados contra el diff canónico antes del commit. Hooks y firma se
  deshabilitan; Git se ejecuta sin shell, sin prompt, con timeout y salida acotada.
- Push dirigido sólo al bare remote local del binding. El recibo create-only incluye
  operación, subject, base, commit, rama, diff/evidencia y hash del remote; su
  `providerRef` empieza con `local-git:` y nunca simula una URL de PR.
- Error o timeout se conserva como `PUBLICATION_OUTCOME_UNKNOWN`; no hay retry
  automático. Replay web y rama remota preexistente son rechazados.

## E2E observado

`npm run speccontrol:test`: **23/23 aprobadas**.

La prueba crea y elimina repositorios fuente/bare, estado y workspaces temporales.
Recorre sesión bootstrap, CSRF, preparación, aprobación exacta y publicación desde
HTTP. Observó un commit nuevo sólo en la rama head, contenido `after` en esa rama,
contenido `before` preservado en `main`, recibo local existente y segundo publish
rechazado. También comprobó rama ya existente, path `.git`, remote UNC y publisher
fallido con resultado incierto. No se usó red ni GitHub.

## Próximo gate

[O4-C1](local-operation-o4-github-adapter.md) ya aporta y valida offline el adaptador
y la reconciliación. O4-C2-A agregó el runtime acotado sin red y B1 verificó acceso
read-only; los efectos reales requieren autorización específica antes de cualquier push. Merge y deploy
permanecen fuera de alcance.
