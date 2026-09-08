# ADR SF-0001 — Revisiones de trabajo separadas de specs y runs

Fecha: 2026-09-07. Estado: decisión de implementación dentro de Phase 1 autorizada;
aceptación de la fase se registra separadamente en su evidencia.

## Decisión

Package nuevo `@specdd/artifact-model`. Reutiliza project-model para identidad,
schemas y diagnósticos, sin extender CapabilityPack, SpecArtifact o PlanArtifact
con estado de negocio. Requirement contiene criterios; OpenQuestion y Decision
tienen payloads propios. Reglas BA detalladas esperan Phase 3.

Cada revisión es un snapshot con journal de lifecycle. Las APIs retornan copias;
editar crea otro snapshot que fija el registro anterior completo por SHA-256.
El journal encadena eventos sujetos al contenido exacto. `status` es una proyección
verificada del journal, nunca una bandera de autorización independiente.

Usar Web Crypto asíncrono y JSON determinista en el entry point portable, sin
imports Node ni crypto artesanal. Ordenar claves, preservar strings y orden de
arrays. Serializar sólo JSON ordinario finito; rechazar objetos no portables.
Las relaciones fijan revisión/hash y Project Definition fija contexto por hash.
El host debe revalidar binding al guardar una aprobación o proyectarla.

## Alternativas

- Extender PlanArtifact: acopla edición BA al run técnico y a su store.
- Poner todo en Project Definition: mezcla catálogo de intención y trabajo diario.
- Envelope `content:any`: pierde la validación útil del requisito y preguntas.
- Un schema por criterio: demasiados agregados antes de necesidad de revisión propia.
- Store SQLite ahora: difiere la validación del dominio y adelanta Phase 4.

## Consecuencias

No se modifican schemas previos, ZIPs, conocimiento de roles ni runtime. La
persistencia deberá conservar revisiones y comparar la revisión esperada dentro
de una transacción; devolver una copia pura no bloquea replay entre procesos.
`actor.kind: human` es una atestación del host, no identidad autenticada. Un
adversario que reescriba todos los datos/hashes puede fabricar un historial; no
se declara firma ni verificación externa. Las contribuciones preservan origen,
pero no prueban verdad de negocio ni atribución palabra por palabra.

Proyecto inicial preparado por operador; importación mediante Project Definition
válido. No se inventa modelo alternativo de proyecto. La aprobación de requisitos
no publica specs; esa transformación revisada y sus preimages pertenecen a Phase 5.
