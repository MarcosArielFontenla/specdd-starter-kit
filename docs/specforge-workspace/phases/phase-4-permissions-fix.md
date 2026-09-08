# Phase 4 — corrección offline del adaptador de permisos BA

Fecha: 2026-09-07. Autorización: «si autorizado» a corregir localmente el adaptador,
agregar validación fail-closed y regresiones offline, sin ejecutar el modelo ni
actualizar dependencias. Implementación terminada; **preflight real aún pendiente**.

## Cambio

El modo BA dejó de enviar `readOnly.access`, no declarado por Codex 0.145.0.
Usa un perfil con nombre derivado del directorio vacío de ejecución: `:root=deny`,
únicamente ese path absoluto con lectura, sin permisos de escritura, sin `extends`,
sin raíces adicionales y con red de comandos deshabilitada. La configuración se
pasa como argumentos del proceso; no se escribe en la configuración global.

La skill OpenAI Docs orientó el cambio hacia los
[perfiles de permisos](https://learn.chatgpt.com/docs/permissions). Se contrastaron
los campos utilizados con seis schemas locales conservados del ejecutable instalado.
Ese contraste es estático: no acredita el enforcement del sistema operativo.

Antes de enviar el prompt, el transporte:

1. Lee `config/read` y exige coincidencia exacta del perfil/default y los controles
   de herramientas ya configurados. Campos ausentes o acceso adicional rechazan.
2. Consulta `permissionProfile/list`: perfil exacto permitido, sin duplicados ni
   paginación pendiente. Un RPC desconocido también detiene el flujo.
3. Inicia el thread usando `permissions`, sin combinarlo con `sandbox`.
4. Comprueba perfil activo sin herencia, raíces exactas, modelo, cwd, aprobación
   `never` y red deshabilitada. Vuelve a leer configuración/listado en esa sesión.
5. Sólo entonces puede enviar `turn/start` con el mismo perfil, sin `sandboxPolicy`.

Una configuración no verificable produce `RUNTIME_PERMISSIONS_UNVERIFIED` en el
Workspace, conserva el borrador y queda en `needs-attention`. No se reintenta ni
se recurre a un perfil integrado de lectura amplia. Los defaults de SpecControl
fuera del modo BA siguen usando su camino anterior.

## Verificación offline

| Prueba | Resultado |
|---|---|
| `npm run speccontrol:test` | 55/55: 46 anteriores y 9 nuevas de permisos/transporte |
| `npm run specforge:test` | 22/22, incluyendo fallo de permisos explícito y terminal |
| `npm run specforge:test:ui` | PASS; agente simulado, escritorio/móvil |
| Contraste de campos con schemas del preflight preservado | PASS; seis schemas, cero llamadas a Codex |
| Compilación TypeScript | PASS, incluida en las suites |

Las pruebas incluyen profiles ampliados/heredados, red/herramientas habilitadas,
datos ausentes, lista incompleta, perfil denegado/duplicado, modelo/raíz incorrectos,
drift posterior al inicio y RPC no admitido. Dos pruebas recorren el transporte
de producción reemplazando `spawn` y stdio por dobles locales: comprueban que no se
envía el prompt antes de los gates y que no hay turn ni retry ante un fallo inicial.
No se confunden esas respuestas sintéticas con evidencia del App Server real.

La evidencia anterior permanece intacta. SHA-256 de su `report.json`:
`ddd083e144d2f32453344f19a5dbd5ecfe8bde5bfea2e6d9defb93a258bc497e`.
No se actualizó Codex, dependencias ni configuración global. Sin cambios en Bloom,
commit/push del repositorio, PR o deploy. No se ejecutó un modelo real.

## Límites y próximo gate

El runtime real debe confirmar la forma efectiva de `config/read`, que puede
rechazarse si omite datos; no se interpreta un valor ausente como una restricción
aplicada. Los controles rechazan hooks/plugins/notify presentes en esa respuesta,
pero no acreditan ausencia de archivos de hooks externos ni de políticas
administradas fuera de ella. Esa inspección y la validación Windows siguen pendientes.

Repetir primero el preflight real bajo autorización, sin turn de modelo ni cambios
de configuración global. Si confirma compatibilidad y enforcement, realizar después
la única ejecución BA sintética autorizada y la aceptación observada por el usuario.
Phase 4 permanece Partial y Phase 5 no comienza todavía.
