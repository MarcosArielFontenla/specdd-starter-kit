import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {
  artifactSchema, validateArtifact, assertArtifactIntegrity, canonicalJson, fingerprint,
  createArtifact, reviseArtifact, reviewArtifact, artifactSubject, assertRevisionHistory,
  assertArtifactContext, assertApprovedArtifact, migrateArtifact,
} from '../dist/index.js';
import {structuralValidator} from '../../project-model/dist/index.js';

const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const project = await json('../../project-model/examples/minimal.project.json');
const requirement = await json('../examples/requirement.json');
const question = await json('../examples/question.json');
const human = {id: 'synthetic-ba', kind: 'human'};
const agent = {id: 'synthetic-agent', kind: 'agent'};
const at = n => `2026-09-07T12:00:${String(n).padStart(2, '0')}.000Z`;
const copy = value => structuredClone(value);
const context = (a, other = []) => ({project: copy(project), artifacts: [a, ...other]});
const contribution = (n, actor = human, origin = 'human-authored') => ({actor, origin, at: at(n), sourceRefs: []});
const input = a => copy({id: a.id, title: a.title, type: a.type, content: a.content, projectRef: a.projectRef, ownerRole: a.ownerRole, relationships: a.relationships});
const edit = a => { const {id, ...rest} = input(a); return copy(rest); };
async function transition(a, action, n, actor = human, other = []) {
  return reviewArtifact(a, {id: `event-${n}`, action, actor, at: at(n), subjectSha256: await artifactSubject(a)}, context(a, other));
}
async function approved(a = copy(requirement), other = []) {
  return transition(await transition(a, 'request-review', 1, human, other), 'approve', 2, human, other);
}

test('published schema and all three synthetic examples validate against pinned real Project Definition', async () => {
  assert.equal(artifactSchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  const structural = structuralValidator(artifactSchema);
  for (const name of ['requirement', 'question', 'decision']) {
    const a = await json(`../examples/${name}.json`);
    assert.deepEqual(structural(a), []);
    assert.deepEqual(validateArtifact(a), {valid: true, diagnostics: []});
    await assertArtifactIntegrity(a);
    await assertArtifactContext(a, context(a));
  }
});

test('published schema enforces payload discrimination, strict nested fields, types and extensions', () => {
  const structural = structuralValidator(artifactSchema);
  for (const mutate of [
    a => a.type = 'decision', a => a.content.unknown = true, a => a.unknown = true,
    a => a.projectRef.extra = true, a => a.content.acceptanceCriteria[0].command = 'shell',
    a => a.provenance[0].actor.kind = 'stakeholder', a => a.revision = 1.5,
    a => a.extensions = {vendor: true}, a => a.schemaVersion = '2.0.0',
    a => a.title = '   ', a => a.id = '../unsafe', a => a.status = 'verified',
    a => a.review = [{approved: true}], a => a.content = null,
  ]) {
    const a = copy(requirement); mutate(a);
    assert.ok(structural(a).length);
    assert.equal(validateArtifact(a).valid, false);
  }
});

test('semantic validation rejects impossible dates, duplicate criteria and invalid revision ancestry', () => {
  for (const mutate of [a => a.updatedAt = '2026-02-30T12:00:00.000Z',
    a => a.createdAt = at(1), a => a.provenance[0].at = at(2),
    a => a.content.acceptanceCriteria.push(copy(a.content.acceptanceCriteria[0])),
    a => a.revision = 2, a => a.previousRevisionSha256 = 'a'.repeat(64)]) {
    const a = copy(requirement); mutate(a); assert.equal(validateArtifact(a).valid, false);
  }
});

test('canonical JSON rejects lossy/non-JSON data, cycles, accessors and oversized values', () => {
  const cyclic = {}; cyclic.self = cyclic;
  const getter = {}; Object.defineProperty(getter, 'danger', {get() {throw new Error('must not invoke');}, enumerable: true});
  for (const v of [undefined, NaN, Infinity, {x: undefined}, new Date(), new Map(), cyclic, getter,
    [,,], {x: 2n}, {[Symbol('hidden')]: 1}, 'x'.repeat(2_000_001)]) assert.throws(() => canonicalJson(v), /ARTIFACT_/);
});

test('fingerprints match independent SHA-256 and preserve array order, CRLF, LF and BOM', async () => {
  const text = canonicalJson({z: 1, a: {b: ['x', 'y']}});
  assert.equal(await fingerprint({a: {b: ['x', 'y']}, z: 1}), createHash('sha256').update(text).digest('hex'));
  const hashes = await Promise.all(['a\nb', 'a\r\nb', '\ufeffa\nb'].map(fingerprint));
  assert.equal(new Set(hashes).size, 3);
  assert.notEqual(await fingerprint([1, 2]), await fingerprint([2, 1]));
});

test('creation returns independent draft and valid known-format migration is a non-mutating round trip', async () => {
  const source = input(requirement);
  const a = await createArtifact(source, contribution(0));
  assert.deepEqual(a, requirement);
  source.content.description = 'caller mutation';
  assert.equal(a.content.description, requirement.content.description);
  const migrated = await migrateArtifact(a);
  assert.deepEqual(migrated, {artifact: a, diagnostics: []});
  assert.notEqual(migrated.artifact, a);
});

test('migration rejects unknown versions, legacy packs, truncated input and false approved flags', async () => {
  for (const value of [{...requirement, schemaVersion: '0.1.0'}, {kind: 'SpecDDCapabilityPack'},
    {kind: 'SpecControlPlanArtifact'}, null, '{"truncated":', {...requirement, status: 'approved'}]) {
    const r = await migrateArtifact(value);
    assert.equal(r.artifact, null);
    assert.equal(r.diagnostics[0].code, 'ARTIFACT_MIGRATION_REJECTED');
  }
});

test('complete human lifecycle validates, preserves source and rejects replay or skipped states', async () => {
  const draft = copy(requirement);
  let a = await approved(draft);
  await assertApprovedArtifact(a, context(a));
  assert.equal(draft.status, 'draft'); assert.equal(draft.review.length, 0);
  await assert.rejects(transition(a, 'approve', 3), /ARTIFACT_TRANSITION/);
  a = await transition(a, 'activate', 3);
  assert.equal(a.status, 'active');
  a = await transition(a, 'supersede', 4);
  assert.equal(a.status, 'superseded');
  await assertArtifactIntegrity(a);
  await assert.rejects(assertApprovedArtifact(a, context(a)), /ARTIFACT_NOT_APPROVED/);
  await assert.rejects(transition(draft, 'approve', 1), /ARTIFACT_TRANSITION/);
});

test('return for revision requires human, keeps review history and permits another review request', async () => {
  let a = await transition(copy(requirement), 'request-review', 1, agent);
  await assert.rejects(transition(a, 'return-to-draft', 2, agent), /ARTIFACT_HUMAN_REQUIRED/);
  a = await transition(a, 'return-to-draft', 2);
  a = await transition(a, 'request-review', 3);
  a = await transition(a, 'approve', 4);
  assert.equal(a.review.length, 4);
});

test('agent/system cannot approve, activate or supersede', async () => {
  for (const actor of [agent, {id: 'local-system', kind: 'system'}]) {
    const requested = await transition(copy(requirement), 'request-review', 1);
    await assert.rejects(transition(requested, 'approve', 2, actor), /ARTIFACT_HUMAN_REQUIRED/);
    const a = await approved();
    await assert.rejects(transition(a, 'activate', 3, actor), /ARTIFACT_HUMAN_REQUIRED/);
    const active = await transition(a, 'activate', 3);
    await assert.rejects(transition(active, 'supersede', 4, actor), /ARTIFACT_HUMAN_REQUIRED/);
  }
});

test('tampering any approved snapshot field or review evidence is detected', async () => {
  const a = await approved();
  for (const mutate of [v => v.title += ' changed', v => v.content.acceptanceCriteria[0].then += ' changed',
    v => v.projectRef.definitionSha256 = 'a'.repeat(64), v => v.ownerRole = 'qa',
    v => v.status = 'draft', v => v.review[1].subjectSha256 = 'b'.repeat(64),
    v => v.review[1].previousEventSha256 = null, v => v.review[0].actor.id = 'other',
    v => v.review[1].id = v.review[0].id, v => v.review[1].at = at(0),
    v => v.review[1].actor.kind = 'agent']) {
    const v = copy(a); mutate(v); await assert.rejects(assertArtifactIntegrity(v), /ARTIFACT_/);
  }
});

test('approval binds actual subject and current supplied revision', async () => {
  const a = await transition(copy(requirement), 'request-review', 1);
  await assert.rejects(reviewArtifact(a, {id: 'stale', action: 'approve', actor: human, at: at(2), subjectSha256: 'f'.repeat(64)}, context(a)), /ARTIFACT_STALE_APPROVAL/);
  const next = await reviseArtifact(a, edit(a), contribution(3));
  await assert.rejects(transition(a, 'approve', 4, human, [next]), /ARTIFACT_DUPLICATE_ID/);
  await assert.rejects(reviewArtifact(a, {id: 'old', action: 'approve', actor: human, at: at(4), subjectSha256: await artifactSubject(a)}, context(next)), /ARTIFACT_STALE_REVISION/);
  await assert.rejects(reviewArtifact(a, {id: 'missing', action: 'approve', actor: human, at: at(4), subjectSha256: await artifactSubject(a)}, {project, artifacts: []}), /ARTIFACT_CURRENT_REQUIRED/);
});

test('editing approved artifacts resets approval, preserves history/provenance and rejects stale subjects', async () => {
  const old = await approved();
  const edited = edit(old); edited.content.description += ' revised';
  const next = await reviseArtifact(old, edited, contribution(3));
  assert.equal(next.revision, 2); assert.equal(next.status, 'draft'); assert.deepEqual(next.review, []);
  assert.equal(old.status, 'approved'); assert.equal(old.review.length, 2);
  assert.equal(next.previousRevisionSha256, await fingerprint(old));
  await assertRevisionHistory([old, next]);
  assert.notEqual(await artifactSubject(old), await artifactSubject(next));
  const pending = await transition(next, 'request-review', 4);
  await assert.rejects(reviewArtifact(pending, {id: 'stale', action: 'approve', actor: human, at: at(5), subjectSha256: await artifactSubject(old)}, context(pending)), /ARTIFACT_STALE_APPROVAL/);
});

test('revision history rejects gaps, wrong identity, lost provenance, preimage tampering and time travel', async () => {
  const old = await approved();
  const next = await reviseArtifact(old, edit(old), contribution(3));
  await assert.rejects(assertRevisionHistory([]), /ARTIFACT_EMPTY_HISTORY/);
  await assert.rejects(assertRevisionHistory([next]), /ARTIFACT_HISTORY_GAP/);
  for (const mutate of [v => v.id = 'other', v => v.previousRevisionSha256 = 'a'.repeat(64),
    v => v.provenance[0].actor.id = 'other', v => v.createdAt = at(1)]) {
    const v = copy(next); mutate(v); await assert.rejects(assertRevisionHistory([old, v]), /ARTIFACT_/);
  }
  await assert.rejects(reviseArtifact(old, edit(old), contribution(1)), /ARTIFACT_REVISION_TIME/);
  const foreign = edit(old); foreign.projectRef.id = 'foreign';
  await assert.rejects(reviseArtifact(old, foreign, contribution(3)), /ARTIFACT_REVISION_IDENTITY/);
});

test('human editing an agent proposal preserves agent origin and cannot claim exclusively human authorship', async () => {
  const a = await createArtifact(input(requirement), contribution(0, agent, 'agent-proposed'));
  await assert.rejects(reviseArtifact(a, edit(a), contribution(1)), /ARTIFACT_AUTHORSHIP/);
  const b = await reviseArtifact(a, edit(a), contribution(1, human, 'human-edited-agent-proposal'));
  assert.deepEqual(b.provenance.map(p => p.origin), ['agent-proposed', 'human-edited-agent-proposal']);
  await assertRevisionHistory([a, b]);
  await assert.rejects(createArtifact(input(requirement), contribution(0, agent, 'human-authored')), /ARTIFACT_AUTHORSHIP/);
});

test('imports and generated artifacts require sources and keep their origin after human edits', async () => {
  for (const origin of ['imported', 'generated-from-artifact']) {
    const p = contribution(0, {id: 'importer', kind: 'system'}, origin);
    await assert.rejects(createArtifact(input(requirement), p), /ARTIFACT_SOURCE_REQUIRED/);
    p.sourceRefs = ['synthetic-source-revision'];
    const a = await createArtifact(input(requirement), p);
    const b = await reviseArtifact(a, edit(a), contribution(1));
    assert.equal(b.provenance[0].origin, origin);
    await assertRevisionHistory([a, b]);
  }
});

test('questions stay open until a human resolves them and agents cannot change the resolution', async () => {
  await assert.rejects(approved(copy(question)), /ARTIFACT_QUESTION_OPEN/);
  const change = edit(question);
  change.content.resolution = {answer: 'Synthetic stakeholder answer', actor: human, at: at(3)};
  await assert.rejects(reviseArtifact(question, change, contribution(3, agent, 'agent-proposed')), /ARTIFACT_HUMAN_REQUIRED/);
  const resolved = await reviseArtifact(question, change, contribution(3, human, 'human-edited-agent-proposal'));
  await assertRevisionHistory([question, resolved]);
  const r = await transition(resolved, 'request-review', 4);
  assert.equal((await transition(r, 'approve', 5)).status, 'approved');
  const forged = copy(resolved); forged.content.resolution.actor.id = 'invented-stakeholder';
  assert.equal(validateArtifact(forged).valid, false);
});

async function withQuestion(q = question) {
  const a = copy(requirement);
  a.relationships = [{kind: 'depends-on', target: {projectId: project.metadata.id, artifactId: q.id, revision: q.revision, sha256: await artifactSubject(q)}}];
  return a;
}

test('linked blocking questions prevent approval; resolving requires updating the pinned relationship', async () => {
  const a = await withQuestion();
  await assert.rejects(approved(a, [question]), /ARTIFACT_BLOCKING_QUESTION/);
  const change = edit(question); change.content.resolution = {answer: 'Synthetic answer', actor: human, at: at(3)};
  const resolved = await reviseArtifact(question, change, contribution(3, human, 'human-edited-agent-proposal'));
  await assert.rejects(assertArtifactContext(a, context(a, [resolved])), /ARTIFACT_STALE_TARGET/);
  const next = await reviseArtifact(a, edit(await withQuestion(resolved)), contribution(4));
  const pending = await transition(next, 'request-review', 5, human, [resolved]);
  const done = await transition(pending, 'approve', 6, human, [resolved]);
  await assertApprovedArtifact(done, context(done, [resolved]));
});

test('context rejects missing, duplicate, cross-project and wrong-hash relationship targets', async () => {
  const a = await withQuestion();
  await assert.rejects(assertArtifactContext(a, context(a)), /ARTIFACT_MISSING_TARGET/);
  await assert.rejects(assertArtifactContext(a, context(a, [question, question])), /ARTIFACT_DUPLICATE_ID/);
  const foreign = copy(question); foreign.projectRef.id = 'other';
  await assert.rejects(assertArtifactContext(a, context(a, [foreign])), /ARTIFACT_PROJECT_BINDING/);
  const bad = copy(a); bad.relationships[0].target.sha256 = 'a'.repeat(64);
  await assert.rejects(assertArtifactContext(bad, context(bad, [question])), /ARTIFACT_STALE_TARGET/);
  bad.relationships[0].target.projectId = 'other';
  assert.equal(validateArtifact(bad).valid, false);
  const duplicate = copy(a); duplicate.relationships.push(copy(a.relationships[0]));
  assert.equal(validateArtifact(duplicate).valid, false);
});

test('project context changes and empty criteria invalidate eligibility', async () => {
  const a = await approved();
  const ctx = context(a); ctx.project.metadata.name = 'Changed scope';
  await assert.rejects(assertApprovedArtifact(a, ctx), /ARTIFACT_PROJECT_BINDING/);
  const empty = copy(requirement); empty.content.acceptanceCriteria = [];
  assert.equal(validateArtifact(empty).valid, true);
  await assert.rejects(approved(empty), /ARTIFACT_CRITERIA_REQUIRED/);
});

test('async transitions snapshot caller input before hashing', async () => {
  const a = await transition(copy(requirement), 'request-review', 1);
  const ctx = context(a);
  const promise = reviewArtifact(a, {id: 'approve-snapshot', action: 'approve', actor: human, at: at(2), subjectSha256: await artifactSubject(a)}, ctx);
  a.title = 'concurrent caller edit'; ctx.project.metadata.name = 'concurrent context edit';
  const result = await promise;
  assert.equal(result.title, requirement.title);
  await assertApprovedArtifact(result, context(result));
});

test('package remains browser portable and no runtime/IO side effects are present in its implementation', async () => {
  const source = await readFile(new URL('../src/index.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"]node:|\bfetch\(|\bspawn\(|\bexec\(/);
  assert.match(source, /crypto\.subtle\.digest/);
});

test('JavaScript callers cannot smuggle identity/lifecycle fields through creation or edit inputs', async () => {
  const a = copy(requirement);
  for (const extra of [{id: 'other'}, {revision: 9}, {review: []}, {schemaVersion: '9.0.0'}, {previousRevisionSha256: 'f'.repeat(64)}]) {
    await assert.rejects(reviseArtifact(a, {...edit(a), ...extra}, contribution(1)), /ARTIFACT_INPUT_FIELDS/);
  }
  await assert.rejects(createArtifact({...input(a), status: 'approved'}, contribution(0)), /ARTIFACT_INPUT_FIELDS/);
});

test('a changed question answer cannot be attributed to an older human contribution', async () => {
  const a = copy(question);
  const e = edit(a); e.content.resolution = {actor: human, answer: 'First synthetic answer', at: at(1)};
  const first = await reviseArtifact(a, e, contribution(1, human, 'human-edited-agent-proposal'));
  const changed = edit(first); changed.content.resolution.answer = 'Second synthetic answer';
  await assert.rejects(reviseArtifact(first, changed, contribution(2, human, 'human-edited-agent-proposal')), /ARTIFACT_RESOLUTION_AUTHOR/);
});

test('superseded direct targets invalidate consumer approval checks without changing the source snapshot', async () => {
  let target = await approved(await json('../examples/decision.json'));
  target = await transition(target, 'activate', 3);
  const a = copy(requirement);
  a.relationships = [{kind: 'depends-on', target: {projectId: target.projectRef.id, artifactId: target.id, revision: 1, sha256: await artifactSubject(target)}}];
  const done = await approved(a, [target]);
  const superseded = await transition(target, 'supersede', 4);
  await assert.rejects(assertApprovedArtifact(done, context(done, [superseded])), /ARTIFACT_TARGET_SUPERSEDED/);
});
