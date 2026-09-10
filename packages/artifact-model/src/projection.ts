import schema from '../schema/specdd-projection.schema.json' with {type:'json'};
import {structuralValidator} from '@specdd/project-model';
import {artifactSubject,canonicalJson,fingerprint} from './index.js';
import {createArtifactGraph} from './graph.js';
import {assertBAApproval} from './ba.js';
import type {Actor,Artifact,ArtifactReference} from './types.js';
import type {SpecDDCanonicalSpec,SpecDDProjectionInput,SpecDDProjectionMapping,SpecDDProjectionProposal,SpecDDProjectionReceipt} from './projection-types.js';
export * from './projection-types.js';
export const specDDProjectionSchema=schema;
const structure=structuralValidator(schema);
const fail=(code:string):never=>{throw new Error(code);};
const copy=<T>(value:T):T=>{canonicalJson(value);return structuredClone(value);};
const validTime=(value:string)=>Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const exact=(value:unknown,fields:string[])=>{canonicalJson(value);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!fields.includes(k))||fields.some(k=>!Object.hasOwn(value,k)))fail('PROJECTION_FIELDS');};
const ref=async(a:Artifact):Promise<ArtifactReference>=>({projectId:a.projectRef.id,artifactId:a.id,revision:a.revision,sha256:await artifactSubject(a)});
const clean=(value:string)=>value.trim().replace(/\r\n/g,'\n').replace(/\r/g,'\n');

export function specDDPath(title:string):string {
  const slug=title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80).replace(/-$/,'');
  if(!slug)fail('PROJECTION_PATH');return `specs/${slug}/spec.md`;
}

function assertPath(path:string){if(typeof path!=='string'||path.length>200||!/^specs\/[a-z0-9]+(?:-[a-z0-9]+)*\/spec\.md$/.test(path))fail('PROJECTION_PATH');}
function assertActor(actor:Actor){exact(actor,['id','kind']);if(actor.kind!=='human'||typeof actor.id!=='string'||!actor.id.trim())fail('PROJECTION_HUMAN_REQUIRED');}
async function assertCanonical(value:SpecDDCanonicalSpec|null,projectId:string,path:string){
  if(value===null)return;
  exact(value,['schemaVersion','kind','projectId','path','revision','previousContentSha256','content','contentSha256','source','appliedBy','appliedAt']);
  if(value.schemaVersion!=='1.0.0'||value.kind!=='SpecDDCanonicalSpec'||value.projectId!==projectId||value.path!==path||!Number.isInteger(value.revision)||value.revision<1||
    value.contentSha256!==await fingerprint(value.content)||!validTime(value.appliedAt))fail('PROJECTION_CANONICAL_INVALID');
  assertActor(value.appliedBy);
}

function lines(value:string|null){return value===null?[]:clean(value).split('\n');}
function diff(before:string|null,after:string,path:string){
  const old=lines(before),next=lines(after);let prefix=0,suffix=0;
  while(prefix<old.length&&prefix<next.length&&old[prefix]===next[prefix])prefix++;
  while(suffix<old.length-prefix&&suffix<next.length-prefix&&old[old.length-1-suffix]===next[next.length-1-suffix])suffix++;
  const body=[...old.slice(prefix,old.length-suffix).map(line=>`-${line}`),...next.slice(prefix,next.length-suffix).map(line=>`+${line}`)];
  return [`--- ${before===null?'/dev/null':`a/${path}`}`,`+++ b/${path}`,`@@ -${prefix+1},${old.length-prefix-suffix} +${prefix+1},${next.length-prefix-suffix} @@`,...body].join('\n');
}

async function mapped(input:SpecDDProjectionInput){
  await assertBAApproval({targetId:input.targetId,graph:input.graph,context:input.context},input.approval);
  const view=await createArtifactGraph(input.graph,input.context),snapshot=view.snapshot();
  const root=snapshot.artifacts.find(a=>a.id===input.targetId)??fail('PROJECTION_SOURCE_MISSING');
  if(root.type!=='requirement'||root.status!=='approved')fail('PROJECTION_APPROVED_REQUIREMENT_REQUIRED');
  const requirement=root as Artifact&{type:'requirement'};
  const direct=new Set(snapshot.edges.filter(e=>e.from===root.id||e.to===root.id).flatMap(e=>[e.from,e.to]));direct.delete(root.id);
  const related=snapshot.artifacts.filter(a=>direct.has(a.id)).sort((a,b)=>a.id.localeCompare(b.id));
  const questions=related.filter(a=>a.type==='open-question'&&a.content.resolution) as Array<Artifact&{type:'open-question'}>;
  const rules=related.filter(a=>a.type==='business-rule'&&['approved','active'].includes(a.status)) as Array<Artifact&{type:'business-rule'}>;
  const decisions=related.filter(a=>a.type==='decision'&&['approved','active'].includes(a.status)) as Array<Artifact&{type:'decision'}>;
  const unsupported=related.filter(a=>!['open-question','business-rule','decision'].includes(a.type)).map(a=>({artifactId:a.id,artifactType:a.type,reason:'No deterministic SpecDD section mapping is defined for this related artifact type.'}));
  const project=input.context.project.project,incomplete:SpecDDProjectionMapping['incomplete']=[];
  if(!project.personas.length)incomplete.push({code:'PERSONAS_NOT_MAPPED',targetSection:'Personas & outcomes',reason:'The approved Project Definition has no personas.'});
  if(!project.outcomes.user.trim())incomplete.push({code:'USER_OUTCOME_NOT_MAPPED',targetSection:'Personas & outcomes',reason:'The approved Project Definition has no user outcome.'});
  if(!project.outcomes.business.trim())incomplete.push({code:'BUSINESS_OUTCOME_NOT_MAPPED',targetSection:'Personas & outcomes',reason:'The approved Project Definition has no business outcome.'});
  if(!project.constraints.technical.trim())incomplete.push({code:'NFR_NOT_MAPPED',targetSection:'Requirements / Non-functional',reason:'No approved technical constraint can be mapped deterministically.'});
  incomplete.push({code:'OUT_OF_SCOPE_NOT_MAPPED',targetSection:'Out of scope',reason:'BA artifacts do not carry a typed out-of-scope field.'});
  const value=(v:string,fallback:string)=>v.trim()||fallback;
  const content=[`# Feature Specification: ${requirement.title}`,'','> Specifications are the source of truth. Code is the output.','',
    '## Summary',clean(requirement.content.description),'','## Personas & outcomes',
    `- **Persona:** ${project.personas.length?project.personas.join(', '):'Not mapped — human completion required'}`,
    `- **User outcome:** ${value(project.outcomes.user,'Not mapped — human completion required')}`,
    `- **Business outcome:** ${value(project.outcomes.business,'Not mapped — human completion required')}`,'','## Requirements','### Functional',
    `- FR-1: ${clean(requirement.content.description)}`,
    ...rules.map((r,i)=>`- BR-${i+1}: ${clean(r.content.statement)} — ${clean(r.content.rationale)}`),
    ...decisions.map((d,i)=>`- DEC-${i+1}: ${clean(d.content.decision)} — ${clean(d.content.rationale)}`),'','### Non-functional',
    `- ${value(project.constraints.technical,'Not mapped — human completion required')}`,'','## Acceptance criteria',
    ...requirement.content.acceptanceCriteria.map((c,i)=>`- [ ] AC-${i+1}: Given ${clean(c.given)}; when ${clean(c.when)}; then ${clean(c.then)}`),'','## Out of scope',
    '- Not mapped — human completion required','','## Resolved questions',
    ...(questions.length?questions.flatMap((q,i)=>[`- Q-${i+1}: ${clean(q.content.question)}`,`  - Human answer: ${clean(q.content.resolution!.answer)}`]):['- None in the approved direct graph.']),
    '','## Open questions','- None in the approved direct graph snapshot.','','## Traceability',
    `- Source BA artifact: ${requirement.id}@${requirement.revision}`,
    `- Source graph snapshot: ${view.snapshotSha256}`,
    `- BA approval receipt: ${await fingerprint(input.approval)}`,''].join('\n');
  const mappedEntries:SpecDDProjectionMapping['mapped']=[{sourceArtifactId:requirement.id,sourceRevision:requirement.revision,targetSections:['Summary','Requirements / Functional','Acceptance criteria','Traceability']},
    ...questions.map(q=>({sourceArtifactId:q.id,sourceRevision:q.revision,targetSections:['Resolved questions','Traceability']})),
    ...rules.map(r=>({sourceArtifactId:r.id,sourceRevision:r.revision,targetSections:['Requirements / Functional','Traceability']})),
    ...decisions.map(d=>({sourceArtifactId:d.id,sourceRevision:d.revision,targetSections:['Requirements / Functional','Traceability']}))];
  return {root:requirement,view,content,mapping:{status:(incomplete.length||unsupported.length?'partial':'complete') as 'partial'|'complete',mapped:mappedEntries,incomplete,unsupported}};
}

export async function prepareSpecDDProjection(input:SpecDDProjectionInput,options:{id:string;createdAt:string;destinationPath?:string}):Promise<{proposal:SpecDDProjectionProposal;subjectSha256:string}> {
  const value=copy(input),opt=copy(options);exact(opt,Object.hasOwn(opt,'destinationPath')?['id','createdAt','destinationPath']:['id','createdAt']);
  if(typeof opt.id!=='string'||!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(opt.id)||!validTime(opt.createdAt))fail('PROJECTION_IDENTITY');
  const result=await mapped(value),path=opt.destinationPath??specDDPath(result.root.title);assertPath(path);await assertCanonical(value.current,value.context.project.metadata.id,path);
  const proposal:SpecDDProjectionProposal={schemaVersion:'1.0.0',kind:'SpecDDProjectionProposal',id:opt.id,createdAt:opt.createdAt,projectId:value.context.project.metadata.id,
    source:{artifact:await ref(result.root),baApprovalReceiptSha256:await fingerprint(value.approval),graphSnapshotSha256:result.view.snapshotSha256},
    destination:{path,baseContentSha256:value.current?.contentSha256??null},content:result.content,contentSha256:await fingerprint(result.content),
    diff:diff(value.current?.content??null,result.content,path),mapping:result.mapping};
  assertSpecDDProjectionProposal(proposal);return {proposal,subjectSha256:await fingerprint(proposal)};
}

export function assertSpecDDProjectionProposal(value:unknown):asserts value is SpecDDProjectionProposal {
  const result=structure(value);if(result.length)fail('PROJECTION_SCHEMA');
}

export async function assertSpecDDProjectionCurrent(proposal:SpecDDProjectionProposal,input:SpecDDProjectionInput):Promise<void>{
  assertSpecDDProjectionProposal(proposal);const p=copy(proposal),value=copy(input),result=await mapped(value);assertPath(p.destination.path);await assertCanonical(value.current,p.projectId,p.destination.path);
  if(p.projectId!==value.context.project.metadata.id||p.source.artifact.projectId!==p.projectId||p.source.artifact.sha256!==await artifactSubject(result.root)||p.source.artifact.revision!==result.root.revision||
    p.source.artifact.artifactId!==result.root.id||p.source.baApprovalReceiptSha256!==await fingerprint(value.approval)||p.source.graphSnapshotSha256!==result.view.snapshotSha256||
    p.destination.baseContentSha256!==(value.current?.contentSha256??null)||p.content!==result.content||p.contentSha256!==await fingerprint(result.content)||
    p.diff!==diff(value.current?.content??null,result.content,p.destination.path)||canonicalJson(p.mapping)!==canonicalJson(result.mapping))fail('PROJECTION_STALE');
}

export async function applySpecDDProjection(proposal:SpecDDProjectionProposal,input:SpecDDProjectionInput,decision:{subjectSha256:string;actor:Actor;at:string}):Promise<{canonical:SpecDDCanonicalSpec;receipt:SpecDDProjectionReceipt}>{
  const p=copy(proposal),value=copy(input),d=copy(decision);exact(d,['subjectSha256','actor','at']);assertActor(d.actor);if(!validTime(d.at)||d.at<p.createdAt)fail('PROJECTION_TIME');
  await assertSpecDDProjectionCurrent(p,value);const subject=await fingerprint(p);if(d.subjectSha256!==subject)fail('PROJECTION_STALE_APPROVAL');
  const revision=(value.current?.revision??0)+1,canonical:SpecDDCanonicalSpec={schemaVersion:'1.0.0',kind:'SpecDDCanonicalSpec',projectId:p.projectId,path:p.destination.path,revision,
    previousContentSha256:p.destination.baseContentSha256,content:p.content,contentSha256:p.contentSha256,source:{...p.source,projectionSubjectSha256:subject},appliedBy:d.actor,appliedAt:d.at};
  const receipt:SpecDDProjectionReceipt={schemaVersion:'1.0.0',kind:'SpecDDProjectionReceipt',projectionId:p.id,projectionSubjectSha256:subject,projectId:p.projectId,path:p.destination.path,
    previousContentSha256:p.destination.baseContentSha256,appliedContentSha256:p.contentSha256,canonicalRevision:revision,sourceArtifact:p.source.artifact,
    baApprovalReceiptSha256:p.source.baApprovalReceiptSha256,graphSnapshotSha256:p.source.graphSnapshotSha256,actor:d.actor,at:d.at};
  await assertCanonical(canonical,p.projectId,p.destination.path);return {canonical,receipt};
}

export async function assertSpecDDProjectionReceipt(proposal:SpecDDProjectionProposal,canonical:SpecDDCanonicalSpec,receipt:SpecDDProjectionReceipt):Promise<void>{
  assertSpecDDProjectionProposal(proposal);await assertCanonical(canonical,proposal.projectId,proposal.destination.path);exact(receipt,['schemaVersion','kind','projectionId','projectionSubjectSha256','projectId','path','previousContentSha256','appliedContentSha256','canonicalRevision','sourceArtifact','baApprovalReceiptSha256','graphSnapshotSha256','actor','at']);assertActor(receipt.actor);
  const subject=await fingerprint(proposal);if(!validTime(receipt.at)||receipt.at<proposal.createdAt||proposal.contentSha256!==await fingerprint(proposal.content)||canonical.content!==proposal.content||
    canonical.previousContentSha256!==proposal.destination.baseContentSha256||canonical.source.baApprovalReceiptSha256!==proposal.source.baApprovalReceiptSha256||canonical.source.graphSnapshotSha256!==proposal.source.graphSnapshotSha256||
    canonicalJson(canonical.source.artifact)!==canonicalJson(proposal.source.artifact)||receipt.schemaVersion!=='1.0.0'||receipt.kind!=='SpecDDProjectionReceipt'||receipt.projectionId!==proposal.id||receipt.projectionSubjectSha256!==subject||
    receipt.projectId!==canonical.projectId||receipt.path!==canonical.path||receipt.previousContentSha256!==canonical.previousContentSha256||receipt.appliedContentSha256!==canonical.contentSha256||
    receipt.canonicalRevision!==canonical.revision||canonical.source.projectionSubjectSha256!==subject||canonicalJson(receipt.sourceArtifact)!==canonicalJson(canonical.source.artifact)||
    receipt.baApprovalReceiptSha256!==canonical.source.baApprovalReceiptSha256||receipt.graphSnapshotSha256!==canonical.source.graphSnapshotSha256||
    canonicalJson(receipt.actor)!==canonicalJson(canonical.appliedBy)||receipt.at!==canonical.appliedAt)fail('PROJECTION_RECEIPT_INVALID');
}
