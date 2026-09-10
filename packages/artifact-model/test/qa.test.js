import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {structuralValidator} from '../../project-model/dist/index.js';
import {artifactSchemaV12, artifactSubject, createArtifact, fingerprint, migrateArtifact, reviewArtifact, validateArtifact} from '../dist/index.js';
import {createArtifactGraph} from '../dist/graph.js';
import {acceptQAActionOutput, approveQA, assertQAApproval, assertQACoverageBasis, createQACoverageAssessment, getQAWorkflow, prepareQAAction, prepareQAApproval, resolveQACapability} from '../dist/qa.js';
import {generatePack} from '../../../specforge-kit/website/src/components/generators.js';
import {ROLE_SKILLS} from '../../../specforge-kit/website/src/components/roles.js';

const load=async p=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const project=await load('../../project-model/examples/minimal.project.json');
const baseRequirement=await load('../examples/requirement.json');
const copy=x=>structuredClone(x), human={id:'synthetic-qa',kind:'human'}, agent={id:'synthetic-qa-agent',kind:'agent'};
const at=n=>`2026-09-07T13:00:${String(n).padStart(2,'0')}.000Z`;
const contribution=(n,actor=human)=>({actor,origin:actor.kind==='agent'?'agent-proposed':'human-authored',at:at(n),sourceRefs:[]});
const ref=async a=>({projectId:a.projectRef.id,artifactId:a.id,revision:a.revision,sha256:await artifactSubject(a)});
async function transition(a,action,n,other=[]){return reviewArtifact(a,{id:`event-${a.id}-${n}`,action,actor:human,at:at(n),subjectSha256:await artifactSubject(a)},{project,artifacts:[a,...other]});}
async function approvedRequirement(){return transition(await transition(copy(baseRequirement),'request-review',1),'approve',2);}
async function testCase(requirement,actor=human){return createArtifact({id:'case-1',title:'Cancellation happy path',type:'test-case',ownerRole:'qa',projectRef:requirement.projectRef,relationships:[{kind:'validates',target:await ref(requirement)}],content:{acceptanceCriterionIds:['ac-1'],preconditions:['Future appointment exists'],steps:[{action:'Request cancellation',expected:'Agreed outcome is shown'}],level:'integration',automationStatus:'candidate'}},contribution(3,actor));}
async function graphFixture(artifacts,targetId=artifacts[0].id){return {targetId,graph:{schemaVersion:'1.0.0',kind:'SpecForgeArtifactGraph',projectRef:baseRequirement.projectRef,nodes:await Promise.all(artifacts.map(ref)),assertions:[]},context:{project,artifacts:copy(artifacts)}};}
const baseSkills=Object.fromEntries(await Promise.all(ROLE_SKILLS.QA.map(async id=>[id,await readFile(new URL(`../../../specforge-kit/skills/${id}.md`,import.meta.url),'utf8')])));
const generated=generatePack(baseSkills,{roles:['QA'],tools:['Codex'],skillsByRole:{QA:ROLE_SKILLS.QA},qa:{approach:'mixed'}},'2026-09-10');
const capability={pack:JSON.parse(generated.files['.agents/capabilities/role-qa/capability.json']),files:{...generated.files,'context/project.md':'Synthetic project context.','context/constitution.md':'Never invent evidence.'},dependencies:[{id:'specdd-harness',kind:'harness',versionRange:'^1.0.0'}]};
const emptyOutput=hash=>({schemaVersion:'1.0.0',requestSha256:hash,gaps:[],scenarios:[],testCases:[],risks:[]});

test('QA schema 1.2 is additive and preserves legacy artifact identity',async()=>{
  const req=await approvedRequirement(),tc=await testCase(req);
  assert.equal(tc.schemaVersion,'1.2.0'); assert.equal(validateArtifact(tc).valid,true); assert.deepEqual(structuralValidator(artifactSchemaV12)(tc),[]);
  assert.equal(await artifactSubject(baseRequirement),'1cf9525e28f5e1da381aad6ead8286a8f7dc8cd2a604d42fecdc65b1ab6797fe');
  assert.deepEqual((await migrateArtifact(tc)).artifact,tc); assert.equal((await migrateArtifact({...tc,schemaVersion:'1.1.0'})).artifact,null);
});

test('all five QA payloads validate and malformed payloads fail closed',async()=>{
  const req=await approvedRequirement(),target=await ref(req),source={ownerRole:'qa',projectRef:req.projectRef,relationships:[{kind:'validates',target}]};
  const inputs=[
    {...source,id:'scenario-1',title:'Boundary',type:'test-scenario',content:{objective:'Check cutoff',acceptanceCriterionIds:['ac-1'],technique:'boundary'}},
    {...source,id:'case-2',title:'Case',type:'test-case',content:{acceptanceCriterionIds:['ac-1'],preconditions:[],steps:[{action:'Act',expected:'Observe'}],level:'manual',automationStatus:'manual'}},
    {...source,id:'coverage-1',title:'Coverage',type:'coverage-assessment',content:{basisSnapshotSha256:'0'.repeat(64),target,entries:[{acceptanceCriterionId:'ac-1',testCaseRefs:[]}],scope:'declared-design-only'}},
    {...source,relationships:[{kind:'relates-to',target}],id:'risk-1',title:'Risk',type:'quality-risk',content:{statement:'Cutoff failure',likelihood:'medium',impact:'high',mitigation:'Boundary tests'}},
    {...source,relationships:[{kind:'relates-to',target}],id:'defect-1',title:'Defect',type:'defect',content:{severity:'high',observed:'Wrong status',expected:'Rejected',reproductionSteps:['Submit late cancellation'],evidence:[{kind:'run',locator:'local-run:1',sha256:'1'.repeat(64)}]}}
  ];
  for(const input of inputs) assert.equal(validateArtifact(await createArtifact(input,contribution(3))).valid,true);
  const bad=copy(inputs[1]); bad.content.steps=[]; await assert.rejects(createArtifact(bad,contribution(3)));
  await assert.rejects(createArtifact(copy(inputs[4]),contribution(3,agent)),/DEFECT_EVIDENCE/);
});

test('QA capability resolver consumes the real generated pack without granting execution',async()=>{
  const resolved=await resolveQACapability(capability); assert.equal(resolved.manifest.role.id,'qa'); assert.equal(resolved.workflow.boundary.includes('No test execution'),true);
  assert.ok(resolved.files.some(f=>f.path.endsWith('/test-case-generation.md'))); assert.ok(resolved.files.some(f=>f.path.endsWith('/playwright-testing.md')));
  assert.deepEqual(resolved.missingOptionalContext,['entity-specs']); assert.deepEqual(resolved.missingOptionalPlaybooks,[]); const wf=getQAWorkflow(); wf.actions.length=0; assert.equal(getQAWorkflow().actions.length,5);
});

test('QA resolver rejects missing knowledge, dependency, foreign pack and unsafe path',async()=>{
  for(const mutate of [s=>s.dependencies=[],s=>delete s.files['context/constitution.md'],s=>s.pack.role.id='ba',s=>s.pack.evals=[],s=>s.pack.playbooks=s.pack.playbooks.filter(p=>p.id!=='qa-guardrails'),s=>{s.pack.skills[0].path='../escape';s.files['../escape']='bad';}]){
    const value=copy(capability); mutate(value); await assert.rejects(resolveQACapability(value));
  }
});

test('QA actions require an approved requirement and bind graph, project and capability bytes',async()=>{
  const req=await approvedRequirement(),fixture=await graphFixture([req]),input={...fixture,runId:'run-qa',action:'analyze-approved-spec',capability:copy(capability)};
  const prepared=await prepareQAAction(input); assert.equal(prepared.request.executionAuthorized,false);
  const changed=copy(input); changed.capability.files['context/project.md']+=' drift'; assert.notEqual((await prepareQAAction(changed)).requestSha256,prepared.requestSha256);
  const draftInput={...await graphFixture([copy(baseRequirement)]),runId:'run-qa',action:'analyze-approved-spec',capability}; await assert.rejects(prepareQAAction(draftInput),/APPROVED_REQUIREMENT/);
  await assert.rejects(prepareQAAction({...input,action:'assess-declared-coverage'}),/QA_ACTION/);
});

test('agent output remains proposal-only and cannot fabricate results, defects or unknown criteria',async()=>{
  const req=await approvedRequirement(),input={...await graphFixture([req]),runId:'run-qa',action:'analyze-approved-spec',capability},prepared=await prepareQAAction(input),output=emptyOutput(prepared.requestSha256);
  output.scenarios.push({id:'s-1',supportArtifactIds:[req.id],objective:'Boundary behavior',acceptanceCriterionIds:['ac-1'],technique:'boundary'});
  output.testCases.push({id:'tc-1',supportArtifactIds:[req.id],acceptanceCriterionIds:['ac-1'],preconditions:[],steps:[{action:'Act',expected:'Observe'}],level:'integration',automationStatus:'candidate'});
  output.risks.push({id:'r-1',supportArtifactIds:[req.id],statement:'Boundary regression',likelihood:'medium',impact:'high',mitigation:'Add boundary case'});
  const proposal=await acceptQAActionOutput(output,input,{actor:agent,at:at(20)}); assert.equal(proposal.status,'proposed'); assert.equal(proposal.provenance.actor.kind,'agent'); assert.equal(req.status,'approved');
  await assert.rejects(acceptQAActionOutput({...output,defects:[]},input,{actor:agent,at:at(20)}),/OUTPUT_SCHEMA/);
  const result=copy(output); result.testCases[0].automationStatus='automated'; await assert.rejects(acceptQAActionOutput(result,input,{actor:agent,at:at(20)}),/OUTPUT_SCHEMA/);
  const unknown=copy(output); unknown.scenarios[0].acceptanceCriterionIds=['invented']; await assert.rejects(acceptQAActionOutput(unknown,input,{actor:agent,at:at(20)}),/CRITERION_REFERENCE/);
});

test('action scope, current request hash, support references and agent attribution are enforced',async()=>{
  const req=await approvedRequirement(),input={...await graphFixture([req]),runId:'run-qa',action:'suggest-test-scenarios',capability},prepared=await prepareQAAction(input),output=emptyOutput(prepared.requestSha256);
  output.testCases.push({id:'tc-1',supportArtifactIds:[req.id],acceptanceCriterionIds:['ac-1'],preconditions:[],steps:[{action:'Act',expected:'Observe'}],level:'manual',automationStatus:'manual'});
  await assert.rejects(acceptQAActionOutput(output,input,{actor:agent,at:at(20)}),/ACTION_SCOPE/);
  const stale=emptyOutput('0'.repeat(64)); await assert.rejects(acceptQAActionOutput(stale,input,{actor:agent,at:at(20)}),/STALE_REQUEST/);
  const refs=emptyOutput(prepared.requestSha256); refs.gaps=[{id:'g-1',supportArtifactIds:['invented'],description:'Gap'}]; await assert.rejects(acceptQAActionOutput(refs,input,{actor:agent,at:at(20)}),/OUTPUT_REFERENCE/);
  await assert.rejects(acceptQAActionOutput(emptyOutput(prepared.requestSha256),input,{actor:human,at:at(20)}),/QA_ACTOR/);
});

test('validates relation is restricted to QA design artifacts targeting requirements',async()=>{
  const req=await approvedRequirement(),tc=await testCase(req); assert.equal((await createArtifactGraph((await graphFixture([req,tc])).graph,{project,artifacts:[req,tc]})).snapshot().edges[0].kind,'validates');
  const invalid=copy(tc); invalid.type='quality-risk'; invalid.content={statement:'Risk',likelihood:'low',impact:'low',mitigation:'Review'};
  assert.equal((await (await import('../dist/graph.js')).validateArtifactGraph((await graphFixture([req,invalid])).graph,{project,artifacts:[req,invalid]})).valid,false);
});

test('declared coverage is deterministic, criterion-complete and never claims execution',async()=>{
  const req=await approvedRequirement(),tc=await testCase(req),fixture=await graphFixture([req,tc],req.id),metadata={id:'coverage-1',title:'Declared coverage',at:at(20)};
  const coverage=await createQACoverageAssessment(fixture,metadata); assert.equal(coverage.content.scope,'declared-design-only'); assert.deepEqual(coverage.content.entries.map(e=>[e.acceptanceCriterionId,e.testCaseRefs.map(r=>r.artifactId)]),[['ac-1',['case-1']]]);
  assert.equal(JSON.stringify(coverage).includes('passed'),false); await assertQACoverageBasis(coverage,fixture.graph,fixture.context);
  const changed=copy(fixture); changed.context.artifacts[1].content.acceptanceCriterionIds=[]; await assert.rejects(assertQACoverageBasis(coverage,changed.graph,changed.context));
});

test('coverage approval rejects omitted mappings, invented refs and non-system basis provenance',async()=>{
  const req=await approvedRequirement(),tc=await testCase(req),basis=await graphFixture([req,tc],req.id),coverage=await createQACoverageAssessment(basis,{id:'coverage-gate',title:'Coverage gate',at:at(20)});
  const review=await transition(coverage,'request-review',21,[req,tc]);
  assert.ok((await prepareQAApproval(await graphFixture([req,tc,review],review.id))).subjectSha256);
  for(const mutate of [a=>a.content.entries[0].testCaseRefs=[],a=>a.content.entries[0].testCaseRefs[0].sha256='0'.repeat(64),a=>a.provenance[0].sourceRefs=[]]) {
    const changed=copy(review); mutate(changed); await assert.rejects(async()=>prepareQAApproval(await graphFixture([req,tc,changed],changed.id)),/COVERAGE_BASIS|INTEGRITY|SOURCE_REQUIRED/);
  }
});

test('QA approval is exact, human-only, graph-bound and replayable',async()=>{
  const req=await approvedRequirement(),draft=await testCase(req),review=await transition(draft,'request-review',4,[req]),fixture=await graphFixture([req,review],review.id),prepared=await prepareQAApproval(fixture);
  const result=await approveQA(fixture,{subjectSha256:prepared.subjectSha256,eventId:'qa-approve',actor:human,at:at(20)}); assert.equal(result.artifact.status,'approved');
  const current={...fixture,context:{...fixture.context,artifacts:[req,result.artifact]}}; await assertQAApproval(current,result.receipt);
  await assert.rejects(approveQA(fixture,{subjectSha256:prepared.subjectSha256,eventId:'qa-agent',actor:agent,at:at(20)}),/QA_ACTOR/);
  await assert.rejects(approveQA(fixture,{subjectSha256:'0'.repeat(64),eventId:'qa-stale',actor:human,at:at(20)}),/STALE_APPROVAL/);
  const tampered={...result.receipt,beforeArtifactSha256:'0'.repeat(64)}; await assert.rejects(assertQAApproval(current,tampered));
});

test('QA approval rejects unknown criteria, absent requirement links and draft requirements',async()=>{
  const req=await approvedRequirement(),draft=await testCase(req); draft.content.acceptanceCriterionIds=['unknown'];
  // Rebuild a structurally valid revision-like fixture to exercise semantic approval checks.
  const review=await transition(draft,'request-review',4,[req]); await assert.rejects(prepareQAApproval(await graphFixture([req,review],review.id)),/CRITERION_REFERENCE/);
  const noLink=copy(await testCase(req)); noLink.relationships=[]; const noLinkReview=await transition(noLink,'request-review',4,[req]); await assert.rejects(prepareQAApproval(await graphFixture([req,noLinkReview],noLinkReview.id)),/REQUIREMENT_LINK/);
  const risk=await createArtifact({id:'risk-unlinked',title:'Unlinked risk',type:'quality-risk',ownerRole:'qa',projectRef:req.projectRef,relationships:[],content:{statement:'Unknown risk',likelihood:'low',impact:'low',mitigation:'Review'}},contribution(3));
  const riskReview=await transition(risk,'request-review',4,[req]); await assert.rejects(prepareQAApproval(await graphFixture([req,riskReview],riskReview.id)),/REQUIREMENT_LINK/);
});
