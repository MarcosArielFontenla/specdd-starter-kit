# ADR SF-0002 — Grafo de conocimiento con referencias a revisiones

Fecha: 2026-09-07. Decisión de implementación de Phase 2 autorizada.

## Contexto

Phase 1 fija los targets dentro del subject de cada artefacto. Es adecuado para
referencias unidireccionales previas, pero dos snapshots no pueden fijarse mutuamente
por hash sin circularidad. Los grafos SpecControl además describen ejecución, no
conocimiento. Ninguno debe cambiar de significado para resolver esta necesidad.

## Decisión

Nuevo `SpecForgeArtifactGraph` 1.0.0, dentro de artifact-model mediante subpath.
Contiene un conjunto acotado de refs a artefactos y assertions de relación con
proveniencia atestada. Es una fuente explícita adicional de relaciones, no un
segundo store de contenido. El grafo efectivo agrega siempre las relaciones de
los snapshots; guarda el origen `artifact`/`graph` y rechaza duplicados/conflictos.

No se cambia Artifact 1.0.0 ni se remapean sus tres relaciones silenciosamente.
El grafo habilita refines/blocks/supersedes con reglas específicas. Reconoce
validates/implements, pero los rechaza mientras no existan los payloads apropiados.
El proyecto sigue siendo Project Definition; el grafo sólo fija su hash.

Unión causal acíclica, invirtiendo blocks para detectar dependencias circulares;
relates-to simétrica y con ciclos permitidos. El grafo de ejecución sigue separado.
Un reemplazo declarado no otorga aprobación ni cambia el status del reemplazado.
Las consultas de impacto muestran alcance estructural potencial, no una decisión
de producto ni una prueba de tests aprobados.

## Alternativas y consecuencias

- Cambiar el hash de artefacto para omitir relaciones: invalidaría approvals Phase 1.
- Usar refs flotantes: perdería la identidad de la revisión observada.
- Usar el DAG de SpecControl: confundiría dependencias semánticas y ejecución.
- Duplicar todas las relaciones y elegir una fuente preferida: permitiría ocultar
  blockers preexistentes. Se elige combinación con origen y error por duplicados.

Cada vista es una instantánea validada, sin estado mutable expuesto. El hash completo
de registros distingue cambios de lifecycle. El host controla inventario actual,
historial y permisos; estas consultas no descubren artefactos fuera del contexto.
El análisis no añade permisos ni hace persistencia; Phase 3 deberá integrar la
elegibilidad transitiva en sus acciones. El approval de Phase 1 no se presenta como
un gate del nuevo grafo.
