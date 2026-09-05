import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepare } from './prepare.mjs';

test('preparation generates real contracts without claiming a live run and refuses overwrite', async t => {
  const parent = await mkdtemp(join(tmpdir(), 'specdd-phase5-test-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const destination = join(parent, 'pilot');
  const result = await prepare(destination);
  assert.equal(result.status, 'prepared-not-executed');
  for (const path of ['AGENTS.md', '.agents/REGISTRY.md', '.agents/capabilities/role-ba/capability.json', 'control/definition.json']) {
    assert.ok(result.files.some(item => item.path === path && /^[a-f0-9]{64}$/.test(item.sha256)));
  }
  const before = await readFile(join(destination, 'preparation.json'), 'utf8');
  await assert.rejects(prepare(destination), { code: 'EEXIST' });
  assert.equal(await readFile(join(destination, 'preparation.json'), 'utf8'), before);
  assert.equal(result.files.some(item => item.path === 'artifacts/draft-pr.json'), false);
});
