import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {WorkspaceStore,BAWorkspace,createWorkspaceServer,CodexBARuntime} from '../src/index.mjs';
import {demoBundle} from './demo.mjs';

const args=new Map(),allowed=['--state-dir','--operator','--bundle','--demo','--port','--codex','--model','--windows-sandbox','--isolation-inventory'];
for(let i=2;i<process.argv.length;i+=2){if(!allowed.includes(process.argv[i])||!process.argv[i+1]||args.has(process.argv[i]))throw new Error('INVALID_ARGUMENTS');args.set(process.argv[i],process.argv[i+1]);}
const required=key=>{const value=args.get(key);if(!value)throw new Error(`Required: ${key}`);return value;};
const directory=resolve(required('--state-dir')),operator=required('--operator');
if(args.has('--demo')&&args.get('--demo')!=='true')throw new Error('DEMO_EXPECTS_TRUE');
if(args.has('--demo')&&args.has('--bundle'))throw new Error('CHOOSE_DEMO_OR_BUNDLE');
if(!args.has('--codex')&&(args.has('--model')||args.has('--windows-sandbox')||args.has('--isolation-inventory')))throw new Error('CODEX_REQUIRED');
const port=Number(args.get('--port')??4312);if(!Number.isInteger(port)||port<0||port>65535)throw new Error('INVALID_PORT');
let store,service,closing=false;
async function close(){if(closing)return;closing=true;try{if(service)await service.close();}finally{store?.close();}}
process.once('SIGINT',()=>void close());process.once('SIGTERM',()=>void close());
try{
  store=new WorkspaceStore(join(directory,'workspace.sqlite'));await store.recover();
  if(args.has('--demo'))await store.register(await demoBundle(),{id:operator,kind:'human'});
  if(args.has('--bundle'))await store.register(JSON.parse(await readFile(resolve(args.get('--bundle')),'utf8')),{id:operator,kind:'human'});
  const runtime=args.has('--codex')?new CodexBARuntime({executable:required('--codex'),model:required('--model'),workingDirectory:join(directory,'runtime'),
    isolation:JSON.parse(await readFile(resolve(required('--isolation-inventory')),'utf8')),
    ...(args.has('--windows-sandbox')?{windowsSandboxMode:args.get('--windows-sandbox')}:{})}):null;
  const workspace=new BAWorkspace({store,operator,runtime});service=createWorkspaceServer(workspace,{port});const address=await service.listen();
  console.log(`SpecForge Workspace: ${address.bootstrapUrl}`);
  console.log(`Operador local: ${operator}. Agente: ${runtime?.label??'deshabilitado'}. Sesión privada de un uso; no compartir la URL.`);
}catch(e){await close();throw e;}
