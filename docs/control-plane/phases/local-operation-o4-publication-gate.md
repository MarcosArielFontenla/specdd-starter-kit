# Operación local O4-A — gate exacto de publicación

Fecha: 2026-09-05. Estado: **O4-A completo**. Su continuación offline está validada
en [O4-B](local-operation-o4-local-publication.md), y su adaptador GitHub offline en
[O4-C1](local-operation-o4-github-adapter.md); el transporte y la publicación real
no están implementados ni autorizados.

## Alcance implementado

- Contratos `SpecControlPublicationBinding`, `SpecControlPublicationSubject` y
  journal de publicación con schema SQLite 4.
- Binding confiable sólo por argumentos de arranque; la UI no elige repositorio,
  remote, ramas, ejecutable ni credenciales.
- Inspector Git offline, sin shell, con timeout y salida acotada. Exige que el root
  registrado sea el top-level exacto, esté limpio, en la rama base configurada y
  que el remote coincida con el owner/repository GitHub declarado.
- Rama head determinista: `<headPrefix><runId>-a<executionAttempt>` y validación
  mediante `git check-ref-format`.
- Subject canónico ligado a proyecto, run, intento, plan aprobado, binding O3,
  baseline, diff, evidencia, binding de publicación, revisión base, target y
  `draft: true`.
- Preparación web, visualización del subject y aprobación/rechazo por SHA-256 exacto.
  La aprobación reinspecciona Git y toda la evidencia O3 para detectar drift.
- Intención `publishing` con `operationId` persistida antes de un futuro efecto,
  finalización ligada a esa operación y replay bloqueado. Un reinicio durante ese
  estado produce `PUBLICATION_OUTCOME_UNKNOWN`; nunca reintenta silenciosamente.

## Pruebas

`npm run speccontrol:test`: **21/21 aprobadas**.

Además de la regresión O2/O3, cubren hash incorrecto, replay, target/branch
discordantes, aprobación sin gate, rechazo terminal, operación equivocada,
finalización duplicada, restart con resultado incierto, drift entre preparación y
aprobación, ausencia de endpoint `publish` y un repositorio Git temporal real que
acepta el estado limpio y rechaza un archivo nuevo.

## Límite deliberado y siguiente gate

O4-A no recibe tokens GitHub, no crea commits/branches remotos, no hace push y no
crea PRs. Los métodos transaccionales que representan el futuro efecto no están
expuestos por HTTP. El ejemplo de binding usa un destino ficticio y no activa nada.

O4-B implementó y probó el recorrido web completo con una publicación local
controlada. O4-C1 implementó y probó offline el adaptador y la reconciliación por
`operationId`/head/PR; O4-C2-A agregó el runtime acotado offline y B1 verificó el
destino read-only. Otra autorización humana específica será necesaria para ejecutar el push y crear una draft PR real. Merge y deploy
continúan fuera de alcance.
