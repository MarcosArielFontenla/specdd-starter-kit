import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, symlink, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { get, Server } from 'node:http';
import { spawnSync } from 'node:child_process';
import { startRehearsal, inspectRehearsal, smokeFile } from '../scripts/rehearsal.mjs';

// Owned test evidence is retained in OS temp; no user files or approval decisions are used.
const temporary = () => mkdtemp(join(tmpdir(), 'specdd-delivery-test-'));
const digest = text => createHash('sha256').update(text).digest('hex');
test('actual local materialization, canonical history and smoke stop before approval', async () => {
  const parent = await temporary();
  const result = await startRehearsal(parent, 'positive');
  assert.equal(result.status, 'awaiting-human-approval');
  assert.equal(result.promotionEnabled, false);
  assert.equal(result.environmentClass, 'local-rehearsal');
  const root = join(parent, 'positive');
  assert.equal(await readFile(join(root, 'build/index.html'), 'utf8'), await readFile(join(root, 'slot-a/index.html'), 'utf8'));
  assert.ok(!(await readdir(root)).includes('slot-b'));
  const smoke = JSON.parse(await readFile(join(root, 'delivery/evidence/smoke-observation.json')));
  assert.equal(smoke.status, 200); assert.equal(smoke.serverClosed, true);
  assert.equal(smoke.responseSha256, result.artifactSha256);
  assert.deepEqual(await inspectRehearsal(parent, 'positive'), result);
});
test('successful run cannot be restarted or silently overwrite artifacts', async () => {
  const parent = await temporary(); await startRehearsal(parent, 'replay');
  const before = await readFile(join(parent, 'replay/paused.json'));
  await assert.rejects(startRehearsal(parent, 'replay'), /EEXIST/);
  assert.deepEqual(await readFile(join(parent, 'replay/paused.json')), before);
});
for (const path of ['build/index.html', 'slot-a/index.html', 'delivery/definition.json', 'delivery/evidence/smoke.json', 'delivery/evidence/smoke-eval.json', 'delivery/approval-request.json']) {
  test(`status rejects changed ${path}`, async () => {
    const parent = await temporary(); await startRehearsal(parent, 'drift');
    await writeFile(join(parent, 'drift', path), 'changed test evidence');
    await assert.rejects(inspectRehearsal(parent, 'drift'), /Stale/);
  });
}
test('failed HTTP digest check is a real failure and closes its endpoint', async () => {
  const parent = await temporary(); const path = join(parent, 'index.html');
  await writeFile(path, 'wrong artifact');
  const result = await smokeFile(path, digest('expected artifact'));
  assert.equal(result.status, 200); assert.equal(result.passed, false); assert.equal(result.serverClosed, true);
  await new Promise((accept, reject) => {
    const request = get({ host: '127.0.0.1', port: result.port, agent: false }, response => { response.resume(); reject(new Error('Endpoint still running')); });
    request.on('error', accept); request.setTimeout(1000, () => request.destroy());
  });
});
test('oversized fixture refused without serving', async () => {
  const parent = await temporary(); const path = join(parent, 'large.html');
  await writeFile(path, 'x'.repeat(65537));
  await assert.rejects(smokeFile(path, digest('x')), /size limit/);
});
test('HTTP smoke preserves BOM bytes rather than silently normalizing the artifact', async () => {
  const parent = await temporary(); const path = join(parent, 'bom.html');
  const content = '\uFEFFfixture'; await writeFile(path, content);
  const result = await smokeFile(path, digest(content));
  assert.equal(result.passed, true); assert.equal(result.responseBytes, Buffer.byteLength(content));
});
test('smoke infrastructure failure stops the run without a promotion subject', async t => {
  const parent = await temporary();
  // Synthetic bind failure; unlike the positive pilot this is not an actual HTTP observation.
  t.mock.method(Server.prototype, 'listen', function () {
    queueMicrotask(() => this.emit('error', new Error('Synthetic bind failure'))); return this;
  });
  await assert.rejects(startRehearsal(parent, 'failed-smoke'), /Failed smoke/);
  const root = join(parent, 'failed-smoke');
  const entries = await readdir(root);
  assert.ok(entries.includes('failure.json')); assert.ok(!entries.includes('paused.json')); assert.ok(!entries.includes('slot-b'));
  const smoke = JSON.parse(await readFile(join(root, 'delivery/evidence/smoke.json')));
  assert.equal(smoke.outcome, 'failed');
  const evalResult = JSON.parse(await readFile(join(root, 'delivery/evidence/smoke-eval.json')));
  assert.equal(evalResult.outcome, 'error'); assert.equal(evalResult.score, null);
  const history = (await readFile(join(root, 'history/run-failed-smoke.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(history.at(-1).data.status, 'failed');
  assert.ok(!(await readdir(join(root, 'delivery/evidence'))).includes('promotion-subject.json'));
  await assert.rejects(inspectRehearsal(parent, 'failed-smoke'), /Failed/);
});
test('unsafe run IDs refused before creating a run', async () => {
  const parent = await temporary();
  for (const id of ['../outside', 'a/b', 'a\\b', 'C:escape', 'con', '', 'x'.repeat(61)]) await assert.rejects(startRehearsal(parent, id), /Unsafe/);
  assert.deepEqual(await readdir(parent), []);
});
test('partial existing run fails closed without overwriting', async () => {
  const parent = await temporary(); await mkdir(join(parent, 'partial'));
  await assert.rejects(startRehearsal(parent, 'partial'), /EEXIST/);
  await assert.rejects(inspectRehearsal(parent, 'partial'), /ENOENT/);
});
test('junction output parent rejected', async () => {
  const parent = await temporary(); const target = await temporary();
  await symlink(target, join(parent, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(startRehearsal(join(parent, 'link'), 'unsafe'), /junction/);
  assert.deepEqual(await readdir(target), []);
});
test('unexpected promotion materialization invalidates the paused run', async () => {
  const parent = await temporary(); await startRehearsal(parent, 'conflict');
  await mkdir(join(parent, 'conflict/slot-b'));
  await assert.rejects(inspectRehearsal(parent, 'conflict'), /conflicting/);
});
test('CLI has no approval/promotion switch and rejects extra options', () => {
  for (const args of [['promote', 'pilot'], ['start', 'pilot', '--approve']]) {
    const result = spawnSync(process.execPath, ['scripts/rehearse.mjs', ...args], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 1); assert.match(result.stderr, /No promotion command/);
  }
});
