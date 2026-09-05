import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile, symlink, readdir, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { structuralValidator } from '@specdd/project-model';
import { localResult, classificationResult } from '@specdd/eval-adapters';
import { assertEvent, assertGraphBinding, controlPlaneFingerprint, evalResultTelemetry, summarizeRun, MAX_EVENT_BYTES, MAX_RUN_BYTES } from '../dist/index.js';
import { writeRun, readRun, listRuns, parseRun, encodeRun, readBoundedFile } from '../dist/store.js';

const json = async relative => JSON.parse(await readFile(new URL(relative, import.meta.url), 'utf8'));
const control = await json('../../control-plane-model/examples/feature-delivery.control-plane.json');
const definition = await json('../../eval-adapters/examples/documentation.eval.json');
control.evalGates[0].evalRef = definition.id;
const fingerprint = controlPlaneFingerprint(control);
const evidence = { sha256: 'a'.repeat(64), bytes: 10 };
const at = i => new Date(Date.UTC(2026, 8, 4, 12, 0, i)).toISOString();
const binding = { runId: 'synthetic-001', workflowRef: 'feature-delivery', graphRef: 'feature-delivery-graph', controlPlaneSha256: fingerprint,
  inputRef: 'fixture:synthetic', nodeRef: null, agentRef: null, capabilityRefs: [], runtime: 'fixture-runtime', model: null, harnessRef: null };
function fixture() {
  const events = [];
  const add = (event, data, context = {}) => {
    const index = events.length;
    events.push({ ...structuredClone(binding), ...context, schemaVersion: '1.0.0', kind: 'SpecDDRunEvent', id: 'event-' + index,
      timestamp: at(index), source: { adapter: 'synthetic-fixture', eventId: 'event-' + index }, event, data: structuredClone(data) });
  };
  const planner = { nodeRef: 'specify', agentRef: 'planner', capabilityRefs: ['role-ba'], harnessRef: 'project-harness', model: 'fixture-model' };
  const developer = { nodeRef: 'implement', agentRef: 'developer', capabilityRefs: ['role-dev'], harnessRef: 'project-harness', model: 'fixture-model' };
  add('workflow.started', {});
  add('agent.run.started', { attempt: 1 }, planner);
  add('agent.run.completed', { attempt: 1 }, planner);
  add('approval.requested', { requestId: 'request-1', approvalRef: 'spec-approval', evidence }, { nodeRef: 'approve-spec' });
  add('approval.granted', { requestId: 'request-1', approvalRef: 'spec-approval', actorRef: 'fixture-human', evidence }, { nodeRef: 'approve-spec' });
  add('agent.run.started', { attempt: 1 }, developer);
  add('agent.run.failed', { attempt: 1, code: 'test-failed' }, developer);
  add('agent.run.started', { attempt: 2 }, developer);
  add('agent.run.completed', { attempt: 2 }, developer);
  add('eval.started', { attempt: 1, evalRef: definition.id }, { nodeRef: 'review' });
  const result = localResult(definition, { runId: binding.runId, inputRef: binding.inputRef, observedAt: at(10) },
    { exitCode: 0, signal: null, timedOut: false, launchError: null, stdout: 'SYNTHETIC TEST DATA, NOT LIVE EVIDENCE', stderr: '' }, { passLabel: 'passed', failLabel: 'failed' });
  add('eval.completed', { attempt: 1, result }, { nodeRef: 'review' });
  add('artifact.created', { artifactRef: 'review-evidence', path: 'artifacts/review.json', evidence }, { nodeRef: 'record-evidence' });
  add('workflow.completed', { status: 'success' });
  return events;
}
const temp = async t => { const path = await mkdtemp(join(tmpdir(), 'specdd-history-')); t.after(() => rm(path, { recursive: true, force: true })); return path; };

test('published schema, types and graph binding cover a synthetic full trace with retry', async () => {
  const schema = await json('../schema/event.schema.json');
  const resultSchema = await json('../../eval-adapters/schema/result.schema.json');
  const validate = structuralValidator(schema, [resultSchema]);
  for (const event of fixture()) assert.deepEqual(validate(event), []);
  assertGraphBinding(fixture(), control);
  const summary = summarizeRun(fixture());
  assert.equal(summary.coverage, 'observed-lifecycle');
  assert.equal(summary.reportedStatus, 'success');
  assert.equal(summary.durationMs, 12000);
  assert.equal(summary.failures.length, 1);
  assert.equal(summary.operations.length, 5);
  assert.equal(summary.evals[0].score, 1);
  assert.deepEqual(summary.models, ['fixture-model']);
  assert.equal(summary.approvals.length, 2);
  assert.equal(summary.artifacts.length, 1);
});
test('unknown nested fields and unsupported events fail closed', () => {
  for (const mutate of [e => e.rawLog = 'secret', e => e.source.token = 'secret', e => e.data.extra = 1, e => e.event = 'benchmark.completed', e => e.capabilityRefs = ['x', 'x']]) {
    const e = fixture()[0]; mutate(e); assert.throws(() => assertEvent(e));
  }
});
test('malformed timestamps, calendar overflow and excessive event sizes reject', () => {
  for (const value of ['2026-02-30T00:00:00.000Z', 'yesterday', '2026-09-04', '2026-09-04T00:00:00.000+00:00']) {
    assert.throws(() => assertEvent({ ...fixture()[0], timestamp: value }));
  }
  assert.throws(() => assertEvent({ ...fixture()[0], model: 'a'.repeat(MAX_EVENT_BYTES) }));
});
test('run identity and event/source IDs cannot be replayed or mixed', () => {
  for (const key of ['runId', 'workflowRef', 'graphRef', 'inputRef', 'controlPlaneSha256']) {
    const events = fixture(); events[1][key] = key === 'controlPlaneSha256' ? 'b'.repeat(64) : 'different';
    assert.throws(() => summarizeRun(events), /identity/);
  }
  const duplicate = fixture(); duplicate[1].id = duplicate[0].id;
  assert.throws(() => summarizeRun(duplicate), /Duplicate/);
  const replay = fixture(); replay[1].source = replay[0].source;
  assert.throws(() => summarizeRun(replay), /Duplicate/);
});
test('reversed order, duplicate terminal operations and post-terminal events reject', () => {
  const reversed = fixture(); reversed[2].timestamp = at(0);
  assert.throws(() => summarizeRun(reversed), /chronological/);
  const duplicate = fixture(); duplicate[8].data.attempt = 1;
  assert.throws(() => summarizeRun(duplicate), /completed operation/);
  const after = fixture(); after.push({ ...structuredClone(after[1]), id: 'later', timestamp: at(20), source: { adapter: 'fixture', eventId: 'later' } });
  assert.throws(() => summarizeRun(after), /after workflow/);
});
test('partial trace never manufactures workflow success, duration or approvals', () => {
  const event = fixture()[10];
  const summary = summarizeRun([event]);
  assert.equal(summary.reportedStatus, 'unknown');
  assert.equal(summary.coverage, 'partial');
  assert.equal(summary.durationMs, null);
  assert.equal(summary.operations[0].durationMs, null);
  assert.deepEqual(summary.approvals, []);
  assert.equal(summary.gaps.length, 3);
});
test('incomplete running traces and orphan human decisions remain explicitly partial', () => {
  const summary = summarizeRun(fixture().slice(0, 2));
  assert.equal(summary.reportedStatus, 'running');
  assert.equal(summary.operations[0].endEventId, null);
  const orphan = summarizeRun([fixture()[4]]);
  assert.equal(orphan.coverage, 'partial');
  assert.ok(orphan.gaps.some(g => g.includes('request')));
});
test('approvals bind the decision to the exact observed subject hash and actor', () => {
  const changed = fixture(); changed[4].data.evidence.sha256 = 'b'.repeat(64);
  assert.throws(() => summarizeRun(changed), /subject evidence/);
  const missing = fixture()[4]; delete missing.data.actorRef;
  assert.throws(() => assertEvent(missing));
  const empty = fixture()[3]; empty.data.evidence.bytes = 0;
  assert.throws(() => assertEvent(empty), /nonempty/);
});
test('missing identities cannot be upgraded into observed agents or models', () => {
  assert.throws(() => assertEvent({ ...fixture()[1], agentRef: null }), /Agent reference/);
  assert.throws(() => assertEvent({ ...fixture()[1], nodeRef: null }), /Node reference/);
  const changed = fixture(); changed[2].model = 'different';
  assert.throws(() => summarizeRun(changed), /execution identity/);
});
test('eval run, input, timestamp and unscored error consistency are enforced', () => {
  for (const key of ['runId', 'inputRef', 'observedAt']) {
    const e = fixture()[10]; e.data.result[key] = key === 'observedAt' ? at(11) : 'different';
    assert.throws(() => assertEvent(e));
  }
  const e = fixture()[10]; e.data.result.outcome = 'error';
  assert.throws(() => assertEvent(e));
});
test('graph, role, eval, artifact and control-definition mismatches reject', () => {
  for (const mutate of [
    e => e[1].nodeRef = 'unknown', e => e[1].agentRef = 'developer', e => e[1].capabilityRefs = [],
    e => e[9].data.evalRef = 'different', e => e[11].data.path = 'different.json',
    e => e.forEach(item => item.controlPlaneSha256 = 'b'.repeat(64)),
  ]) { const events = fixture(); mutate(events); assert.throws(() => assertGraphBinding(events, control)); }
});
test('unsafe artifact paths reject without dereferencing them', () => {
  for (const path of ['../secret', '/etc/passwd', 'C:/secret', 'a\\b', 'a//b', './foo']) {
    const e = fixture()[11]; e.data.path = path; assert.throws(() => assertEvent(e), /path/);
  }
});
test('eval adapter normalizes local and externally imported classification results without raw logs', () => {
  const observation = { result: fixture()[10].data.result, startedAt: at(9), attempt: 1, eventId: 'normalized' };
  const context = { ...binding, nodeRef: 'review' };
  const events = evalResultTelemetry.normalize(observation, context);
  assert.equal(summarizeRun(events).operations[0].durationMs, 1000);
  assert.equal(summarizeRun(events).coverage, 'partial');
  assert.ok(!JSON.stringify(events).includes('SYNTHETIC TEST DATA'));
  observation.result.score = 0;
  assert.equal(events[1].data.result.score, 1);
  const classification = { ...definition, method: 'classification' };
  const external = classificationResult(classification, { runId: binding.runId, inputRef: binding.inputRef, observedAt: at(10) }, 'failed', 'synthetic external observation', 'external-fixture');
  const imported = evalResultTelemetry.normalize({ result: external, startedAt: null, attempt: 1, eventId: 'external' }, context);
  assert.equal(summarizeRun(imported).failures.length, 1);
  assert.equal(summarizeRun(imported).operations[0].durationMs, null);
});
test('fingerprints ignore object key order but preserve semantic definition changes', () => {
  assert.equal(controlPlaneFingerprint(Object.fromEntries(Object.entries(control).reverse())), fingerprint);
  const changed = structuredClone(control); changed.metadata.description += '!';
  assert.notEqual(controlPlaneFingerprint(changed), fingerprint);
});
test('JSONL round trip is deterministic and bounded; truncated/blank/bad lines reject', () => {
  assert.equal(encodeRun(parseRun(encodeRun(fixture()))), encodeRun(fixture()));
  for (const text of ['', '{}', '{}\n\n', 'no json\n', ' '.repeat(MAX_RUN_BYTES + 1)]) assert.throws(() => parseRun(text));
});
test('create-only publication, read back, list and collision leave original bytes intact', async t => {
  const root = await temp(t);
  const path = await writeRun(root, fixture(), control);
  const before = await readFile(path, 'utf8');
  assert.equal(encodeRun(await readRun(root, binding.runId, control)), before);
  assert.equal((await listRuns(root))[0].eventCount, 13);
  await assert.rejects(writeRun(root, fixture(), control), { code: 'EEXIST' });
  assert.equal(await readFile(path, 'utf8'), before);
  assert.deepEqual(await readdir(root), ['run-synthetic-001.jsonl']);
});
test('concurrent publication has exactly one winner, with no partial target or temp files', async t => {
  const root = await temp(t);
  const results = await Promise.allSettled([writeRun(root, fixture(), control), writeRun(root, fixture(), control)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await readRun(root, binding.runId)).length, 13);
  assert.equal((await readdir(root)).length, 1);
});
test('path traversal, filename mismatch and corrupt history fail without silent skipping', async t => {
  const root = await temp(t);
  await assert.rejects(readRun(root, '../escape'));
  await writeFile(join(root, 'run-other.jsonl'), encodeRun(fixture()));
  await assert.rejects(listRuns(root), /Filename/);
});
test('symlinked output directory or history file is rejected', async t => {
  const root = await temp(t);
  const actual = join(root, 'actual'); await mkdir(actual);
  const linked = join(root, 'linked'); await symlink(actual, linked, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(writeRun(linked, fixture(), control), /Symbolic/);
  await assert.rejects(readBoundedFile(linked), /Symbolic/);
});
test('read-only CLI lists an existing export without modifying it', async t => {
  const root = await temp(t);
  await writeRun(root, fixture(), control);
  const result = spawnSync(process.execPath, ['scripts/history.mjs', 'list', root], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout)[0].runId, binding.runId);
  assert.equal((await readdir(root)).length, 1);
});

test('failed and cancelled workflow assertions remain failures, not successes', () => {
  for (const status of ['failed', 'cancelled']) {
    const events = fixture(); events[12].data.status = status;
    const summary = summarizeRun(events);
    assert.equal(summary.reportedStatus, status);
    assert.equal(summary.failures.length, 2);
  }
});

test('reviewed live example preserves partial coverage and actual eval timing', async () => {
  const events = parseRun(await readFile(new URL('../examples/run-phase7-local-001.jsonl', import.meta.url), 'utf8'));
  const summary = summarizeRun(events);
  assert.equal(summary.runId, 'phase7-local-001');
  assert.equal(summary.coverage, 'partial');
  assert.equal(summary.reportedStatus, 'unknown');
  assert.equal(summary.operations[0].durationMs, 459);
  assert.equal(summary.evals[0].outcome, 'pass');
  assert.equal(summary.evals[0].evidence.bytes, 1206);
});
test('timeout eval observations retain null scores and explicit failure evidence', () => {
  const result = localResult(definition, { runId: binding.runId, inputRef: binding.inputRef, observedAt: at(10) },
    { exitCode: null, signal: 'SIGTERM', timedOut: true, launchError: null, stdout: '', stderr: '' }, { passLabel: 'passed', failLabel: 'failed' });
  const events = evalResultTelemetry.normalize({ result, startedAt: at(9), attempt: 1, eventId: 'timeout' }, { ...binding, nodeRef: 'review' });
  assert.equal(summarizeRun(events).evals[0].score, null);
  assert.equal(summarizeRun(events).failures.length, 1);
});
test('approval hash comparison does not depend on JSON property order', () => {
  const events = fixture(); events[4].data.evidence = { bytes: 10, sha256: 'a'.repeat(64) };
  assert.equal(summarizeRun(events).coverage, 'observed-lifecycle');
});
test('oversized regular files and malformed stored traces fail on read', async t => {
  const root = await temp(t);
  const path = join(root, 'run-synthetic-001.jsonl');
  await writeFile(path, 'x'.repeat(MAX_RUN_BYTES + 1));
  await assert.rejects(readRun(root, binding.runId), /bounded/);
  await writeFile(path, '{"incomplete":');
  await assert.rejects(readRun(root, binding.runId), /truncated/);
});
test('real local host records passing/failing tests and refuses a duplicate export', async t => {
  const root = await temp(t);
  const controlPath = join(root, 'control.json'); await writeFile(controlPath, JSON.stringify(control));
  const evalPath = fileURLToPath(new URL('../../eval-adapters/examples/documentation.eval.json', import.meta.url));
  const host = fileURLToPath(new URL('../scripts/record-local-eval.mjs', import.meta.url));
  for (const [name, exit] of [['passing', 0], ['failing', 1]]) {
    const testPath = fileURLToPath(new URL('../../eval-adapters/test/fixtures/' + name + '.mjs', import.meta.url));
    const output = join(root, name);
    const args = [host, evalPath, testPath, controlPath, 'feature-delivery', 'review', 'fixture:real-process', name, output, 'passed', 'failed'];
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, timeout: 10000 });
    assert.equal(result.status, exit, result.stderr);
    const summary = JSON.parse(result.stdout).summary;
    assert.equal(summary.coverage, 'partial');
    assert.equal(summary.evals[0].outcome, name === 'passing' ? 'pass' : 'fail');
    assert.ok(summary.operations[0].durationMs >= 0);
    const before = await readFile(join(output, 'run-' + name + '.jsonl'), 'utf8');
    const duplicate = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, timeout: 10000 });
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /already exists/);
    assert.equal(await readFile(join(output, 'run-' + name + '.jsonl'), 'utf8'), before);
  }
});
