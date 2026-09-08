# ADR SF-0004 — Workspace BA local y aceptación separada

Fecha: 2026-09-07. Scope: Phase 4.

Servicio Node/SQLite separado del control plane. UI servida por el mismo origen:
evita CORS y credenciales en el portal estático. Portal conserva Capability Builder
y agrega acceso al Workspace. Se selecciona proyecto preparado, no se inventan
campos de Harness para ofrecer creación genérica sin contexto.

Snapshot por proyecto + historial append-only acotado por operación, con CAS
version/hash y transacción SQLite. Simplicidad antes de granularidad multiusuario.
Conservar todo el historial, no podar evidencia automáticamente. Verificarlo al
abrir; hashes no impiden que un atacante con escritura total regenere la cadena.
Proteger la carpeta con permisos del usuario y no alojarla en un repositorio público.

Solicitud/propuesta fuera del estado aprobado; adopción explícita por sugerencia,
sin aceptar decisiones/respuestas del agente. Receipt BA usa los contratos de
Phase 3. Nuevas revisiones o cambios de grafo invalidan approvals anteriores.

La skill OpenAI Docs motivó revisar los límites del transporte antes de habilitarlo:
[App Server](https://learn.chatgpt.com/docs/app-server) documenta outputSchema e
interrupt, y advierte que read-only usa fullAccess por defecto. La
[referencia de configuración](https://learn.chatgpt.com/docs/config-file/config-reference)
documenta deshabilitar shell, apps y web; el tráfico de conectores no queda cubierto
por el sandbox de comandos. El nuevo modo es opt-in, no altera defaults de O3.
Configuración/sandbox efectivos dependen de versión instalada y políticas del host;
el piloto real debe validarlos. No afirmar seguridad por una instrucción en prompt.

Actualización 2026-09-07: el schema instalado no declara `readOnly.access`.
La [corrección offline](../phases/phase-4-permissions-fix.md) lo reemplaza por perfil
nombrado de sólo lectura acotada, validando config/perfil antes de enviar el prompt.
La comprobación de enforcement real sigue pendiente; no ampliar a lectura global.

Prototipo automático usa runtime falso y lo identifica. Aceptar Phase 4 exige además
un run real trazable y observación del BA trabajando sin consola. La implementación
puede quedar Partial a la espera de esa aceptación; no pasar a Phase 5 por tener
tests verdes. Sin SSO, colaboración, plugins obligatorios, deploy ni proyección.
