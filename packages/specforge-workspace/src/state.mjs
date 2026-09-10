import {canonicalJson, fingerprint, artifactSubject, assertRevisionHistory} from '@specdd/artifact-model';
import {createArtifactGraph} from '@specdd/artifact-model/graph';
import {resolveBACapability} from '@specdd/artifact-model/ba';
import {assertSpecDDProjectionProposal,assertSpecDDProjectionReceipt} from '@specdd/artifact-model/projection';
import {validateProjectDefinition} from '@specdd/project-model';

export const copy = value => { canonicalJson(value); return structuredClone(value); };
export function fail(code) { throw new Error(code); }
export function exact(value, fields) {
  canonicalJson(value);
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !fields.includes(k)) || fields.some(k => !Object.hasOwn(value,k))) fail('INVALID_FIELDS');
}
export const id = value => { if (typeof value !== 'string' || value.length > 128 || !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(value)) fail('INVALID_ID'); return value; };
export function text(value) { if (typeof value !== 'string' || !value.trim() || value.length > 20000) fail('INVALID_TEXT'); return value; }
export const currentArtifacts = state => Object.values(state.histories).map(h => h.at(-1));
export const reference = async a => ({projectId:a.projectRef.id, artifactId:a.id, revision:a.revision, sha256:await artifactSubject(a)});
export async function graphInput(state, targetId) {
  const artifacts = currentArtifacts(state);
  return {targetId, graph:{schemaVersion:'1.0.0',kind:'SpecForgeArtifactGraph',projectRef:{id:state.project.metadata.id,definitionSha256:await fingerprint(state.project)},
    nodes:await Promise.all(artifacts.map(reference)),assertions:state.assertions},context:{project:state.project,artifacts}};
}
export async function validateState(state) {
  const phase5=state?.schemaVersion==='1.1.0';
  exact(state,phase5?['schemaVersion','project','capability','histories','assertions','receipts','adoptions','projections','canonicalSpecs','projectionReceipts']:['schemaVersion','project','capability','histories','assertions','receipts','adoptions']);
  if (!['1.0.0','1.1.0'].includes(state.schemaVersion) || !validateProjectDefinition(state.project).valid) fail('INVALID_PROJECT');
  await resolveBACapability(state.capability);
  const binding = state.project.capabilities.find(b=>b.id===state.capability.pack.metadata.id);
  if (!binding?.enabled || binding.version !== state.capability.pack.metadata.version ||
      canonicalJson(JSON.parse(state.capability.files[binding.source] ?? 'null')) !== canonicalJson(state.capability.pack)) fail('PROJECT_CAPABILITY_NOT_REGISTERED');
  if (!state.histories || typeof state.histories !== 'object' || Array.isArray(state.histories) || !Array.isArray(state.assertions) || !Array.isArray(state.receipts) || !Array.isArray(state.adoptions)) fail('INVALID_STATE');
  for (const [key, history] of Object.entries(state.histories)) {
    id(key); await assertRevisionHistory(history);
    if (history[0].id !== key || history.some(a=>a.ownerRole!=='ba')) fail('INVALID_HISTORY');
  }
  const artifacts = currentArtifacts(state);
  if (artifacts.length) { const g = await graphInput(state,artifacts[0].id); await createArtifactGraph(g.graph,g.context); }
  else if (state.assertions.length || state.receipts.length || state.adoptions.length) fail('INVALID_EMPTY_STATE');
  if(phase5){
    if(!Array.isArray(state.projections)||!Array.isArray(state.canonicalSpecs)||!Array.isArray(state.projectionReceipts))fail('INVALID_PROJECTION_STATE');
    const projectionIds=new Set(),canonicalKeys=new Set(),receiptIds=new Set();
    for(const entry of state.projections){exact(entry,['proposal','status']);assertSpecDDProjectionProposal(entry.proposal);if(!['proposed','applied','discarded'].includes(entry.status)||entry.proposal.projectId!==state.project.metadata.id||projectionIds.has(entry.proposal.id))fail('INVALID_PROJECTION_STATE');projectionIds.add(entry.proposal.id);}
    for(const canonical of state.canonicalSpecs){const key=`${canonical.path}@${canonical.revision}`;if(canonical.projectId!==state.project.metadata.id||canonicalKeys.has(key))fail('INVALID_PROJECTION_STATE');canonicalKeys.add(key);}
    for(const receipt of state.projectionReceipts){if(receiptIds.has(receipt.projectionId))fail('INVALID_PROJECTION_STATE');receiptIds.add(receipt.projectionId);const entry=state.projections.find(p=>p.proposal.id===receipt.projectionId),canonical=state.canonicalSpecs.find(c=>c.path===receipt.path&&c.revision===receipt.canonicalRevision);if(!entry||entry.status!=='applied'||!canonical)fail('INVALID_PROJECTION_STATE');await assertSpecDDProjectionReceipt(entry.proposal,canonical,receipt);}
    if(state.projections.some(p=>(p.status==='applied')!==receiptIds.has(p.proposal.id)))fail('INVALID_PROJECTION_STATE');
    if(state.canonicalSpecs.some(c=>!state.projectionReceipts.some(r=>r.path===c.path&&r.canonicalRevision===c.revision)))fail('INVALID_PROJECTION_STATE');
    const paths=new Set(state.canonicalSpecs.map(c=>c.path));for(const path of paths){const revisions=state.canonicalSpecs.filter(c=>c.path===path).sort((a,b)=>a.revision-b.revision);for(let i=0;i<revisions.length;i++)if(revisions[i].revision!==i+1||revisions[i].previousContentSha256!==(i?revisions[i-1].contentSha256:null))fail('INVALID_PROJECTION_STATE');}
  }
}

export function phase5State(state){return state.schemaVersion==='1.1.0'?state:{...state,schemaVersion:'1.1.0',projections:[],canonicalSpecs:[],projectionReceipts:[]};}
export function put(state, artifact) {
  const history = state.histories[artifact.id] ?? [];
  if (history.length && artifact.revision === history.length) history[history.length-1] = artifact;
  else if (artifact.revision === history.length+1) history.push(artifact);
  else fail('REVISION_GAP');
  state.histories[artifact.id] = history;
}
