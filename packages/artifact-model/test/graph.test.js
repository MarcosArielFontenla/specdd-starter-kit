import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {structuralValidator} from '../../project-model/dist/index.js';
import {artifactSubject, fingerprint, reviseArtifact, reviewArtifact} from '../dist/index.js';
import {artifactGraphSchema, createArtifactGraph, validateArtifactGraph, migrateArtifactGraph} from '../dist/graph.js';

const load = async p => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));
const project = await load('../../project-model/examples/minimal.project.json');
const template = await load('../examples/requirement.json');
const question = await load('../examples/question.json');
const decision = await load('../examples/decision.json');
const copy = x => structuredClone(x);
const human = {id: 'synthetic-ba', kind: 'human'};
const at = n => `2026-09-07T12:00:${String(n).padStart(2, '0')}.000Z`;
const req = id => ({...copy(template), id, title: `Synthetic ${id}`});
const edge = (kind, from, to, id = `${kind}.${from}.${to}`) => ({id, kind, from, to,
  provenance: {actor: human, at: at(10), sourceRefs: ['synthetic-phase2-assertion']}});
async function fixture(artifacts, assertions = []) {
  const nodes = [];
  for (const a of artifacts) nodes.push({artifactId: a.id, projectId: a.projectRef.id, revision: a.revision, sha256: await artifactSubject(a)});
  return {definition: {schemaVersion: '1.0.0', kind: 'SpecForgeArtifactGraph', projectRef: copy(template.projectRef), nodes, assertions},
    context: {project: copy(project), artifacts: copy(artifacts)}};
}
const build = f => createArtifactGraph(f.definition, f.context);
const result = f => validateArtifactGraph(f.definition, f.context);
const ids = r => r.nodes.map(n => n.artifactId);
async function hasCode(f, code) {
  const r = await result(f); assert.equal(r.valid, false);
  assert.ok(r.diagnostics.some(d => d.code === code), JSON.stringify(r.diagnostics));
  await assert.rejects(build(f), new RegExp(code));
}

test('published graph example pins the published artifacts and exposes the real open synthetic question', async () => {
  const definition = await load('../examples/graph.json');
  const g = await createArtifactGraph(definition, {project, artifacts: [template, question, decision]});
  assert.equal(g.blockers(template.id).questions[0].artifactId, question.id);
  assert.deepEqual(ids(g.impact(question.id)), [question.id, template.id]);
  assert.equal(g.snapshot().edges[1].origin.provenance.actor.kind, 'agent');
});

test('three-family graph validates schema and provides deterministic incoming/outgoing neighbors', async () => {
  const f = await fixture([template, question, decision], [edge('blocks', question.id, template.id), edge('depends-on', template.id, decision.id)]);
  assert.deepEqual(structuralValidator(artifactGraphSchema)(f.definition), []);
  assert.deepEqual(await result(f), {valid: true, diagnostics: []});
  const graph = await build(f);
  assert.deepEqual(ids(graph.neighbors(template.id)), [template.id, decision.id]);
  assert.deepEqual(ids(graph.neighbors(template.id, {direction: 'incoming'})), [template.id, question.id]);
  assert.deepEqual(graph.blockers(template.id).questions.map(n => n.artifactId), [question.id]);
  assert.equal(graph.blockers(template.id).declaredBlocks.length, 1);
});

test('strict graph schema rejects unknown fields, types, nulls and unsupported versions', async () => {
  const base = await fixture([req('a'), req('b')], [edge('depends-on', 'a', 'b')]);
  for (const mutate of [d => d.schemaVersion = '2.0.0', d => d.extra = true, d => d.projectRef.extra = true,
    d => d.nodes[0].revision = 1.2, d => d.assertions[0].to = '../bad', d => d.assertions[0].provenance.actor.kind = 'admin',
    d => d.assertions[0].kind = 'unknown', d => d.nodes = [], d => d.assertions = null,
    d => d.assertions[0].provenance.extra = true]) {
    const f = copy(base); mutate(f.definition);
    await hasCode(f, 'SCHEMA_CONSTRAINT');
  }
});

test('context and node inventory must be unique, complete for supplied scope and revision-bound', async () => {
  const base = await fixture([req('a'), req('b')]);
  for (const [mutate, code] of [
    [f => f.definition.nodes.pop(), 'GRAPH_UNLISTED_ARTIFACT'],
    [f => f.context.artifacts.pop(), 'GRAPH_MISSING_ARTIFACT'],
    [f => f.definition.nodes.push(copy(f.definition.nodes[0])), 'GRAPH_DUPLICATE_NODE'],
    [f => f.context.artifacts.push(copy(f.context.artifacts[0])), 'GRAPH_DUPLICATE_ARTIFACT'],
    [f => f.definition.nodes[0].sha256 = 'a'.repeat(64), 'GRAPH_STALE_NODE'],
    [f => f.definition.nodes[0].revision = 2, 'GRAPH_STALE_NODE'],
    [f => f.definition.nodes[0].projectId = 'other', 'GRAPH_STALE_NODE'],
    [f => f.context.project.metadata.name = 'Different context', 'GRAPH_PROJECT_BINDING'],
    [f => f.context.artifacts[0].projectRef.id = 'other', 'GRAPH_PROJECT_BINDING'],
    [f => f.context.artifacts[0].status = 'approved', 'GRAPH_ARTIFACT_INTEGRITY'],
  ]) { const f = copy(base); mutate(f); await hasCode(f, code); }
});

test('missing targets, self-links, duplicate IDs and reserved origin IDs reject', async () => {
  const base = await fixture([req('a'), req('b')], [edge('depends-on', 'a', 'b')]);
  for (const [mutate, code] of [
    [f => f.definition.assertions[0].to = 'missing', 'GRAPH_MISSING_TARGET'],
    [f => f.definition.assertions[0].to = 'a', 'GRAPH_SELF_LINK'],
    [f => f.definition.assertions.push(copy(f.definition.assertions[0])), 'GRAPH_ASSERTION_ID'],
    [f => f.definition.assertions[0].id = 'artifact.a.0', 'GRAPH_ASSERTION_ID'],
  ]) {const f = copy(base); mutate(f); await hasCode(f, code);}
});

test('relations embedded in artifacts are always included with origin and cannot be hidden', async () => {
  const a = req('a');
  a.relationships = [{kind: 'depends-on', target: {projectId: question.projectRef.id, artifactId: question.id, revision: 1, sha256: await artifactSubject(question)}}];
  const f = await fixture([a, question]);
  const g = await build(f);
  assert.equal(g.snapshot().edges[0].origin.kind, 'artifact');
  assert.equal(g.blockers('a').questions[0].artifactId, question.id);
  f.definition.assertions.push(edge('depends-on', 'a', question.id));
  await hasCode(f, 'GRAPH_DUPLICATE_RELATION');
});

test('embedded missing/stale references are rejected even when graph node pins match', async () => {
  const a = req('a');
  a.relationships = [{kind: 'depends-on', target: {projectId: question.projectRef.id, artifactId: question.id, revision: 1, sha256: 'b'.repeat(64)}}];
  await hasCode(await fixture([a]), 'GRAPH_MISSING_TARGET');
  await hasCode(await fixture([a, question]), 'GRAPH_STALE_TARGET');
});

test('relates-to is symmetric, supports triangles and rejects reciprocal duplicate assertions', async () => {
  const f = await fixture(['a', 'b', 'c'].map(req), [edge('relates-to', 'a', 'b'), edge('relates-to', 'b', 'c'), edge('relates-to', 'c', 'a')]);
  const g = await build(f);
  assert.deepEqual(ids(g.trace('a')), ['a', 'b', 'c']);
  assert.deepEqual(ids(g.neighbors('b', {direction: 'incoming'})), ['b', 'a', 'c']);
  assert.deepEqual(ids(g.impact('a')), ['a']);
  f.definition.assertions.push(edge('relates-to', 'b', 'a'));
  await hasCode(f, 'GRAPH_DUPLICATE_RELATION');
});

test('causal cycles reject including mixed depends-on, derives-from, refines and inverted blocks', async () => {
  for (const edges of [
    [edge('depends-on', 'a', 'b'), edge('depends-on', 'b', 'a')],
    [edge('depends-on', 'a', 'b'), edge('derives-from', 'b', 'c'), edge('refines', 'c', 'a')],
    [edge('depends-on', 'a', 'b'), edge('blocks', 'a', 'b')],
    [edge('supersedes', 'a', 'b'), edge('supersedes', 'b', 'a')],
  ]) await hasCode(await fixture(['a', 'b', 'c'].map(req), edges), 'GRAPH_CAUSAL_CYCLE');
});

test('same-direction semantic edges and a contextual association do not create a false causal cycle', async () => {
  const f = await fixture(['a', 'b'].map(req), [edge('depends-on', 'a', 'b'), edge('blocks', 'b', 'a'), edge('relates-to', 'a', 'b')]);
  assert.equal((await result(f)).valid, true);
});

test('refines and supersedes enforce endpoint types; competing replacements reject', async () => {
  await hasCode(await fixture([template, question], [edge('refines', question.id, template.id)]), 'GRAPH_RELATION_TYPES');
  await hasCode(await fixture([template, decision], [edge('supersedes', decision.id, template.id)]), 'GRAPH_RELATION_TYPES');
  await hasCode(await fixture(['a', 'b', 'c'].map(req), [edge('supersedes', 'b', 'a'), edge('supersedes', 'c', 'a')]), 'GRAPH_SUPERSESSION_CONFLICT');
});

test('declared supersession is queryable but cannot retire or approve either artifact', async () => {
  const f = await fixture(['old', 'new'].map(req), [edge('supersedes', 'new', 'old')]);
  const before = copy(f);
  const g = await build(f);
  assert.equal(g.replacements('old')[0].from, 'new');
  assert.deepEqual(g.snapshot().artifacts.map(a => a.status), ['draft', 'draft']);
  assert.deepEqual(f, before);
});

test('validates requires QA design payloads targeting requirements; implements remains unsupported', async () => {
  await hasCode(await fixture([template, decision], [edge('validates', decision.id, template.id)]), 'GRAPH_RELATION_TYPES');
  await hasCode(await fixture([template, decision], [edge('implements', decision.id, template.id)]), 'GRAPH_UNSUPPORTED_RELATION_TYPES');
});

test('transitive impact follows reverse dependencies and forward blocks but excludes unrelated artifacts', async () => {
  const f = await fixture(['a', 'b', 'c', 'side'].map(req), [edge('depends-on', 'a', 'b'), edge('blocks', 'c', 'b'), edge('relates-to', 'side', 'c')]);
  const g = await build(f);
  assert.deepEqual(g.impact('c').nodes, [{artifactId: 'c', depth: 0}, {artifactId: 'b', depth: 1}, {artifactId: 'a', depth: 2}]);
  assert.deepEqual(ids(g.trace('a', {direction: 'outgoing', kinds: ['depends-on']})), ['a', 'b']);
});

test('transitive open questions and declared blockers retain supplied evidence scope', async () => {
  const f = await fixture([req('a'), req('b'), question], [edge('depends-on', 'a', 'b'), edge('blocks', question.id, 'b')]);
  const g = await build(f);
  assert.deepEqual(g.openQuestions('a').questions, [{artifactId: question.id, depth: 2, blocking: true}]);
  assert.equal(g.blockers('a').declaredBlocks[0].origin.kind, 'graph');
  const limited = g.blockers('a', 1);
  assert.equal(limited.truncated, true); assert.equal(limited.questions.length, 0);
});

test('resolved and nonblocking questions are not reported as blockers; contradictory blocks assertion rejects', async () => {
  const nonblocking = copy(question); nonblocking.content.blocking = false;
  const f = await fixture([template, nonblocking], [edge('depends-on', template.id, nonblocking.id)]);
  const g = await build(f);
  assert.equal(g.openQuestions(template.id).questions.length, 1);
  assert.equal(g.blockers(template.id).questions.length, 0);
  f.definition.assertions = [edge('blocks', nonblocking.id, template.id)];
  await hasCode(f, 'GRAPH_NONBLOCKING_QUESTION');
  const resolved = copy(question);
  resolved.provenance[0] = {actor: human, origin: 'human-authored', at: at(0), sourceRefs: []};
  resolved.content.resolution = {actor: human, at: at(0), answer: 'Synthetic answer'};
  const done = await build(await fixture([template, resolved], [edge('blocks', resolved.id, template.id)]));
  assert.equal(done.blockers(template.id).questions.length, 0);
  assert.equal(done.blockers(template.id).declaredBlocks.length, 0);
});

test('BFS distances, deduplication, ordering and truncation are truthful for diamonds', async () => {
  const f = await fixture(['a', 'b', 'c', 'd'].map(req), [edge('depends-on', 'a', 'b'), edge('depends-on', 'a', 'c'), edge('depends-on', 'b', 'd'), edge('depends-on', 'c', 'd')]);
  const g = await build(f);
  assert.deepEqual(g.trace('a').nodes, [{artifactId: 'a', depth: 0}, {artifactId: 'b', depth: 1}, {artifactId: 'c', depth: 1}, {artifactId: 'd', depth: 2}]);
  assert.equal(g.trace('a', {maxDepth: 1}).truncated, true);
  assert.equal(g.trace('a', {maxDepth: 2}).truncated, false);
  assert.deepEqual(ids(g.trace('a', {maxDepth: 0})), ['a']);
  assert.equal(g.trace('a', {maxDepth: 0}).truncated, true);
  assert.equal(g.trace('d', {maxDepth: 0}).truncated, false);
  assert.equal(g.trace('a', {kinds: []}).truncated, false);
});

test('queries reject unknown nodes and malformed options instead of returning empty success', async () => {
  const g = await build(await fixture([req('a')]));
  for (const fn of ['trace', 'neighbors', 'impact', 'openQuestions', 'blockers', 'replacements']) assert.throws(() => g[fn]('missing'), /GRAPH_UNKNOWN_NODE/);
  for (const opts of [null, {maxDepth: -1}, {maxDepth: 201}, {maxDepth: 1.5}, {direction: 'sideways'}, {kinds: ['unknown']}, {kinds: ['blocks', 'blocks']}, {extra: 1}, {maxDepth: null}, {kinds: null}]) assert.throws(() => g.trace('a', opts), /GRAPH_QUERY_OPTIONS/);
  assert.throws(() => g.neighbors('a', {maxDepth: 3}), /GRAPH_QUERY_OPTIONS/);
});

test('fingerprints and query outputs are deterministic across set input order', async () => {
  const f = await fixture(['a', 'b', 'c'].map(req), [edge('depends-on', 'a', 'b'), edge('relates-to', 'a', 'c')]);
  const a = await build(f);
  f.context.artifacts.reverse(); f.definition.nodes.reverse(); f.definition.assertions.reverse();
  const b = await build(f);
  assert.equal(a.definitionSha256, b.definitionSha256);
  assert.equal(a.snapshotSha256, b.snapshotSha256);
  assert.deepEqual(a.trace('a'), b.trace('a'));
});

test('snapshot fingerprint tracks lifecycle evidence even when definition and artifact subjects are unchanged', async () => {
  const a = req('a');
  const f = await fixture([a]);
  const first = await build(f);
  const pending = await reviewArtifact(a, {id: 'review', action: 'request-review', actor: human, at: at(1), subjectSha256: await artifactSubject(a)}, f.context);
  assert.equal(await artifactSubject(a), await artifactSubject(pending));
  f.context.artifacts = [pending];
  const second = await build(f);
  assert.equal(first.definitionSha256, second.definitionSha256);
  assert.notEqual(first.snapshotSha256, second.snapshotSha256);
});

test('views are immutable snapshots, not live mutable input arrays or exposed maps', async () => {
  const f = await fixture(['a', 'b'].map(req), [edge('depends-on', 'a', 'b')]);
  const pending = build(f);
  f.definition.assertions.length = 0; f.context.artifacts[0].title = 'mutation';
  const g = await pending;
  assert.equal(g.snapshot().edges.length, 1);
  const snap = g.snapshot(); snap.artifacts[0].title = 'output mutation'; snap.edges.length = 0;
  const trace = g.trace('a'); trace.nodes.length = 0; trace.edges[0].origin.provenance.actor.id = 'other';
  assert.deepEqual(ids(g.trace('a')), ['a', 'b']);
  assert.equal(g.snapshot().artifacts[0].title, 'Synthetic a');
  assert.equal(g.trace('a').edges[0].origin.provenance.actor.id, human.id);
  assert.equal(Object.isFrozen(g), true);
});

test('artifact edits require updated graph pins and assertion provenance cannot predate its targets', async () => {
  const old = req('a');
  const f = await fixture([old, req('b')], [edge('depends-on', 'b', 'a')]);
  const {id, ...change} = {id: old.id, type: old.type, content: old.content, title: 'Revised', relationships: [], projectRef: old.projectRef, ownerRole: old.ownerRole};
  const next = await reviseArtifact(old, change, {actor: human, origin: 'human-authored', at: at(20), sourceRefs: []});
  f.context.artifacts[0] = next;
  await hasCode(f, 'GRAPH_STALE_NODE');
  f.definition.nodes[0].revision = next.revision; f.definition.nodes[0].sha256 = await artifactSubject(next);
  await hasCode(f, 'GRAPH_ASSERTION_TIME');
  f.definition.assertions[0].provenance.at = at(21);
  assert.equal((await result(f)).valid, true);
});

test('migration supports only bound current-version graphs and does not infer missing assertions', async () => {
  const f = await fixture([req('a')]);
  const migrated = await migrateArtifactGraph(f.definition, f.context);
  assert.deepEqual(migrated.definition, f.definition);
  assert.notEqual(migrated.definition, f.definition);
  for (const value of [{...f.definition, schemaVersion: '0.1.0'}, {kind: 'SpecDDControlPlane'}, null]) {
    const r = await migrateArtifactGraph(value, f.context); assert.equal(r.definition, null); assert.ok(r.diagnostics.length);
  }
});

test('graph node/edge and JSON bounds reject without silently dropping inventory', async () => {
  const big = await fixture(Array.from({length: 201}, (_, i) => req(`n-${i}`)));
  await hasCode(big, 'SCHEMA_CONSTRAINT');
  const f = await fixture([req('a'), req('b')]);
  f.definition.assertions = Array.from({length: 1001}, (_, i) => edge('depends-on', 'a', 'b', `e-${i}`));
  await hasCode(f, 'SCHEMA_CONSTRAINT');
  f.definition.assertions = []; f.definition.extra = 'x'.repeat(2_000_001);
  await hasCode(f, 'GRAPH_INVALID_JSON');
});

test('effective edge limit counts embedded edges in addition to explicit assertions', async () => {
  const artifacts = Array.from({length: 47}, (_, i) => req(`n-${i}`));
  for (let i = 1; i < artifacts.length; i++) for (let j = 0; j < i; j++) {
    const target = artifacts[j];
    artifacts[i].relationships.push({kind: 'depends-on', target: {projectId: target.projectRef.id, artifactId: target.id, revision: 1, sha256: await artifactSubject(target)}});
  }
  await hasCode(await fixture(artifacts), 'GRAPH_EDGE_LIMIT');
});

test('invalid JSON context and impossible assertion dates fail closed', async () => {
  const f = await fixture(['a', 'b'].map(req), [edge('depends-on', 'a', 'b')]);
  f.definition.assertions[0].provenance.at = '2026-02-30T12:00:00.000Z';
  await hasCode(f, 'GRAPH_ASSERTION_TIME');
  const clean = await fixture([req('a')]); clean.context.project = null;
  await hasCode(clean, 'GRAPH_INVALID_CONTEXT');
  clean.definition.nodes[0].unexpected = undefined;
  await hasCode(clean, 'GRAPH_INVALID_JSON');
});
