import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Server } from 'node:http';
import { startRehearsal } from '../scripts/rehearsal.mjs';
import { promoteRehearsal, inspectPromotion } from '../scripts/promotion.mjs';

async function setup() {
  const parent = await mkdtemp(join(tmpdir(), 'specdd-promotion-test-'));
  const pause = await startRehearsal(parent, 'test-run');
  const decision = { kind: 'SpecDDLocalPromotionDecision', schemaVersion: '1.0.0', runId: pause.runId, decision: 'approved',
    subjectSha256: pause.subjectSha256, artifactSha256: pause.artifactSha256, destinationRef: 'slot-b', environmentClass: 'local-rehearsal',
    actorRef: 'synthetic-test-reviewer', recordedAt: new Date().toISOString(), origin: 'operator-recorded-human-decision',
    message: 'SYNTHETIC TEST ONLY: not an actual human decision or permission for the real pilot.' };
  return { parent, pause, decision, dir: join(parent, pause.runId) };
}
test('synthetic decision exercises real same-byte local promotion, eval and canonical full history', async () => {
  const { parent, pause, decision, dir } = await setup();
  const originalPause = await readFile(join(dir, 'paused.json'));
  const originalHistory = await readFile(join(dir, 'history/run-test-run.jsonl'));
  const result = await promoteRehearsal(parent, pause.runId, decision);
  assert.equal(result.status, 'success'); assert.equal(result.postDeploy, 'pass'); assert.equal(result.serverRunning, false);
  assert.deepEqual(await readFile(join(dir, 'build/index.html')), await readFile(result.physicalDestination));
  assert.deepEqual(await readFile(join(dir, 'paused.json')), originalPause);
  assert.deepEqual(await readFile(join(dir, 'history/run-test-run.jsonl')), originalHistory);
  assert.deepEqual(await inspectPromotion(parent, pause.runId), result);
  const history = (await readFile(join(dir, 'promotion/history/run-test-run.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(history.filter(e => e.event === 'approval.granted').length, 1);
  assert.equal(history.at(-1).data.status, 'success');
});
for (const [name, edit] of [
  ['missing approval', () => null], ['rejected decision', d => ({ ...d, decision: 'rejected' })],
  ['wrong run', d => ({ ...d, runId: 'another' })], ['wrong subject', d => ({ ...d, subjectSha256: '0'.repeat(64) })],
  ['wrong artifact', d => ({ ...d, artifactSha256: '0'.repeat(64) })], ['remote destination', d => ({ ...d, destinationRef: 'cloud' })],
  ['production class', d => ({ ...d, environmentClass: 'production' })], ['extra approval boolean', d => ({ ...d, approved: true })],
  ['missing actor', d => ({ ...d, actorRef: '' })], ['old decision', d => ({ ...d, recordedAt: '2000-01-01T00:00:00.000Z' })],
  ['future decision', d => ({ ...d, recordedAt: '2999-01-01T00:00:00.000Z' })],
]) test(`${name} cannot materialize a promotion directory`, async () => {
  const { parent, pause, decision, dir } = await setup();
  await assert.rejects(promoteRehearsal(parent, pause.runId, edit(decision)), /approval/);
  assert.ok(!(await readdir(dir)).includes('promotion'));
});
test('changed approved artifact fails before creating the second slot', async () => {
  const { parent, pause, decision, dir } = await setup();
  await writeFile(join(dir, 'build/index.html'), 'changed after approval');
  await assert.rejects(promoteRehearsal(parent, pause.runId, decision), /Stale/);
  assert.ok(!(await readdir(dir)).includes('promotion'));
});
test('successful promotion cannot replay and partial claim cannot resume', async () => {
  const first = await setup();
  await promoteRehearsal(first.parent, first.pause.runId, first.decision);
  const before = await readFile(join(first.dir, 'promotion/completed.json'));
  await assert.rejects(promoteRehearsal(first.parent, first.pause.runId, first.decision), /EEXIST/);
  assert.deepEqual(await readFile(join(first.dir, 'promotion/completed.json')), before);
  const partial = await setup(); await mkdir(join(partial.dir, 'promotion'));
  await assert.rejects(promoteRehearsal(partial.parent, partial.pause.runId, partial.decision), /EEXIST/);
});
test('concurrent dispatch has exactly one exclusive winner', async () => {
  const { parent, pause, decision } = await setup();
  const results = await Promise.allSettled([promoteRehearsal(parent, pause.runId, decision), promoteRehearsal(parent, pause.runId, decision)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected').length, 1);
});
test('post-deploy error records deployed-unhealthy, retains bytes and cannot retry', async t => {
  const { parent, pause, decision, dir } = await setup();
  t.mock.method(Server.prototype, 'listen', function () {
    queueMicrotask(() => this.emit('error', new Error('Synthetic post-deploy bind failure'))); return this;
  });
  const result = await promoteRehearsal(parent, pause.runId, decision);
  assert.equal(result.status, 'deployed-unhealthy'); assert.equal(result.materialized, true); assert.equal(result.postDeploy, 'error');
  assert.deepEqual(await readFile(join(dir, 'build/index.html')), await readFile(result.physicalDestination));
  await assert.rejects(promoteRehearsal(parent, pause.runId, decision), /EEXIST/);
});
for (const path of ['promotion/slot-b/index.html', 'promotion/decision.json', 'delivery/evidence/post-deploy-eval.json', 'promotion/history/run-test-run.jsonl']) {
  test(`status detects drift in ${path}`, async () => {
    const { parent, pause, decision, dir } = await setup();
    await promoteRehearsal(parent, pause.runId, decision);
    await writeFile(join(dir, path), 'mutated test evidence');
    await assert.rejects(inspectPromotion(parent, pause.runId), /Stale/);
  });
}
test('linked continuation cannot redirect writes', async () => {
  const { parent, pause, decision, dir } = await setup();
  const target = await mkdtemp(join(tmpdir(), 'specdd-promotion-link-'));
  await symlink(target, join(dir, 'promotion'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(promoteRehearsal(parent, pause.runId, decision), /EEXIST/);
  assert.deepEqual(await readdir(target), []);
});
