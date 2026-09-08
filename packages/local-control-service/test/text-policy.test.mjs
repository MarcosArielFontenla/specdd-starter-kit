import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve, parse } from 'node:path';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { textPolicy, textPolicyArgs, assertTextConfig, assertTextThread, startTextThread, textTurnParameters } from '../dist/codex-text-policy.js';
import { appServerArgs, appServerThreadParameters, runCodexStructured } from '../dist/codex-planner.js';

// Explicit synthetic RPC replies, not evidence of installed runtime enforcement.
const cwd=resolve('synthetic-ba-runtime'), policy=textPolicy(cwd), model='fixture-model';
function config(){return {config:{default_permissions:policy.id,permissions:{[policy.id]:structuredClone(policy.profile)},
  features:Object.fromEntries(['shell_tool','unified_exec','apps','multi_agent','browser_use','browser_use_external','js_repl','skill_mcp_dependency_install','hooks'].map(k=>[k,false])),
  web_search:'disabled',project_doc_max_bytes:0,mcp_servers:{},hooks:{},plugins:{},notify:[]}};}
function thread(){return {thread:{id:'synthetic-thread'},activePermissionProfile:{id:policy.id,extends:null},sandbox:{type:'readOnly',networkAccess:false},
  approvalPolicy:'never',cwd,model,runtimeWorkspaceRoots:[cwd]};}
function client(change=()=>{}){const calls=[];let reads=0;return {calls,async request(method,params){calls.push({method,params});
  const result=method==='config/read'?config():method==='permissionProfile/list'?{data:[{id:policy.id,allowed:true}],nextCursor:null}:method==='thread/start'?thread():assert.fail('Unexpected RPC');
  if(method==='config/read')reads++;change(method,result,reads);return result;}};}

test('BA policy denies root, grants only the absolute run directory read access and disables network',()=>{
  assert.deepEqual(policy.profile,{filesystem:{':root':'deny',':minimal':'read',[cwd]:'read'},network:{enabled:false}});
  assert.deepEqual(textPolicy(cwd),policy);assert.notEqual(textPolicy(resolve('other')).id,policy.id);
  assert.throws(()=>textPolicy('relative'),/UNVERIFIED/);assert.throws(()=>textPolicy(parse(cwd).root),/UNVERIFIED/);
  const args=textPolicyArgs(policy);assert.ok(args.includes(`default_permissions="${policy.id}"`));
  assert.ok(args.some(s=>s.includes(`${JSON.stringify(cwd)}="read"`)));assert.ok(!JSON.stringify(args).includes('extends'));
  assert.ok(args.some(s=>s.includes('\":minimal\"=\"read\"')));
});
test('effective configuration must match the exact profile and disabled tools',()=>{
  assert.doesNotThrow(()=>assertTextConfig(config(),policy));
  const mutations=[c=>delete c.permissions,c=>delete c.default_permissions,c=>c.default_permissions=':read-only',
    c=>c.permissions[policy.id].extends=':workspace',c=>c.permissions[policy.id].filesystem[':root']='read',
    c=>c.permissions[policy.id].filesystem[cwd]='write',c=>delete c.permissions[policy.id].filesystem[':minimal'],c=>c.permissions[policy.id].filesystem[':minimal']='write',
    c=>c.permissions[policy.id].workspace_roots={extra:true},c=>c.permissions[policy.id].network.enabled=true,
    c=>c.features.shell_tool=true,c=>c.features.hooks=true,c=>delete c.features.hooks,c=>delete c.features.apps,c=>c.mcp_servers={inherited:{}},
    c=>c.hooks={SessionStart:[]},c=>c.plugins={inherited:{}},c=>c.notify=['command'],
    c=>c.web_search='cached',c=>c.project_doc_max_bytes=1];
  for(const mutate of mutations){const c=config();mutate(c.config);assert.throws(()=>assertTextConfig(c,policy),/UNVERIFIED/);}
});
test('BA inventory disables inherited entries individually and notify without a global mutation',()=>{
  const p=textPolicy(cwd,{mcpServerIds:['node_repl'],pluginIds:['example@local']});
  const args=textPolicyArgs(p);
  assert.ok(args.includes('mcp_servers.node_repl.enabled=false'));
  assert.ok(args.includes('plugins.example@local.enabled=false'));
  assert.ok(args.includes('notify=[]'));
  const c=config();c.config.mcp_servers={node_repl:{enabled:false,command:'never-run'}};
  c.config.plugins={'example@local':{enabled:false}};
  assert.doesNotThrow(()=>assertTextConfig(c,p));
  for(const mutate of [c=>c.mcp_servers.node_repl.enabled=true,c=>delete c.mcp_servers.node_repl.enabled,
    c=>c.plugins['example@local'].enabled=true,c=>delete c.plugins['example@local'],
    c=>c.plugins.extra={enabled:false},c=>c.mcp_servers.extra={enabled:false},c=>c.notify=['never-run']]){
    const changed=structuredClone(c);mutate(changed.config);assert.throws(()=>assertTextConfig(changed,p),/UNVERIFIED/);
  }
});
test('inventory rejects malformed, duplicate and injectable keys and snapshots input',()=>{
  for(const inventory of [null,{}, {mcpServerIds:[],pluginIds:[],extra:true},
    {mcpServerIds:['x','x'],pluginIds:[]},{mcpServerIds:[],pluginIds:['x".enabled=true']},
    {mcpServerIds:'x',pluginIds:[]},{mcpServerIds:['nested.key'],pluginIds:[]},{mcpServerIds:[],pluginIds:Array(129).fill('x')}])
    assert.throws(()=>textPolicy(cwd,inventory),/UNVERIFIED/);
  const inventory={mcpServerIds:['b','a'],pluginIds:[]},p=textPolicy(cwd,inventory);
  inventory.mcpServerIds.push('c');assert.deepEqual(p.isolation.mcpServerIds,['a','b']);
});
test('thread receipt must confirm exact named profile, roots, model and policy before any turn',()=>{
  assert.doesNotThrow(()=>assertTextThread(thread(),policy,model));
  for(const mutate of [r=>delete r.activePermissionProfile,r=>r.activePermissionProfile.id=':read-only',
    r=>r.activePermissionProfile.extends=':workspace',r=>r.sandbox.type='workspaceWrite',r=>r.sandbox.networkAccess=true,
    r=>delete r.sandbox.networkAccess,r=>r.runtimeWorkspaceRoots.push(resolve('other')),
    r=>r.cwd=resolve('other'),r=>r.model='other',r=>r.approvalPolicy='on-request',r=>r.thread.id='']){
    const r=thread();mutate(r);assert.throws(()=>assertTextThread(r,policy,model),/UNVERIFIED/);
  }
});
test('typed nullable profile options normalize narrowly without admitting permissions',()=>{
  const c=config(),p=c.config.permissions[policy.id];
  Object.assign(p,{description:null,extends:null,workspace_roots:null});p.filesystem.glob_scan_max_depth=null;
  for(const key of ['proxy_url','enable_socks5','socks_url','enable_socks5_udp','allow_upstream_proxy',
    'dangerously_allow_non_loopback_proxy','dangerously_allow_all_unix_sockets','mode','domains','unix_sockets','allow_local_binding','mitm'])p.network[key]=null;
  assert.doesNotThrow(()=>assertTextConfig(c,policy));assert.equal(p.extends,null);
  for(const mutate of [p=>p.extends=':workspace',p=>p.workspace_roots=[],p=>p.filesystem.glob_scan_max_depth=1,
    p=>p.filesystem.extra=null,p=>p.network.extra=null,p=>p.network.domains={},p=>p.network.allow_local_binding=true]){
    const changed=structuredClone(c);mutate(changed.config.permissions[policy.id]);assert.throws(()=>assertTextConfig(changed,policy),/UNVERIFIED/);
  }
});
test('preflight gates occur before thread creation and are rechecked on the same session',async()=>{
  const c=client();assert.equal((await startTextThread(c,policy,model,'fixture')).thread.id,'synthetic-thread');
  assert.deepEqual(c.calls.map(c=>c.method),['config/read','permissionProfile/list','thread/start','config/read','permissionProfile/list']);
  assert.equal(c.calls[2].params.permissions,policy.id);assert.ok(!('sandbox' in c.calls[2].params));
  const turn=textTurnParameters(policy,'synthetic-thread','synthetic prompt',{});
  assert.equal(turn.permissions,policy.id);assert.ok(!('sandboxPolicy' in turn));assert.equal(turn.approvalPolicy,'never');
  assert.ok(!JSON.stringify(c.calls).includes('synthetic prompt'));
});
test('unavailable, forbidden, duplicate or truncated profile listing stops before thread/start',async()=>{
  for(const data of [[],[{id:policy.id,allowed:false}],[{id:policy.id,allowed:true},{id:policy.id,allowed:true}],null]){
    const c=client((m,r)=>{if(m==='permissionProfile/list')r.data=data;});
    await assert.rejects(startTextThread(c,policy,model,'fixture'),/UNVERIFIED/);assert.ok(!c.calls.some(x=>x.method==='thread/start'));
  }
  const c=client((m,r)=>{if(m==='permissionProfile/list')r.nextCursor='more';});await assert.rejects(startTextThread(c,policy,model,'fixture'),/UNVERIFIED/);
});
test('unsupported RPC and post-start configuration drift fail closed without a model turn',async()=>{
  const unsupported={async request(){throw new Error('unknown method plus private diagnostics');}};
  await assert.rejects(startTextThread(unsupported,policy,model,'fixture'),e=>e.message==='TEXT_ONLY_PERMISSIONS_UNVERIFIED');
  const c=client((m,r,reads)=>{if(m==='config/read'&&reads===2)r.config.permissions[policy.id].network.enabled=true;});
  await assert.rejects(startTextThread(c,policy,model,'fixture'),/UNVERIFIED/);
  assert.ok(!c.calls.some(x=>x.method==='turn/start'));
});
test('BA rejects workspace-write and abort before spawning, while SpecControl defaults remain unchanged',async()=>{
  await assert.rejects(runCodexStructured({textOnly:true,sandbox:'workspace-write'}),/TEXT_ONLY_READ_ONLY_REQUIRED/);
  await assert.rejects(runCodexStructured({textOnly:true,signal:AbortSignal.abort(),errorPrefix:'TEST'}),/TEST_ABORTED/);
  assert.deepEqual(appServerArgs(),['app-server','--stdio','-c','mcp_servers={}','-c','analytics.enabled=false']);
  assert.deepEqual(appServerThreadParameters({cwd,model,sandbox:'workspace-write',serviceName:'fixture'}),{cwd,model,sandbox:'workspace-write',serviceName:'fixture',approvalPolicy:'never'});
});

// Wire-level fake stdio process: executes the production transport but never an
// executable, network call or model. Restore the builtin binding after each test.
function fakeSpawn(t, invalid=false, inventory=null){const calls=[],spawns=[];
  t.mock.method(childProcess,'spawn',(exe,args,options)=>{
    spawns.push({exe,args,options});const child=new EventEmitter();
    child.stdout=new PassThrough();child.stderr=new PassThrough();child.exitCode=null;child.signalCode=null;
    const close=()=>{if(child.exitCode===null){child.exitCode=0;queueMicrotask(()=>child.emit('close',0));}};
    child.kill=()=>{close();return true;};
    child.stdin=new Writable({write(chunk,_encoding,done){
      const request=JSON.parse(chunk.toString());calls.push(request);done();if(request.id===undefined)return;
      queueMicrotask(()=>{
        let result={};
        if(request.method==='config/read')result=invalid?{config:{}}:config();
        if(request.method==='config/read'&&!invalid&&inventory){
          result.config.mcp_servers=Object.fromEntries(inventory.mcpServerIds.map(id=>[id,{enabled:false}]));
          result.config.plugins=Object.fromEntries(inventory.pluginIds.map(id=>[id,{enabled:false}]));
        }
        if(request.method==='permissionProfile/list')result={data:[{id:policy.id,allowed:true}]};
        if(request.method==='thread/start')result=thread();
        if(request.method==='turn/start')result={turn:{id:'synthetic-turn'}};
        child.stdout.write(JSON.stringify({id:request.id,result})+'\n');
        if(request.method==='turn/start')queueMicrotask(()=>{
          child.stdout.write(JSON.stringify({method:'item/completed',params:{item:{type:'agentMessage',phase:'final_answer',text:'{"synthetic":true}'}}})+'\n');
          child.stdout.write(JSON.stringify({method:'turn/completed',params:{turn:{id:'synthetic-turn',status:'completed'}}})+'\n');
        });
      });
    },final(done){done();close();}});
    queueMicrotask(()=>child.emit('spawn'));return child;
  });
  syncBuiltinESMExports();t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});return {calls,spawns};
}
const runOptions={executable:'never-executed',cwd,model,sandbox:'read-only',textOnly:true,timeoutMs:1000,
  serviceName:'fixture',prompt:'PRIVATE_SYNTHETIC_PROMPT',outputSchema:{type:'object'},errorPrefix:'TEST'};
test('production transport sends only named permissions after gates and keeps business prompt out of preflight',async t=>{
  const fake=fakeSpawn(t),result=await runCodexStructured(runOptions);
  assert.equal(result.text,'{"synthetic":true}');assert.equal(fake.spawns.length,1);
  assert.equal(fake.spawns[0].options.shell,false);assert.ok(fake.spawns[0].args.some(a=>a.startsWith(`permissions.${policy.id}=`)));
  const turnIndex=fake.calls.findIndex(c=>c.method==='turn/start');assert.ok(turnIndex>0);
  assert.ok(!JSON.stringify(fake.calls.slice(0,turnIndex)).includes(runOptions.prompt));
  assert.equal(fake.calls[turnIndex].params.permissions,policy.id);assert.ok(!('sandboxPolicy' in fake.calls[turnIndex].params));
  assert.equal(fake.calls.filter(c=>c.method==='turn/start').length,1);
});
test('production transport stops on missing effective config with no thread, prompt, turn or retry',async t=>{
  const fake=fakeSpawn(t,true);await assert.rejects(runCodexStructured(runOptions),/TEXT_ONLY_PERMISSIONS_UNVERIFIED/);
  assert.equal(fake.spawns.length,1);assert.ok(!JSON.stringify(fake.calls).includes(runOptions.prompt));
  assert.ok(!fake.calls.some(c=>['thread/start','turn/start'].includes(c.method)));
});
test('production transport forwards inventoried process overrides and checks disabled entries before a turn',async t=>{
  const inventory={mcpServerIds:['inherited'],pluginIds:['plugin@fixture']},fake=fakeSpawn(t,false,inventory);
  await runCodexStructured({...runOptions,textOnlyIsolation:inventory});
  assert.equal(fake.spawns.length,1);
  for(const setting of ['mcp_servers.inherited.enabled=false','plugins.plugin@fixture.enabled=false','notify=[]'])
    assert.ok(fake.spawns[0].args.includes(setting));
  assert.equal(fake.calls.filter(c=>c.method==='config/read').length,2);
  assert.equal(fake.calls.filter(c=>c.method==='turn/start').length,1);
});
