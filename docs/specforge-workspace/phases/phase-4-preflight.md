# Phase 4 — preflight del piloto BA real

Fecha: 2026-09-07. Autorización del usuario: «si autorizado» al preflight y una
única ejecución BA sintética, con detención ante fallo y sin retry automático.

Resultado: **needs-attention antes de ejecutar el modelo**. No se consumió la
ejecución BA autorizada: no se inició ningún turn, no se envió el requisito ni se
creó un store del piloto. Phase 4 continúa Partial.

## Evidencia local

Ejecutable seleccionado por PATH:
`C:/Users/tecno.pc/AppData/Local/Programs/OpenAI/Codex/bin/codex.exe`.
Versión: `codex-cli 0.145.0`.

| Artefacto inspeccionado | SHA-256 |
|---|---|
| Ejecutable | `83751f15cb6a0a7b97df67752c001e3fe1c20e18ffbfec3ff63567296205eb6c` |
| `TurnStartParams.json` generado por ese ejecutable | `f23021c02d28b60fccb6dcaaace9ff676127065f8254537265d6622656860dca` |
| Transporte compilado `codex-planner.js` | `d24016be7d1d8a81b2b420d6d05387302cc18e739f781d07cce5c68c0449b1cf` |

Se preservan schema completo y reporte en
`.specforge-workspace/preflight-20260907/` (evidencia local ignorada por Git).
Generación de schema con `--experimental`: exit 0. El CLI informó restricciones
de permisos sobre aliases temporales arg0; no se las evadió ni se ejecutó un setup.

## Hallazgo y decisión

OpenAI Docs describe `readOnly.access` con raíces restringidas en la
[documentación de App Server](https://learn.chatgpt.com/docs/app-server#sandbox-read-access-readonlyaccess).
Sin embargo, el schema emitido por el ejecutable instalado sólo declara `type` y
`networkAccess` en `ReadOnlySandboxPolicy`. No declara `access`,
`includePlatformDefaults` ni `readableRoots`, que el transporte BA sí envía.

Esto no prueba si el runtime rechaza o ignora un campo desconocido; **ese
comportamiento no se probó**. Sí impide acreditar el aislamiento de lectura
prometido. La referencia oficial no sustituye verificar el protocolo local.
Se detuvo el preflight y no se inició el piloto, sin cambiar a acceso completo,
otro ejecutable o una política menos restrictiva.

Faltan por validar configuración efectiva/hooks, herramientas/plugins, permisos
nombrados admitidos, enforcement Windows, autenticación y modelo disponible.
No se afirma que alguna de esas comprobaciones haya pasado.

## Siguiente paso propuesto

Autorizar una corrección acotada del adaptador BA para el mecanismo de permisos
soportado por el runtime instalado, junto con un gate automático de compatibilidad
fail-closed y regresiones offline. Conservar defaults de SpecControl y evidencia.
No actualizar Codex, dependencias o configuración global, ni ejecutar el modelo
durante esa corrección. Luego repetir el preflight antes de la primera ejecución
BA real, bajo autorización explícita; la aceptación observada del usuario sigue
pendiente. Sin Bloom, publicación, commit/push, PR ni deploy.
