import {createServer} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {exact,fail} from './state.mjs';

const equal=(a,b)=>typeof a==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function createWorkspaceServer(workspace,{port=4312,host='127.0.0.1'}={}) {
  if(host!=='127.0.0.1')fail('LOOPBACK_REQUIRED');
  const token=randomBytes(32).toString('hex'),session=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
  let bootstrap=true,origin='',closing=false;
  const assets=new Map([['/','index.html'],['/app.js','app.js'],['/style.css','style.css']].map(([url,file])=>[url,readFileSync(new URL(`../ui/${file}`,import.meta.url))]));
  const send=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
  const server=createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if(req.headers.host!==origin.slice(7))return send(res,421,{error:'INVALID_HOST'});
    let url;try{url=new URL(req.url??'/',origin);}catch{return send(res,400,{error:'INVALID_URL'});}
    if(req.method==='GET'&&url.pathname==='/session'){
      if(!bootstrap||!equal(url.searchParams.get('token'),token))return send(res,401,{error:'INVALID_SESSION'});
      bootstrap=false;res.statusCode=303;res.setHeader('Set-Cookie',`specforge_session=${session}; HttpOnly; SameSite=Strict; Path=/`);res.setHeader('Location','/');res.end();return;
    }
    const cookie=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('specforge_session='))?.slice('specforge_session='.length);
    if(!equal(cookie,session))return send(res,401,{error:'SESSION_REQUIRED',message:'Abrí la URL de sesión que muestra el operador al iniciar SpecForge Workspace.'});
    if(closing)return send(res,503,{error:'CLOSING'});
    try{
      if(req.method==='GET'&&assets.has(url.pathname)){
        res.statusCode=200;res.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript; charset=utf-8':url.pathname.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');res.end(assets.get(url.pathname));return;
      }
      if(req.method==='GET'&&url.pathname==='/api/session')return send(res,200,{csrf,operator:workspace.actor.id,runtime:workspace.runtime?.label??null});
      if(req.method==='GET'&&url.pathname==='/api/projects'){
        const projects=[];for(const projectId of workspace.store.ids()){const row=await workspace.store.load(projectId);projects.push({id:projectId,name:row.state.project.metadata.name});}
        return send(res,200,{projects});
      }
      const match=/^\/api\/projects\/([a-z0-9._-]+)(?:\/(command|approval|qa-approval|runs|cancel))?$/.exec(url.pathname);
      if(!match)return send(res,404,{error:'NOT_FOUND'});
      const [,projectId,route]=match;
      if(req.method==='GET'&&!route)return send(res,200,await workspace.view(projectId));
      if(req.method==='GET'&&route==='approval')return send(res,200,await workspace.approval(projectId,url.searchParams.get('target')));
      if(req.method==='GET'&&route==='qa-approval')return send(res,200,await workspace.qaApproval(projectId,url.searchParams.get('target')));
      if(req.method!=='POST')return send(res,405,{error:'METHOD'});
      if(req.headers.origin!==origin||!equal(req.headers['x-specforge-csrf'],csrf))return send(res,403,{error:'CSRF'});
      if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'JSON_REQUIRED'});
      const body=await jsonBody(req);
      if(route==='command'){exact(body,['version','command']);return send(res,200,await workspace.command(projectId,body.version,body.command));}
      if(route==='runs'){exact(body,['version','request']);return send(res,202,{runId:await workspace.start(projectId,body.version,body.request)});}
      if(route==='cancel'){exact(body,['runId']);await workspace.cancel(projectId,body.runId);return send(res,200,{cancelled:true});}
      return send(res,404,{error:'NOT_FOUND'});
    }catch(error){
      const message=String(error?.message??'');
      // Only stable codes, never source text, paths, prompts or provider diagnostics.
      const code=message.match(/^(?:BA_|ARTIFACT_|GRAPH_)?[A-Z][A-Z0-9_]{1,70}(?=\s|;|$)/)?.[0]??'REQUEST_FAILED';
      return send(res,409,{error:code});
    }
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  return {async listen(){await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});origin=`http://${host}:${server.address().port}`;return {origin,bootstrapUrl:`${origin}/session?token=${token}`};},
    async close(){closing=true;await workspace.close();await new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();});}};
}
async function jsonBody(req){let length=0;const chunks=[];for await(const chunk of req){length+=chunk.length;if(length>128*1024)fail('BODY_TOO_LARGE');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('INVALID_JSON');}}
