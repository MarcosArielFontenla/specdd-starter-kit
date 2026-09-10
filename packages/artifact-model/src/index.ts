import { structuralValidator, validateProjectDefinition, type Diagnostic, type ValidationResult } from '@specdd/project-model';
import schema from '../schema/artifact.schema.json' with { type: 'json' };
import { artifactSchemaV11 } from './schema-v11.js';
export { artifactSchemaV11 } from './schema-v11.js';
import { artifactSchemaV12 } from './schema-v12.js';
export { artifactSchemaV12 } from './schema-v12.js';
import type { Actor, Artifact, ArtifactContext, ArtifactInput, ArtifactStatus, Contribution, Payload, ReviewAction, ReviewEvent } from './types.js';
export * from './types.js';
export const artifactSchema = schema;
const structure = structuralValidator(schema);
const structureV11 = structuralValidator(artifactSchemaV11);
const structureV12 = structuralValidator(artifactSchemaV12);
const fail = (code: string): never => { throw new Error(code); };
const clone = <T>(value: T): T => { canonicalJson(value); return structuredClone(value); };
const time = (value: string) => Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

/** Ordinary finite JSON only; no silent toJSON/coercion, omitted values or Unicode rewriting. */
export function canonicalJson(value: unknown): string {
  const stack = new Set<object>();
  function encode(v: unknown, depth: number): string {
    if (depth > 64) return fail('ARTIFACT_JSON_DEPTH');
    if (v === null || typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
    if (typeof v !== 'object' || v === null) return fail('ARTIFACT_NON_JSON');
    if (stack.has(v)) return fail('ARTIFACT_JSON_CYCLE');
    if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) return fail('ARTIFACT_NON_JSON');
    if (Object.getOwnPropertySymbols(v).length) return fail('ARTIFACT_NON_JSON');
    for (const key of Object.getOwnPropertyNames(v)) {
      if (Array.isArray(v) && key === 'length') continue;
      const d = Object.getOwnPropertyDescriptor(v, key)!;
      if (!d.enumerable || !('value' in d)) return fail('ARTIFACT_NON_JSON');
    }
    stack.add(v);
    let result: string;
    if (Array.isArray(v)) {
      if (Object.keys(v).length !== v.length) return fail('ARTIFACT_NON_JSON');
      result = '[' + Array.from(v, item => encode(item, depth + 1)).join(',') + ']';
    } else {
      result = '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + encode((v as Record<string, unknown>)[k], depth + 1)).join(',') + '}';
    }
    stack.delete(v);
    return result;
  }
  const result = encode(value, 0);
  if (new TextEncoder().encode(result).byteLength > 2_000_000) return fail('ARTIFACT_TOO_LARGE');
  return result;
}

export async function fingerprint(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

export function validateArtifact(value: unknown): ValidationResult {
  const diagnostics: Diagnostic[] = [];
  const error = (code: string, path: string) => diagnostics.push({code, path, severity: 'error', message: code});
  try { canonicalJson(value); } catch (e) { error((e as Error).message, '/'); return {valid: false, diagnostics}; }
  const version = (value as {schemaVersion?: string} | null)?.schemaVersion;
  diagnostics.push(...(version === '1.2.0' ? structureV12 : version === '1.1.0' ? structureV11 : structure)(value));
  if (diagnostics.length) return {valid: false, diagnostics};
  const a = value as Artifact;
  if (!time(a.createdAt) || !time(a.updatedAt) || a.updatedAt < a.createdAt) error('ARTIFACT_TIME', '/updatedAt');
  if ((a.revision === 1) !== (a.previousRevisionSha256 === null)) error('ARTIFACT_PARENT', '/previousRevisionSha256');
  if (a.provenance.length !== a.revision) error('ARTIFACT_PROVENANCE_REVISION', '/provenance');
  let seenAgent = false, last = a.createdAt;
  for (const [i, p] of a.provenance.entries()) {
    if (!time(p.at) || p.at < last || p.at > a.updatedAt) error('ARTIFACT_PROVENANCE_TIME', `/provenance/${i}`);
    if ((p.origin === 'human-authored' && (p.actor.kind !== 'human' || seenAgent)) ||
        (p.origin === 'agent-proposed' && p.actor.kind !== 'agent') ||
        (p.origin === 'human-edited-agent-proposal' && (p.actor.kind !== 'human' || !seenAgent))) error('ARTIFACT_AUTHORSHIP', `/provenance/${i}`);
    if (['imported', 'generated-from-artifact'].includes(p.origin) && !p.sourceRefs.length) error('ARTIFACT_SOURCE_REQUIRED', `/provenance/${i}`);
    seenAgent ||= p.actor.kind === 'agent'; last = p.at;
  }
  if (a.provenance[0]!.at !== a.createdAt || last !== a.updatedAt) error('ARTIFACT_PROVENANCE_TIME', '/provenance');
  if (a.type === 'requirement') {
    const ids = a.content.acceptanceCriteria.map(c => c.id);
    if (new Set(ids).size !== ids.length) error('ARTIFACT_DUPLICATE_CRITERION', '/content/acceptanceCriteria');
  }
  if (a.type === 'impact-analysis') {
    const refs = [a.content.root, ...a.content.affected];
    if (refs.some(r => r.projectId !== a.projectRef.id || r.artifactId === a.id) ||
        new Set(refs.map(r => r.artifactId)).size !== refs.length) error('ARTIFACT_IMPACT_SCOPE', '/content');
  }
  if (a.type === 'coverage-assessment') {
    const ids = a.content.entries.map(e => e.acceptanceCriterionId);
    if (new Set(ids).size !== ids.length) error('ARTIFACT_DUPLICATE_COVERAGE', '/content/entries');
    const refs = [a.content.target, ...a.content.entries.flatMap(e => e.testCaseRefs)];
    if (refs.some(r => r.projectId !== a.projectRef.id || r.artifactId === a.id)) error('ARTIFACT_COVERAGE_SCOPE', '/content');
  }
  if (a.type === 'open-question' && a.content.resolution) {
    const r = a.content.resolution;
    if (r.actor.kind !== 'human' || !time(r.at) || r.at < a.createdAt || r.at > a.updatedAt) error('ARTIFACT_QUESTION_RESOLUTION', '/content/resolution');
    if (!a.provenance.some(p => p.actor.kind === 'human' && p.actor.id === r.actor.id && p.at === r.at)) error('ARTIFACT_RESOLUTION_AUTHOR', '/content/resolution');
  }
  const targets = new Set<string>();
  for (const [i, r] of a.relationships.entries()) {
    if (r.target.projectId !== a.projectRef.id || r.target.artifactId === a.id) error('ARTIFACT_RELATION_SCOPE', `/relationships/${i}`);
    const key = r.kind + ':' + r.target.artifactId;
    if (targets.has(key)) error('ARTIFACT_DUPLICATE_RELATION', `/relationships/${i}`);
    targets.add(key);
  }
  return {valid: diagnostics.length === 0, diagnostics};
}

export function assertArtifact(value: unknown): asserts value is Artifact {
  const result = validateArtifact(value);
  if (!result.valid) fail(result.diagnostics.map(d => `${d.code} ${d.path}`).join('; '));
}

/** Hash excludes only the lifecycle projection and its journal. */
export async function artifactSubject(value: Artifact): Promise<string> {
  assertArtifact(value);
  const {status: _status, review: _review, ...snapshot} = value;
  return fingerprint(snapshot);
}

const nextState = (state: ArtifactStatus, action: ReviewAction): ArtifactStatus => {
  if (state === 'draft' && action === 'request-review') return 'under-review';
  if (state === 'under-review' && action === 'return-to-draft') return 'draft';
  if (state === 'under-review' && action === 'approve') return 'approved';
  if (state === 'approved' && action === 'activate') return 'active';
  if (state === 'active' && action === 'supersede') return 'superseded';
  return fail('ARTIFACT_TRANSITION');
};

export async function assertArtifactIntegrity(value: unknown): Promise<void> {
  assertArtifact(value);
  const a = clone(value), subject = await artifactSubject(a);
  let status: ArtifactStatus = 'draft', previous: string | null = null, at = a.updatedAt;
  const ids = new Set<string>();
  for (const e of a.review) {
    if (e.subjectSha256 !== subject || e.previousEventSha256 !== previous) fail('ARTIFACT_REVIEW_INTEGRITY');
    if (!time(e.at) || e.at < at || ids.has(e.id)) fail('ARTIFACT_REVIEW_ORDER');
    if (e.action !== 'request-review' && e.actor.kind !== 'human') fail('ARTIFACT_HUMAN_REQUIRED');
    status = nextState(status, e.action);
    if (e.action === 'approve') assertReady(a);
    previous = await fingerprint(e); at = e.at; ids.add(e.id);
  }
  if (a.status !== status) fail('ARTIFACT_STATUS_MISMATCH');
}

function assertReady(a: Artifact): void {
  if (a.type === 'requirement' && !a.content.acceptanceCriteria.length) fail('ARTIFACT_CRITERIA_REQUIRED');
  if (a.type === 'open-question' && !a.content.resolution) fail('ARTIFACT_QUESTION_OPEN');
}

/** Caller supplies the current project and complete current direct targets. No graph traversal. */
export async function assertArtifactContext(value: Artifact, context: ArtifactContext): Promise<void> {
  const a = clone(value), ctx = clone(context);
  await assertArtifactIntegrity(a);
  if (!validateProjectDefinition(ctx.project).valid || ctx.project.metadata.id !== a.projectRef.id ||
      await fingerprint(ctx.project) !== a.projectRef.definitionSha256) fail('ARTIFACT_PROJECT_BINDING');
  const index = new Map<string, Artifact>();
  for (const target of ctx.artifacts) {
    await assertArtifactIntegrity(target);
    if (target.projectRef.id !== a.projectRef.id || target.projectRef.definitionSha256 !== a.projectRef.definitionSha256) fail('ARTIFACT_PROJECT_BINDING');
    if (index.has(target.id)) fail('ARTIFACT_DUPLICATE_ID');
    index.set(target.id, target);
  }
  const current = index.get(a.id);
  if (current && await fingerprint(current) !== await fingerprint(a)) fail('ARTIFACT_STALE_REVISION');
  for (const r of a.relationships) {
    const target = index.get(r.target.artifactId);
    if (!target) fail('ARTIFACT_MISSING_TARGET');
    if (target!.revision !== r.target.revision || await artifactSubject(target!) !== r.target.sha256) fail('ARTIFACT_STALE_TARGET');
  }
}

export async function createArtifact(input: ArtifactInput, contribution: Contribution): Promise<Artifact> {
  assertInputKeys(input, ['id', 'title', 'type', 'content', 'projectRef', 'ownerRole', 'relationships']);
  const qaTypes = ['test-scenario', 'test-case', 'coverage-assessment', 'quality-risk', 'defect'];
  const a = clone({...input, schemaVersion: qaTypes.includes(input.type) ? '1.2.0' : ['business-rule', 'impact-analysis'].includes(input.type) ? '1.1.0' : '1.0.0', kind: 'SpecForgeArtifact', revision: 1,
    previousRevisionSha256: null, createdAt: contribution.at, updatedAt: contribution.at,
    provenance: [contribution], relationships: input.relationships, status: 'draft', review: []}) as Artifact;
  await assertArtifactIntegrity(a);
  if (a.type === 'open-question' && a.content.resolution && contribution.actor.kind !== 'human') fail('ARTIFACT_HUMAN_REQUIRED');
  if (a.type === 'defect' && contribution.actor.kind === 'agent') fail('ARTIFACT_DEFECT_EVIDENCE_REQUIRED');
  return a;
}

export type RevisionEdit = Payload & Pick<ArtifactInput, 'title' | 'relationships' | 'projectRef' | 'ownerRole'>;
export async function reviseArtifact(previous: Artifact, edit: RevisionEdit, contribution: Contribution): Promise<Artifact> {
  assertInputKeys(edit, ['title', 'type', 'content', 'projectRef', 'ownerRole', 'relationships']);
  const old = clone(previous), change = clone(edit), p = clone(contribution);
  await assertArtifactIntegrity(old);
  if (change.type !== old.type || change.projectRef.id !== old.projectRef.id || old.status === 'superseded') fail('ARTIFACT_REVISION_IDENTITY');
  if (p.at < (old.review.at(-1)?.at ?? old.updatedAt)) fail('ARTIFACT_REVISION_TIME');
  if (old.type === 'open-question' && change.type === 'open-question' &&
      canonicalJson(old.content.resolution) !== canonicalJson(change.content.resolution)) assertResolutionChange(change.content.resolution, p);
  const a = {...old, ...change, revision: old.revision + 1, previousRevisionSha256: await fingerprint(old),
    updatedAt: p.at, provenance: [...old.provenance, p], status: 'draft', review: []} as Artifact;
  await assertArtifactIntegrity(a);
  return a;
}

/** Pure transition. Persistence must atomically compare the old record hash before saving. */
export async function reviewArtifact(value: Artifact, decision: {id: string; action: ReviewAction; actor: Actor; at: string; subjectSha256: string}, context: ArtifactContext): Promise<Artifact> {
  const a = clone(value), d = clone(decision), ctx = clone(context);
  await assertArtifactContext(a, ctx);
  if (!ctx.artifacts.some(t => t.id === a.id)) fail('ARTIFACT_CURRENT_REQUIRED');
  if (d.subjectSha256 !== await artifactSubject(a)) fail('ARTIFACT_STALE_APPROVAL');
  if (['approve', 'activate'].includes(d.action)) {
    assertReady(a);
    assertTargetsReady(a, ctx);
  }
  const event: ReviewEvent = {...d, previousEventSha256: a.review.length ? await fingerprint(a.review.at(-1)!) : null};
  const result = {...a, status: nextState(a.status, d.action), review: [...a.review, event]} as Artifact;
  await assertArtifactIntegrity(result);
  return result;
}

function assertTargetsReady(a: Artifact, ctx: ArtifactContext): void {
  for (const r of a.relationships) {
    const target = ctx.artifacts.find(t => t.id === r.target.artifactId)!;
    if (target.status === 'superseded') fail('ARTIFACT_TARGET_SUPERSEDED');
    if (target.type === 'open-question' && target.content.blocking && !target.content.resolution) fail('ARTIFACT_BLOCKING_QUESTION');
  }
}

function assertInputKeys(value: unknown, keys: string[]): void {
  canonicalJson(value);
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !keys.includes(key))) fail('ARTIFACT_INPUT_FIELDS');
}

function assertResolutionChange(resolution: {actor: Actor; at: string} | null, p: Contribution): void {
  if (p.actor.kind !== 'human') fail('ARTIFACT_HUMAN_REQUIRED');
  if (resolution && (resolution.actor.id !== p.actor.id || resolution.actor.kind !== 'human' || resolution.at !== p.at)) fail('ARTIFACT_RESOLUTION_AUTHOR');
}

/** Recheck at consumption time; a serialized approved flag alone is insufficient. */
export async function assertApprovedArtifact(value: Artifact, context: ArtifactContext): Promise<void> {
  const a = clone(value), ctx = clone(context);
  await assertArtifactContext(a, ctx);
  if (!ctx.artifacts.some(t => t.id === a.id)) fail('ARTIFACT_CURRENT_REQUIRED');
  if (!['approved', 'active'].includes(a.status)) fail('ARTIFACT_NOT_APPROVED');
  assertReady(a);
  assertTargetsReady(a, ctx);
}

export async function assertRevisionHistory(values: Artifact[]): Promise<void> {
  const history = clone(values);
  if (!history.length) fail('ARTIFACT_EMPTY_HISTORY');
  for (let i = 0; i < history.length; i++) {
    const a = history[i]!;
    await assertArtifactIntegrity(a);
    if (a.revision !== i + 1) fail('ARTIFACT_HISTORY_GAP');
    if (!i) continue;
    const old = history[i - 1]!;
    if (old.status === 'superseded' || a.schemaVersion !== old.schemaVersion || a.id !== old.id || a.type !== old.type || a.projectRef.id !== old.projectRef.id ||
        a.createdAt !== old.createdAt || a.previousRevisionSha256 !== await fingerprint(old)) fail('ARTIFACT_HISTORY_IDENTITY');
    if (a.updatedAt < (old.review.at(-1)?.at ?? old.updatedAt)) fail('ARTIFACT_REVISION_TIME');
    if (a.provenance.length !== old.provenance.length + 1 ||
        canonicalJson(a.provenance.slice(0, -1)) !== canonicalJson(old.provenance)) fail('ARTIFACT_HISTORY_PROVENANCE');
    if (a.type === 'open-question' && old.type === 'open-question' && canonicalJson(a.content.resolution) !== canonicalJson(old.content.resolution)) {
      assertResolutionChange(a.content.resolution, a.provenance.at(-1)!);
    }
  }
}

/** Version recognition, not legacy inference or approval. Unknown formats fail closed. */
export async function migrateArtifact(value: unknown): Promise<{artifact: Artifact | null; diagnostics: Diagnostic[]}> {
  try {
    const result = clone(value);
    await assertArtifactIntegrity(result);
    return {artifact: result as Artifact, diagnostics: []};
  } catch (e) {
    return {artifact: null, diagnostics: [{code: 'ARTIFACT_MIGRATION_REJECTED', path: '/', severity: 'error', message: (e as Error).message}]};
  }
}
