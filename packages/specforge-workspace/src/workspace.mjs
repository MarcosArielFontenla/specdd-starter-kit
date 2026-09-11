import {randomUUID} from 'node:crypto';
import {createArtifact,reviseArtifact,reviewArtifact,artifactSubject,canonicalJson,fingerprint} from '@specdd/artifact-model';
import {prepareBAAction,acceptBAActionOutput,prepareBAApproval,approveBA,assertBAApproval} from '@specdd/artifact-model/ba';
import {prepareQAAction,acceptQAActionOutput,prepareQAApproval,approveQA,assertQAApproval,createQACoverageAssessment} from '@specdd/artifact-model/qa';
import {createArtifactGraph} from '@specdd/artifact-model/graph';
import {prepareSpecDDProjection,applySpecDDProjection,assertSpecDDProjectionReceipt,specDDPath} from '@specdd/artifact-model/projection';
import {copy,exact,fail,id,text,put,currentArtifacts,graphInput,phase5State,phase7State} from './state.mjs';

const uid = prefix=>`${prefix}-${randomUUID()}`;
const now = ()=>new Date().toISOString();
const latestCanonical=(state,path)=>state.canonicalSpecs.filter(c=>c.path===path).sort((a,b)=>b.revision-a.revision)[0]??null;
const origin = a=>a.provenance.some(p=>p.actor.kind==='agent')?'human-edited-agent-proposal':'human-authored';
const editOf = a=>({type:a.type,title:a.title,content:a.content,ownerRole:a.ownerRole,projectRef:a.projectRef,relationships:a.relationships});
const referenceFor=async a=>({projectId:a.projectRef.id,artifactId:a.id,revision:a.revision,sha256:await artifactSubject(a)});

export class BAWorkspace {
  #pending=new Map(); #work=new Set(); #closed=false;
  constructor({store,operator,runtime=null,timeoutMs=120000}) {
    this.store=store;this.actor={id:text(operator),kind:'human'};this.runtime=runtime;
    if(!Number.isInteger(timeoutMs)||timeoutMs<20||timeoutMs>300000)fail('INVALID_TIMEOUT');this.timeoutMs=timeoutMs;
  }
  async view(projectId) {
    const row=await this.store.load(projectId),state=row.state,artifacts=currentArtifacts(state);
    const approvals=[];
    for(const r of state.receipts){let valid=true;try{await assertBAApproval(await graphInput(state,r.targetId),r);}catch{valid=false;}approvals.push({...r,valid});}
    let graph=null;
    if(artifacts.length){const g=await graphInput(state,artifacts[0].id),view=await createArtifactGraph(g.graph,g.context);graph={edges:view.snapshot().edges,
      blockers:Object.fromEntries(artifacts.map(a=>[a.id,view.blockers(a.id)])),impact:Object.fromEntries(artifacts.map(a=>[a.id,view.impact(a.id)]))};}
    const runs=(await this.store.runs(projectId)).map(({record:r})=>({id:r.id,role:r.role??'ba',targetId:r.input.targetId,action:r.input.action,status:r.status,error:r.error,
      startedAt:r.startedAt,finishedAt:r.finishedAt,proposal:r.proposal,runtime:r.runtimeReceipt,requestSha256:r.requestSha256}));
    const p5=phase5State(state);
    const qa=state.schemaVersion==='1.2.0'?{available:true,assignments:state.qaAssignments,receipts:state.qaReceipts,adoptions:state.qaAdoptions}:{available:false,assignments:[],receipts:[],adoptions:[]};
    const qaApprovals=[];for(const r of qa.receipts){let valid=true;try{await assertQAApproval(await graphInput(state,r.targetId),r);}catch{valid=false;}qaApprovals.push({...r,valid});}
    return {project:state.project,version:row.version,artifacts,histories:state.histories,approvals,graph,runs,projections:p5.projections,canonicalSpecs:p5.canonicalSpecs,projectionReceipts:p5.projectionReceipts,
      qa:{...qa,approvals:qaApprovals},history:this.store.history(projectId),operator:this.actor.id,runtime:this.runtime?.label??'No configurado',runtimeAvailable:Boolean(this.runtime)};
  }
  async #load(projectId,version){const row=await this.store.load(projectId);if(row.version!==version)fail('STALE_STATE');return row;}
  #target(state,targetId){return currentArtifacts(state).find(a=>a.id===id(targetId))??fail('ARTIFACT_NOT_FOUND');}
  #contribution(at,artifact=null){return {actor:this.actor,origin:artifact?origin(artifact):'human-authored',at,sourceRefs:[]};}
  #reattest(state,artifact,at){for(const e of state.assertions)if((e.from===artifact.id||e.to===artifact.id)&&e.provenance.at<artifact.updatedAt)e.provenance={actor:this.actor,at,sourceRefs:[...new Set([...e.provenance.sourceRefs,'explicit-workspace-revision'])]};}
  async command(projectId,version,value) {
    const command=copy(value),row=await this.#load(projectId,version),state=phase5State(row.state),at=now();let runChange=null;
    const event={action:command.op,actor:this.actor,at};
    if(command.op==='create') {
      exact(command,['op','title','description','source']);
      const artifact=await createArtifact({id:uid('requirement'),title:command.title,type:'requirement',content:{description:command.description,acceptanceCriteria:[]},ownerRole:'ba',
        projectRef:{id:projectId,definitionSha256:await fingerprint(state.project)},relationships:[]},
        {...this.#contribution(at),sourceRefs:command.source?[text(command.source)]:[]});put(state,artifact);event.targetId=artifact.id;
    } else if(command.op==='edit') {
      exact(command,['op','targetId','title','content']);const old=this.#target(state,command.targetId);
      if(!['requirement','business-rule','decision'].includes(old.type))fail('EDIT_TYPE');
      const next=await reviseArtifact(old,{...editOf(old),title:command.title,content:command.content},this.#contribution(at,old));
      put(state,next);this.#reattest(state,next,at);event.targetId=old.id;
    } else if(command.op==='resolve-question') {
      exact(command,['op','targetId','answer']);const old=this.#target(state,command.targetId);if(old.type!=='open-question')fail('QUESTION_REQUIRED');
      const next=await reviseArtifact(old,{...editOf(old),content:{...old.content,resolution:{answer:text(command.answer),actor:this.actor,at}}},this.#contribution(at,old));
      put(state,next);this.#reattest(state,next,at);event.targetId=old.id;
    } else if(command.op==='request-review') {
      exact(command,['op','targetId']);const old=this.#target(state,command.targetId),g=await graphInput(state,old.id);
      put(state,await reviewArtifact(old,{id:uid('review'),action:'request-review',actor:this.actor,at,subjectSha256:await artifactSubject(old)},g.context));event.targetId=old.id;
    } else if(command.op==='approve') {
      exact(command,['op','targetId','subjectSha256']);
      const result=await approveBA(await graphInput(state,command.targetId),{subjectSha256:command.subjectSha256,eventId:uid('approve'),actor:this.actor,at});
      put(state,result.artifact);state.receipts.push(result.receipt);event.targetId=result.artifact.id;event.subjectSha256=command.subjectSha256;
    } else if(command.op==='adopt'||command.op==='discard') {
      exact(command,command.op==='adopt'?['op','runId','selectedIds']:['op','runId']);
      const stored=await this.store.run(projectId,command.runId),run=stored.record;
      if(run.status!=='ready')fail('PROPOSAL_NOT_READY');
      const selected=command.op==='adopt'?command.selectedIds:[];
      if(!Array.isArray(selected)||new Set(selected).size!==selected.length||selected.length>400||selected.some(s=>typeof s!=='string'))fail('INVALID_SELECTION');
      if(command.op==='adopt') {
        if(!selected.length)fail('EMPTY_SELECTION');
        const current={...run.input,...await graphInput(state,run.input.targetId),capability:state.capability};
        if((await prepareBAAction(current)).requestSha256!==run.requestSha256)fail('BA_STALE_REQUEST');
        await acceptBAActionOutput(run.proposal.output,current,{actor:run.proposal.provenance.actor,at:run.proposal.provenance.at});
        const out=run.proposal.output;
        const candidates=[...(out.wording?[{kind:'wording',...out.wording}]:[]),...out.questions.map(s=>({kind:'question',...s})),...out.rules.map(s=>({kind:'rule',...s})),...out.criteria.map(s=>({kind:'criterion',...s}))];
        if(selected.some(s=>!candidates.some(c=>c.id===s)))fail('INVALID_SELECTION');
        const target=this.#target(state,run.input.targetId),accepted=candidates.filter(c=>selected.includes(c.id));
        const agentContribution={actor:run.proposal.provenance.actor,origin:'agent-proposed',at:run.proposal.provenance.at,sourceRefs:[run.id,run.requestSha256]};
        const draftInput=(artifactId,title,type,content)=>({id:artifactId,title,type,content,ownerRole:'ba',projectRef:target.projectRef,relationships:[]});
        for(const c of accepted.filter(c=>c.kind==='question'||c.kind==='rule')) {
          const question=c.kind==='question',artifactId=uid(question?'question':'rule');
          const a=await createArtifact(draftInput(artifactId,question?c.question:c.statement,question?'open-question':'business-rule',question?{question:c.question,blocking:c.blocking,resolution:null}:{statement:c.statement,rationale:c.rationale}),agentContribution);put(state,a);
          put(state,await reviseArtifact(a,editOf(a),{actor:this.actor,origin:'human-edited-agent-proposal',at,sourceRefs:[run.id,c.id]}));
          state.assertions.push({id:uid('link'),kind:question?(c.blocking?'blocks':'relates-to'):'depends-on',from:question?artifactId:target.id,to:question?target.id:artifactId,provenance:{actor:this.actor,at,sourceRefs:[run.id,c.id]}});
        }
        const wording=accepted.find(c=>c.kind==='wording'),criteria=accepted.filter(c=>c.kind==='criterion');
        if(wording||criteria.length) {
          const content={description:wording?.description??target.content.description,acceptanceCriteria:[...target.content.acceptanceCriteria,...criteria.map(c=>({id:uid('ac'),given:c.given,when:c.when,then:c.then}))]};
          const proposalRevision=await reviseArtifact(target,{...editOf(target),content},agentContribution);put(state,proposalRevision);
          const adopted=await reviseArtifact(proposalRevision,editOf(proposalRevision),{actor:this.actor,origin:'human-edited-agent-proposal',at,sourceRefs:[run.id]});put(state,adopted);this.#reattest(state,adopted,at);
        }
      }
      state.adoptions.push({runId:run.id,requestSha256:run.requestSha256,selectedIds:selected,actor:this.actor,at,decision:command.op});
      runChange={expectedStatus:'ready',expectedHash:stored.hash,record:{...run,status:command.op==='adopt'?'adopted':'discarded',decision:{actor:this.actor,at,selectedIds:selected}}};event.runId=run.id;
    } else if(command.op==='prepare-projection') {
      exact(command,['op','targetId']);const target=this.#target(state,command.targetId);if(target.type!=='requirement'||target.status!=='approved')fail('PROJECTION_APPROVED_REQUIREMENT_REQUIRED');
      const approval=[...state.receipts].reverse().find(r=>r.targetId===target.id)??fail('PROJECTION_APPROVAL_REQUIRED');
      const current=latestCanonical(state,specDDPath(target.title));
      if(state.projections.some(p=>p.status==='proposed'&&p.proposal.source.artifact.artifactId===target.id))fail('PROJECTION_PENDING');
      const prepared=await prepareSpecDDProjection({...await graphInput(state,target.id),approval,current},{id:uid('projection'),createdAt:at});
      state.projections.push({proposal:prepared.proposal,status:'proposed'});event.targetId=target.id;event.projectionId=prepared.proposal.id;event.subjectSha256=prepared.subjectSha256;
    } else if(command.op==='apply-projection') {
      exact(command,['op','projectionId','subjectSha256']);const entry=state.projections.find(p=>p.proposal.id===id(command.projectionId))??fail('PROJECTION_NOT_FOUND');if(entry.status!=='proposed')fail('PROJECTION_ALREADY_APPLIED');
      const target=this.#target(state,entry.proposal.source.artifact.artifactId),approval=[...state.receipts].reverse().find(r=>r.targetId===target.id)??fail('PROJECTION_APPROVAL_REQUIRED');
      const current=latestCanonical(state,entry.proposal.destination.path);
      const result=await applySpecDDProjection(entry.proposal,{...await graphInput(state,target.id),approval,current},{subjectSha256:command.subjectSha256,actor:this.actor,at});
      await assertSpecDDProjectionReceipt(entry.proposal,result.canonical,result.receipt);entry.status='applied';state.canonicalSpecs.push(result.canonical);state.projectionReceipts.push(result.receipt);
      event.targetId=target.id;event.projectionId=entry.proposal.id;event.subjectSha256=command.subjectSha256;
    } else if(command.op==='discard-projection') {
      exact(command,['op','projectionId']);const entry=state.projections.find(p=>p.proposal.id===id(command.projectionId))??fail('PROJECTION_NOT_FOUND');if(entry.status!=='proposed')fail('PROJECTION_NOT_PENDING');entry.status='discarded';event.targetId=entry.proposal.source.artifact.artifactId;event.projectionId=entry.proposal.id;
    } else if(command.op==='qa-assign') {
      exact(command,['op','targetId']);Object.assign(state,phase7State(state));const target=this.#target(state,command.targetId);
      if(target.type!=='requirement'||!['approved','active'].includes(target.status))fail('QA_APPROVED_REQUIREMENT_REQUIRED');
      if(!state.qaAssignments.includes(target.id))state.qaAssignments.push(target.id);event.targetId=target.id;
    } else if(command.op==='qa-create') {
      exact(command,['op','targetId','type','title','content']);Object.assign(state,phase7State(state));const target=this.#target(state,command.targetId);
      if(target.type!=='requirement'||!['approved','active'].includes(target.status))fail('QA_APPROVED_REQUIREMENT_REQUIRED');
      const types=['test-scenario','test-case','quality-risk','defect'];if(!types.includes(command.type))fail('QA_ARTIFACT_TYPE');
      const targetRef=await referenceFor(target),relation=['test-scenario','test-case'].includes(command.type)?'validates':'relates-to';
      const artifact=await createArtifact({id:uid(command.type),title:command.title,type:command.type,content:command.content,ownerRole:'qa',projectRef:target.projectRef,relationships:[{kind:relation,target:targetRef}]},this.#contribution(at));
      put(state,artifact);if(!state.qaAssignments.includes(target.id))state.qaAssignments.push(target.id);event.targetId=artifact.id;event.requirementId=target.id;
    } else if(command.op==='qa-edit') {
      exact(command,['op','targetId','title','content']);Object.assign(state,phase7State(state));const old=this.#target(state,command.targetId);if(old.ownerRole!=='qa')fail('QA_ARTIFACT_TYPE');
      const next=await reviseArtifact(old,{...editOf(old),title:command.title,content:command.content},this.#contribution(at,old));put(state,next);event.targetId=old.id;
    } else if(command.op==='qa-request-review') {
      exact(command,['op','targetId']);Object.assign(state,phase7State(state));const old=this.#target(state,command.targetId);if(old.ownerRole!=='qa')fail('QA_ARTIFACT_TYPE');
      put(state,await reviewArtifact(old,{id:uid('qa-review'),action:'request-review',actor:this.actor,at,subjectSha256:await artifactSubject(old)},(await graphInput(state,old.id)).context));event.targetId=old.id;
    } else if(command.op==='qa-approve') {
      exact(command,['op','targetId','subjectSha256']);Object.assign(state,phase7State(state));const result=await approveQA(await graphInput(state,command.targetId),{subjectSha256:command.subjectSha256,eventId:uid('qa-approve'),actor:this.actor,at});
      put(state,result.artifact);state.qaReceipts.push(result.receipt);event.targetId=result.artifact.id;event.subjectSha256=command.subjectSha256;
    } else if(command.op==='qa-refresh-coverage') {
      exact(command,['op','targetId']);Object.assign(state,phase7State(state));const target=this.#target(state,command.targetId);
      const coverage=await createQACoverageAssessment(await graphInput(state,target.id),{id:uid('coverage'),title:`Cobertura declarada · ${target.title}`,at});put(state,coverage);event.targetId=coverage.id;event.requirementId=target.id;
    } else if(command.op==='qa-adopt'||command.op==='qa-discard') {
      exact(command,command.op==='qa-adopt'?['op','runId','selectedIds']:['op','runId']);Object.assign(state,phase7State(state));const stored=await this.store.run(projectId,command.runId),run=stored.record;
      if(run.status!=='ready'||run.role!=='qa')fail('QA_PROPOSAL_NOT_READY');const selected=command.op==='qa-adopt'?command.selectedIds:[];
      if(!Array.isArray(selected)||new Set(selected).size!==selected.length)fail('INVALID_SELECTION');
      if(command.op==='qa-adopt'){
        if(!selected.length)fail('EMPTY_SELECTION');const current={...run.input,...await graphInput(state,run.input.targetId),capability:state.qaCapability};
        if((await prepareQAAction(current)).requestSha256!==run.requestSha256)fail('QA_STALE_REQUEST');await acceptQAActionOutput(run.proposal.output,current,{actor:run.proposal.provenance.actor,at:run.proposal.provenance.at});
        const out=run.proposal.output,candidates=[...out.scenarios.map(s=>({kind:'test-scenario',...s})),...out.testCases.map(s=>({kind:'test-case',...s})),...out.risks.map(s=>({kind:'quality-risk',...s}))];if(selected.some(s=>!candidates.some(c=>c.id===s)))fail('INVALID_SELECTION');
        const target=this.#target(state,run.input.targetId),targetRef=await referenceFor(target),agentContribution={actor:run.proposal.provenance.actor,origin:'agent-proposed',at:run.proposal.provenance.at,sourceRefs:[run.id,run.requestSha256]};
        for(const c of candidates.filter(c=>selected.includes(c.id))){const relation=c.kind==='quality-risk'?'relates-to':'validates',content=c.kind==='test-scenario'?{objective:c.objective,acceptanceCriterionIds:c.acceptanceCriterionIds,technique:c.technique}:c.kind==='test-case'?{acceptanceCriterionIds:c.acceptanceCriterionIds,preconditions:c.preconditions,steps:c.steps,level:c.level,automationStatus:c.automationStatus}:{statement:c.statement,likelihood:c.likelihood,impact:c.impact,mitigation:c.mitigation};
          const proposed=await createArtifact({id:uid(c.kind),title:c.kind==='test-scenario'?c.objective:c.kind==='test-case'?`Caso propuesto · ${target.title}`:c.statement,type:c.kind,content,ownerRole:'qa',projectRef:target.projectRef,relationships:[{kind:relation,target:targetRef}]},agentContribution);put(state,proposed);
          put(state,await reviseArtifact(proposed,editOf(proposed),{actor:this.actor,origin:'human-edited-agent-proposal',at,sourceRefs:[run.id,c.id]}));}
      }
      state.qaAdoptions.push({runId:run.id,requestSha256:run.requestSha256,selectedIds:selected,actor:this.actor,at,decision:command.op==='qa-adopt'?'adopt':'discard'});runChange={expectedStatus:'ready',expectedHash:stored.hash,record:{...run,status:command.op==='qa-adopt'?'adopted':'discarded',decision:{actor:this.actor,at,selectedIds:selected}}};event.runId=run.id;
    } else fail('UNKNOWN_COMMAND');
    await this.store.commit(projectId,version,state,event,runChange);return this.view(projectId);
  }
  async approval(projectId,targetId){const row=await this.store.load(projectId);return {version:row.version,...await prepareBAApproval(await graphInput(row.state,targetId))};}
  async qaApproval(projectId,targetId){const row=await this.store.load(projectId);return {version:row.version,...await prepareQAApproval(await graphInput(row.state,targetId))};}
  async start(projectId,version,value) {
    exact(value,['targetId','action','consent']);if(value.consent!==true)fail('RUNTIME_CONSENT_REQUIRED');if(!this.runtime)fail('RUNTIME_UNAVAILABLE');
    const row=await this.#load(projectId,version),runId=uid('run');
    const qa=['analyze-approved-spec','suggest-test-scenarios','suggest-test-cases','assess-quality-risks'].includes(value.action),capability=qa?row.state.qaCapability:row.state.capability;
    if(qa&&!capability)fail('QA_CAPABILITY_UNAVAILABLE');const input={...await graphInput(row.state,value.targetId),action:value.action,runId,capability};
    const prepared=qa?await prepareQAAction(input):await prepareBAAction(input);if(!prepared.request.projectCapabilityBinding)fail(qa?'QA_PROJECT_CAPABILITY_NOT_REGISTERED':'PROJECT_CAPABILITY_NOT_REGISTERED');
    // Recheck CAS after asynchronous preparation, before consuming runtime quota.
    await this.#load(projectId,version);
    const record={id:runId,projectId,role:qa?'qa':'ba',status:'running',input,requestSha256:prepared.requestSha256,projectVersion:version,startedAt:now(),finishedAt:null,proposal:null,runtimeReceipt:null,error:null};
    await this.store.insertRun(record);
    const controller=new AbortController();this.#pending.set(runId,controller);
    const timer=setTimeout(()=>{void this.cancel(projectId,runId,'TIMEOUT').catch(()=>{});},this.timeoutMs);
    const work=Promise.resolve().then(()=>this.runtime.execute({...prepared,signal:controller.signal})).then(async result=>{
      const stored=await this.store.run(projectId,runId);if(stored.record.status!=='running')return;
      const fresh=await this.store.load(projectId);
      if(fresh.version!==version)fail('STALE_STATE');
      const freshCapability=qa?fresh.state.qaCapability:fresh.state.capability;const current={...input,...await graphInput(fresh.state,value.targetId),capability:freshCapability};
      const execution={actor:{id:this.runtime.label,kind:'agent'},at:now()};
      const proposal=qa?await acceptQAActionOutput(result.output,current,execution):await acceptBAActionOutput(result.output,current,execution);
      canonicalJson(result.receipt);
      await this.#load(projectId,version);
      await this.store.updateRun({...stored.record,status:'ready',proposal,runtimeReceipt:result.receipt,finishedAt:now()},stored.hash);
    }).catch(async error=>{
      const stored=await this.store.run(projectId,runId);if(stored.record.status!=='running')return;
      const code=error.message==='TEXT_ONLY_PERMISSIONS_UNVERIFIED'?'RUNTIME_PERMISSIONS_UNVERIFIED':/STALE/.test(error.message)?'STALE_CONTEXT':/(?:BA|QA)_(?:OUTPUT|DUPLICATE|TIME)/.test(error.message)?'INVALID_AGENT_OUTPUT':'RUNTIME_FAILED';
      await this.store.updateRun({...stored.record,status:'needs-attention',error:code,finishedAt:now()},stored.hash);
    }).finally(()=>{clearTimeout(timer);this.#pending.delete(runId);this.#work.delete(work);});
    this.#work.add(work);void work.catch(()=>{});return record.id;
  }
  async cancel(projectId,runId,reason='CANCELLED') {
    const stored=await this.store.run(projectId,runId);if(stored.record.status!=='running')fail('RUN_NOT_RUNNING');
    await this.store.updateRun({...stored.record,status:reason==='CANCELLED'?'cancelled':'needs-attention',error:reason,finishedAt:now()},stored.hash);
    this.#pending.get(runId)?.abort();
  }
  async close() {
    if(this.#closed)return;this.#closed=true;
    for(const projectId of this.store.ids())for(const {record} of await this.store.runs(projectId))if(record.status==='running')await this.cancel(projectId,record.id,'INTERRUPTED');
    // Do not wait forever for a broken injected adapter. Terminal state ignores late output.
    await Promise.race([Promise.allSettled([...this.#work]),new Promise(resolve=>setTimeout(resolve,1000))]);
  }
}
