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
  return {output:{schemaVersion:'1.0.0',requestSha256,wording:null,ambiguities:[],
    questions:[{id:'q1',question:'¿Quién puede cancelar?',blocking:true,supportArtifactIds:[request.target.artifactId]}],
    rules:[{id:'r1',statement:'Regla sintética pendiente de revisión.',rationale:'No es una decisión real de negocio.',supportArtifactIds:[request.target.artifactId]}],
    criteria:[{id:'c1',given:'Contexto sintético acordado',when:'Se solicita la acción',then:'Se observa el resultado acordado',supportArtifactIds:[request.target.artifactId]}]},receipt:{runtime:'simulated-ui-fixture',simulated:true}};
}};
const directory=mkdtempSync(join(tmpdir(),'specforge-ui-')),store=new WorkspaceStore(join(directory,'state.sqlite'));
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
  const screenshots=resolve('.specforge-workspace/evidence');mkdirSync(screenshots,{recursive:true});await page.screenshot({path:join(screenshots,'ba-workspace-desktop.png')});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:join(screenshots,'ba-workspace-mobile.png')});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile horizontal overflow');
  await page.setViewportSize({width:1440,height:1100});
  mode='failure';await page.getByLabel('Autorizo enviar este contexto').check();await page.getByRole('button',{name:'Analizar requisito',exact:true}).click();
  await page.getByText(/El agente no pudo completar la acción/).waitFor();
  mode='wait';await page.getByLabel('Autorizo enviar este contexto').check();await page.getByRole('button',{name:'Analizar requisito',exact:true}).click();
  await page.getByRole('button',{name:'Cancelar análisis'}).click();await page.getByRole('heading',{name:'Cancelada',exact:true}).waitFor();
  await page.getByLabel('Título',{exact:true}).fill('<img src=x onerror=alert(1)>');await page.getByRole('button',{name:'Guardar nueva revisión'}).click();
  await page.getByRole('heading',{name:'<img src=x onerror=alert(1)>',exact:true}).waitFor();assert.equal(await page.locator('img').count(),0);
  await page.getByText(/La aprobación anterior ya no cubre/).waitFor();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ui:'PASS',runtime:'SIMULATED',flow:'create/edit/analyze/adopt/resolve/approve/project/review/canonicalize/reload/fail/cancel/stale/XSS',desktop:true,mobile:true,pageErrors:0,evidence:screenshots}));
}finally{await browser?.close();await service.close();store.close();}
