import { structuralValidator } from '@specdd/project-model';
import { validateCapabilityPack } from '@specdd/capability-model';
import { artifactSubject, canonicalJson, createArtifact, fingerprint, reviewArtifact } from './index.js';
import { createArtifactGraph } from './graph.js';
import workflow from '../schema/qa-workflows.json' with { type: 'json' };
import outputSchema from '../schema/qa-action-output.schema.json' with { type: 'json' };
import type { Actor, Artifact, ArtifactContext, ArtifactReference } from './types.js';
import type { ArtifactGraphDefinition, ArtifactGraphView } from './graph-types.js';
import type { QAActionInput, QAActionOutput, QAApprovalInput, QAApprovalReceipt, QAApprovalResult, QACapabilitySource, QACoverageMetadata } from './qa-types.js';
export * from './qa-types.js';
export const qaActionOutputSchema = outputSchema;
const outputStructure = structuralValidator(outputSchema);
const copy = <T>(v:T):T => { canonicalJson(v); return structuredClone(v); };
function fail(code:string):never { throw new Error(code); }
const validId = (v:unknown) => typeof v === 'string' && v.length <= 128 && /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(v);
const validTime = (v:string) => Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
function keys(v:unknown, allowed:string[]):void {
  canonicalJson(v);
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => !allowed.includes(k)) || allowed.some(k => !Object.hasOwn(v,k))) fail('QA_FIELDS');
}
function actor(v:Actor, kind:Actor['kind']):void { keys(v,['id','kind']); if (v.kind !== kind || typeof v.id !== 'string' || !v.id.trim() || v.id.length > 20000) fail('QA_ACTOR'); }
const ref = async (a:Artifact):Promise<ArtifactReference> => ({projectId:a.projectRef.id,artifactId:a.id,revision:a.revision,sha256:await artifactSubject(a)});
function assertGraphTime(at:string, snapshot:ReturnType<ArtifactGraphView['snapshot']>) {
  if (!validTime(at) || snapshot.artifacts.some(a => (a.review.at(-1)?.at ?? a.updatedAt) > at) || snapshot.definition.assertions.some(a => a.provenance.at > at)) fail('QA_TIME');
}
export function getQAWorkflow() { return copy(workflow); }

/** Resolves host-supplied QA knowledge only; it never executes workflows or tools. */
export async function resolveQACapability(value:QACapabilitySource) {
  const source=copy(value); keys(source,['pack','files','dependencies']); const pack=source.pack;
  if (!validateCapabilityPack(pack).valid || pack.lifecycle !== 'active' || pack.role.id !== 'qa' || pack.metadata.id !== workflow.capabilityId) fail('QA_CAPABILITY_UNAVAILABLE');
  if (!source.files || typeof source.files !== 'object' || Array.isArray(source.files) || !Array.isArray(source.dependencies)) fail('QA_CAPABILITY_SOURCE');
  const dependencyKeys=new Set<string>();
  for (const d of source.dependencies) { keys(d,['id','kind','versionRange']); if (!validId(d.id) || !['harness','capability'].includes(d.kind) || typeof d.versionRange !== 'string') fail('QA_DEPENDENCY'); const key=`${d.kind}:${d.id}`; if (dependencyKeys.has(key)) fail('QA_DEPENDENCY'); dependencyKeys.add(key); }
  for (const d of pack.dependencies.filter(d=>d.required)) if (!source.dependencies.some(a=>a.id===d.id&&a.kind===d.kind&&a.versionRange===d.versionRange)) fail('QA_DEPENDENCY_UNAVAILABLE');
  const w=pack.workflows.find(w=>w.id===workflow.workflowRef) ?? fail('QA_WORKFLOW_UNAVAILABLE');
  const playbooks=workflow.playbookRefs.map(id=>pack.playbooks.find(p=>p.id===id) ?? fail('QA_PLAYBOOK_UNAVAILABLE'));
  const optional=pack.playbooks.find(p=>p.id==='playwright-testing');
  const skillIds=new Set([...w.skillRefs,...playbooks.map(p=>p.skillRef),...(optional?[optional.skillRef]:[])]);
  const skills=pack.skills.filter(s=>skillIds.has(s.id)); if (skills.length!==skillIds.size) fail('QA_SKILL_UNAVAILABLE');
  const evals=pack.evals.filter(e=>e.targetRefs.some(id=>skillIds.has(id))); if (!evals.length) fail('QA_EVAL_UNAVAILABLE');
  const consumed=new Map<string,string>();
  function read(path:string, required=true) { if (!path || path.includes('\\') || path.includes(':') || path.startsWith('/') || path.split('/').some(s=>!s||s==='.'||s==='..')) fail('QA_PATH'); if (!Object.hasOwn(source.files,path)) { if(required) fail('QA_CONTENT_UNAVAILABLE'); return; } const text=source.files[path]; if(typeof text!=='string'||!text.trim()) fail('QA_CONTENT_UNAVAILABLE'); consumed.set(path,text); }
  for (const entry of [w,...skills,...playbooks,...evals]) read(entry.path);
  if (optional) read(optional.path,false);
  const contexts=pack.context.filter(c=>c.required||w.contextRefs.includes(c.id)); for(const c of contexts) read(c.path,c.required);
  const files=await Promise.all([...consumed].sort(([a],[b])=>a<b?-1:a>b?1:0).map(async([path,content])=>({path,content,sha256:await fingerprint(content)})));
  const resolution={manifest:pack,workflow:copy(workflow),files,
    missingOptionalPlaybooks:optional&&!consumed.has(optional.path)?[optional.id]:[],
    missingOptionalContext:contexts.filter(c=>!c.required&&!consumed.has(c.path)).map(c=>c.id).sort(),dependencyAttestations:source.dependencies.sort((a,b)=>`${a.kind}:${a.id}`<`${b.kind}:${b.id}`?-1:1)};
  return {...resolution,sha256:await fingerprint(resolution)};
}

async function graphInput(value:QAApprovalInput) {
  const input=copy(value); keys(input,['targetId','graph','context']); const graph=await createArtifactGraph(input.graph,input.context);
  const target=graph.snapshot().artifacts.find(a=>a.id===input.targetId) ?? fail('QA_TARGET');
  if (target.status==='superseded') fail('QA_TARGET'); return {input,graph,target};
}
function approvedRequirement(target:Artifact):void {
  if (target.type!=='requirement' || !['approved','active'].includes(target.status) || !target.content.acceptanceCriteria.length) fail('QA_APPROVED_REQUIREMENT_REQUIRED');
}
export async function prepareQAAction(value:QAActionInput) {
  const input=copy(value); keys(input,['runId','action','targetId','graph','context','capability']); if(!validId(input.runId)) fail('QA_RUN_ID');
  const action=workflow.actions.find(a=>a.id===input.action&&a.executor==='agent') ?? fail('QA_ACTION');
  const {graph,target}=await graphInput({targetId:input.targetId,graph:input.graph,context:input.context}); approvedRequirement(target);
  const capability=await resolveQACapability(input.capability); const binding=input.context.project.capabilities.find(c=>c.id===capability.manifest.metadata.id);
  if(binding){try{if(!binding.enabled||binding.version!==capability.manifest.metadata.version||!Object.hasOwn(input.capability.files,binding.source)||canonicalJson(JSON.parse(input.capability.files[binding.source]!))!==canonicalJson(capability.manifest)) fail('QA_PROJECT_CAPABILITY_BINDING');}catch{fail('QA_PROJECT_CAPABILITY_BINDING');}}
  const request={schemaVersion:'1.0.0' as const,kind:'SpecForgeQAAction' as const,runId:input.runId,action:action.id,target:await ref(target),project:input.context.project,projectCapabilityBinding:binding??null,executionAuthorized:false,graph:graph.snapshot(),snapshotSha256:graph.snapshotSha256,capability,outputSchema:copy(outputSchema),boundary:workflow.boundary};
  return {request,requestSha256:await fingerprint(request)};
}
export async function acceptQAActionOutput(value:unknown,current:QAActionInput,execution:{actor:Actor;at:string}) {
  const output=copy(value),input=copy(current),e=copy(execution); keys(e,['actor','at']); actor(e.actor,'agent'); if(!validTime(e.at)) fail('QA_TIME');
  const prepared=await prepareQAAction(input); assertGraphTime(e.at,prepared.request.graph); if(outputStructure(output).length) fail('QA_OUTPUT_SCHEMA'); const result=output as QAActionOutput;
  if(result.requestSha256!==prepared.requestSha256) fail('QA_STALE_REQUEST'); const allowed=workflow.actions.find(a=>a.id===input.action)!.outputs;
  for(const name of ['gaps','scenarios','testCases','risks'] as const) if(result[name].length&&!allowed.includes(name)) fail('QA_OUTPUT_ACTION_SCOPE');
  const suggestions=[...result.gaps,...result.scenarios,...result.testCases,...result.risks]; if(new Set(suggestions.map(s=>s.id)).size!==suggestions.length) fail('QA_DUPLICATE_SUGGESTION');
  const ids=new Set(prepared.request.graph.artifacts.map(a=>a.id)); if(suggestions.some(s=>new Set(s.supportArtifactIds).size!==s.supportArtifactIds.length||s.supportArtifactIds.some(id=>!ids.has(id)))) fail('QA_OUTPUT_REFERENCE');
  const criteria=new Set((prepared.request.graph.artifacts.find(a=>a.id===input.targetId)!.content as {acceptanceCriteria:Array<{id:string}>}).acceptanceCriteria.map(c=>c.id));
  if([...result.scenarios,...result.testCases].some(s=>s.acceptanceCriterionIds.some(id=>!criteria.has(id)))) fail('QA_CRITERION_REFERENCE');
  const proposal={schemaVersion:'1.0.0',kind:'SpecForgeQAProposal',status:'proposed',requestSha256:prepared.requestSha256,runId:input.runId,action:input.action,provenance:{actor:e.actor,at:e.at,origin:'agent-proposed'},output:result};
  return {...proposal,sha256:await fingerprint(proposal)};
}

function linkedRequirement(target:Artifact, records:Artifact[]):Artifact {
  const links=target.relationships.filter(r=>r.kind==='validates').map(r=>records.find(a=>a.id===r.target.artifactId)!).filter(Boolean);
  if(links.length!==1) fail('QA_REQUIREMENT_LINK'); const requirement=links[0]!; approvedRequirement(requirement); return requirement;
}
async function ready(graph:ArtifactGraphView,target:Artifact):Promise<void> {
  if(target.ownerRole!=='qa'||!['test-scenario','test-case','coverage-assessment','quality-risk','defect'].includes(target.type)) fail('QA_APPROVAL_TYPE');
  const snapshot=graph.snapshot(); const blockers=graph.blockers(target.id); if(blockers.truncated||blockers.questions.length||blockers.declaredBlocks.length) fail('QA_BLOCKED');
  if(['test-scenario','test-case','coverage-assessment'].includes(target.type)) {
    const requirement=linkedRequirement(target,snapshot.artifacts); const ids=new Set(requirement.type==='requirement'?requirement.content.acceptanceCriteria.map(c=>c.id):[]);
    const used=target.type==='coverage-assessment'?target.content.entries.map(e=>e.acceptanceCriterionId):
      target.type==='test-scenario'||target.type==='test-case'?target.content.acceptanceCriterionIds:[];
    if(used.some(id=>!ids.has(id))) fail('QA_CRITERION_REFERENCE');
    if(target.type==='coverage-assessment') {
      if(canonicalJson(target.content.target)!==canonicalJson(await ref(requirement)) ||
          !target.provenance.some(p=>p.actor.kind==='system'&&p.origin==='generated-from-artifact'&&p.sourceRefs.includes(target.content.basisSnapshotSha256))) fail('QA_COVERAGE_BASIS');
      const cases=snapshot.artifacts.filter(a=>a.type==='test-case'&&snapshot.edges.some(e=>e.kind==='validates'&&e.from===a.id&&e.to===requirement.id));
      const expected=await Promise.all(requirement.type==='requirement'?requirement.content.acceptanceCriteria.map(async criterion=>({acceptanceCriterionId:criterion.id,testCaseRefs:await Promise.all(cases.filter(c=>c.type==='test-case'&&c.content.acceptanceCriterionIds.includes(criterion.id)).map(ref))})):[]);
      if(canonicalJson(target.content.entries)!==canonicalJson(expected)) fail('QA_COVERAGE_BASIS');
    }
  }
  if(['quality-risk','defect'].includes(target.type)) {
    const related=target.relationships.filter(r=>r.kind==='relates-to').map(r=>snapshot.artifacts.find(a=>a.id===r.target.artifactId)).filter((a):a is Artifact=>!!a&&a.type==='requirement');
    if(!related.length||related.some(a=>!['approved','active'].includes(a.status))) fail('QA_REQUIREMENT_LINK');
  }
  if(target.type==='defect'&&(!target.content.evidence.length||target.provenance.some(p=>p.actor.kind==='agent'&&p.origin==='agent-proposed'))) fail('QA_DEFECT_EVIDENCE_REQUIRED');
}
export async function prepareQAApproval(value:QAApprovalInput) {
  const {graph,target}=await graphInput(value); if(target.status!=='under-review') fail('QA_UNDER_REVIEW_REQUIRED'); await ready(graph,target);
  const subject={schemaVersion:'1.0.0',kind:'SpecForgeQAApprovalSubject',target:await ref(target),artifactSha256:await fingerprint(target),snapshotSha256:graph.snapshotSha256};
  return {subject,subjectSha256:await fingerprint(subject)};
}
export async function approveQA(value:QAApprovalInput,approval:{subjectSha256:string;eventId:string;actor:Actor;at:string}):Promise<QAApprovalResult> {
  const input=copy(value),a=copy(approval); keys(a,['subjectSha256','eventId','actor','at']); actor(a.actor,'human'); const prepared=await prepareQAApproval(input); if(a.subjectSha256!==prepared.subjectSha256) fail('QA_STALE_APPROVAL');
  const graph=await createArtifactGraph(input.graph,input.context); assertGraphTime(a.at,graph.snapshot()); const target=input.context.artifacts.find(t=>t.id===input.targetId)!;
  const artifact=await reviewArtifact(target,{id:a.eventId,action:'approve',actor:a.actor,at:a.at,subjectSha256:await artifactSubject(target)},input.context);
  const after=await createArtifactGraph(input.graph,{...input.context,artifacts:input.context.artifacts.map(t=>t.id===artifact.id?artifact:t)});
  const receipt:QAApprovalReceipt={schemaVersion:'1.0.0',kind:'SpecForgeQAApproval',targetId:artifact.id,subjectSha256:prepared.subjectSha256,beforeSnapshotSha256:prepared.subject.snapshotSha256,beforeArtifactSha256:prepared.subject.artifactSha256,afterArtifactSha256:await fingerprint(artifact),afterSnapshotSha256:after.snapshotSha256,eventId:a.eventId,actor:a.actor,at:a.at}; return {artifact,receipt};
}
export async function assertQAApproval(value:QAApprovalInput,evidence:QAApprovalReceipt):Promise<void> {
  const r=copy(evidence),{input,graph,target}=await graphInput(value); if(target.status!=='approved'||r.afterSnapshotSha256!==graph.snapshotSha256||r.afterArtifactSha256!==await fingerprint(target)) fail('QA_STALE_RECEIPT');
  const event=target.review.at(-1)!; if(event.action!=='approve') fail('QA_RECEIPT'); const before={...target,status:'under-review',review:target.review.slice(0,-1)} as Artifact;
  const replay=await approveQA({...input,context:{...input.context,artifacts:input.context.artifacts.map(a=>a.id===before.id?before:a)}},{subjectSha256:r.subjectSha256,eventId:event.id,actor:event.actor,at:event.at}); if(canonicalJson(replay.receipt)!==canonicalJson(r)||canonicalJson(replay.artifact)!==canonicalJson(target)) fail('QA_RECEIPT');
}

/** Computes declared design coverage from current validates edges; it makes no execution claim. */
export async function createQACoverageAssessment(value:QAApprovalInput,metadata:QACoverageMetadata) {
  const m=copy(metadata); keys(m,['id','title','at']); const {graph,target}=await graphInput(value); approvedRequirement(target); assertGraphTime(m.at,graph.snapshot());
  const snap=graph.snapshot(); if(snap.artifacts.some(a=>a.id===m.id)) fail('QA_COVERAGE_ID'); if(target.type!=='requirement') fail('QA_APPROVED_REQUIREMENT_REQUIRED');
  const cases=snap.artifacts.filter(a=>a.type==='test-case'&&snap.edges.some(e=>e.kind==='validates'&&e.from===a.id&&e.to===target.id));
  const entries=await Promise.all(target.content.acceptanceCriteria.map(async criterion=>({acceptanceCriterionId:criterion.id,testCaseRefs:await Promise.all(cases.filter(c=>c.type==='test-case'&&c.content.acceptanceCriterionIds.includes(criterion.id)).map(ref))})));
  return createArtifact({id:m.id,title:m.title,ownerRole:'qa',projectRef:target.projectRef,type:'coverage-assessment',content:{basisSnapshotSha256:graph.snapshotSha256,target:await ref(target),entries,scope:'declared-design-only'},relationships:[{kind:'validates',target:await ref(target)}]},{actor:{id:'specforge-qa-coverage',kind:'system'},at:m.at,origin:'generated-from-artifact',sourceRefs:[graph.snapshotSha256]});
}
export async function assertQACoverageBasis(artifact:Artifact,graph:ArtifactGraphDefinition,context:ArtifactContext) {
  const a=copy(artifact); if(a.type!=='coverage-assessment') fail('QA_COVERAGE_TYPE'); const regenerated=await createQACoverageAssessment({targetId:a.content.target.artifactId,graph:copy(graph),context:copy(context)},{id:a.id,title:a.title,at:a.createdAt}); if(canonicalJson(a)!==canonicalJson(regenerated)) fail('QA_COVERAGE_BASIS');
}
