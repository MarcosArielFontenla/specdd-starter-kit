import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {structuralValidator} from '../../project-model/dist/index.js';
import {artifactSchema, artifactSchemaV11, artifactSubject, createArtifact, fingerprint, validateArtifact,
  migrateArtifact, reviseArtifact, reviewArtifact, assertRevisionHistory} from '../dist/index.js';
import {createArtifactGraph} from '../dist/graph.js';
import {getBAWorkflow, resolveBACapability, prepareBAAction, acceptBAActionOutput,
  prepareBAApproval, approveBA, assertBAApproval, createBAImpactAnalysis, assertBAImpactBasis} from '../dist/ba.js';
import {generatePack} from '../../../specforge-kit/website/src/components/generators.js';
import {ROLE_SKILLS} from '../../../specforge-kit/website/src/components/roles.js';

const load = async p => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));
const project = await load('../../project-model/examples/minimal.project.json');
const requirement = await load('../examples/requirement.json');
const question = await load('../examples/question.json');
const decision = await load('../examples/decision.json');
const copy = x => structuredClone(x);
const human = {id: 'synthetic-ba', kind: 'human'}, agent = {id: 'synthetic-agent', kind: 'agent'};
const at = n => `2026-09-07T12:00:${String(n).padStart(2, '0')}.000Z`;
const contribution = (n, actor = human) => ({actor, origin: actor.kind === 'agent' ? 'agent-proposed' : 'human-authored', at: at(n), sourceRefs: []});
const ref = async a => ({artifactId: a.id, projectId: a.projectRef.id, revision: a.revision, sha256: await artifactSubject(a)});
const edge = (kind, from, to) => ({id: `${kind}.${from}.${to}`, kind, from, to, provenance: {actor: human, at: at(20), sourceRefs: ['synthetic-test']}});
async function fixture(artifacts = [copy(requirement)], assertions = []) {
  return {targetId: artifacts[0].id, graph: {schemaVersion: '1.0.0', kind: 'SpecForgeArtifactGraph',
    projectRef: copy(requirement.projectRef), nodes: await Promise.all(artifacts.map(ref)), assertions}, context: {project: copy(project), artifacts: copy(artifacts)}};
}
async function transition(a, action, n, other = []) {
  return reviewArtifact(a, {id: `event-${n}`, action, actor: human, at: at(n), subjectSha256: await artifactSubject(a)}, {project, artifacts: [a, ...other]});
}
async function approved(a) { return transition(await transition(a, 'request-review', 1), 'approve', 2); }
async function rule() {
  return createArtifact({id: 'rule-1', title: 'Synthetic rule', type: 'business-rule', ownerRole: 'ba',
    projectRef: requirement.projectRef, relationships: [], content: {statement: 'Proposed synthetic rule only', rationale: 'For regression tests'}}, contribution(0));
}
const baseSkills = Object.fromEntries(await Promise.all(ROLE_SKILLS.BA.map(async id => [id, await readFile(new URL(`../../../specforge-kit/skills/${id}.md`, import.meta.url), 'utf8')])));
const generated = generatePack(baseSkills, {roles: ['BA'], tools: ['Codex'], skillsByRole: {BA: ROLE_SKILLS.BA}}, '2026-09-07');
const capability = {pack: JSON.parse(generated.files['.agents/capabilities/role-ba/capability.json']), files: {
  ...generated.files, 'context/project.md': 'Explicit synthetic project context.', 'context/constitution.md': 'Synthetic: ask rather than invent.'},
  dependencies: [{id: 'specdd-harness', kind: 'harness', versionRange: '^1.0.0'}]};
const actionInput = async action => ({...await fixture(), action: action ?? 'analyze-requirement', runId: 'run-synthetic', capability: copy(capability)});
const emptyOutput = hash => ({schemaVersion: '1.0.0', requestSha256: hash, wording: null, ambiguities: [], questions: [], rules: [], criteria: []});
const exec = {actor: agent, at: at(30)};

test('BA payload version is additive; old snapshots, schema and migration remain exact', async () => {
  const r = await rule();
  assert.equal(r.schemaVersion, '1.1.0');
  assert.equal(validateArtifact(r).valid, true);
  assert.deepEqual(structuralValidator(artifactSchemaV11)(r), []);
  assert.ok(structuralValidator(artifactSchema)(r).length);
  assert.equal(await artifactSubject(requirement), '1cf9525e28f5e1da381aad6ead8286a8f7dc8cd2a604d42fecdc65b1ab6797fe');
  for (const a of [r, requirement]) assert.deepEqual((await migrateArtifact(a)).artifact, a);
  assert.equal((await migrateArtifact({...r, schemaVersion: '2.0.0'})).artifact, null);
  assert.equal(validateArtifact({...r, schemaVersion: '1.0.0'}).valid, false);
});

test('BA business rule schema rejects missing, extra, blank or wrong payload fields', async () => {
  const r = await rule();
  for (const content of [{statement: 'x'}, {statement: ' ', rationale: 'x'}, {statement: 'x', rationale: 'y', approved: true}, requirement.content]) {
    assert.equal(validateArtifact({...r, content}).valid, false);
  }
});

test('new rule lifecycle and revision history preserve version and invalidate old approval', async () => {
  const r = await approved(await rule());
  const updated = await reviseArtifact(r, {type: r.type, title: r.title, content: {...r.content, statement: 'Revised synthetic rule'},
    relationships: [], ownerRole: 'ba', projectRef: r.projectRef}, contribution(3));
  assert.equal(updated.status, 'draft'); assert.equal(updated.schemaVersion, '1.1.0');
  await assertRevisionHistory([r, updated]);
  await assert.rejects(assertRevisionHistory([r, {...updated, schemaVersion: '1.0.0'}]));
});

test('resolver consumes real generated BA pack and byte-exact playbooks without executing legacy commands', async () => {
  const resolved = await resolveBACapability(capability);
  const text = resolved.files.find(f => f.path.endsWith('/context-analysis.md'));
  assert.equal(text.content, baseSkills['context-analysis']);
  assert.equal(text.sha256, await fingerprint(baseSkills['context-analysis']));
  assert.deepEqual(resolved.missingOptionalContext, ['entity-specs']);
  assert.ok(!resolved.files.some(f => f.path.endsWith('/documentation.md') || f.path.includes('/subagents/')));
  assert.equal(resolved.workflow.actions.find(a => a.id === 'impact-analysis').executor, 'deterministic');
  const wf = getBAWorkflow(); wf.actions.length = 0;
  assert.equal(getBAWorkflow().actions.length, 4);
});

test('resolver fails on missing dependencies, required context, playbooks, eval and inactive/foreign packs', async () => {
  for (const mutate of [s => s.dependencies = [], s => s.dependencies[0].versionRange = '^2.0.0',
    s => delete s.files['context/constitution.md'], s => delete s.files['.agents/skills/role-ba/assets/context-analysis.md'],
    s => s.pack.playbooks = s.pack.playbooks.filter(p => p.id !== 'miro-collaboration'),
    s => s.pack.evals = [], s => s.pack.lifecycle = 'draft', s => s.pack.role.id = 'qa']) {
    const s = copy(capability); mutate(s); await assert.rejects(resolveBACapability(s));
  }
});

test('resolver rejects unsafe paths, blank content, duplicate attestations and non-JSON input', async () => {
  for (const path of ['../escape', 'C:/secrets', '/absolute', 'https://outside', 'a\\b']) {
    const s = copy(capability); s.pack.skills[0].path = path; s.files[path] = 'present';
    await assert.rejects(resolveBACapability(s));
  }
  const blank = copy(capability); blank.files['context/project.md'] = ' '; await assert.rejects(resolveBACapability(blank));
  const duplicate = copy(capability); duplicate.dependencies.push(copy(duplicate.dependencies[0])); await assert.rejects(resolveBACapability(duplicate), /BA_DEPENDENCY/);
  await assert.rejects(resolveBACapability({...capability, files: {...capability.files, extra: undefined}}), /NON_JSON/);
});

test('request hash binds action, run, full graph, canonical project and resolved knowledge', async () => {
  const i = await actionInput(); const original = await prepareBAAction(i);
  for (const mutate of [i => i.runId = 'run-other', i => i.action = 'refine-wording',
    i => i.capability.files['context/project.md'] += '\nMore context.',
    i => i.capability.files['.agents/skills/role-ba/assets/context-analysis.md'] += '\r\n',
    i => i.capability.pack.policies[0].statement += ' More.']) {
    const changed = copy(i); mutate(changed); assert.notEqual((await prepareBAAction(changed)).requestSha256, original.requestSha256);
  }
});

test('only bounded agent actions on current BA requirements are available', async () => {
  for (const action of ['impact-analysis', 'approve', 'prepare-spec', 'unknown']) await assert.rejects(prepareBAAction(await actionInput(action)), /BA_ACTION/);
  const i = await actionInput(); i.targetId = 'missing'; await assert.rejects(prepareBAAction(i), /BA_TARGET/);
  const other = {...await fixture([await rule()]), runId: 'run-1', action: 'analyze-requirement', capability};
  await assert.rejects(prepareBAAction(other), /BA_REQUIREMENT_REQUIRED/);
  const changed = copy(requirement); changed.ownerRole = 'qa';
  await assert.rejects(prepareBAAction({...await fixture([changed]), runId: 'run-1', action: 'analyze-requirement', capability}), /BA_TARGET/);
});

test('agent analysis yields separate proposed questions/rules/criteria, with host agent attribution', async () => {
  const i = await actionInput(); const before = copy(i); const p = await prepareBAAction(i);
  const output = emptyOutput(p.requestSha256);
  output.questions.push({id: 'q-suggestion', supportArtifactIds: [requirement.id], question: 'Who can cancel?', blocking: true});
  output.rules.push({id: 'rule-suggestion', supportArtifactIds: [requirement.id], statement: 'Rule candidate for review', rationale: 'Not a confirmed business fact'});
  output.criteria.push({id: 'criterion-suggestion', supportArtifactIds: [requirement.id], given: 'Agreed context', when: 'Agreed action', then: 'Agreed outcome'});
  const proposal = await acceptBAActionOutput(output, i, exec);
  assert.equal(proposal.status, 'proposed'); assert.equal(proposal.provenance.actor.kind, 'agent');
  assert.deepEqual(i, before); assert.equal(i.context.artifacts[0].status, 'draft');
});

test('agent cannot inject resolution, decision, approval, untyped output or human attribution', async () => {
  const i = await actionInput(), p = await prepareBAAction(i), base = emptyOutput(p.requestSha256);
  for (const extra of [{status: 'approved'}, {decision: 'invented'}, {actor: human}, {unexpected: true}]) await assert.rejects(acceptBAActionOutput({...base, ...extra}, i, exec), /BA_OUTPUT_SCHEMA/);
  const output = copy(base); output.questions = [{id: 'q', supportArtifactIds: [requirement.id], question: 'When?', blocking: true, resolution: 'Now'}];
  await assert.rejects(acceptBAActionOutput(output, i, exec), /BA_OUTPUT_SCHEMA/);
  await assert.rejects(acceptBAActionOutput(base, i, {actor: human, at: at(30)}), /BA_ACTOR/);
  await assert.rejects(acceptBAActionOutput(base, i, {actor: agent, at: '2026-02-30T12:00:00.000Z'}), /BA_TIME/);
});

test('action-specific outputs, existing sources and unique suggestion IDs are enforced', async () => {
  const i = await actionInput('suggest-acceptance-criteria'), p = await prepareBAAction(i);
  const o = emptyOutput(p.requestSha256);
  o.wording = {id: 'w', description: 'Rewrite', supportArtifactIds: [requirement.id]};
  await assert.rejects(acceptBAActionOutput(o, i, exec), /BA_OUTPUT_ACTION_SCOPE/);
  o.wording = null; o.questions = [{id: 'q', question: 'When?', blocking: true, supportArtifactIds: ['invented']}];
  await assert.rejects(acceptBAActionOutput(o, i, exec), /BA_OUTPUT_REFERENCE/);
  o.questions[0].supportArtifactIds = [requirement.id]; o.questions.push(copy(o.questions[0]));
  await assert.rejects(acceptBAActionOutput(o, i, exec), /BA_DUPLICATE_SUGGESTION/);
  o.questions.pop(); o.questions[0].supportArtifactIds = [requirement.id, requirement.id];
  await assert.rejects(acceptBAActionOutput(o, i, exec), /BA_DUPLICATE_SUPPORT/);
});

test('stale knowledge, graph lifecycle, project or request rejects agent output', async () => {
  const i = await actionInput(), p = await prepareBAAction(i), o = emptyOutput(p.requestSha256);
  const changed = copy(i); changed.capability.files['context/project.md'] += ' changed';
  await assert.rejects(acceptBAActionOutput(o, changed, exec), /BA_STALE_REQUEST/);
  const changedState = copy(i); changedState.context.artifacts[0] = await transition(requirement, 'request-review', 1);
  await assert.rejects(acceptBAActionOutput(o, changedState, exec), /BA_STALE_REQUEST/);
  const changedProject = copy(i); changedProject.context.project.metadata.name += ' changed';
  await assert.rejects(acceptBAActionOutput(o, changedProject, exec), /BINDING/);
  await assert.rejects(acceptBAActionOutput({...o, requestSha256: '0'.repeat(64)}, i, exec), /BA_STALE_REQUEST/);
});

test('async request and proposal creation use defensive snapshots', async () => {
  const i = await actionInput(); const promise = prepareBAAction(i); i.runId = 'mutated';
  const prepared = await promise; assert.equal(prepared.request.runId, 'run-synthetic');
  const current = await actionInput(); const o = emptyOutput(prepared.requestSha256);
  const accept = acceptBAActionOutput(o, current, exec); o.rules.push({invalid: true}); current.capability.files = {};
  const result = await accept; assert.equal(result.output.rules.length, 0);
});

test('BA approval and auditable receipt replay the exact existing journal transition', async () => {
  const f = await fixture([await transition(requirement, 'request-review', 1)]), before = copy(f);
  const p = await prepareBAApproval(f);
  const result = await approveBA(f, {subjectSha256: p.subjectSha256, actor: human, eventId: 'ba-approve', at: at(30)});
  assert.equal(result.artifact.status, 'approved'); assert.deepEqual(f, before);
  await assertBAApproval({...f, context: {...f.context, artifacts: [result.artifact]}}, result.receipt);
});

test('BA approval rejects agent, wrong subject, duplicate application and missing review', async () => {
  const f = await fixture([await transition(requirement, 'request-review', 1)]), p = await prepareBAApproval(f);
  const a = {subjectSha256: p.subjectSha256, actor: human, eventId: 'ba-approve', at: at(30)};
  await assert.rejects(approveBA(f, {...a, actor: agent}), /BA_ACTOR/);
  await assert.rejects(approveBA(f, {...a, subjectSha256: '0'.repeat(64)}), /BA_STALE_APPROVAL/);
  await assert.rejects(prepareBAApproval(await fixture()), /BA_UNDER_REVIEW_REQUIRED/);
  const result = await approveBA(f, a);
  await assert.rejects(approveBA({...f, context: {...f.context, artifacts: [result.artifact]}}, a), /BA_UNDER_REVIEW_REQUIRED/);
});

test('transitive question blocks BA approval through an approved decision', async () => {
  const req = await transition(requirement, 'request-review', 1), d = await approved(decision);
  const f = await fixture([req, d, question], [edge('depends-on', req.id, d.id), edge('depends-on', d.id, question.id)]);
  await assert.rejects(prepareBAApproval(f), /BA_BLOCKED/);
});

test('unapproved causal rules and decisions block, associations do not', async () => {
  const req = await transition(requirement, 'request-review', 1);
  for (const other of [await rule(), decision]) {
    const f = await fixture([req, other], [edge('depends-on', req.id, other.id)]);
    await assert.rejects(prepareBAApproval(f), /BA_DEPENDENCY_UNAPPROVED/);
    const related = await fixture([req, other], [edge('relates-to', req.id, other.id)]);
    assert.ok((await prepareBAApproval(related)).subjectSha256);
  }
});

test('declared blocks and superseded prerequisites reject approval', async () => {
  const req = await transition(requirement, 'request-review', 1), d = await approved(decision);
  await assert.rejects(prepareBAApproval(await fixture([req, d], [edge('blocks', d.id, req.id)])), /BA_BLOCKED/);
  const superseded = await transition(await transition(d, 'activate', 3), 'supersede', 4);
  await assert.rejects(prepareBAApproval(await fixture([req, superseded], [edge('depends-on', req.id, d.id)])), /BA_DEPENDENCY_SUPERSEDED/);
});

test('human-resolved question plus approved rule permit reviewed requirement; no fabricated resolution', async () => {
  const q = await reviseArtifact(question, {type: 'open-question', title: question.title, ownerRole: 'ba', projectRef: question.projectRef,
    relationships: [], content: {...question.content, resolution: {answer: 'Synthetic answer supplied by fixture human', actor: human, at: at(3)}}}, {...contribution(3), origin: 'human-edited-agent-proposal'});
  const req = await transition(requirement, 'request-review', 4), r = await approved(await rule());
  const f = await fixture([req, r, q], [edge('depends-on', req.id, r.id), edge('blocks', q.id, req.id)]);
  const p = await prepareBAApproval(f);
  const approvedResult = await approveBA(f, {subjectSha256: p.subjectSha256, actor: human, eventId: 'ba-approve', at: at(30)});
  await assertBAApproval({...f, context: {...f.context, artifacts: [approvedResult.artifact, r, q]}}, approvedResult.receipt);
});

test('receipt detects context drift, lifecycle changes and tampered fields including actor and prior hash', async () => {
  const req = await transition(requirement, 'request-review', 1), r = await approved(await rule());
  const f = await fixture([req, r], [edge('depends-on', req.id, r.id)]), p = await prepareBAApproval(f);
  const result = await approveBA(f, {subjectSha256: p.subjectSha256, actor: human, eventId: 'ba-approve', at: at(30)});
  const current = {...f, context: {...f.context, artifacts: [result.artifact, r]}};
  for (const changes of [{beforeArtifactSha256: '0'.repeat(64)}, {actor: agent}, {eventId: 'other'}, {extra: true}, {at: at(31)}, {targetId: r.id}]) {
    await assert.rejects(assertBAApproval(current, {...result.receipt, ...changes}));
  }
  const changed = copy(current); changed.context.artifacts[1] = await transition(r, 'activate', 31);
  await assert.rejects(assertBAApproval(changed, result.receipt), /BA_STALE_RECEIPT/);
  const graphChanged = copy(current); graphChanged.graph.assertions = [];
  await assert.rejects(assertBAApproval(graphChanged, result.receipt), /BA_STALE_RECEIPT/);
});

test('approval subject binds graph assertions independently of artifact subject', async () => {
  const req = await transition(requirement, 'request-review', 1), r = await approved(await rule());
  const f = await fixture([req, r]), p = await prepareBAApproval(f);
  f.graph.assertions.push(edge('depends-on', req.id, r.id));
  await assert.rejects(approveBA(f, {subjectSha256: p.subjectSha256, actor: human, eventId: 'ba-approve', at: at(30)}), /BA_STALE_APPROVAL/);
});

test('impact artifact is deterministic, revision-pinned and explicitly limited to supplied graph', async () => {
  const r = await rule(), f = await fixture([r, requirement], [edge('depends-on', requirement.id, r.id)]);
  const m = {id: 'impact-1', title: 'Synthetic impact', at: at(30)};
  const a = await createBAImpactAnalysis(f, m);
  assert.equal(a.schemaVersion, '1.1.0'); assert.equal(a.type, 'impact-analysis');
  assert.equal(a.provenance[0].actor.kind, 'system'); assert.equal(a.status, 'draft');
  assert.deepEqual(a.content.affected, [await ref(requirement)]);
  assert.equal(a.content.scope, 'provided-context-only');
  assert.deepEqual(await createBAImpactAnalysis(f, m), a);
  await assertBAImpactBasis(a, f.graph, f.context);
  const updated = copy(a); updated.content.affected = [];
  await assert.rejects(assertBAImpactBasis(updated, f.graph, f.context), /BA_IMPACT_BASIS/);
  const g = copy(f.graph); g.assertions = [];
  await assert.rejects(assertBAImpactBasis(a, g, f.context), /BA_IMPACT_BASIS/);
});

test('impact rejects duplicate/foreign refs, collision IDs, future inputs and wrong artifact type', async () => {
  const f = await fixture(), a = await createBAImpactAnalysis(f, {id: 'impact-1', title: 'Impact', at: at(30)});
  const bad = copy(a); bad.content.affected = [copy(a.content.root)]; assert.equal(validateArtifact(bad).valid, false);
  bad.content.affected = [{...a.content.root, artifactId: 'other', projectId: 'foreign'}]; assert.equal(validateArtifact(bad).valid, false);
  await assert.rejects(createBAImpactAnalysis(f, {id: requirement.id, title: 'Impact', at: at(30)}), /BA_IMPACT_ID/);
  await assert.rejects(createBAImpactAnalysis(f, {id: 'impact-1', title: 'Impact', at: '2025-01-01T00:00:00.000Z'}), /BA_TIME/);
  await assert.rejects(assertBAImpactBasis(requirement, f.graph, f.context), /BA_IMPACT_TYPE/);
});

test('new BA types participate in Phase 2 graph without enabling unsupported QA/Dev relations', async () => {
  const r = await rule(), f = await fixture([r, requirement], [edge('depends-on', requirement.id, r.id)]);
  const graph = await createArtifactGraph(f.graph, f.context);
  assert.deepEqual(graph.impact(r.id).nodes.map(n => n.artifactId), [r.id, requirement.id]);
  f.graph.assertions[0].kind = 'implements';
  await assert.rejects(createArtifactGraph(f.graph, f.context), /GRAPH_UNSUPPORTED_RELATION_TYPES/);
});

test('approval, analysis output and impact cannot predate graph assertion evidence', async () => {
  const req = await transition(requirement, 'request-review', 1), r = await approved(await rule());
  const f = await fixture([req, r], [edge('depends-on', req.id, r.id)]), p = await prepareBAApproval(f);
  await assert.rejects(approveBA(f, {subjectSha256: p.subjectSha256, actor: human, eventId: 'ba-approve', at: at(10)}), /BA_TIME/);
  await assert.rejects(createBAImpactAnalysis(f, {id: 'impact-1', title: 'Impact', at: at(10)}), /BA_TIME/);
  const i = {...f, action: 'analyze-requirement', runId: 'run-1', capability};
  const request = await prepareBAAction(i);
  await assert.rejects(acceptBAActionOutput(emptyOutput(request.requestSha256), i, {actor: agent, at: at(10)}), /BA_TIME/);
});

test('approval preparation rejects missing criteria and unresolved nonblocking question itself', async () => {
  const req = copy(requirement); req.content.acceptanceCriteria = [];
  await assert.rejects(prepareBAApproval(await fixture([await transition(req, 'request-review', 1)])), /BA_CRITERIA_REQUIRED/);
  const q = copy(question); q.content.blocking = false;
  await assert.rejects(prepareBAApproval(await fixture([await transition(q, 'request-review', 1)])), /BA_QUESTION_OPEN/);
});

test('refinement output is a suggestion only and never overwrites an approved source', async () => {
  const req = await approved(requirement), f = await fixture([req]);
  const i = {...f, action: 'refine-wording', runId: 'run-refine', capability}, p = await prepareBAAction(i);
  const output = emptyOutput(p.requestSha256);
  output.wording = {id: 'wording-1', description: 'A proposed clearer wording.', supportArtifactIds: [req.id]};
  const result = await acceptBAActionOutput(output, i, exec);
  assert.equal(result.status, 'proposed'); assert.deepEqual(i.context.artifacts[0], req);
});

test('published BA business rule example is valid draft with retained agent origin', async () => {
  const a = await load('../examples/business-rule.json');
  assert.equal(validateArtifact(a).valid, true);
  assert.deepEqual((await migrateArtifact(a)).artifact, a);
  assert.equal(a.status, 'draft'); assert.equal(a.provenance[0].origin, 'agent-proposed');
});

test('project capability bindings cannot be bypassed; unregistered input confers no execution authority', async () => {
  const detached = await prepareBAAction(await actionInput());
  assert.equal(detached.request.projectCapabilityBinding, null);
  assert.equal(detached.request.executionAuthorized, false);
  for (const mode of ['valid', 'disabled', 'version', 'source']) {
    const i = await actionInput();
    const binding = {id: 'role-ba', source: '.agents/capabilities/role-ba/capability.json', version: '1.0.0', enabled: true};
    if (mode === 'disabled') binding.enabled = false;
    if (mode === 'version') binding.version = '9.0.0';
    if (mode === 'source') binding.source = '.agents/capabilities/role-ba/missing.json';
    i.context.project.capabilities = [binding];
    const hash = await fingerprint(i.context.project);
    i.context.artifacts[0].projectRef.definitionSha256 = hash;
    i.graph.projectRef.definitionSha256 = hash;
    i.graph.nodes = await Promise.all(i.context.artifacts.map(ref));
    if (mode === 'valid') assert.deepEqual((await prepareBAAction(i)).request.projectCapabilityBinding, binding);
    else await assert.rejects(prepareBAAction(i), /BA_PROJECT_CAPABILITY_BINDING/);
  }
});
