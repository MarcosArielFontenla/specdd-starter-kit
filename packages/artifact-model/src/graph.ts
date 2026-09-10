import { structuralValidator, validateProjectDefinition, type Diagnostic, type ValidationResult } from '@specdd/project-model';
import schema from '../schema/artifact-graph.schema.json' with {type: 'json'};
import { assertArtifactIntegrity, artifactSubject, canonicalJson, fingerprint } from './index.js';
import type { Artifact, ArtifactContext } from './types.js';
import { RELATION_KINDS, type ArtifactGraphDefinition, type ArtifactGraphView, type GraphEdge, type TraceOptions, type TraceResult } from './graph-types.js';
export * from './graph-types.js';
export const artifactGraphSchema = schema;
const structural = structuralValidator(schema);
const snapshot = <T>(value: T): T => { canonicalJson(value); return structuredClone(value); };
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const causal = new Set(['depends-on', 'derives-from', 'refines', 'blocks', 'supersedes']);
const dependencies = ['depends-on', 'derives-from', 'refines', 'blocks'] as const;
const causalPair = (e: GraphEdge): [string, string] => e.kind === 'blocks' ? [e.to, e.from] : [e.from, e.to];
const fail = (code: string): never => { throw new Error(code); };

interface Prepared { definition: ArtifactGraphDefinition; artifacts: Artifact[]; edges: GraphEdge[] }
async function prepare(value: unknown, context: ArtifactContext): Promise<{diagnostics: Diagnostic[]; prepared: Prepared | null}> {
  const diagnostics: Diagnostic[] = [];
  const error = (code: string, path: string, message = code) => diagnostics.push({code, path, severity: 'error', message});
  let definition: ArtifactGraphDefinition, ctx: ArtifactContext;
  try {
    definition = snapshot(value) as ArtifactGraphDefinition;
    ctx = snapshot(context);
  } catch (e) { error('GRAPH_INVALID_JSON', '/', (e as Error).message); return {diagnostics, prepared: null}; }
  diagnostics.push(...structural(definition));
  if (diagnostics.length) return {diagnostics, prepared: null};
  if (!ctx || !Array.isArray(ctx.artifacts) || ctx.artifacts.length > 200 || !validateProjectDefinition(ctx.project).valid) {
    error('GRAPH_INVALID_CONTEXT', '/context'); return {diagnostics, prepared: null};
  }
  if (definition.projectRef.id !== ctx.project.metadata.id || definition.projectRef.definitionSha256 !== await fingerprint(ctx.project)) error('GRAPH_PROJECT_BINDING', '/projectRef');
  const artifacts = new Map<string, Artifact>();
  const subjects = new Map<string, string>();
  for (const [i, a] of ctx.artifacts.entries()) {
    try { await assertArtifactIntegrity(a); } catch (e) { error('GRAPH_ARTIFACT_INTEGRITY', `/context/artifacts/${i}`, (e as Error).message); continue; }
    if (artifacts.has(a.id)) error('GRAPH_DUPLICATE_ARTIFACT', `/context/artifacts/${i}`);
    if (a.projectRef.id !== definition.projectRef.id || a.projectRef.definitionSha256 !== definition.projectRef.definitionSha256) error('GRAPH_PROJECT_BINDING', `/context/artifacts/${i}/projectRef`);
    artifacts.set(a.id, a); subjects.set(a.id, await artifactSubject(a));
  }
  const nodes = new Set<string>();
  for (const [i, n] of definition.nodes.entries()) {
    if (nodes.has(n.artifactId)) error('GRAPH_DUPLICATE_NODE', `/nodes/${i}`);
    nodes.add(n.artifactId);
    const a = artifacts.get(n.artifactId);
    if (!a) error('GRAPH_MISSING_ARTIFACT', `/nodes/${i}`);
    else if (n.projectId !== definition.projectRef.id || n.revision !== a.revision || n.sha256 !== subjects.get(a.id)) error('GRAPH_STALE_NODE', `/nodes/${i}`);
  }
  for (const id of artifacts.keys()) if (!nodes.has(id)) error('GRAPH_UNLISTED_ARTIFACT', '/nodes', `Context artifact '${id}' is absent from nodes.`);
  if (diagnostics.length) return {diagnostics, prepared: null};

  const edges: GraphEdge[] = [];
  for (const a of artifacts.values()) {
    for (const [i, r] of a.relationships.entries()) {
      const target = artifacts.get(r.target.artifactId);
      if (!target) error('GRAPH_MISSING_TARGET', `/artifacts/${a.id}/relationships/${i}`);
      else if (target.revision !== r.target.revision || subjects.get(target.id) !== r.target.sha256) error('GRAPH_STALE_TARGET', `/artifacts/${a.id}/relationships/${i}`);
      edges.push({id: `artifact.${a.id}.${i}`, kind: r.kind, from: a.id, to: r.target.artifactId,
        origin: {kind: 'artifact', artifactId: a.id, revision: a.revision}});
    }
  }
  const ids = new Set<string>();
  for (const [i, a] of definition.assertions.entries()) {
    if (ids.has(a.id) || a.id.startsWith('artifact.')) error('GRAPH_ASSERTION_ID', `/assertions/${i}/id`);
    ids.add(a.id);
    const from = artifacts.get(a.from), to = artifacts.get(a.to);
    if (!from || !to) error('GRAPH_MISSING_TARGET', `/assertions/${i}`);
    const at = a.provenance.at;
    if (!Number.isFinite(Date.parse(at)) || new Date(at).toISOString() !== at ||
        (from && at < from.updatedAt) || (to && at < to.updatedAt)) error('GRAPH_ASSERTION_TIME', `/assertions/${i}/provenance/at`);
    edges.push({id: a.id, kind: a.kind, from: a.from, to: a.to, origin: {kind: 'graph', provenance: a.provenance}});
  }
  if (edges.length > 1000) error('GRAPH_EDGE_LIMIT', '/assertions');
  if (diagnostics.length) return {diagnostics, prepared: null};
  const tuples = new Set<string>(), successors = new Set<string>();
  for (const e of edges) {
    const from = artifacts.get(e.from)!, to = artifacts.get(e.to)!;
    if (e.from === e.to) error('GRAPH_SELF_LINK', `/edges/${e.id}`);
    const pair = e.kind === 'relates-to' ? [e.from, e.to].sort(compare) : [e.from, e.to];
    const key = canonicalJson([e.kind, ...pair]);
    if (tuples.has(key)) error('GRAPH_DUPLICATE_RELATION', `/edges/${e.id}`);
    tuples.add(key);
    if (e.kind === 'implements') error('GRAPH_UNSUPPORTED_RELATION_TYPES', `/edges/${e.id}`, `${e.kind} requires implementation payloads/evidence not implemented in this phase.`);
    if (e.kind === 'validates' && (!['test-scenario', 'test-case', 'coverage-assessment'].includes(from.type) || to.type !== 'requirement')) error('GRAPH_RELATION_TYPES', `/edges/${e.id}`);
    if (e.kind === 'refines' && (from.type !== 'requirement' || to.type !== 'requirement')) error('GRAPH_RELATION_TYPES', `/edges/${e.id}`);
    if (e.kind === 'blocks' && from.type === 'open-question' && !from.content.blocking) error('GRAPH_NONBLOCKING_QUESTION', `/edges/${e.id}`);
    if (e.kind === 'supersedes') {
      if (from.type !== to.type) error('GRAPH_RELATION_TYPES', `/edges/${e.id}`);
      if (successors.has(e.to)) error('GRAPH_SUPERSESSION_CONFLICT', `/edges/${e.id}`);
      successors.add(e.to);
    }
  }
  if (!diagnostics.length && hasCausalCycle([...nodes], edges)) error('GRAPH_CAUSAL_CYCLE', '/assertions');
  definition.nodes.sort((a, b) => compare(a.artifactId, b.artifactId));
  definition.assertions.sort((a, b) => compare(a.id, b.id));
  edges.sort((a, b) => compare(a.id, b.id));
  return {diagnostics, prepared: diagnostics.length ? null : {definition, artifacts: [...artifacts.values()].sort((a, b) => compare(a.id, b.id)), edges}};
}

function hasCausalCycle(nodes: string[], edges: GraphEdge[]): boolean {
  const degree = new Map(nodes.map(id => [id, 0]));
  const next = new Map(nodes.map(id => [id, [] as string[]]));
  for (const e of edges) if (causal.has(e.kind)) {
    const [from, to] = causalPair(e);
    next.get(from)!.push(to); degree.set(to, degree.get(to)! + 1);
  }
  const queue = nodes.filter(id => degree.get(id) === 0);
  for (let i = 0; i < queue.length; i++) for (const id of next.get(queue[i]!)!) {
    degree.set(id, degree.get(id)! - 1);
    if (degree.get(id) === 0) queue.push(id);
  }
  return queue.length !== nodes.length;
}

export async function validateArtifactGraph(value: unknown, context: ArtifactContext): Promise<ValidationResult> {
  const {diagnostics} = await prepare(value, context);
  return {valid: diagnostics.length === 0, diagnostics};
}

export async function createArtifactGraph(value: unknown, context: ArtifactContext): Promise<ArtifactGraphView> {
  const {diagnostics, prepared} = await prepare(value, context);
  if (!prepared) return fail(diagnostics.map(d => `${d.code} ${d.path}`).join('; '));
  const {definition, artifacts, edges} = prepared;
  const byId = new Map(artifacts.map(a => [a.id, a]));
  const definitionSha256 = await fingerprint(definition);
  const records = [];
  for (const a of artifacts) records.push({id: a.id, sha256: await fingerprint(a)});
  const snapshotSha256 = await fingerprint({definitionSha256, records});
  const ensureNode = (id: string) => { if (!byId.has(id)) fail('GRAPH_UNKNOWN_NODE'); };

  function options(value: TraceOptions): Required<TraceOptions> {
    canonicalJson(value);
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !['direction', 'kinds', 'maxDepth'].includes(k))) fail('GRAPH_QUERY_OPTIONS');
    const direction = value.direction === undefined ? 'outgoing' : value.direction;
    const kinds = value.kinds === undefined ? [...RELATION_KINDS] : value.kinds;
    const maxDepth = value.maxDepth === undefined ? 200 : value.maxDepth;
    if (!['outgoing', 'incoming', 'both'].includes(direction) || !Array.isArray(kinds) ||
        kinds.some(k => !RELATION_KINDS.includes(k)) || new Set(kinds).size !== kinds.length ||
        !Number.isInteger(maxDepth) || maxDepth < 0 || maxDepth > 200) fail('GRAPH_QUERY_OPTIONS');
    return {direction, kinds, maxDepth};
  }

  function walk(id: string, opts: TraceOptions, mode: 'normal' | 'dependencies' | 'impact' = 'normal'): TraceResult {
    ensureNode(id);
    const o = options(opts), selected = new Set(o.kinds);
    const depths = new Map<string, number>([[id, 0]]), queue = [id], traversed = new Map<string, GraphEdge>();
    let truncated = false;
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i]!, depth = depths.get(current)!;
      for (const edge of edges) {
        if (!selected.has(edge.kind)) continue;
        const [from, to] = mode === 'normal' ? [edge.from, edge.to] : causalPair(edge);
        const direction = mode === 'impact' ? 'incoming' : mode === 'dependencies' ? 'outgoing' : o.direction;
        const candidates: string[] = [];
        const symmetric = mode === 'normal' && edge.kind === 'relates-to';
        if (from === current && (symmetric || direction !== 'incoming')) candidates.push(to);
        if (to === current && (symmetric || direction !== 'outgoing')) candidates.push(from);
        for (const target of candidates) {
          if (depth >= o.maxDepth && !depths.has(target)) { truncated = true; continue; }
          if (!depths.has(target)) { depths.set(target, depth + 1); queue.push(target); }
          traversed.set(edge.id, edge);
        }
      }
    }
    return {snapshotSha256, nodes: [...depths].map(([artifactId, depth]) => ({artifactId, depth})).sort((a, b) => a.depth - b.depth || compare(a.artifactId, b.artifactId)),
      edges: snapshot([...traversed.values()].sort((a, b) => compare(a.id, b.id))), truncated};
  }

  function questionReport(id: string, maxDepth: number) {
    const trace = walk(id, {kinds: [...dependencies], maxDepth}, 'dependencies');
    return {trace, report: {snapshotSha256, truncated: trace.truncated,
      questions: trace.nodes.flatMap(n => {
        const a = byId.get(n.artifactId)!;
        return a.type === 'open-question' && !a.content.resolution ? [{...n, blocking: a.content.blocking}] : [];
      })}};
  }

  return Object.freeze({
    definitionSha256, snapshotSha256,
    snapshot: () => snapshot(prepared),
    neighbors: (id: string, opts: Omit<TraceOptions, 'maxDepth'> = {}) => {
      options(opts);
      if (Object.hasOwn(opts, 'maxDepth')) fail('GRAPH_QUERY_OPTIONS');
      return walk(id, {...opts, maxDepth: 1});
    },
    trace: (id: string, opts: TraceOptions = {}) => walk(id, opts),
    impact: (id: string, maxDepth = 200) => walk(id, {kinds: [...dependencies], maxDepth}, 'impact'),
    openQuestions: (id: string, maxDepth = 200) => questionReport(id, maxDepth).report,
    blockers: (id: string, maxDepth = 200) => {
      const {trace, report} = questionReport(id, maxDepth);
      return {...report, questions: report.questions.filter(q => q.blocking),
        declaredBlocks: trace.edges.filter(e => {
          const a = byId.get(e.from)!;
          return e.kind === 'blocks' && (a.type !== 'open-question' || !a.content.resolution);
        })};
    },
    replacements: (id: string) => { ensureNode(id); return snapshot(edges.filter(e => e.kind === 'supersedes' && e.to === id)); },
  });
}

/** Current-version round trip after full binding validation; no inference from legacy data. */
export async function migrateArtifactGraph(value: unknown, context: ArtifactContext): Promise<{definition: ArtifactGraphDefinition | null; diagnostics: Diagnostic[]}> {
  const {diagnostics, prepared} = await prepare(value, context);
  return {definition: prepared ? snapshot(prepared.definition) : null, diagnostics};
}
