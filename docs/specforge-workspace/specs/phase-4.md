# Phase 4 — MVP BA local

Autorizado: «excelente, vamos con Phase 4 entonces». Implementar la sección
vertical, detenerse antes de Phase 5 y separar pruebas simuladas de aceptación real.

## Arquitectura y recorrido

Servicio local `@specdd/specforge-workspace`, puerto 4312, UI propia accesible desde
el portal. Mismo patrón operacional que SpecControl: operador prepara proyecto,
identidad local y sesión; BA selecciona por nombre y trabaja sin Git/IDE/JSON.
No convertir el portal estático en backend ni reutilizar tablas de SpecControl.

SQLite guarda estado por proyecto, snapshots históricos encadenados, solicitudes,
propuestas, recepción de runtime, decisiones sobre sugerencias y receipts BA.
Cada escritura humana compara versión previa y hace commit atómico; carga verifica
hashes, schema, historial de artefactos y grafo. Un único servicio posee el store.
Runs interrumpidos al reiniciar pasan a needs-attention, nunca retry automático.

Pantallas: proyecto/contexto, requisitos, preguntas/reglas relacionadas, propuesta
separada, historial y aprobación. Crear/editar requisito y criterios; analizar,
cancelar, revisar sugerencias individualmente y aceptar un subconjunto o descartar;
resolver preguntas como humano, revisar reglas, preparar subject y aprobar exacto.
Mostrar errores/faltantes/bloqueos y stale approval. Revisión humana nunca se infiere
de presionar «Analizar». No insertar HTML de fuentes/propuestas.

La adopción registra qué sugerencias se eligieron, crea borradores con origen agente,
agrega preguntas/reglas enlazadas y nuevas revisiones para redacción/criterios.
La resolución humana conserva origen previo. IDs nuevos los genera el host.
Al editar se actualizan pins de nodos en el grafo bajo CAS y se conservan assertions
históricas; nuevas assertions quedan atestadas en la operación humana. Los vínculos
embebidos ajenos no se reescriben silenciosamente: si quedan stale la operación falla.
Receipts anteriores se conservan y su validez actual se deriva contra el grafo.

## Contexto y ejecución

Importación por operador de bundle explícito `{project, capability}` ya revisado,
con binding habilitado y versión/manifest exactos. No leer un repo externo ni
fabricar contexto. Opción demo genera un proyecto claramente sintético desde la
fixture canónica y el BA pack real; no es Bloom ni está aprobado por stakeholders.

Runtime intercambiable: interfaz de solicitud estructurada + AbortSignal, retorno
de output y receipt. Adaptador inicial reutiliza runCodexStructured, no Planner ni
Developer. Opt-in: executable, modelo y sandbox Windows explícitos. Restricción
adicional text-only con herramientas/config limitada y acceso read-only restringido;
sin MCP/apps/web, sin escrituras de proyecto ni publicación. No usar danger-full-access.
El proceso del proveedor puede consumir red/créditos cuando se habilita: requiere
acción del usuario y aceptación del envío del contexto, nunca ejecución al cargar UI.

La primera ejecución real con proyecto sintético y la observación humana del flujo
son acceptance pendientes explícitos si no se autorizan/configuran durante esta
entrega. Tests inyectan runtime falso marcado como tal; ningún mock acredita uso real.

## Seguridad y pruebas

Loopback IPv4, Host exacto, sesión bootstrap de un uso, cookie HttpOnly/SameSite,
CSRF + Origin para writes, CSP, no CORS, no caché/referrer, cuerpos limitados y
errores acotados sin prompts/secretos en logs. Identidad local atestada, no multiusuario.
Timeout y cancelación terminal; resultados tardíos ignorados. Sin reintentos ocultos.

Probar CAS, restart, corrupción, rollback, revisión/proveniencia, stale propuestas,
receipt/contexto, preguntas bloqueantes, fail/cancel/late completion, autorización
HTTP, UI completa con mock explícito, builds y regresiones de dominio/packs.
