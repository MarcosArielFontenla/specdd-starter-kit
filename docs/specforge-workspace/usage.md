# Guía de uso — Workspace BA local

Estado: Phase 4 **aceptada** el 2026-09-08. Además del runtime **simulado** de
regresión, se completaron un piloto sintético con agente real y un recorrido humano
observado hasta aprobación exacta. El [tracker](roadmap.md) conserva ambos gates.

## 1. Qué abre cada opción

- **SpecForge / Capability Builder:** el wizard existente genera un pack ZIP.
- **SpecForge Workspace:** servicio local separado para el trabajo diario del BA.
  Guarda requisitos, preguntas, reglas, criterios, propuestas, revisiones y receipts.
- **SpecControl:** flujo de implementación de ingeniería. No se ejecuta Developer
  para analizar un requisito BA y no se reutiliza su base de datos.

Desde el portal, SpecForge tiene un enlace a `/specforge-workspace`, con instrucciones
de acceso. Esa página no inicia el servicio ni transfiere credenciales. Abrir el puerto
sin una sesión válida muestra que falta la sesión: usá la URL privada del operador.

## 2. Preparación del operador — sin agente

Una vez, desde SPECDDSTARTERKIT, con Node 22.12+ y las dependencias del lockfile ya
instaladas. No es necesario instalar paquetes ni abrir un proyecto Bloom para probar:

```powershell
npm run specforge:build
$baState = Join-Path $env:LOCALAPPDATA 'SpecDD\specforge-ba-pilot'
npm run specforge:start -- --state-dir "$baState" --operator "Marcos Ariel Fontenla" --demo true
```

Elegí una carpeta nueva y privada. La opción demo registra explícitamente un proyecto
**sintético** y la capacidad BA generada del pack existente. No representa reglas
reales de Bloom ni modifica su checkout. No se ejecuta un agente al iniciar.

1. El servicio imprime una URL privada `http://127.0.0.1:4312/session?token=...`.
2. Abrila una sola vez en el navegador. No la compartas ni la copies a tickets/logs.
3. Seleccioná **Piloto BA — sintético**.
4. Podés crear, editar y revisar requisitos localmente. Los botones del agente
   estarán deshabilitados y explicarán que falta configurar el runtime.
5. Cerrá el servicio con `Ctrl+C`. Reiniciar con la misma carpeta conserva el estado
   y genera otra sesión. No borres la base para volver a entrar.

La identidad `--operator` es una declaración local del operador, **no un login
verificado**. No compartas esta sesión entre revisores que necesiten autoría distinta.

Para un proyecto real, un operador debe revisar un bundle JSON `{project, capability}`
y usar `--bundle` con su ruta absoluta en lugar de `--demo true`. `project` es un
Project Definition canónico válido; `capability` contiene `{pack, files, dependencies}`
según la [API BA](../../packages/artifact-model/BA.md). El binding debe estar habilitado,
tener versión exacta y apuntar al manifest incluido. Faltantes se rechazan, no se
completan con valores inventados. Todavía no hay wizard de importación ni editor del
contexto de proyecto; una reinscripción diferente del mismo ID también se rechaza.

## 3. Habilitar un agente — opt-in validado para el piloto

**Estado actual:** el runtime no está habilitado por defecto. El piloto aceptado
preparó y validó el backend Windows `elevated`, el perfil nombrado, el directorio
vacío de ejecución y el aislamiento por proceso de hooks, MCP, plugins y notify.
Shell, apps, web, MCP y agentes adicionales permanecieron deshabilitados; el
transporte rechaza cualquier evento de tools.

Los [preflights inicial](phases/phase-4-preflight.md),
[segundo](phases/phase-4-preflight-r2.md) y de
[host](phases/phase-4-host-preflight.md) se conservan porque documentan los bloqueos
encontrados antes del éxito: contrato de permisos incompatible, configuración global
heredada y backend `unelevated` insuficiente. No son el estado vigente ni autorizan
ampliar permisos. La [corrección](phases/phase-4-permissions-fix.md) y el
[aislamiento por proceso](phases/phase-4-config-isolation.md) cerraron esos puntos
para el entorno exacto del piloto.

Para otro host, versión o configuración se debe repetir el preflight. No alcanza con
escribir «no usar tools» en un prompt y nunca se debe ampliar lectura como fallback.

Después de la revisión y autorización correspondiente, iniciar con carpeta/operador y
agregar `--codex` (ruta absoluta al ejecutable), `--model` (modelo explícitamente
aprobado) y, en Windows, `--windows-sandbox elevated`, después del setup
validado. También es obligatorio `--isolation-inventory` con la ruta absoluta al
JSON de identificadores MCP/plugins inspeccionados en ese host (formato en el informe
de aislamiento). No contiene comandos ni secretos. No se instala ni eleva un sandbox
automáticamente y no hay fallback sin él.
No añadir estos flags sólo para que desaparezca el aviso de agente no configurado.

El runtime puede enviar el contexto al proveedor y consumir cuota. Cada análisis
exige marcar el consentimiento y presionar una acción. El envío incluye el contexto
preparado, artefactos del grafo y capacidad BA, no sólo el texto visible del requisito;
revisá que no contengan secretos ni información que no quieras enviar.

## 4. Recorrido del BA, una vez habilitado y validado el runtime

1. Elegí el proyecto y abrí **Contexto del proyecto**. Verificá que sea el correcto.
2. Presioná **Nuevo**. Escribí título, pedido/descripción y fuente si la conocés.
   Para el piloto: «Quiero que las personas puedan cancelar su turno». Indicá que
   es sintético; no inventes anticipación mínima, permisos ni otras reglas.
3. **Guardar borrador**. El requisito todavía no está aprobado.
4. Marcá el consentimiento y presioná **Analizar requisito**. También hay acciones
   acotadas **Refinar redacción** y **Sugerir criterios**. Guardá cambios primero.
5. Revisá la propuesta separada. Las ambigüedades son observaciones; preguntas,
   reglas y criterios son candidatos. Tildá sólo los que querés y elegí
   **Incorporar seleccionadas**, o **Descartar propuesta**. Lo no seleccionado no
   se incorpora. Incorporar no significa aprobar ni resolver preguntas.
6. Completá **Respuesta humana** para cada pregunta que puedas responder realmente
   y guardala. Si no sabés, dejala abierta. Una pregunta bloqueante impide aprobar.
7. Revisá/edita cada regla y sus motivos; guardá y elegí **Revisar aprobación de regla**.
   Leé el contenido de la confirmación y aprobá sólo si lo aceptás como humano.
8. Revisá los criterios **Dado / Cuando / Entonces** y guardá las correcciones.
   Editá y guardá una sección por vez: las otras entradas se bloquean temporalmente
   para no perder cambios al actualizar la pantalla.
9. **Revisar aprobación** del requisito. Si falta algo, el mensaje explica el bloqueo.
   Si permite avanzar, leé la revisión exacta y confirmá con tu identidad local.
10. Revisá el historial y recargá: el requisito y su evidencia deben seguir allí.
    Si lo editás después, se guarda una nueva revisión sin la aprobación anterior;
    cambios del grafo también pueden invalidar un receipt, aunque el texto no cambie.

La interfaz informa el impacto conocido dentro del grafo registrado. No demuestra
que no haya otras reglas/requisitos ausentes del contexto. Los vínculos derivados
se conservan; el MVP no ofrece un editor libre de relaciones ni de decisiones.

## 5. Fallos y recuperación

- **Necesita atención:** el borrador se conserva; revisar causa/configuración con
  el operador. Nunca se reintenta automáticamente.
- **Cancelar análisis:** registra estado terminal e ignora salidas tardías. La
  cuota ya consumida por el proveedor no se revierte.
- **Contexto/propuesta obsoleta:** no incorporar. Actualizar, revisar los cambios y
  descartar o solicitar otro análisis con nueva autorización de envío.
- **Cambios sin guardar:** guardar la sección antes de analizar, aprobar o navegar.
- **Servicio reiniciado:** abrir nueva sesión. Runs interrumpidos quedan en atención,
  no continúan ni se convierten en aprobados.
- **Corrupción/schema desconocido:** detener y conservar evidencia. No editar SQLite
  ni hashes a mano. Los snapshots no son un sistema de recuperación de desastres.

La carpeta contiene datos en texto plano; protegerla con permisos del sistema.
Para respaldar, detener el servicio y copiar la carpeta completa. MVP acotado:
valores JSON de hasta 2.000.000 bytes, sin poda automática, cifrado, multiusuario ni SSO.

## 6. Pruebas y aceptación completada

El [piloto real sintético](phases/phase-4-real-pilot.md) completó técnica y
humanamente. El usuario revisó la propuesta separada, incorporó explícitamente tres
preguntas, respondió cada una, agregó tres criterios Dado/Cuando/Entonces, revisó el
subject exacto y confirmó la aprobación. Nada se incorporó ni aprobó automáticamente.

Con Chromium de Playwright ya disponible, desde la raíz:

```powershell
npm run specforge:test
npm run specforge:test:ui
```

No usan un agente real. El segundo ejecuta el recorrido con la etiqueta **SIMULADO**,
incluyendo fallos/cancelación, y produce capturas locales. No instala navegadores
si faltan; eso requiere una preparación aparte.

Los dos gates se cumplieron: preflight más ejecución real acotada, y recorrido
observado en la UI sin repo/IDE para el BA. El siguiente paso requiere autorización
separada para Phase 5: proyección gobernada a SpecDD. Phase 4 no escribió specs
canónicas, repositorios, PRs ni desplegó.
