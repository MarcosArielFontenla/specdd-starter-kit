const $=id=>document.getElementById(id);
let session,view,projectId,selected=null,timer=null,busy=false,dirty=false;
const dirtyTargets=new Set();
function markDirty(target){if([...dirtyTargets].some(id=>id!==target))throw new Error('UNSAVED_CHANGES');dirty=true;dirtyTargets.add(target);for(const field of $('detail').querySelectorAll('input,textarea'))if(field.closest('[data-artifact]').dataset.artifact!==target)field.disabled=true;}
const labels={draft:'Borrador','under-review':'En revisión',approved:'Aprobado',active:'Activo',superseded:'Retirado',running:'Analizando',ready:'Propuesta para revisar',adopted:'Incorporada',discarded:'Descartada',cancelled:'Cancelada','needs-attention':'Necesita atención'};
const errors={STALE_STATE:'El proyecto cambió. Actualizá y revisá el contenido antes de repetir la acción.',BA_STALE_APPROVAL:'Cambió el contexto de la aprobación. Preparala nuevamente.',BA_STALE_REQUEST:'La propuesta pertenece a un contexto anterior. No se aplicó; descartala y solicitá un nuevo análisis.',BA_BLOCKED:'Hay preguntas o bloqueos pendientes. Revisalos antes de aprobar.',BA_DEPENDENCY_UNAPPROVED:'Primero revisá y aprobá las reglas o decisiones relacionadas.',BA_CRITERIA_REQUIRED:'Agregá al menos un criterio de aceptación antes de aprobar.',BA_QUESTION_OPEN:'La pregunta todavía no tiene respuesta humana.',RUNTIME_UNAVAILABLE:'El operador todavía no configuró un agente.',STALE_CONTEXT:'El contexto cambió durante el análisis. El borrador se conservó; solicitá otro análisis si corresponde.',RUNTIME_FAILED:'El agente no pudo completar la acción. No se cambió el requisito. Revisá la configuración con el operador.',INVALID_AGENT_OUTPUT:'La respuesta no cumplió el contrato. No se incorporó contenido.',TIMEOUT:'El análisis superó el tiempo permitido.',INTERRUPTED:'El servicio se interrumpió. No hubo reintento automático.',CANCELLED:'Análisis cancelado por el usuario.'};
errors.PROJECTION_APPROVED_REQUIREMENT_REQUIRED='Sólo un requisito con aprobación vigente puede proyectarse.';errors.PROJECTION_PENDING='Ya existe una propuesta SpecDD pendiente para este requisito.';errors.PROJECTION_STALE='Cambió el requisito, el grafo o el destino canónico. Prepará una nueva proyección.';errors.PROJECTION_STALE_APPROVAL='La aprobación no corresponde al subject exacto de esta proyección.';
function el(tag,content,className){const n=document.createElement(tag);if(content!==undefined)n.textContent=content;if(className)n.className=className;return n;}
function button(label,fn,secondary=false){const b=el('button',label,secondary?'secondary':'');b.type='button';b.addEventListener('click',()=>task(fn));return b;}
function field(parent,label,value='',tag='input'){const l=el('label',label),n=document.createElement(tag);n.value=value;l.append(n);parent.append(l);return n;}
function detail(title,content){const d=el('details'),s=el('summary',title);d.append(s,el('pre',content));return d;}
async function api(path,body){const res=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','x-specforge-csrf':session.csrf}:{},...(body?{body:JSON.stringify(body)}:{})});const data=await res.json();if(!res.ok)throw new Error(data.error);return data;}
function message(error){$('message').textContent=errors[error.message]??`No se completó la operación (${error.message}). Los cambios no se aplicaron. Podés actualizar para revisar el estado.`;}
errors.RUNTIME_PERMISSIONS_UNVERIFIED='No se pudieron verificar los permisos del agente. El análisis no se inició. Conservá el borrador y pedí al operador revisar el preflight; no hay reintento automático.';
async function task(fn){if(busy)return;busy=true;document.body.inert=true;document.body.setAttribute('aria-busy','true');$('message').textContent='';try{await fn();}catch(e){message(e);}finally{busy=false;document.body.inert=false;document.body.setAttribute('aria-busy','false');}}
const base=()=>`/api/projects/${encodeURIComponent(projectId)}`;
async function command(command,version=view.version){const target=command.op==='create'?'new':command.targetId;if([...dirtyTargets].some(id=>id!==target))throw new Error('UNSAVED_CHANGES');view=await api(`${base()}/command`,{version,command});render();}
async function refresh(){if(!projectId)return;if(dirty)throw new Error('UNSAVED_CHANGES');view=await api(base());render();}
function render(){
  dirty=false;dirtyTargets.clear();$('detail').dataset.artifact=selected??'new';
  clearTimeout(timer);$('operator').textContent=`Revisor local: ${view.operator} · identidad local declarada`;$('runtime').textContent=`Agente: ${view.runtime}`;
  $('context').replaceChildren(el('p',view.project.project.description||'Sin descripción de contexto.'),el('p',`Principios: ${view.project.project.principles.join(' · ')||'No declarados'}`),detail('Contexto preparado y procedencia',JSON.stringify(view.project,null,2)));
  const reqs=view.artifacts.filter(a=>a.type==='requirement');$('list').replaceChildren();
  for(const a of reqs){const b=button(`${a.title} · ${labels[a.status]}`,async()=>{if(dirty)throw new Error('UNSAVED_CHANGES');selected=a.id;render();},true);if(a.id===selected)b.classList.add('selected');$('list').append(b);}
  if(!reqs.length)$('list').append(el('p','Todavía no hay requisitos. Creá el primero a partir de un pedido real o del piloto sintético.','empty'));
  if(selected&&!view.artifacts.some(a=>a.id===selected))selected=null;
  $('detail').replaceChildren();if(selected)renderRequirement(view.artifacts.find(a=>a.id===selected));else renderNew();
  $('history').replaceChildren(...view.history.map(h=>el('p',`${new Date(h.event.at).toLocaleString()} · ${h.event.actor.id} · ${h.event.action} · versión ${h.version}`,'history-item')));
  const running=view.runs.some(r=>r.status==='running');
  $('new').disabled=running;$('projects').disabled=running;
  if(running)for(const n of $('detail').querySelectorAll('input,textarea,button'))if(n.textContent!=='Cancelar análisis')n.disabled=true;
  if(view.runs.some(r=>r.status==='running')){const poll=()=>{if(!busy)task(refresh);else timer=setTimeout(poll,250);};timer=setTimeout(poll,1500);}
}
function renderNew(){const root=$('detail');root.append(el('h2','Crear requisito'),el('p','Registrá el pedido tal como lo conocés. Las dudas se trabajan después, sin inventar respuestas.','muted'));
  const title=field(root,'Título del requisito'),description=field(root,'Pedido o descripción','','textarea'),source=field(root,'Fuente conocida (opcional)');
  root.append(button('Guardar borrador',async()=>{await command({op:'create',title:title.value,description:description.value,source:source.value});selected=view.history[0].event.targetId;render();}));}
function criteriaEditor(root,criteria){const rows=[];const list=el('div');root.append(el('h3','Criterios de aceptación'),list);
    function add(c){const box=el('div',undefined,'card');const fields=el('div',undefined,'criteria');box.append(fields);const given=field(fields,'Dado',c?.given??'','textarea'),when=field(fields,'Cuando',c?.when??'','textarea'),then=field(fields,'Entonces',c?.then??'','textarea');const row={id:c?.id??`ac-${crypto.randomUUID()}`,given,when,then,removed:false};rows.push(row);box.append(button('Quitar criterio',async()=>{markDirty(selected);row.removed=true;box.remove();},true));list.append(box);}
  for(const c of criteria)add(c);root.append(button('Agregar criterio',async()=>{markDirty(selected);add();},true));return ()=>rows.filter(r=>!r.removed).map(r=>({id:r.id,given:r.given.value,when:r.when.value,then:r.then.value}));}
function renderRequirement(a){const root=$('detail');root.append(el('h2',a.title),el('p',`${labels[a.status]} · revisión ${a.revision}`,'muted'));
  const approval=view.approvals.filter(r=>r.targetId===a.id).at(-1);if(approval)root.append(el('p',approval.valid?'Aprobación vigente para este contexto.':'La aprobación anterior ya no cubre el contexto actual. Revisá y guardá una nueva revisión antes de aprobar.','notice'));
  const title=field(root,'Título',a.title),description=field(root,'Descripción del requisito',a.content.description,'textarea');const criteria=criteriaEditor(root,a.content.acceptanceCriteria);
  const actions=el('div',undefined,'actions');root.append(actions);
  actions.append(button('Guardar nueva revisión',async()=>command({op:'edit',targetId:a.id,title:title.value,content:{description:description.value,acceptanceCriteria:criteria()}})),button('Revisar aprobación',()=>openApproval(a.id),true));
  if(a.status==='approved'||a.status==='active')actions.append(button('Preparar propuesta SpecDD',async()=>command({op:'prepare-projection',targetId:a.id}),true));
  renderProjections(root,a);
  root.append(el('h3','Trabajar con el agente'),el('p','El agente analiza la última revisión guardada. Guardá tus cambios antes de continuar. Enviar contexto puede consumir cuota del proveedor configurado.','muted'));
  const consentLabel=el('label',undefined,'check'),consent=document.createElement('input');consent.type='checkbox';consentLabel.append(consent,el('span','Autorizo enviar este contexto al agente configurado para esta acción.'));root.append(consentLabel);
  const agentActions=el('div',undefined,'actions');root.append(agentActions);
  for(const [name,action] of [['Analizar requisito','analyze-requirement'],['Refinar redacción','refine-wording'],['Sugerir criterios','suggest-acceptance-criteria']]){
    const b=button(name,async()=>{if(dirty)throw new Error('UNSAVED_CHANGES');if(!consent.checked)throw new Error('RUNTIME_CONSENT_REQUIRED');await api(`${base()}/runs`,{version:view.version,request:{targetId:a.id,action,consent:true}});await refresh();},true);b.disabled=!view.runtimeAvailable||view.runs.some(r=>r.status==='running');agentActions.append(b);
  }
  if(!view.runtimeAvailable)root.append(el('p','Agente no configurado. Podés crear, editar y revisar localmente; el operador debe habilitar el runtime.','notice'));
  for(const run of view.runs.filter(r=>r.targetId===a.id))renderRun(root,run);
  root.append(el('h3','Preguntas y reglas relacionadas'));
  const linked=new Set(view.graph.edges.filter(e=>e.from===a.id||e.to===a.id).flatMap(e=>[e.from,e.to]));
  const related=view.artifacts.filter(t=>t.id!==a.id&&linked.has(t.id));
  if(!related.length)root.append(el('p','No hay preguntas o reglas incorporadas. Esto no demuestra que el requisito esté completo.','muted'));
  for(const item of related){const box=el('div',undefined,'card');box.dataset.artifact=item.id;box.append(el('h3',item.title),el('p',`${labels[item.status]} · revisión ${item.revision}`,'muted'));
    if(item.type==='open-question'){box.append(el('p',item.content.blocking?'Bloquea aprobación mientras no tenga respuesta.':'Pregunta no bloqueante.'));const answer=field(box,'Respuesta humana',item.content.resolution?.answer??'','textarea');box.append(button('Guardar respuesta humana',async()=>command({op:'resolve-question',targetId:item.id,answer:answer.value})));}
    else if(item.type==='business-rule'){const statement=field(box,'Regla propuesta',item.content.statement,'textarea'),rationale=field(box,'Motivo',item.content.rationale,'textarea');box.append(button('Guardar revisión de regla',async()=>command({op:'edit',targetId:item.id,title:item.title,content:{statement:statement.value,rationale:rationale.value}}),true),button('Revisar aprobación de regla',()=>openApproval(item.id),true));}
    else box.append(el('p',JSON.stringify(item.content)));root.append(box);
  }
  const impact=view.graph.impact[a.id].nodes.filter(n=>n.artifactId!==a.id);root.append(el('p',`Impacto conocido: ${impact.length} artefacto(s) dependiente(s). Sólo relaciones del contexto registrado. No es una evaluación completa del negocio.`,'muted'));
  root.append(detail('Historial de este requisito y procedencia',view.histories[a.id].map(r=>`Revisión ${r.revision} · ${labels[r.status]}\n${r.content.description}\nOrigen: ${r.provenance.map(p=>`${p.actor.id} (${p.origin})`).join(' → ')}`).join('\n\n')));
}
function renderProjections(root,a){
  const projections=view.projections.filter(p=>p.proposal.source.artifact.artifactId===a.id),canonicals=view.canonicalSpecs.filter(c=>c.source.artifact.artifactId===a.id);
  if(!projections.length&&!canonicals.length)return;
  root.append(el('h3','Proyección gobernada a SpecDD'));
  for(const entry of projections){const p=entry.proposal,status=entry.status==='proposed'?'Propuesta pendiente':entry.status==='applied'?'Aplicada':'Descartada',box=el('div',undefined,'card projection');box.append(el('h3',`${p.destination.path} · ${status}`),el('p',`Mapping ${p.mapping.status==='partial'?'parcial':'completo'} · ${p.mapping.incomplete.length} faltante(s) · ${p.mapping.unsupported.length} no soportado(s)`,'muted'),detail('Contenido propuesto',p.content),detail('Diff exacto',p.diff),detail('Reporte de mapping',JSON.stringify(p.mapping,null,2)),detail('Trazabilidad de propuesta',JSON.stringify({...p.source,destination:p.destination,contentSha256:p.contentSha256},null,2)));
    if(entry.status==='proposed')box.append(button('Revisar y crear artefacto SpecDD',()=>openProjectionApproval(p.id)),button('Descartar propuesta SpecDD',async()=>command({op:'discard-projection',projectionId:p.id}),true));root.append(box);}
  for(const c of canonicals){const box=el('div',undefined,'card canonical');box.append(el('h3',`Artefacto SpecDD canónico · ${c.path}`),el('p',`Revisión ${c.revision} · hash ${c.contentSha256}`,'muted'),detail('Contenido canónico',c.content),detail('Trazabilidad canónica',JSON.stringify(c.source,null,2)));root.append(box);}
}
function renderRun(root,run){const box=el('div',undefined,'card proposal');box.append(el('h3',labels[run.status]),el('p',`${run.action} · ${new Date(run.startedAt).toLocaleString()}`,'muted'));
  if(run.error)box.append(el('p',errors[run.error]??run.error));
  if(run.status==='running')box.append(button('Cancelar análisis',async()=>{await api(`${base()}/cancel`,{runId:run.id});await refresh();},true));
  if(run.proposal){const out=run.proposal.output;const checks=[];box.append(el('p','Propuesta del agente: no es una decisión ni una aprobación. Seleccioná sólo lo que querés incorporar como borrador.'));
    for(const a of out.ambiguities)box.append(el('p',`Observación: ${a.description}`));
    const suggestions=[...(out.wording?[{...out.wording,text:`Redacción: ${out.wording.description}`}]:[]),...out.questions.map(s=>({...s,text:`Pregunta: ${s.question} (${s.blocking?'bloqueante':'no bloqueante'})`})),...out.rules.map(s=>({...s,text:`Regla propuesta: ${s.statement}\nMotivo: ${s.rationale}`})),...out.criteria.map(s=>({...s,text:`Criterio: Dado ${s.given}, cuando ${s.when}, entonces ${s.then}`}))];
    for(const s of suggestions){const l=el('label',undefined,'check'),c=document.createElement('input');c.type='checkbox';c.disabled=run.status!=='ready';l.append(c,el('span',s.text));box.append(l);checks.push({id:s.id,c});}
    if(run.status==='ready'){box.append(button('Incorporar seleccionadas',async()=>command({op:'adopt',runId:run.id,selectedIds:checks.filter(s=>s.c.checked).map(s=>s.id)})),button('Descartar propuesta',async()=>command({op:'discard',runId:run.id}),true));}
  }
  box.append(detail('Evidencia de ejecución',JSON.stringify({id:run.id,requestSha256:run.requestSha256,runtime:run.runtime},null,2)));root.append(box);
}
async function openApproval(targetId){let artifact=view.artifacts.find(a=>a.id===targetId);
  if(dirty)throw new Error('UNSAVED_CHANGES');
  if(artifact.status==='draft'){await command({op:'request-review',targetId});artifact=view.artifacts.find(a=>a.id===targetId);}
  const prepared=await api(`${base()}/approval?target=${encodeURIComponent(targetId)}`);
  $('approval-title').textContent='Revisar aprobación exacta';$('approval-note').textContent='No modifica ni publica una spec. Si cambia el contexto, la aprobación deberá revisarse.';
  $('approval-content').replaceChildren(el('h3',artifact.title),el('p',`Revisión ${artifact.revision} · revisor: ${view.operator}`),el('pre',JSON.stringify(artifact.content,null,2)),detail('Subject exacto y grafo',JSON.stringify(prepared,null,2)));
  $('approve-confirm').textContent=`Confirmar aprobación como ${view.operator}`;
  $('approve-confirm').onclick=()=>task(async()=>{await command({op:'approve',targetId,subjectSha256:prepared.subjectSha256},prepared.version);$('approval').close();});$('approval').showModal();
}
async function openProjectionApproval(projectionId){if(dirty)throw new Error('UNSAVED_CHANGES');const entry=view.projections.find(p=>p.proposal.id===projectionId),p=entry?.proposal;if(!p||entry.status!=='proposed')throw new Error('PROJECTION_NOT_FOUND');
  const subjectSha256=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(p))).then(b=>[...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join(''));
  $('approval-title').textContent='Revisar proyección SpecDD exacta';$('approval-note').textContent='La confirmación crea el artefacto canónico sólo en el store local. No escribe archivos, Git ni publica.';
  $('approval-content').replaceChildren(el('h3',p.destination.path),el('p',`Mapping ${p.mapping.status} · revisor: ${view.operator}`),detail('Diff exacto',p.diff),detail('Faltantes y no soportados',JSON.stringify({incomplete:p.mapping.incomplete,unsupported:p.mapping.unsupported},null,2)),detail('Contenido completo',p.content),detail('Subject exacto',JSON.stringify({subjectSha256,proposal:p},null,2)));
  $('approve-confirm').textContent=`Crear artefacto SpecDD como ${view.operator}`;$('approve-confirm').onclick=()=>task(async()=>{await command({op:'apply-projection',projectionId,subjectSha256});$('approval').close();});$('approval').showModal();
}
function canonical(value){if(value===null||typeof value==='boolean'||typeof value==='string'||typeof value==='number')return JSON.stringify(value);if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;}
$('detail').addEventListener('input',event=>{if(event.target.type!=='checkbox')markDirty(event.target.closest('[data-artifact]').dataset.artifact);});
errors.UNSAVED_CHANGES='Tenés cambios sin guardar. Guardá la revisión antes de analizar, actualizar o aprobar.';
errors.RUNTIME_CONSENT_REQUIRED='Marcá el consentimiento de envío de contexto para ejecutar esta acción.';
$('approve-cancel').onclick=()=>$('approval').close();$('new').onclick=()=>{if(dirty){message(new Error('UNSAVED_CHANGES'));return;}selected=null;render();};$('refresh').onclick=()=>task(refresh);
$('projects').onchange=()=>task(async()=>{if(dirty){$('projects').value=projectId;throw new Error('UNSAVED_CHANGES');}projectId=$('projects').value;selected=null;await refresh();});
task(async()=>{session=await api('/api/session');const data=await api('/api/projects');for(const p of data.projects){const o=el('option',p.name);o.value=p.id;$('projects').append(o);}projectId=data.projects[0]?.id;if(projectId)await refresh();else $('detail').append(el('p','No hay proyectos preparados. El operador debe registrar un bundle revisado.','empty'));});
