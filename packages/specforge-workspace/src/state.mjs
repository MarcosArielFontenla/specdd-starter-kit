import {canonicalJson, fingerprint, artifactSubject, assertRevisionHistory} from '@specdd/artifact-model';
import {createArtifactGraph} from '@specdd/artifact-model/graph';
import {resolveBACapability} from '@specdd/artifact-model/ba';
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
  exact(state,['schemaVersion','project','capability','histories','assertions','receipts','adoptions']);
  if (state.schemaVersion !== '1.0.0' || !validateProjectDefinition(state.project).valid) fail('INVALID_PROJECT');
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
}
export function put(state, artifact) {
  const history = state.histories[artifact.id] ?? [];
  if (history.length && artifact.revision === history.length) history[history.length-1] = artifact;
  else if (artifact.revision === history.length+1) history.push(artifact);
  else fail('REVISION_GAP');
  state.histories[artifact.id] = history;
}
