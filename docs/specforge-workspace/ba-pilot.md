# Piloto BA y alcance recomendado de Phase 1

Estado: propuesta de Phase 0 para revisión. Fecha: 2026-09-07.

## Hipótesis de valor

Un BA puede convertir un pedido ambiguo en un requisito revisado, manteniendo
preguntas y decisiones visibles, sin operar un repositorio. El éxito no se mide
por cantidad de documentos generados sino por poder entregar una intención clara,
con revisión humana y trazabilidad, al equipo de ingeniería.

## Primera sección vertical útil

Un usuario local, un proyecto con Project Definition preparado previamente y un
requisito. La preparación técnica es responsabilidad del operador; el BA sólo
selecciona el proyecto por nombre. El producto debe declarar ese prerrequisito.

1. Seleccionar proyecto y ver contexto aprobado, procedencia y faltantes.
2. Crear pedido con título, descripción, objetivo y fuente conocida.
3. Ejecutar «Analizar requisito» desde la capacidad BA. Mostrar estado, fallo o
   cancelación; conservar intacto el borrador si la ejecución no finaliza.
4. Revisar sugerencias separadas del texto humano: ambigüedades, preguntas,
   reglas propuestas, criterios y posibles impactos con sus referencias.
5. Responder preguntas como humano y aceptar/editar/descartar sugerencias. Guardar
   nuevas revisiones y conservar la proveniencia de las aportaciones del agente.
6. Revisar contenido y relaciones; impedir aprobación con preguntas bloqueantes
   abiertas o si cambió la revisión mostrada. Aprobar la revisión exacta.
7. En Phase 5, preparar una propuesta SpecDD con diff, destino y límites del mapeo.
   Revisarla por separado antes de crear/actualizar una spec canónica.

Pantallas mínimas: lista de requisitos, preguntas/revisiones pendientes derivadas
del estado, detalle de requisito con contenido/sugerencias/historial/aprobación.
No se necesita dashboard ni visualización de grafo para probar este recorrido.

## Caso de aceptación propuesto

Usar inicialmente un proyecto de prueba y el pedido sintético «Quiero que las
personas puedan cancelar su turno». No implica cambiar Bloom ni afirmar que esa
regla pertenece a su negocio. El agente debe preguntar quién puede cancelar,
con qué plazo, qué estados lo permiten y qué ocurre después, sin inventar valores.

El humano proporciona las respuestas durante la prueba. Se captura una revisión
aprobada, se edita después un criterio y se demuestra que la nueva revisión exige
revisión y que una proyección previa no puede publicarse contra el nuevo contenido.

| Evidencia requerida | Fase |
|---|---|
| Payloads válidos/inválidos, revisiones, proveniencia y decisión exacta | 1 |
| Preguntas/decisiones/requisito enlazados; no refs inexistentes o entre proyectos sin autorización | 2 |
| Acciones BA con input/output tipado, conocimiento canónico, reglas de preguntas y aprobación | 3 |
| Flujo completo en UI, restart conserva contenido e historial, ejecución real trazable | 4 |
| Diff reproducible, reporte de mapping incompleto, rechazo de destino cambiado y segunda aprobación | 5 |

La aceptación del piloto incluye observación de un usuario siguiendo el recorrido
sin consola/IDE; pruebas automatizadas de UI no sustituyen esa validación de utilidad.
El tiempo y la cantidad de intervención se registrarán durante el piloto, sin
inventar ahora métricas ni umbrales de productividad.

## Límite de ejecución

El prototipo de interacción puede probarse con un adaptador simulado identificado
como tal. Para aceptar «usar agente BA» se necesita una ejecución real con inputs,
capacidad, salida y procedencia registrados. Si no hay runtime configurado, edición
y revisión locales siguen disponibles y la acción de agente comunica su indisponibilidad.

El servicio actual usa interfaces Planner/Developer/Reviewer sobre un flujo fijo;
no se debe ejecutar Developer para analizar un requisito. Phase 3 debe diseñar la
acción y Phase 4 integrar el camino disponible más pequeño, con cancelación y salida
validada. Warp, Figma y servicios externos no son prerrequisitos del dominio.

## Phase 1 propuesta

Preparar spec y ADR sobre envelope/payloads y ownership antes del código. Entrega
acotada a contrato portable, tipos, ejemplos, validación estructural/semántica,
reglas de revisión/aprobación y política de evolución/migración. Requirement,
OpenQuestion y Decision como candidatos; AcceptanceCriteria tipados con identidad
dentro de Requirement. BusinessRule e ImpactAnalysis detallados esperan Phase 3.

Incluir referencia a Project Definition, ownerRole y procedencia, sin nuevo modelo
de proyecto. Definir la forma mínima de relaciones ahora para no romper el modelo
en Phase 2. Mantener implementaciones de almacenamiento, UI, runtime y proyección
fuera de Phase 1. Ningún schema existente cambia de significado.

Pruebas negativas prioritarias: revisión inexistente, hash obsoleto, referencia de
proyecto incorrecta, IDs duplicados, autoría humana falsa de una propuesta, pregunta
bloqueante abierta, mutación de contenido aprobado y schema desconocido. Donde no
hay backend aún, probar funciones puras de transición y describir el enforcement
transaccional pendiente; no declarar persistencia implementada.
