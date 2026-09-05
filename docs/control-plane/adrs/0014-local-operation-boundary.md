# ADR 0014 — Operación local mediante adaptador y workflow acotado

Fecha: 2026-09-05. Estado: **aceptado** por aprobación del diseño ("si aprobado").
La selección y aceptación del runtime siguen sujetas a evidencia de O1.

## Contexto y problema

El portal genera Harnesses; los contratos de SpecControl y herramientas de evidencia
no operan conjuntamente un flujo desde la web. El siguiente objetivo autorizado es
comenzar esa integración sin volver obligatorio Warp ni retomar SpecDeploy.

## Opciones

1. Agregar botones que invoquen shell arbitrario: no establece aislamiento, gates
   ni recuperación y expone una superficie de ejecución insegura.
2. Construir un motor universal/distribuido: contradice los antiobjetivos del roadmap.
3. Integrar un runtime existente mediante un adaptador, coordinando solamente el
   perfil fijo de tarea → spec/plan → aprobación → código → revisión → eval → PR.

## Decisión

Opción 3. Servicio local separado de los wizards, un operador, una ejecución activa
por proyecto, bindings explícitos y rechazo previo de capacidades no soportadas.
El servicio implementa gates y persistencia de ese perfil; no evalúa libremente una
DSL ni trata instrucciones al agente como enforcement de seguridad.

Runtime, autenticación, aislamiento y almacenamiento se seleccionarán mediante un
spike verificable antes del piloto. No se elige un proveedor sólo por estar nombrado
en el roadmap. Historial canónico es proyección de observaciones, no fuente de
permisos ni sustituto de transacciones de ejecución.

## Consecuencias y migración

Reutilizar schemas 1.0.0, mantener wizards y ZIPs compatibles y conservar APIs
browser-safe separadas de Node/ejecución. Si falta una semántica canónica, presentar
un cambio versionado; no sobrecargar silenciosamente nodos existentes.

Los costos, límites y permisos dependen del adaptador elegido. Una acción de estado
incierto requiere reconciliación o intervención, no retry ciego. La primera entrega
no ofrece garantías de seguridad multiusuario ni de producción empresarial.

## Verificación requerida

Pruebas de gates/hash/replay, concurrencia, crash, cancelación, paths, acceso web
local no autorizado, logs y publicación duplicada; piloto externo aislado con datos
sintéticos. La aceptación no se satisface con un runtime simulado.

Detalle: [spec de operación local](../../superpowers/specs/2026-09-05-speccontrol-local-operation-design.md).
