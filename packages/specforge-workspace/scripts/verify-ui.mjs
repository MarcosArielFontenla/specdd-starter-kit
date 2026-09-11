// Explicit local UI acceptance with a SIMULATED runtime. Not evidence of a real BA run.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {WorkspaceStore,BAWorkspace,createWorkspaceServer} from '../src/index.mjs';
import {demoBundle} from './demo.mjs';
let mode='success';
const runtime={label:'SIMULADO · prueba UI',async execute({request,requestSha256,signal}){
  if(mode==='failure')throw new Error('synthetic runtime failure');
  if(mode==='wait')return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
  if(request.kind==='SpecForgeQAAction'){const criterion=request.graph.artifacts.find(a=>a.id===request.target.artifactId).content.acceptanceCriteria[0].id;return {output:{schemaVersion:'1.0.0',requestSha256,gaps:[{id:'qa-gap',description:'Falta explicitar el caso límite.',supportArtifactIds:[request.target.artifactId]}],
    scenarios:[{id:'qa-scenario',objective:'Validar cancelación en el límite',acceptanceCriterionIds:[criterion],technique:'boundary',supportArtifactIds:[request.target.artifactId]}],testCases:[],risks:[]},receipt:{runtime:'simulated-ui-fixture',simulated:true}};}
  return {output:{schemaVersion:'1.0.0',requestSha256,wording:null,ambiguities:[],
    questions:[{id:'q1',question:'¿Quién puede cancelar?',blocking:true,supportArtifactIds:[request.target.artifactId]}],
    rules:[{id:'r1',statement:'Regla sintética pendiente de revisión.',rationale:'No es una decisión real de negocio.',supportArtifactIds:[request.target.artifactId]}],
    criteria:[{id:'c1',given:'Contexto sintético acordado',when:'Se solicita la acción',then:'Se observa el resultado acordado',supportArtifactIds:[request.target.artifactId]}]},receipt:{runtime:'simulated-ui-fixture',simulated:true}};
}};
const directory=mkdtempSync(join(tmpdir(),'specforge-ui-')),screenshots=resolve('.specforge-workspace/evidence'),store=new WorkspaceStore(join(directory,'state.sqlite'));
await store.register(await demoBundle(),{id:'Operador sintético de test',kind:'human'});
const workspace=new BAWorkspace({store,operator:'Operador sintético de test',runtime}),service=createWorkspaceServer(workspace,{port:0});
let browser;
try{
  const address=await service.listen();browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>route.request().url().startsWith(address.origin+'/')?route.continue():route.abort());
  await page.goto(address.bootstrapUrl);
  await page.getByText('Revisor local: Operador sintético de test · identidad local declarada',{exact:true}).waitFor();
  assert.equal(await page.getByText(/identidad atestada/i).count(),0);
  await page.getByLabel('Título del requisito').fill('Cancelar turno — piloto sintético');
  await page.getByLabel('Pedido o descripción').fill('Quiero que las personas puedan cancelar su turno. No se acordaron reglas todavía.');
  await page.getByRole('button',{name:'Guardar borrador',exact:true}).click();
  await page.getByLabel('Descripción del requisito').waitFor();
  await page.getByLabel('Descripción del requisito').fill('Cambio sin guardar');
  await page.getByRole('button',{name:'Analizar requisito',exact:true}).click();
  await page.getByRole('status').filter({hasText:'sin guardar'}).waitFor();
  await page.getByRole('button',{name:'Guardar nueva revisión',exact:true}).click();
  await page.getByLabel('Autorizo enviar este contexto').check();
  await page.getByRole('button',{name:'Analizar requisito',exact:true}).click();
  await page.getByRole('heading',{name:'Propuesta para revisar',exact:true}).waitFor();
  for(const c of await page.locator('.proposal input[type=checkbox]').all())await c.check();
  await page.getByRole('button',{name:'Incorporar seleccionadas'}).click();
  await page.getByLabel('Respuesta humana').waitFor();
  await page.getByRole('button',{name:'Revisar aprobación',exact:true}).click();
  await page.getByRole('status').filter({hasText:'preguntas o bloqueos'}).waitFor();
  await page.getByLabel('Respuesta humana').fill('Respuesta humana sintética para el caso de prueba.');
  assert.equal(await page.getByLabel('Descripción del requisito').isDisabled(),true);
  await page.getByRole('button',{name:'Guardar nueva revisión',exact:true}).click();
  await page.getByRole('status').filter({hasText:'sin guardar'}).waitFor();
  assert.equal(await page.getByLabel('Respuesta humana').inputValue(),'Respuesta humana sintética para el caso de prueba.');
  await page.getByRole('button',{name:'Guardar respuesta humana'}).click();
  await page.getByRole('button',{name:'Revisar aprobación de regla'}).click();
  await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:/^Confirmar aprobación como/}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Revisar aprobación',exact:true}).click();
  await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:/^Confirmar aprobación como/}).click();
  await page.getByText('Aprobación vigente para este contexto.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Preparar propuesta SpecDD',exact:true}).click();
  await page.getByRole('heading',{name:/specs\/cancelar-turno-piloto-sintetico\/spec\.md · Propuesta pendiente/}).waitFor();
  await page.getByText(/Mapping parcial/).waitFor();await page.getByRole('button',{name:'Revisar y crear artefacto SpecDD'}).click();
  await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:/^Crear artefacto SpecDD como/}).click();
  await page.getByRole('heading',{name:/Artefacto SpecDD canónico/}).waitFor();
  await page.reload();await page.getByRole('button',{name:/Cancelar turno — piloto sintético · Aprobado/}).click();
  await page.getByText('Aprobación vigente para este contexto.',{exact:true}).waitFor();
  await page.getByRole('heading',{name:/Artefacto SpecDD canónico/}).waitFor();
  await page.getByRole('button',{name:'Quality Assurance',exact:true}).click();await page.getByRole('button',{name:/Cancelar turno — piloto sintético · Disponible/}).click();
  await page.getByRole('button',{name:'Tomar spec para QA'}).click();await page.getByLabel('Autorizo enviar esta spec').check();await page.getByRole('button',{name:'Sugerir escenarios'}).click();
  await page.waitForTimeout(2500);if(!await page.getByText('Gap: Falta explicitar el caso límite.').count())throw new Error(`QA_UI_PROPOSAL_MISSING: ${await page.locator('#message').textContent()} / ${await page.locator('#detail').innerText()}`);await page.getByText('Escenario: Validar cancelación en el límite').locator('..').getByRole('checkbox').check();await page.getByRole('button',{name:'Incorporar seleccionadas'}).click();
  await page.getByText('Escenario',{exact:true}).waitFor();await page.getByRole('button',{name:'Solicitar revisión QA'}).click();await page.getByRole('button',{name:'Revisar aprobación QA'}).click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:/^Confirmar aprobación QA como/}).click();
  await page.getByText(/aprobación vigente/).waitFor();const criteriaDetail=page.locator('details').filter({has:page.getByText('Criterios aprobados e IDs',{exact:true})});await criteriaDetail.getByText('Criterios aprobados e IDs',{exact:true}).click();const criterionCard=criteriaDetail.locator('.criterion').first();await criterionCard.waitFor();const criterionId=await criterionCard.locator(':scope > .qa-kind').textContent(),criterionText=criterionCard.locator(':scope > p');assert.ok(criterionId?.startsWith('ac-'));assert.equal(await criterionText.count(),1);const idBox=await criterionCard.locator(':scope > .qa-kind').boundingBox(),textBox=await criterionText.boundingBox();assert.ok(idBox&&textBox&&idBox.y+idBox.height<=textBox.y,'criterion ID and description must render as separate blocks');const caseForm=page.locator('details').filter({hasText:'Nuevo caso de prueba'});await caseForm.getByText('Nuevo caso de prueba').click();await caseForm.getByLabel('Título').fill('Caso manual del límite');await caseForm.getByLabel('IDs de criterios').fill(criterionId);await caseForm.getByLabel('Precondiciones').fill('Turno futuro confirmado');await caseForm.getByLabel('Acción').fill('Solicitar cancelación');await caseForm.getByLabel('Resultado esperado').fill('Se respeta el criterio aprobado');await caseForm.getByRole('button',{name:'Guardar caso'}).click();await page.waitForTimeout(1000);if(!await page.getByText('Caso de prueba',{exact:true}).count())throw new Error(`QA_UI_CASE_MISSING: ${criterionId} / ${await page.locator('#message').textContent()}`);
  await page.getByRole('button',{name:'Recalcular cobertura declarada'}).click();await page.waitForTimeout(1000);if(!await page.getByText('Todos los criterios tienen al menos un caso declarado.').count())throw new Error(`QA_UI_COVERAGE_MISSING: ${await page.locator('#message').textContent()} / ${await page.locator('#detail').innerText()}`);
  const defectForm=page.locator('details').filter({hasText:'Nuevo defecto con evidencia'});await defectForm.getByText('Nuevo defecto con evidencia').click();await defectForm.getByLabel('Título').fill('Defecto sintético evidenciado');await defectForm.getByLabel('Observado').fill('Resultado observado sintético');await defectForm.getByLabel('Esperado').fill('Resultado esperado sintético');await defectForm.getByLabel('Pasos de reproducción').fill('Paso local sintético');await defectForm.getByLabel('Localizador de evidencia').fill('local-report:ui-fixture');await defectForm.getByLabel('SHA-256 de evidencia').fill('0'.repeat(64));await defectForm.getByRole('button',{name:'Guardar defecto evidenciado'}).click();await page.getByText('Defecto evidenciado',{exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Quality Assurance'}).click();await page.getByRole('button',{name:/Cancelar turno — piloto sintético · Asignada/}).click();await page.getByText('Todos los criterios tienen al menos un caso declarado.').waitFor();const reloadedCriteria=page.locator('details').filter({has:page.getByText('Criterios aprobados e IDs',{exact:true})});await reloadedCriteria.getByText('Criterios aprobados e IDs',{exact:true}).click();assert.equal(await reloadedCriteria.locator('.criterion').first().locator(':scope > .qa-kind').textContent(),criterionId);
  mkdirSync(screenshots,{recursive:true});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(screenshots,'qa-workspace-desktop.png')});await page.setViewportSize({width:390,height:844});await page.screenshot({path:join(screenshots,'qa-workspace-mobile.png')});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'QA mobile horizontal overflow');await page.setViewportSize({width:1440,height:1100});
  const historyBefore=await page.locator('.history-item').count();await page.getByRole('button',{name:'Product Management',exact:true}).click();await page.getByRole('heading',{name:'Project Health / Release Readiness',exact:true}).waitFor();await page.getByText('Parcial',{exact:true}).waitFor();await page.getByText(/Evidencia de ejecución: desconocida/).waitFor();assert.equal(await page.locator('#detail input,#detail textarea,#detail select').count(),0);await page.getByRole('button',{name:/Cancelar turno — piloto sintético · Parcial/}).click();await page.getByText('Estado QA',{exact:true}).waitFor();assert.equal(await page.locator('.history-item').count(),historyBefore);await page.screenshot({path:join(screenshots,'pm-readiness-desktop.png')});await page.setViewportSize({width:390,height:844});await page.screenshot({path:join(screenshots,'pm-readiness-mobile.png')});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'PM mobile horizontal overflow');await page.setViewportSize({width:1440,height:1100});
  await page.getByRole('button',{name:'Business Analysis'}).click();await page.getByRole('button',{name:/Cancelar turno — piloto sintético · Aprobado/}).click();
  await page.screenshot({path:join(screenshots,'ba-workspace-desktop.png')});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:join(screenshots,'ba-workspace-mobile.png')});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile horizontal overflow');
  await page.setViewportSize({width:1440,height:1100});
  mode='failure';await page.getByLabel('Autorizo enviar este contexto').check();await page.getByRole('button',{name:'Analizar requisito',exact:true}).click();
  await page.getByText(/El agente no pudo completar la acción/).waitFor();
  mode='wait';await page.getByLabel('Autorizo enviar este contexto').check();await page.getByRole('button',{name:'Analizar requisito',exact:true}).click();
  await page.getByRole('button',{name:'Cancelar análisis'}).click();await page.getByRole('heading',{name:'Cancelada',exact:true}).waitFor();
  await page.getByRole('button',{name:'Nuevo',exact:true}).click();await page.getByLabel('Título del requisito').fill('<img src=x onerror=alert(1)>');await page.getByLabel('Pedido o descripción').fill('Entrada sintética para probar renderizado seguro.');await page.getByRole('button',{name:'Guardar borrador',exact:true}).click();
  await page.getByRole('heading',{name:'<img src=x onerror=alert(1)>',exact:true}).waitFor();assert.equal(await page.locator('img').count(),0);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ui:'PASS',runtime:'SIMULATED',flow:'BA create/edit/analyze/adopt/resolve/approve/project + SpecDD canonicalize + QA assign/suggest/adopt/review/approve/case/coverage/defect/reload + PM evidence-backed read model + fail/cancel/stale/XSS',desktop:true,mobile:true,pageErrors:0,evidence:screenshots}));
}finally{await browser?.close();await service.close();store.close();}
