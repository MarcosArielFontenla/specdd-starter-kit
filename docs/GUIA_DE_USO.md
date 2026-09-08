# Guía única de uso — SpecDD Platform

Fecha: 2026-09-08. Alcance: generación del Harness y Capability Packs, trabajo
spec-first con revisión humana y herramientas locales de contratos/evidencia.
SpecDeploy específico de infraestructura, proyecto o empresa queda como trabajo
futuro. No necesitás Warp, créditos de Warp ni servicios de deploy para este recorrido.

## 1. Ubicate: plataforma y proyecto son carpetas diferentes

| Carpeta | Para qué sirve | Qué comandos corresponden allí |
|---|---|---|
| `SPECDDSTARTERKIT` | Ejecutar el portal y las herramientas de arquitectura/evidencia | `npm run dev -w specdd-platform`, comandos `node packages/...` |
| Tu proyecto destino | Desarrollar tu aplicación con el Harness generado | `pwsh .agents/scripts/validate-project.ps1`, tests/build propios del proyecto |

No copies todo SPECDDSTARTERKIT dentro de tu aplicación. Instalás el contenido del
ZIP revisado, no este monorepo. El proyecto destino no necesita convertirse en un
proyecto Node: los requisitos de la plataforma son independientes de su stack.

El portal de los tres kits genera archivos en el navegador; **no ejecuta tu proyecto**.
SpecControl es un servicio local separado y aceptado para un recorrido acotado: un
Planner real pausa spec/plan para aprobación; Developer trabaja en una copia aislada;
Reviewer usa otra sesión; luego corren checks registrados y una segunda aprobación
puede habilitar una draft PR. Publicación está desactivada por defecto y deploy no
forma parte del flujo. No es un botón universal «ejecutar fábrica».

Para **trabajo diario de BA**, Phase 4 de SpecForge agrega otro servicio local:
selección de proyecto preparado, requisitos, preguntas, reglas, criterios y revisión
humana desde el navegador. No necesita Git/IDE para el BA; el operador prepara y
levanta el servicio. Seguí la [guía del Workspace BA](specforge-workspace/usage.md).
La implementación, el E2E simulado y un piloto sintético con agente real y aprobación
humana observada fueron aceptados en Phase 4. No confundirlo con instalar un
Capability Pack ni con SpecControl. Proyección a SpecDD y otros roles todavía son
fases siguientes.

## 2. Levantá el portal

En la raíz de **SPECDDSTARTERKIT**, necesitás Node 22.12+ y npm:

```powershell
node --version
npm --version
npm ci
npm run dev -w specdd-platform
```

`npm ci` instala según el lockfile y reemplaza la instalación local de dependencias;
no lo ejecutes sobre un proceso de desarrollo activo. Para volver a abrir el portal
con las dependencias ya instaladas, alcanza con el último comando. La preparación
compila contratos y empaqueta los kits, por lo que el primer arranque puede tardar.

Abrí [el portal local](http://localhost:4320). Entrá a **SpecDD** para el Harness
o **SpecForge** para los roles. SpecDeploy existe en el portal, pero no forma parte
del recorrido operativo aquí. Detené el servidor con `Ctrl+C` al terminar.

PowerShell 7 y el módulo `powershell-yaml` se necesitan para los validadores del
Harness en el proyecto destino, no para navegar el portal. Si el módulo falta,
revisá y ejecutá explícitamente su instalación para tu usuario:

```powershell
Install-Module powershell-yaml -Scope CurrentUser
```

No aceptes cambios de confianza en repositorios de paquetes sin revisarlos.

## 3. Generá el Harness con SpecDD

### Si empezás un proyecto nuevo — Greenfield

1. Elegí **Greenfield**.
2. Definí el problema, usuarios, resultados esperados, restricciones y stack real.
3. Definí dominios del negocio, entidades y primeras funcionalidades. Un dominio
   es, por ejemplo, «Pedidos»; no una carpeta técnica como «Controllers».
4. Seleccioná herramientas de equipo, principios y requisitos de seguridad.
5. Revisá los archivos del preview y descargá el ZIP.
6. Extraelo en la raíz de un proyecto nuevo vacío. El scaffold prepara el contexto
   de desarrollo; **no equivale a una aplicación ya implementada**.

### Si tenés un proyecto existente — Brownfield

1. Guardá un punto de recuperación y revisá `git status` en tu proyecto. Conservá
   los cambios existentes; una rama por sí sola no es una copia de seguridad.
2. Elegí **Brownfield** y seleccioná la carpeta del proyecto destino, no la plataforma.
3. Elegí Level 1 para análisis estructural o activá Level 2 para lectura semántica
   asistida y acotada. El análisis es local; no comprende todas las reglas del negocio.
4. En **Review Context**, corregí o excluí lo detectado antes de aprobarlo.
5. Si hay un Harness previo, revisá la advertencia y las tareas de migración. El
   acknowledgement no es permiso para borrar o reemplazar archivos indiscriminadamente.
6. Revisá el preview, las colisiones y el reporte. Descargá el ZIP y, preferentemente,
   extraelo primero en una carpeta temporal para comparar lo que vas a incorporar.
7. Copiá al proyecto sólo lo revisado. No uses reemplazo forzado ante una colisión
   inesperada; si el proyecto cambió desde el análisis, volvé a contrastarlo.
8. Revisá el diff: no debe haber cambios ajenos al Harness o a la migración aprobada.

La aprobación del contexto Brownfield **no aprueba specs, código ni migraciones
posteriores**. No regeneres sobre un Harness mantenido a mano para intentar «arreglarlo»
sin comparar antes los cambios. [Detalle Greenfield/Brownfield](../specdd-kit/docs/greenfield-vs-brownfield.md).

## 4. Validá lo instalado

En la raíz del **proyecto destino**, una vez revisados los scripts y los checks
configurados, ejecutá:

```powershell
pwsh .agents/scripts/validate-project.ps1
$LASTEXITCODE
```

Abrí `context/harness-validation-report.md` y su equivalente `.json`.

| Resultado | Interpretación | Qué hacer |
|---|---|---|
| `0 / VERIFIED` | Pasaron las validaciones y checks configurados | Continuar; no significa que todas las reglas de negocio estén verificadas |
| `2 / PARTIAL` | Hay evidencia/checks incompletos | Leer el reporte, definir lo que falta y volver a validar; no presentarlo como verificación total |
| `1 / FAILED` | Falló estructura, integridad o un check declarado | Corregir la causa antes de dar por válida la instalación |

`context/project-validation.json` empieza vacío en Greenfield. En Brownfield puede
incluir únicamente los checks detectados que seleccionaste explícitamente durante
Review Context. Definí allí comandos reales y aprobados de test/build/lint. El validador
puede **ejecutar esos comandos**: revisarlos es parte del permiso, no un detalle opcional.
No inventes comandos ni cambies el baseline para esconder un fallo.

Para la primera sesión con tu agente, dentro del proyecto destino:

> Leé AGENTS.md y seguí su routing y orden de carga. Inspeccioná el reporte de
> validación. Indicá qué está confirmado y qué falta. No implementes funcionalidades
> ni modifiques baselines sin una solicitud y revisión concretas.

Si es Brownfield, agregá:

> Leé context/brownfield-analysis.md. Revisá su Kickoff y las tareas de migración,
> si existen. Proponé los cambios de convergencia sin aplicar reemplazos todavía.

Para cerrar contratos placeholder, el agente debe crear candidatos JSON bajo
`.agents/evidence/entity-contracts/candidates/` y ejecutar
`converge-contracts.ps1 -Mode propose` con la lista exacta. Revisá el contenido y el
subject SHA-256 impreso. Sólo después autorizá una ejecución separada de `-Mode apply`
con ese hash y `-ReviewedBy`; esa operación alinea atómicamente las specs autorizadas
con `context/project-definition.json` y conserva un receipt auditable. Si cambia un
candidato, una spec o la definición entre ambas fases, hay que generar otra propuesta.

Si una implementación aprobada cambia archivos que Level 2 fingerprinted, no edites
`context/scaffold-manifest.json` a mano ni regeneres para esconder el cambio. Proponé
un rebaseline limitado a las rutas exactas:

```powershell
$rutasRebaseline = @(
  'src/ruta-exacta.ext',
  'tests/ruta-exacta.ext'
)
& '.\.agents\scripts\rebaseline-source.ps1' -Mode propose -Paths $rutasRebaseline
```

Revisá el diff y el subject impreso. Sólo después ejecutá por separado
`-Mode apply -SubjectSha256 <hash-aprobado>`. El apply vuelve a verificar manifest,
paths y contenido para cerrar TOCTOU, rechaza replay y escribe un receipt. Sólo acepta
archivos modificados ya presentes: altas, bajas o drift adicional requieren una nueva
ingesta. Los fingerprints usan los bytes exactos, por lo que LF, CRLF y BOM no se
normalizan. Esto prueba fidelidad local, no autenticidad ni corrección del negocio.

En el JSON final revisá ambos estados: `extractionStatus: VERIFIED` confirma
estructura, archivos generados y baseline; `projectReadinessStatus: VERIFIED` exige
además contexto clasificado, contratos reales y todos los checks aprobados en verde.
El recorrido Level 2 completo fue validado en un proyecto real de alcance acotado;
consultá la [auditoría Brownfield C4](control-plane/audits/2026-09-06-brownfield-c4-acceptance.md).

## 5. Agregá roles con SpecForge cuando los necesites

1. Volvé al portal y abrí **SpecForge**.
2. Seleccioná el proyecto destino para detectar su Harness y posibles colisiones.
3. Elegí los roles necesarios: BA, Dev, QA o UX. No hace falta instalarlos todos.
4. Revisá opciones, playbooks y archivos; descargá e incorporá el ZIP con el mismo
   cuidado de colisiones del paso anterior.
5. En el agente del proyecto, pedí:

> Leé AGENTS.md y context/role-pack-report.md. Revisá
> .agents/specs/tasks/role-pack-install.tasks.md. Explicá los cambios propuestos en
> ROUTING, REGISTRY, presupuesto y bindings. Esperá mi aprobación antes de instalarlos.

6. Después de aprobar la instalación concreta, el agente puede realizar ese wiring
   y ejecutar los gates correspondientes. Revisá el diff y el reporte resultante.

El manifiesto `capability.json` describe el pack; no lo activa por sí solo. Los seeds
de subagentes permanecen inactivos: generar roles no inicia sesiones ni delegaciones.

## 6. Usá el Harness para una tarea real

Empezá con una funcionalidad chica y verificable. Por ejemplo: «rechazar un pedido
sin ítems», si esa regla pertenece realmente a tu negocio.

> Leé AGENTS.md y la skill que corresponda. Revisá las specs y el código de pedidos.
> Proponé la regla, casos de aceptación y archivos afectados. Marcá las dudas;
> no inventes requisitos y no implementes hasta que revisemos la propuesta.

Para una entidad nueva o una funcionalidad de varios dominios, seguí el
[workflow spec-first](../specdd-kit/.agents/workflows/spec-first-feature.md):

1. **Especificar y aclarar:** reglas y casos reales en la spec; resolver dudas con vos.
2. **Aprobar:** revisar la spec y sus checks. Un placeholder no es un test aprobado;
   cualquier waiver requiere motivo y aprobación explícitos.
3. **Planificar:** tareas con rutas reales, dependencias y relación con los checks;
   revisar y aprobar el plan antes de implementar.
4. **Implementar y probar:** ejecutar sólo el alcance aprobado, con tests adecuados.
5. **Revisar:** contrastar diff, spec y resultados. Una revisión del mismo agente no
   se debe registrar como revisión independiente.
6. **Cerrar:** ejecutar los checks reales, informar límites y revisar el resultado.
   Crear/publicar una PR o hacer merge es una decisión posterior, no implícita.

Para un cambio pequeño de un único archivo, usá el routing del Harness; no impongas
todo el workflow si no corresponde. Las specs generadas son borradores, no requisitos
validados automáticamente. Un comando concreto de cierre para una spec existente es:

```powershell
# Proyecto destino: reemplazá pedidos por el nombre real de tu spec revisada.
pwsh .agents/scripts/validate-spec.ps1 -Run -SpecPath .agents/specs/pedidos.spec.yaml
```

`-Run` ejecuta sus acceptanceChecks. No lo uses antes de revisar sus comandos.

## 7. Incorporá SpecControl sólo si necesitás formalizar el flujo

No necesitás un grafo para cada corrección. Para un flujo repetible, SpecControl
permite describir roles, pasos, artefactos, evals y gates en un contrato portable.
Actualmente no hay un editor/orquestador universal de grafos en el portal. El host
implementa un único recorrido operativo acotado, separado del portal principal. En
Windows, el estado privado debe estar fuera del repositorio objetivo y O3 exige un
modo de sandbox explícito:

```powershell
$codexPath = (Get-Command codex).Source
$statePath = Join-Path $env:LOCALAPPDATA 'SpecDD\mi-proyecto'
npm run speccontrol:start -- `
  --project-id mi-proyecto `
  --project-root D:\ruta\a\mi-proyecto `
  --state-dir $statePath `
  --codex $codexPath `
  --execution-binding D:\ruta\confiable\execution-binding.json `
  --windows-sandbox unelevated `
  --port 4310
```

Abrí la URL de bootstrap de un solo uso que imprime el proceso. Podés crear una
tarea, esperar el draft, aprobar o rechazar su hash exacto y, con otra autorización,
ejecutar Developer, Reviewer y checks. El root, el binding y el modo de sandbox sólo se registran al
arrancar: el navegador no acepta paths ni comandos. `unelevated` es el fallback
validado en este host; usá `elevated` únicamente cuando su prueba de frontera pase.
El servicio nunca usa ejecución irrestricta como fallback. Consultá los requisitos,
límites y recuperación en
[`packages/local-control-service/README.md`](../packages/local-control-service/README.md).

Para habilitar el gate de publicación —todavía sin efectos remotos— agregá un binding
confiable y el ejecutable Git al arranque. La consola prepara y aprueba el hash exacto
de una futura draft PR. Requiere un proyecto que sea el top-level
Git exacto, limpio, en la rama base y con el remote GitHub esperado; vuelve a revisar
todo eso al aprobar. Usá el
[ejemplo y límites O4-A](../packages/local-control-service/README.md#optional-o4-a-publication-gate)
y no coloques tokens en el binding.

O4-B agrega exclusivamente un modo de ensayo `local-git`: con un bare remote local
confiable y `--local-publication-root`, el botón publica una rama/commit reales sólo
en ese remote y guarda un recibo privado. Sirve para probar el recorrido; **no es una
draft PR ni evidencia de GitHub**.

El publicador GitHub implementa draft PR exacta e idempotente, transporte `gh`
acotado, commit en clone privado y reconciliación `published`/`absent`/`conflict`.
Sigue desconectado por defecto. Para una operación real, después de revisar el
binding y aprobar el subject exacto, reiniciá agregando:

```powershell
$gitPath = (Get-Command git).Source
$ghPath = (Get-Command gh).Source
$publicationRoot = Join-Path $statePath 'publication-workspaces'
npm run speccontrol:start -- `
  --project-id mi-proyecto `
  --project-root D:\ruta\a\mi-proyecto `
  --state-dir $statePath `
  --codex $codexPath `
  --execution-binding D:\ruta\confiable\execution-binding.json `
  --publication-binding D:\ruta\confiable\publication-binding.json `
  --git $gitPath `
  --github-cli $ghPath `
  --github-publication-root $publicationRoot `
  --windows-sandbox unelevated `
  --port 4310
```

Esto habilita un efecto real: revalida repo/base/diff, configura `core.longpaths`
sólo en el clone privado, crea un commit exacto, hace push create-only y crea la
draft PR. No concede merge ni deploy. Ante timeout o resultado remoto incierto, no
presiones publicar otra vez: conservá la evidencia y reconciliá la operación exacta.
Sólo la ausencia exacta de rama y PR puede devolver el run a `approved`; cualquier
presencia incompatible queda en conflicto. El piloto Bloom comprobó este recorrido,
incluido un fallo pre-head, reconciliación y retry explícito.

En **SPECDDSTARTERKIT**, este ejemplo valida un contrato público sin ejecutarlo:

```powershell
npm run build -w @specdd/control-plane-model
node --input-type=module -e "import fs from 'node:fs'; import {validateControlPlaneDefinition} from '@specdd/control-plane-model'; const d=JSON.parse(fs.readFileSync('packages/control-plane-model/examples/feature-delivery.control-plane.json','utf8')); const r=validateControlPlaneDefinition(d); console.log(JSON.stringify(r,null,2)); if(!r.valid) process.exitCode=1;"
```

Resultado esperado: `valid: true`, exit 0. Es validez del contrato, **no prueba de
que corrieron sus nodos**; tampoco el campo `lifecycle: active` inicia un proceso.
Antes de adaptar el ejemplo al proyecto, revisá sus referencias a Project Definition,
Harness, Capability Packs, evals y artefactos. No asumas que esos archivos fueron
generados por SpecDD ni que existen porque aparecen como referencias en el ejemplo.

Un operador/agente debe seguir y registrar los pasos; sólo los hosts acotados
documentados ejecutan acciones específicas. [Contrato y límites](../packages/control-plane-model/README.md).

## 8. Evals e historial: primero aprendé a leer la evidencia

Hay dos usos diferentes: los checks/drift del Harness dentro de tu proyecto y los
contratos de eval por ejecución de la plataforma. No son intercambiables sin adaptación.

En **SPECDDSTARTERKIT**, con las dependencias instaladas:

```powershell
npm run build -w @specdd/run-history
node packages/run-history/scripts/history.mjs show packages/run-history/examples phase7-local-001
```

Este ejemplo público funciona sin `.specdd-runs` privado. Inspecciona evidencia
guardada: el eval pasó, pero el workflow es `unknown` y la cobertura `partial`, porque
sólo se observaron eventos de eval. No conviertas esa señal en «todo el flujo pasó».

Para registrar una ejecución nueva, el host
`packages/run-history/scripts/record-local-eval.mjs` requiere: definición de eval,
test Node aprobado, contrato de grafo, IDs reales de workflow/nodo, referencia
verificada del input, run ID nuevo, directorio de salida y labels válidos.
La correspondencia debe revisarse antes de invocarlo; no hay un comando universal
correcto para cualquier proyecto. [API y ejemplo completo](../packages/run-history/README.md).

El host ejecuta un test Node explícito con límites de tiempo/salida; **no es un
sandbox**. Para .NET, Java u otro stack, no pases comandos de shell como si fueran un
archivo Node: hace falta una integración revisada. Los ejemplos que mencionan
`.phase5/pilot-001` requieren ese sandbox privado y no funcionan en un checkout nuevo.
[Normalización y host de evals](../packages/eval-adapters/README.md).

Usá identificadores nuevos por ejecución, conservá fallos y revisá datos antes de
compartirlos. Un hash no autentica al revisor ni demuestra por sí solo que algo ocurrió.

## 9. Benchmarks y propuestas: medir antes de adoptar

Esto sirve cuando hay una hipótesis concreta de mejora, no como requisito para cada
tarea. Desde **SPECDDSTARTERKIT**, compará evidencia pública sin ejecutar nuevos tests:

```powershell
npm run build -w @specdd/improvement-proposals
node packages/benchmarks/scripts/compare.mjs packages/benchmarks/examples/local/plan.json packages/benchmarks/examples/local/dataset.json
```

Esperado: comparación `complete`, exit 0. Ese exit significa datos completos, no
«el candidato ganó». Revisá métricas, fallos y alcance: son slices de eval, no el
rendimiento integral del equipo. Costo/defectos/intervenciones desconocidos siguen null.

Este segundo ejemplo demuestra una propuesta que **no califica**:

```powershell
node packages/improvement-proposals/scripts/inspect.mjs packages/improvement-proposals/examples/serial-profile.proposal.json packages/benchmarks/examples/local/plan.json packages/benchmarks/examples/local/dataset.json packages/benchmarks/examples/local/plan.json packages/benchmarks/examples/local/dataset.json packages/improvement-proposals/examples/journal.json
$LASTEXITCODE
```

Esperado: exit **2**, `eligibleForReview: false`, estado `draft`; es el resultado
correcto de este ejemplo, no un error de instalación. La alternativa resultó más lenta.
El [otro piloto, aprobado y llevado a PR](../packages/improvement-proposals/pilot/README.md),
usa evidencia distinta. No mezcles ambos casos ni reutilices su aprobación para cambios nuevos.

Para tu propia mejora: fijá tarea/eval/baseline y aceptación antes de medir, compará
resultados pertinentes, revisá una propuesta concreta y obtené aprobación humana.
Cambiar la propuesta o su evidencia exige revisar de nuevo. La librería prepara
metadatos de handoff; no modifica el Harness, crea PRs ni hace merges automáticamente.

## 10. Qué queda fuera del recorrido

SpecDeploy específico de infraestructura/empresa es trabajo futuro. Conservamos
templates, contratos y un ensayo local aceptado; no hay validación universal de
deploy ni adaptadores cloud controlados listos para cualquier organización. Activar
pipelines legacy puede tener efectos externos y no queda autorizado por esta guía.

No repitas el piloto de promoción como ejercicio inicial. Si necesitás estudiar esa
evidencia, consultá el [cierre local de Phase 10](control-plane/phases/phase-10-acceptance.md).
La guía tampoco activa Warp, un scheduler genérico, auto-mejora del Harness ni
aprobaciones autenticadas multiusuario. [Alcance auditado](control-plane/audits/2026-09-05-evolution-closure.md).

## 11. Rutina mínima y problemas frecuentes

Para cada tarea: leer contexto/routing → aclarar alcance → obtener las aprobaciones
que correspondan → implementar/probar → revisar diff y evidencia → decidir el cierre.
No hace falta repetir la generación del ZIP ni el benchmark en cada sesión.

| Si pasa esto | Revisá esto |
|---|---|
| `npm` no encuentra el workspace o un `packages/...` | Estás en la carpeta correcta: raíz de SPECDDSTARTERKIT |
| Falta `AGENTS.md` o `.agents/scripts` | El ZIP fue incorporado al proyecto destino correcto |
| Faltan módulos `dist` al usar un CLI | Ejecutaste su `npm run build -w ...` con dependencias instaladas |
| Validación `PARTIAL` | Leé el reporte; probablemente falta evidencia o checks reales, no los inventes |
| Fallo de integridad/colisión | Compará cambios con lo generado; no fuerces reemplazos ni reescribas hashes |
| Run privado inexistente | Usá el ejemplo público o prepará una ejecución nueva autorizada |
| Export ya existente o evidencia desactualizada | No sobrescribas; conservá el run y revisá una ejecución nueva |
| Publicación en `needs-attention` | No repitas el push; observá y reconciliá la operación exacta antes de decidir |
| PR con CI rojo pero check de tarea verde | Compará con CI de la base; documentá el fallo preexistente y no la declares mergeable |
| Propuesta con exit 2 | Puede ser rechazo por evidencia insuficiente o falta de mejora; leé el assessment |

## 12. Comprobar la plataforma como mantenedor

En **SPECDDSTARTERKIT**, no dentro de tu aplicación:

```powershell
npm run test:unit --workspaces --if-present
npm run build --workspaces --if-present
```

Comprobá el exit de cada comando antes de continuar. Los E2E requieren Chromium
de Playwright instalado; no lo instales durante un cierre que prohíba actualizar
dependencias. Detené previamente los servidores de desarrollo que ocupen los puertos
4320–4323 si querés el mismo aislamiento que CI:

```powershell
$env:CI='true'
npm run test -w specdd-platform -w sdd-kit-wizard -w specforge-wizard -w specdeploy-wizard
Remove-Item Env:CI
```

Usá una terminal dedicada para no alterar una variable CI que ya necesitaras en otra
sesión. La [auditoría de cierre](control-plane/audits/2026-09-05-evolution-closure.md)
registra 397 tests unitarios, 28 adicionales y 12 E2E aprobados en O5-D;
no garantiza resultados futuros sin reejecutarlos. CI alojada, publicación y merge
son pasos separados con revisión/autorización, no efectos de generar el Harness.
