# Phase 4 — segundo preflight real, sin modelo

Fecha: 2026-09-07, 14:10:22 UTC. Autorización: «si autorizado» a repetir el
preflight contra App Server, sin ejecutar el modelo ni modificar configuración global.

Resultado: **needs-attention**, detenido por `TEXT_ONLY_PERMISSIONS_UNVERIFIED`.
RPCs ejecutados: únicamente `initialize` y `config/read`. Cero `thread/start`,
cero `turn/start`, sin prompt de negocio, modelo, retry ni setup de sandbox.

## Observaciones verificadas

Se usó el mismo ejecutable de Codex 0.145.0, SHA-256
`83751f15cb6a0a7b97df67752c001e3fe1c20e18ffbfec3ff63567296205eb6c`,
con los argumentos del adaptador BA corregido y un directorio temporal nuevo.
No se abrieron proyectos de negocio.

La respuesta real de configuración informa:

- El default corresponde al perfil BA solicitado y el perfil está presente.
- Los ocho flags de herramientas consultados figuran en `false`.
- `web_search=disabled` y `project_doc_max_bytes=0`.
- **Un servidor MCP todavía configurado**, aun enviando `mcp_servers={}`.
- **14 entradas de plugins** y **`notify` presente**.
- Cero entradas inline de hooks en esa respuesta; esto no prueba ausencia de
  archivos de hooks externos ni hooks administrados.

Las entradas de plugins no demuestran por sí solas que todos estén habilitados o
se hayan ejecutado. La presencia de configuración no permitida basta para rechazar
el gate actual. Tampoco se afirma que se haya ejecutado `notify` o alguna herramienta.

El reporte incluye `profileMatches=false` como comparación de serialización JSON
directa del probe. El orden de claves puede producir ese resultado: **no se usa
como prueba de diferencia semántica del perfil**. El validador de producción sí
compara canónicamente; el acceso efectivo completo todavía no fue acreditado.

La presencia del MCP indica que no se puede tratar un override de tabla vacía como
prueba suficiente de ausencia de configuración heredada. No se relajó el gate para
aceptar lo que devolvió el servidor.

## Evidencia y preservación

Probe y reporte redactado se conservan en `.specforge-workspace/preflight-r2/`.
El reporte contiene hashes, contadores y flags; no guarda configuración completa,
comandos de notificación, credenciales o contenido de conexiones. Se conservan el
directorio temporal de la prueba y las evidencias de preflights anteriores.

SHA-256 de `C:/Users/tecno.pc/.codex/config.toml` antes y después, idéntico:
`168e9215ac17037b97c45547c3f368de1f63280940da02ae317d60a3d0a203c6`.
El proceso se cerró al detectar el fallo. El exit del script sólo indica que
terminó de registrar evidencia; no significa que el preflight haya pasado.

OpenAI Docs se usó para confirmar el método de inspección
[`config/read`](https://learn.chatgpt.com/docs/app-server); la decisión se basa
en la respuesta real, no sólo en la documentación o en los mocks anteriores.

## Próximo alcance propuesto

Corregir el aislamiento de configuración **por proceso BA** para las entradas
heredadas de MCP/plugins/notify, inspeccionando su procedencia en modo read-only y
agregando regresiones offline. No desactivar integraciones globales del usuario,
no usar perfiles de acceso amplio, no actualizar dependencias y no ejecutar modelos.
Requiere autorización antes de implementar ese nuevo ajuste.

Quedan pendientes listado permitido del perfil, hooks externos, perfil activo del
thread, enforcement Windows y disponibilidad de autenticación/modelo. No se
avanza a la ejecución BA real ni a Phase 5: Phase 4 permanece Partial.
