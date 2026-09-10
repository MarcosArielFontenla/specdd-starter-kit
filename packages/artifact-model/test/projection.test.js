import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createArtifact,reviewArtifact,artifactSubject,fingerprint} from '../dist/index.js';
import {prepareBAApproval,approveBA} from '../dist/ba.js';
import {prepareSpecDDProjection,applySpecDDProjection,assertSpecDDProjectionCurrent,assertSpecDDProjectionReceipt,specDDPath} from '../dist/projection.js';

const human={id:'fixture-reviewer',kind:'human'},t0='2026-09-08T10:00:00.000Z',t1='2026-09-08T10:01:00.000Z',t2='2026-09-08T10:02:00.000Z';
async function fixture(){
  const project=JSON.parse(await readFile(new URL('../../project-model/examples/minimal.project.json',import.meta.url),'utf8'));
  project.metadata.id='projection-fixture';project.metadata.name='Projection fixture';
  const projectRef={id:project.metadata.id,definitionSha256:await fingerprint(project)};
  let artifact=await createArtifact({id:'cancel-appointment',title:'Cancelar un turno',type:'requirement',content:{description:'Permitir al cliente cancelar un turno aprobado.',acceptanceCriteria:[{id:'ac-1',given:'Un turno futuro',when:'El cliente cancela',then:'El turno queda cancelado'}]},ownerRole:'ba',projectRef,relationships:[]},{actor:human,origin:'human-authored',at:t0,sourceRefs:[]});
  artifact=await reviewArtifact(artifact,{id:'review-1',action:'request-review',actor:human,at:t1,subjectSha256:await artifactSubject(artifact)},{project,artifacts:[artifact]});
  let graph={schemaVersion:'1.0.0',kind:'SpecForgeArtifactGraph',projectRef,nodes:[{projectId:project.metadata.id,artifactId:artifact.id,revision:artifact.revision,sha256:await artifactSubject(artifact)}],assertions:[]};
  const before={targetId:artifact.id,graph,context:{project,artifacts:[artifact]}},prepared=await prepareBAApproval(before);
  const approved=await approveBA(before,{subjectSha256:prepared.subjectSha256,eventId:'approve-1',actor:human,at:t2});artifact=approved.artifact;
  graph={...graph,nodes:[{projectId:project.metadata.id,artifactId:artifact.id,revision:artifact.revision,sha256:await artifactSubject(artifact)}]};
  return {targetId:artifact.id,graph,context:{project,artifacts:[artifact]},approval:approved.receipt,current:null};
}

test('approved BA requirement deterministically projects to the concrete SpecDD path with explicit gaps',async()=>{
  const input=await fixture(),a=await prepareSpecDDProjection(input,{id:'projection-1',createdAt:t2}),b=await prepareSpecDDProjection(input,{id:'projection-1',createdAt:t2});
  assert.deepEqual(a,b);assert.equal(a.proposal.destination.path,'specs/cancelar-un-turno/spec.md');assert.equal(a.proposal.mapping.status,'partial');
  assert.match(a.proposal.content,/FR-1: Permitir al cliente/);assert.match(a.proposal.content,/AC-1: Given Un turno futuro/);assert.match(a.proposal.diff,/--- \/dev\/null/);
  assert.ok(a.proposal.mapping.incomplete.some(g=>g.code==='PERSONAS_NOT_MAPPED'));assert.equal(specDDPath('Árbol & Acción'),'specs/arbol-accion/spec.md');
});

test('exact human approval creates a canonical portable artifact and auditable receipt',async()=>{
  const input=await fixture(),{proposal,subjectSha256}=await prepareSpecDDProjection(input,{id:'projection-1',createdAt:t2});
  const result=await applySpecDDProjection(proposal,input,{subjectSha256,actor:human,at:'2026-09-08T10:03:00.000Z'});
  assert.equal(result.canonical.revision,1);assert.equal(result.canonical.path,proposal.destination.path);assert.equal(result.receipt.previousContentSha256,null);
  await assertSpecDDProjectionReceipt(proposal,result.canonical,result.receipt);
});

test('wrong subject, non-human decision and time travel fail closed',async()=>{
  const input=await fixture(),{proposal,subjectSha256}=await prepareSpecDDProjection(input,{id:'projection-1',createdAt:t2});
  await assert.rejects(applySpecDDProjection(proposal,input,{subjectSha256:'0'.repeat(64),actor:human,at:'2026-09-08T10:03:00.000Z'}),/PROJECTION_STALE_APPROVAL/);
  await assert.rejects(applySpecDDProjection(proposal,input,{subjectSha256,actor:{id:'agent',kind:'agent'},at:'2026-09-08T10:03:00.000Z'}),/PROJECTION_HUMAN_REQUIRED/);
  await assert.rejects(applySpecDDProjection(proposal,input,{subjectSha256,actor:human,at:t1}),/PROJECTION_TIME/);
});

test('graph, approval and destination drift invalidate a prepared proposal',async()=>{
  const input=await fixture(),{proposal}=await prepareSpecDDProjection(input,{id:'projection-1',createdAt:t2});
  const changed=structuredClone(input);changed.context.project.project.outcomes.user='A changed outcome';changed.context.project.metadata.name='drift';
  await assert.rejects(assertSpecDDProjectionCurrent(proposal,changed));
  const other={schemaVersion:'1.0.0',kind:'SpecDDCanonicalSpec',projectId:proposal.projectId,path:proposal.destination.path,revision:1,previousContentSha256:null,content:'external drift',contentSha256:await fingerprint('external drift'),source:{artifact:proposal.source.artifact,baApprovalReceiptSha256:proposal.source.baApprovalReceiptSha256,graphSnapshotSha256:proposal.source.graphSnapshotSha256,projectionSubjectSha256:'1'.repeat(64)},appliedBy:human,appliedAt:t2};
  await assert.rejects(assertSpecDDProjectionCurrent(proposal,{...input,current:other}),/PROJECTION_STALE/);
});

test('replacement is bound to the exact previous canonical content and increments revision',async()=>{
  const input=await fixture(),first=await prepareSpecDDProjection(input,{id:'projection-1',createdAt:t2}),applied=await applySpecDDProjection(first.proposal,input,{subjectSha256:first.subjectSha256,actor:human,at:'2026-09-08T10:03:00.000Z'});
  const nextInput={...input,current:applied.canonical},next=await prepareSpecDDProjection(nextInput,{id:'projection-2',createdAt:'2026-09-08T10:04:00.000Z'}),result=await applySpecDDProjection(next.proposal,nextInput,{subjectSha256:next.subjectSha256,actor:human,at:'2026-09-08T10:05:00.000Z'});
  assert.equal(next.proposal.destination.baseContentSha256,applied.canonical.contentSha256);assert.equal(result.canonical.revision,2);assert.equal(result.canonical.previousContentSha256,applied.canonical.contentSha256);
});

test('proposal and receipt tampering are detected',async()=>{
  const input=await fixture(),prepared=await prepareSpecDDProjection(input,{id:'projection-1',createdAt:t2}),result=await applySpecDDProjection(prepared.proposal,input,{subjectSha256:prepared.subjectSha256,actor:human,at:'2026-09-08T10:03:00.000Z'});
  const proposal=structuredClone(prepared.proposal);proposal.content+='tampered';await assert.rejects(assertSpecDDProjectionCurrent(proposal,input));
  await assert.rejects(assertSpecDDProjectionReceipt(proposal,result.canonical,result.receipt),/PROJECTION_RECEIPT_INVALID/);
  const receipt={...result.receipt,appliedContentSha256:'f'.repeat(64)};await assert.rejects(assertSpecDDProjectionReceipt(prepared.proposal,result.canonical,receipt),/PROJECTION_RECEIPT_INVALID/);
});
