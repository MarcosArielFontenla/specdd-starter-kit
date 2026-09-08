import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {setTimeout as delay} from 'node:timers/promises';
import {request as httpRequest} from 'node:http';
import {WorkspaceStore,BAWorkspace,createWorkspaceServer} from '../src/index.mjs';
import {demoBundle} from '../scripts/demo.mjs';
import {appServerArgs} from '@specdd/local-control-service';

const projectId='ba-synthetic-pilot';
const mock={label:'synthetic-test-runtime',async execute({request,requestSha256}){return {output:{schemaVersion:'1.0.0',requestSha256,wording:null,ambiguities:[],
  questions:[{id:'q',question:'¿Quién puede cancelar?',blocking:true,supportArtifactIds:[request.target.artifactId]}],
  rules:[{id:'r',statement:'Regla sintética propuesta para revisión.',rationale:'Sólo fixture de prueba.',supportArtifactIds:[request.target.artifactId]}],
  criteria:[{id:'c',given:'Contexto acordado',when:'Acción acordada',then:'Resultado acordado',supportArtifactIds:[request.target.artifactId]}]},receipt:{runtime:'synthetic-test-runtime',simulated:true,requestSha256}};}};
async function setup(t,runtime=mock,timeoutMs=2000){const dir=mkdtempSync(join(tmpdir(),'specforge-test-')),path=join(dir,'state.sqlite'),store=new WorkspaceStore(path);await store.register(await demoBundle(),{id:'fixture-operator',kind:'human'});const app=new BAWorkspace({store,operator:'fixture-operator',runtime,timeoutMs});t.after(async()=>{await app.close();store.close();});return {store,app,path};}
async function create(app,title='Cancelar turno'){const v=await app.view(projectId);const next=await app.command(projectId,v.version,{op:'create',title,description:'Pedido sintético ambiguo',source:'fixture'});return next.history[0].event.targetId;}
async function command(app,c){return app.command(projectId,(await app.view(projectId)).version,c);}
async function run(app,targetId){return app.start(projectId,(await app.view(projectId)).version,{targetId,action:'analyze-requirement',consent:true});}
async function terminal(store,runId){for(let i=0;i<150;i++){const r=await store.run(projectId,runId);if(r.record.status!=='running')return r.record;await delay(10);}throw new Error('TEST_TIMEOUT');}
async function approve(app,targetId){await command(app,{op:'request-review',targetId});const p=await app.approval(projectId,targetId);return app.command(projectId,p.version,{op:'approve',targetId,subjectSha256:p.subjectSha256});}

test('prepared project persists, defaults to no runtime, and rejects contradictory re-registration',async t=>{
  const {store,app}=await setup(t,null);assert.equal((await app.view(projectId)).runtimeAvailable,false);
  const b=await demoBundle();b.project.metadata.name='different';await assert.rejects(store.register(b,{id:'fixture',kind:'human'}),/PROJECT_ALREADY_REGISTERED_DIFFERENT/);
  b.capability.pack.lifecycle='draft';await assert.rejects(store.register(b,{id:'fixture',kind:'human'}));
});
test('store lease prevents concurrent service ownership without overwriting state',async t=>{const {store,path}=await setup(t);assert.throws(()=>new WorkspaceStore(path),/STORE_IN_USE/);assert.equal((await store.load(projectId)).version,1);});
test('optimistic CAS rejects stale edits and keeps both prior versions intact',async t=>{
  const {app,store}=await setup(t);await create(app);await assert.rejects(app.command(projectId,1,{op:'create',title:'stale',description:'x',source:''}),/STALE_STATE/);
  assert.equal((await app.view(projectId)).artifacts.length,1);assert.equal(store.history(projectId).length,2);
});
test('concurrent valid creates cannot overwrite a successful CAS commit',async t=>{
  const {app}=await setup(t);const c={op:'create',title:'A',description:'B',source:''};const results=await Promise.allSettled([app.command(projectId,1,c),app.command(projectId,1,c)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await app.view(projectId)).artifacts.length,1);
});
test('unknown fields and injected lifecycle cannot alter a project',async t=>{
  const {app}=await setup(t);await assert.rejects(app.command(projectId,1,{op:'create',title:'x',description:'y',source:'',status:'approved'}),/INVALID_FIELDS/);
  assert.equal((await app.view(projectId)).version,1);
});
test('runtime unavailable, consent absent, wrong role action and missing target fail before a run',async t=>{
  const {app,store}=await setup(t,null),target=await create(app);await assert.rejects(run(app,target),/RUNTIME_UNAVAILABLE/);
  const available=new BAWorkspace({store,operator:'fixture',runtime:mock});
  await assert.rejects(available.start(projectId,2,{targetId:target,action:'analyze-requirement',consent:false}),/CONSENT/);
  await assert.rejects(available.start(projectId,2,{targetId:target,action:'approve',consent:true}),/BA_ACTION/);
  await assert.rejects(run(available,'unknown'),/BA_TARGET/);assert.equal((await store.runs(projectId)).length,0);
});
test('validated agent proposal is persisted separately, never modifies draft automatically',async t=>{
  const {app,store}=await setup(t),target=await create(app),before=await app.view(projectId),r=await terminal(store,await run(app,target));
  assert.equal(r.status,'ready');assert.equal(r.runtimeReceipt.simulated,true);assert.equal(r.proposal.provenance.actor.kind,'agent');
  assert.deepEqual((await app.view(projectId)).artifacts,before.artifacts);
});
test('adoption preserves intermediate agent revisions, creates linked questions/rules and records human selection',async t=>{
  const {app,store}=await setup(t),target=await create(app),r=await terminal(store,await run(app,target));
  const v=await command(app,{op:'adopt',runId:r.id,selectedIds:['q','r','c']});
  assert.equal(v.artifacts.length,3);assert.equal(v.histories[target].length,3);
  assert.equal(v.histories[target][1].provenance.at(-1).actor.kind,'agent');assert.equal(v.histories[target][2].provenance.at(-1).origin,'human-edited-agent-proposal');
  assert.equal(v.artifacts.find(a=>a.type==='open-question').content.resolution,null);
  assert.equal(v.graph.blockers[target].questions.length,1);assert.equal((await store.run(projectId,r.id)).record.status,'adopted');
  await assert.rejects(command(app,{op:'adopt',runId:r.id,selectedIds:['q']}),/PROPOSAL_NOT_READY/);
});
test('partial adoption incorporates only selected content and invalid selection rolls back atomically',async t=>{
  const {app,store}=await setup(t),target=await create(app),r=await terminal(store,await run(app,target)),version=(await app.view(projectId)).version;
  await assert.rejects(command(app,{op:'adopt',runId:r.id,selectedIds:['invented']}),/INVALID_SELECTION/);
  assert.equal((await app.view(projectId)).version,version);assert.equal((await store.run(projectId,r.id)).record.status,'ready');
  const v=await command(app,{op:'adopt',runId:r.id,selectedIds:['c']});assert.equal(v.artifacts.length,1);assert.equal(v.artifacts[0].content.acceptanceCriteria.length,1);
});
test('discard persists explicit decision with unchanged artifacts',async t=>{
  const {app,store}=await setup(t),target=await create(app),before=(await app.view(projectId)).artifacts,r=await terminal(store,await run(app,target));
  const v=await command(app,{op:'discard',runId:r.id});assert.deepEqual(v.artifacts,before);assert.equal((await store.run(projectId,r.id)).record.status,'discarded');
});
test('editing after a proposal prevents stale adoption',async t=>{
  const {app,store}=await setup(t),target=await create(app),r=await terminal(store,await run(app,target));
  const a=(await app.view(projectId)).artifacts[0];await command(app,{op:'edit',targetId:target,title:a.title,content:{...a.content,description:'Cambio humano'}});
  await assert.rejects(command(app,{op:'adopt',runId:r.id,selectedIds:['c']}),/BA_STALE_REQUEST/);
  assert.equal((await store.run(projectId,r.id)).record.status,'ready');
});
test('full synthetic domain flow enforces blockers, human answers, rule approval and exact root receipt',async t=>{
  const {app,store}=await setup(t),target=await create(app),r=await terminal(store,await run(app,target));let v=await command(app,{op:'adopt',runId:r.id,selectedIds:['q','r','c']});
  await command(app,{op:'request-review',targetId:target});await assert.rejects(app.approval(projectId,target),/BA_BLOCKED/);
  const q=v.artifacts.find(a=>a.type==='open-question'),rule=v.artifacts.find(a=>a.type==='business-rule');
  await command(app,{op:'resolve-question',targetId:q.id,answer:'Respuesta explícita del humano del fixture.'});
  await assert.rejects(app.approval(projectId,target),/BA_DEPENDENCY_UNAPPROVED/);
  await approve(app,rule.id);const p=await app.approval(projectId,target);v=await app.command(projectId,p.version,{op:'approve',targetId:target,subjectSha256:p.subjectSha256});
  assert.equal(v.artifacts.find(a=>a.id===target).status,'approved');assert.equal(v.approvals.find(a=>a.targetId===target).valid,true);
  await assert.rejects(app.command(projectId,p.version,{op:'approve',targetId:target,subjectSha256:p.subjectSha256}),/STALE_STATE/);
  const a=v.artifacts.find(a=>a.id===target);v=await command(app,{op:'edit',targetId:target,title:a.title,content:{...a.content,description:'Nueva revisión humana'}});
  assert.equal(v.artifacts.find(a=>a.id===target).status,'draft');assert.equal(v.approvals.find(a=>a.targetId===target).valid,false);
});
test('late successful output after cancellation is ignored',async t=>{
  let finish;const runtime={label:'synthetic-delayed',execute(input){return new Promise(resolve=>{finish=async()=>resolve(await mock.execute(input));});}};
  const {app,store}=await setup(t,runtime),target=await create(app),runId=await run(app,target);while(!finish)await delay(1);await app.cancel(projectId,runId);await finish();await delay(30);
  assert.equal((await store.run(projectId,runId)).record.status,'cancelled');assert.equal((await app.view(projectId)).artifacts[0].revision,1);
});
test('timeout is terminal even if adapter ignores abort; no hidden retry',async t=>{
  let calls=0;const {app,store}=await setup(t,{label:'synthetic-hang',execute(){calls++;return new Promise(()=>{});}},30),target=await create(app);
  const r=await terminal(store,await run(app,target));assert.equal(r.status,'needs-attention');assert.equal(r.error,'TIMEOUT');assert.equal(calls,1);
});
test('runtime errors are sanitized and invalid outputs do not create artifacts',async t=>{
  const {app,store}=await setup(t,{label:'synthetic-error',async execute(){throw new Error('secret token and filesystem path');}}),target=await create(app);
  const r=await terminal(store,await run(app,target));assert.equal(r.error,'RUNTIME_FAILED');assert.ok(!JSON.stringify(r).includes('secret token'));
  app.runtime={label:'synthetic-invalid',async execute(input){const r=await mock.execute(input);r.output.approved=true;return r;}};
  const bad=await terminal(store,await run(app,target));assert.equal(bad.error,'INVALID_AGENT_OUTPUT');assert.equal((await app.view(projectId)).artifacts.length,1);
});
test('edit during execution marks result stale and preserves edited data',async t=>{
  let finish;const {app,store}=await setup(t,{label:'synthetic-delayed',execute(input){return new Promise(resolve=>{finish=async()=>resolve(await mock.execute(input));});}}),target=await create(app),runId=await run(app,target);
  while(!finish)await delay(1);const a=(await app.view(projectId)).artifacts[0];await command(app,{op:'edit',targetId:target,title:'Edited',content:a.content});await finish();
  const r=await terminal(store,runId);assert.equal(r.error,'STALE_CONTEXT');assert.equal((await app.view(projectId)).artifacts[0].title,'Edited');
});

test('permission preflight failure is explicit and terminal, with the human draft untouched',async t=>{
  let calls=0;const {app,store}=await setup(t,{label:'synthetic-policy-failure',async execute(){calls++;throw new Error('TEXT_ONLY_PERMISSIONS_UNVERIFIED');}});
  const target=await create(app),before=(await app.view(projectId)).artifacts;
  const r=await terminal(store,await run(app,target));assert.equal(r.status,'needs-attention');assert.equal(r.error,'RUNTIME_PERMISSIONS_UNVERIFIED');
  assert.equal(calls,1);assert.deepEqual((await app.view(projectId)).artifacts,before);
});
test('restart preserves revisions and reconciles interrupted run without retry',async()=>{
  const path=join(mkdtempSync(join(tmpdir(),'specforge-restart-')),'state.sqlite');let store=new WorkspaceStore(path);await store.register(await demoBundle(),{id:'fixture',kind:'human'});
  let app=new BAWorkspace({store,operator:'fixture',runtime:mock});const target=await create(app);
  // Simulate persisted in-flight work followed by process loss without a live adapter.
  await store.insertRun({id:'run-interrupted',projectId,projectVersion:2,status:'running',input:{targetId:target},startedAt:new Date().toISOString()});store.close();
  store=new WorkspaceStore(path);try{await store.recover();app=new BAWorkspace({store,operator:'fixture'});assert.equal((await app.view(projectId)).artifacts[0].id,target);assert.equal((await store.run(projectId,'run-interrupted')).record.error,'INTERRUPTED');}finally{store.close();}
});
test('tampered snapshot/history and unknown store versions reject instead of repairing evidence',async()=>{
  const path=join(mkdtempSync(join(tmpdir(),'specforge-corrupt-')),'state.sqlite');const store=new WorkspaceStore(path);await store.register(await demoBundle(),{id:'fixture',kind:'human'});
  await store.insertRun({id:'run-interrupted',projectId,projectVersion:1,status:'running'});store.close();
  let db=new DatabaseSync(path);db.prepare("UPDATE history SET hash='bad'").run();db.close();const corrupted=new WorkspaceStore(path);try{await assert.rejects(corrupted.load(projectId),/STORE_CORRUPT/);await assert.rejects(corrupted.recover(),/STORE_CORRUPT/);assert.equal((await corrupted.run(projectId,'run-interrupted')).record.status,'running');}finally{corrupted.close();}
  db=new DatabaseSync(path);db.exec('PRAGMA user_version=99');db.close();assert.throws(()=>new WorkspaceStore(path),/STORE_VERSION/);
});
test('text-only transport opt-in leaves SpecControl defaults intact and disables side-channel tools',()=>{
  assert.deepEqual(appServerArgs(),['app-server','--stdio','-c','mcp_servers={}','-c','analytics.enabled=false']);
  const args=appServerArgs('unelevated',true);for(const setting of ['features.shell_tool=false','features.apps=false','web_search="disabled"','project_doc_max_bytes=0'])assert.ok(args.includes(setting));
});

test('run persistence rechecks project version atomically before runtime can start',async t=>{
  const {app,store}=await setup(t);await create(app);
  await assert.rejects(store.insertRun({id:'run-stale',projectId,projectVersion:1,status:'running'}),/STALE_STATE/);
  assert.equal((await store.runs(projectId)).length,0);
});
test('HTTP bootstrap, host, session, CSRF, methods and CSP enforce local boundaries',async t=>{
  const {app}=await setup(t,null),server=createWorkspaceServer(app,{port:0}),address=await server.listen();t.after(()=>server.close());
  assert.equal((await fetch(address.origin+'/api/projects')).status,401);
  const boot=await fetch(address.bootstrapUrl,{redirect:'manual'}),cookie=boot.headers.get('set-cookie').split(';')[0];assert.equal(boot.status,303);
  assert.equal((await fetch(address.bootstrapUrl,{redirect:'manual'})).status,401);
  const headers={cookie},session=await (await fetch(address.origin+'/api/session',{headers})).json();
  const page=await fetch(address.origin+'/',{headers});assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  assert.equal(page.headers.get('cache-control'),'no-store');
  const post=address.origin+`/api/projects/${projectId}/command`,body=JSON.stringify({version:1,command:{op:'create',title:'x',description:'y',source:''}});
  assert.equal((await fetch(post,{method:'POST',headers:{...headers,'content-type':'application/json'},body})).status,403);
  assert.equal((await fetch(post,{method:'POST',headers:{...headers,'content-type':'application/json',origin:'http://evil.invalid','x-specforge-csrf':session.csrf},body})).status,403);
  assert.equal((await fetch(post,{method:'POST',headers:{...headers,'content-type':'application/json',origin:address.origin,'x-specforge-csrf':session.csrf},body})).status,200);
  const status=await new Promise((resolve,reject)=>{const req=httpRequest(address.origin+'/api/projects',{headers:{...headers,host:'evil.invalid'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});
  assert.equal(status,421);
  const malformed=await new Promise((resolve,reject)=>{const req=httpRequest(address.origin,{path:'//[',headers},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});
  assert.equal(malformed,400);
  assert.equal((await fetch(address.origin+'/api/projects',{headers})).status,200);
});
