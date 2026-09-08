# Phase 0 — SpecForge Baseline and Product Boundary

Fecha: 2026-09-07. Estado: Accepted al indicar el usuario «vamos con la siguiente Phase 1».
Baseline: `bd7b8007b7e917317433a2c923e322561355e191`.

## Alcance realizado

Inspección transversal del monorepo con foco en SpecForge: README y guía de setup,
portal, Wizard, generadores, conocimiento de roles, bundler, contratos y ejemplos
de capacidades/proyecto/control plane, servicio local, evals, historial, propuestas,
delivery, templates/specs, convergencia Brownfield, ADRs y pruebas relevantes.
No es auditoría exhaustiva de cada archivo ni nueva aceptación de los otros módulos.

El roadmap suministrado estaba sin seguimiento Git al iniciar; se conserva intacto.
Phase 0 agrega análisis y enlaces documentales, sin modificar arquitectura de
producción, generar un Workspace, cambiar Bloom ni activar agentes externos.

## Entregables A–G

| Requisito del roadmap | Entrega |
|---|---|
| A. Arquitectura actual | [Arquitectura](../architecture.md): responsabilidades, pack, conocimiento, generación, instalación y compatibilidad |
| B. Brecha por rol | Tabla BA/QA/PM/UX/Dev en [arquitectura](../architecture.md) |
| C. Ownership | Tabla de límites en [arquitectura](../architecture.md) |
| D. Inventario de artefactos | [Contratos reutilizables](../artifact-inventory.md) |
| E. Preguntas de modelo | Tabla de decisiones pendientes en [inventario](../artifact-inventory.md) |
| F. Piloto BA | [Recorrido y aceptación](../ba-pilot.md) |
| G. Validación del roadmap | [Tracker y ajustes fundamentados](../roadmap.md) |

## Evidencia de baseline

Pruebas ejecutadas sobre dependencias locales disponibles, sin instalar ni actualizar
paquetes. Las pruebas de source remoto del bundler inyectan fetch simulado; no
demuestran integración con un servicio externo.

| Comprobación | Resultado |
|---|---|
| `npm run test:unit -w specforge-wizard` | 27/27; pretest compila project-model y capability-model |
| `node --test packages/capability-model/test/capability-model.test.js` | 8/8 |
| Generación real en memoria de BA/QA/Dev/UX con Markdown local | 18/18/20/16 archivos; manifiestos validados por generatePack; sin escribir en destino |
| `npm test -w specforge-wizard` | 2/2; generación multirol y detección/colisión en destino, servidor local |
| Enlaces locales de los cinco documentos nuevos | 60 referencias verificadas, 0 destinos inexistentes |
| Whitespace documental | `git diff --check` sin errores; inspección de los cinco archivos nuevos sin trailing whitespace |

La primera ejecución del runner Node dentro del sandbox falló con `spawn EPERM`
antes de ejecutar los tests. La repetición autorizada fuera del sandbox pasó;
se registra como limitación de ejecución, no como defecto funcional de SpecForge.

Cobertura inspeccionada: generación, referencias, playbook ausente, colisiones,
manifest independiente por rol, proyecciones opcionales, semántica de IDs/rutas,
migración legacy draft y subagentes inactivos. E2E existente cubre pack multirol
y destino con Harness/colisión; no cubre un workflow BA persistente inexistente.
No se atribuye a este trabajo una regresión completa de SpecControl/SpecDD/Deploy,
un build productivo del portal ni validación de usuario BA.

## Conclusión y siguiente entrega

El generador actual es una base aprovechable de especialidad, pero no resuelve
trabajo diario para roles no técnicos. Hay patrones útiles de aprobación y
evidencia; falta el modelo editorial versionado y la superficie operativa.

La siguiente entrega es spec/ADR de Phase 1 con envelope, payloads mínimos,
identidad de proyecto, revisión, proveniencia, aprobación y relaciones mínimas.
Las opciones de [inventario](../artifact-inventory.md) permanecen propuestas hasta
su revisión. La autorización para Phase 0 no se registra como aprobación de un
schema nuevo ni de los pilotos posteriores.
