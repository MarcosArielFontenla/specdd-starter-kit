import { structuralValidator } from '@specdd/project-model';
import { validateCapabilityPack } from '@specdd/capability-model';
import { artifactSubject, canonicalJson, createArtifact, fingerprint, reviewArtifact } from './index.js';
import { createArtifactGraph } from './graph.js';
import workflow from '../schema/ba-workflows.json' with { type: 'json' };
import outputSchema from '../schema/ba-action-output.schema.json' with { type: 'json' };
import type { Actor, Artifact, ArtifactContext, ArtifactReference } from './types.js';
import type { ArtifactGraphDefinition, ArtifactGraphView } from './graph-types.js';
import type { BAActionInput, BAActionOutput, BAApprovalInput, BAApprovalReceipt, BAApprovalResult, BACapabilitySource } from './ba-types.js';
export * from './ba-types.js';
export const baActionOutputSchema = outputSchema;
const outputStructure = structuralValidator(outputSchema);
const copy = <T>(v: T): T => { canonicalJson(v); return structuredClone(v); };
function fail(code: string): never { throw new Error(code); }
const validId = (v: unknown) => typeof v === 'string' && v.length <= 128 && /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(v);
const validTime = (v: string) => Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
function keys(v: unknown, allowed: string[]): void {
  canonicalJson(v);
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => !allowed.includes(k)) ||
      allowed.some(k => !Object.hasOwn(v, k))) fail('BA_FIELDS');
}
function actor(v: Actor, kind: Actor['kind']): void {
  keys(v, ['id', 'kind']);
  if (v.kind !== kind || typeof v.id !== 'string' || !v.id.trim() || v.id.length > 20000) fail('BA_ACTOR');
}
const ref = async (a: Artifact): Promise<ArtifactReference> => ({projectId: a.projectRef.id, artifactId: a.id, revision: a.revision, sha256: await artifactSubject(a)});
function assertGraphTime(at: string, snapshot: ReturnType<ArtifactGraphView['snapshot']>) {
  if (!validTime(at) || snapshot.artifacts.some(a => (a.review.at(-1)?.at ?? a.updatedAt) > at) ||
      snapshot.definition.assertions.some(a => a.provenance.at > at)) fail('BA_TIME');
}
export function getBAWorkflow() { return copy(workflow); }

/** Resolves host-supplied content only; no filesystem, package install or external tools. */
export async function resolveBACapability(value: BACapabilitySource) {
  const source = copy(value);
  keys(source, ['pack', 'files', 'dependencies']);
  const pack = source.pack;
  if (!validateCapabilityPack(pack).valid || pack.lifecycle !== 'active' || pack.role.id !== 'ba' ||
      pack.metadata.id !== workflow.capabilityId) fail('BA_CAPABILITY_UNAVAILABLE');
  if (!source.files || typeof source.files !== 'object' || Array.isArray(source.files) || !Array.isArray(source.dependencies)) fail('BA_CAPABILITY_SOURCE');
  const dependencyKeys = new Set<string>();
  for (const d of source.dependencies) {
    keys(d, ['id', 'kind', 'versionRange']);
    if (!validId(d.id) || !['harness', 'capability'].includes(d.kind) || typeof d.versionRange !== 'string') fail('BA_DEPENDENCY');
    const key = `${d.kind}:${d.id}`;
    if (dependencyKeys.has(key)) fail('BA_DEPENDENCY');
    dependencyKeys.add(key);
  }
  for (const d of pack.dependencies.filter(d => d.required)) {
    if (!source.dependencies.some(a => a.id === d.id && a.kind === d.kind && a.versionRange === d.versionRange)) fail('BA_DEPENDENCY_UNAVAILABLE');
  }
  const w = pack.workflows.find(w => w.id === workflow.workflowRef);
  if (!w) fail('BA_WORKFLOW_UNAVAILABLE');
  const playbooks = workflow.playbookRefs.map(id => pack.playbooks.find(p => p.id === id) ?? fail('BA_PLAYBOOK_UNAVAILABLE'));
  const skillIds = new Set([...w.skillRefs, ...playbooks.map(p => p.skillRef)]);
  const skills = pack.skills.filter(s => skillIds.has(s.id));
  if (skills.length !== skillIds.size) fail('BA_SKILL_UNAVAILABLE');
  const evals = pack.evals.filter(e => e.targetRefs.some(id => skillIds.has(id)));
  if (!evals.length) fail('BA_EVAL_UNAVAILABLE');
  const consumed = new Map<string, string>();
  function read(path: string, required = true) {
    if (!path || path.includes('\\') || path.includes(':') || path.startsWith('/') || path.split('/').some(s => !s || s === '.' || s === '..')) fail('BA_PATH');
    if (!Object.hasOwn(source.files, path)) { if (required) fail('BA_CONTENT_UNAVAILABLE'); return; }
    const text = source.files[path];
    if (typeof text !== 'string' || !text.trim()) fail('BA_CONTENT_UNAVAILABLE');
    consumed.set(path, text);
  }
  for (const entry of [w, ...skills, ...playbooks, ...evals]) read(entry.path);
  const contexts = pack.context.filter(c => c.required || w.contextRefs.includes(c.id));
  for (const c of contexts) read(c.path, c.required);
  const files = await Promise.all([...consumed].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(async ([path, content]) => ({path, content, sha256: await fingerprint(content)})));
  const resolution = {manifest: pack, workflow: copy(workflow), files,
    missingOptionalContext: contexts.filter(c => !c.required && !consumed.has(c.path)).map(c => c.id).sort(),
    dependencyAttestations: source.dependencies.sort((a, b) => `${a.kind}:${a.id}` < `${b.kind}:${b.id}` ? -1 : `${a.kind}:${a.id}` > `${b.kind}:${b.id}` ? 1 : 0)};
  return {...resolution, sha256: await fingerprint(resolution)};
}

async function graphInput(value: BAApprovalInput) {
  const input = copy(value);
  keys(input, ['targetId', 'graph', 'context']);
  const graph = await createArtifactGraph(input.graph, input.context);
  const target = graph.snapshot().artifacts.find(a => a.id === input.targetId) ?? fail('BA_TARGET');
  if (target.ownerRole !== 'ba' || target.status === 'superseded') fail('BA_TARGET');
  return {input, graph, target};
}

export async function prepareBAAction(value: BAActionInput) {
  const input = copy(value);
  keys(input, ['runId', 'action', 'targetId', 'graph', 'context', 'capability']);
  if (!validId(input.runId)) fail('BA_RUN_ID');
  const action = workflow.actions.find(a => a.id === input.action && a.executor === 'agent') ?? fail('BA_ACTION');
  const {graph, target} = await graphInput({targetId: input.targetId, graph: input.graph, context: input.context});
  if (target.type !== 'requirement') fail('BA_REQUIREMENT_REQUIRED');
  const capability = await resolveBACapability(input.capability);
  const binding = input.context.project.capabilities.find(c => c.id === capability.manifest.metadata.id);
  if (binding) {
    try {
      if (!binding.enabled || binding.version !== capability.manifest.metadata.version ||
          !Object.hasOwn(input.capability.files, binding.source) ||
          canonicalJson(JSON.parse(input.capability.files[binding.source]!)) !== canonicalJson(capability.manifest)) fail('BA_PROJECT_CAPABILITY_BINDING');
    } catch { fail('BA_PROJECT_CAPABILITY_BINDING'); }
  }
  const request = {schemaVersion: '1.0.0' as const, kind: 'SpecForgeBAAction' as const, runId: input.runId,
    action: action.id, target: await ref(target), project: input.context.project,
    projectCapabilityBinding: binding ?? null, executionAuthorized: false,
    graph: graph.snapshot(), snapshotSha256: graph.snapshotSha256, capability,
    outputSchema: copy(outputSchema), boundary: workflow.boundary};
  return {request, requestSha256: await fingerprint(request)};
}

/** Rebuild request against CURRENT host inputs. Does not materialize or approve any suggestions. */
export async function acceptBAActionOutput(value: unknown, current: BAActionInput, execution: {actor: Actor; at: string}) {
  const output = copy(value), input = copy(current), e = copy(execution);
  keys(e, ['actor', 'at']); actor(e.actor, 'agent');
  if (!validTime(e.at)) fail('BA_TIME');
  const prepared = await prepareBAAction(input);
  assertGraphTime(e.at, prepared.request.graph);
  if (outputStructure(output).length) fail('BA_OUTPUT_SCHEMA');
  const result = output as BAActionOutput;
  if (result.requestSha256 !== prepared.requestSha256) fail('BA_STALE_REQUEST');
  const allowed = workflow.actions.find(a => a.id === input.action)!.outputs;
  for (const name of ['wording', 'ambiguities', 'questions', 'rules', 'criteria'] as const) {
    const present = name === 'wording' ? result.wording !== null : result[name].length > 0;
    if (present && !allowed.includes(name)) fail('BA_OUTPUT_ACTION_SCOPE');
  }
  const suggestions = [...(result.wording ? [result.wording] : []), ...result.ambiguities, ...result.questions, ...result.rules, ...result.criteria];
  if (new Set(suggestions.map(s => s.id)).size !== suggestions.length) fail('BA_DUPLICATE_SUGGESTION');
  if (suggestions.some(s => new Set(s.supportArtifactIds).size !== s.supportArtifactIds.length)) fail('BA_DUPLICATE_SUPPORT');
  const ids = new Set(prepared.request.graph.artifacts.map(a => a.id));
  if (suggestions.some(s => s.supportArtifactIds.some(id => !ids.has(id)))) fail('BA_OUTPUT_REFERENCE');
  const proposal = {schemaVersion: '1.0.0', kind: 'SpecForgeBAProposal', status: 'proposed',
    requestSha256: prepared.requestSha256, runId: input.runId, action: input.action,
    provenance: {actor: e.actor, at: e.at, origin: 'agent-proposed'}, output: result};
  return {...proposal, sha256: await fingerprint(proposal)};
}

function prerequisites(graph: ArtifactGraphView, root: string): string[] {
  const edges = graph.snapshot().edges, seen = new Set([root]), queue = [root];
  for (let i = 0; i < queue.length; i++) {
    for (const edge of edges) {
      const next = edge.kind === 'blocks' && edge.to === queue[i] ? edge.from :
        ['depends-on', 'derives-from', 'refines'].includes(edge.kind) && edge.from === queue[i] ? edge.to : null;
      if (next && !seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return queue;
}
function ready(graph: ArtifactGraphView, target: Artifact) {
  if (!['requirement', 'business-rule', 'decision', 'open-question'].includes(target.type)) fail('BA_APPROVAL_TYPE');
  if (target.type === 'requirement' && !target.content.acceptanceCriteria.length) fail('BA_CRITERIA_REQUIRED');
  if (target.type === 'open-question' && !target.content.resolution) fail('BA_QUESTION_OPEN');
  const blockers = graph.blockers(target.id);
  if (blockers.truncated || blockers.questions.length || blockers.declaredBlocks.length) fail('BA_BLOCKED');
  const ids = new Set(prerequisites(graph, target.id));
  for (const a of graph.snapshot().artifacts.filter(a => ids.has(a.id))) {
    if (a.status === 'superseded') fail('BA_DEPENDENCY_SUPERSEDED');
    if (a.id !== target.id && ['business-rule', 'decision'].includes(a.type) && !['approved', 'active'].includes(a.status)) fail('BA_DEPENDENCY_UNAPPROVED');
  }
}

export async function prepareBAApproval(value: BAApprovalInput) {
  const {graph, target} = await graphInput(value);
  if (target.status !== 'under-review') fail('BA_UNDER_REVIEW_REQUIRED');
  ready(graph, target);
  const subject = {schemaVersion: '1.0.0', kind: 'SpecForgeBAApprovalSubject', target: await ref(target),
    artifactSha256: await fingerprint(target), snapshotSha256: graph.snapshotSha256};
  return {subject, subjectSha256: await fingerprint(subject)};
}

/** Pure transition: host must CAS input artifact/graph and atomically persist artifact + receipt. */
export async function approveBA(value: BAApprovalInput, approval: {subjectSha256: string; eventId: string; actor: Actor; at: string}): Promise<BAApprovalResult> {
  const input = copy(value), a = copy(approval);
  keys(a, ['subjectSha256', 'eventId', 'actor', 'at']); actor(a.actor, 'human');
  const prepared = await prepareBAApproval(input);
  if (a.subjectSha256 !== prepared.subjectSha256) fail('BA_STALE_APPROVAL');
  assertGraphTime(a.at, (await createArtifactGraph(input.graph, input.context)).snapshot());
  const target = input.context.artifacts.find(t => t.id === input.targetId)!;
  const artifact = await reviewArtifact(target, {id: a.eventId, action: 'approve', actor: a.actor, at: a.at,
    subjectSha256: await artifactSubject(target)}, input.context);
  const after = await createArtifactGraph(input.graph, {...input.context,
    artifacts: input.context.artifacts.map(t => t.id === artifact.id ? artifact : t)});
  const receipt: BAApprovalReceipt = {schemaVersion: '1.0.0', kind: 'SpecForgeBAApproval', targetId: artifact.id,
    subjectSha256: prepared.subjectSha256, beforeSnapshotSha256: prepared.subject.snapshotSha256,
    beforeArtifactSha256: prepared.subject.artifactSha256, afterArtifactSha256: await fingerprint(artifact),
    afterSnapshotSha256: after.snapshotSha256, eventId: a.eventId, actor: a.actor, at: a.at};
  return {artifact, receipt};
}

/** Reconstruct/replay exact transition; receipt is a host attestation, not a signature. */
export async function assertBAApproval(value: BAApprovalInput, evidence: BAApprovalReceipt): Promise<void> {
  const r = copy(evidence);
  const {input, graph, target} = await graphInput(value);
  if (target.status !== 'approved' || r.afterSnapshotSha256 !== graph.snapshotSha256 || r.afterArtifactSha256 !== await fingerprint(target)) fail('BA_STALE_RECEIPT');
  const event = target.review.at(-1)!;
  if (event.action !== 'approve') fail('BA_RECEIPT');
  const before = {...target, status: 'under-review', review: target.review.slice(0, -1)} as Artifact;
  const replay = await approveBA({...input, context: {...input.context, artifacts: input.context.artifacts.map(a => a.id === before.id ? before : a)}},
    {subjectSha256: r.subjectSha256, eventId: event.id, actor: event.actor, at: event.at});
  if (canonicalJson(replay.receipt) !== canonicalJson(r) || canonicalJson(replay.artifact) !== canonicalJson(target)) fail('BA_RECEIPT');
}

/** Structural impact from known edges only. No claim to semantic completeness or AI execution. */
export async function createBAImpactAnalysis(value: BAApprovalInput, metadata: {id: string; title: string; at: string}) {
  const m = copy(metadata); keys(m, ['id', 'title', 'at']);
  const {graph, target} = await graphInput(value);
  assertGraphTime(m.at, graph.snapshot());
  if (graph.snapshot().artifacts.some(a => a.id === m.id)) fail('BA_IMPACT_ID');
  const impact = graph.impact(target.id);
  if (impact.truncated) fail('BA_IMPACT_TRUNCATED');
  const records = graph.snapshot().artifacts;
  return createArtifact({id: m.id, title: m.title, ownerRole: 'ba', projectRef: target.projectRef,
    type: 'impact-analysis', content: {basisSnapshotSha256: graph.snapshotSha256, root: await ref(target),
      affected: await Promise.all(impact.nodes.filter(n => n.artifactId !== target.id).map(n => ref(records.find(a => a.id === n.artifactId)!))),
      scope: 'provided-context-only'}, relationships: [{kind: 'derives-from', target: await ref(target)}]},
    {actor: {id: 'specforge-graph', kind: 'system'}, at: m.at, origin: 'generated-from-artifact', sourceRefs: [graph.snapshotSha256]});
}

export async function assertBAImpactBasis(artifact: Artifact, graph: ArtifactGraphDefinition, context: ArtifactContext) {
  const a = copy(artifact), g = copy(graph), c = copy(context);
  const regenerated = await createBAImpactAnalysis({targetId: a.type === 'impact-analysis' ? a.content.root.artifactId : fail('BA_IMPACT_TYPE'), graph: g, context: c},
    {id: a.id, title: a.title, at: a.createdAt});
  if (canonicalJson(a) !== canonicalJson(regenerated)) fail('BA_IMPACT_BASIS');
}
