import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROLES, TOOLS, ROLE_SKILLS, ROLE_META, roleSlug, commandsFor, stepsFor, errorFor } from './roles.js';

test('every kit skill belongs to exactly one role', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const skillsDir = join(here, '..', '..', '..', 'skills');
  const onDisk = readdirSync(skillsDir).filter((f) => extname(f) === '.md').map((f) => basename(f, '.md')).sort();
  const mapped = ROLES.flatMap((r) => ROLE_SKILLS[r]);
  assert.equal(new Set(mapped).size, mapped.length, 'no skill appears twice');
  assert.deepEqual([...mapped].sort(), onDisk);
});

test('role meta is complete', () => {
  for (const r of ROLES) {
    assert.ok(ROLE_META[r].title && ROLE_META[r].scope && ROLE_META[r].verification);
    assert.ok(ROLE_META[r].must.length >= 3 && ROLE_META[r].never.length >= 2);
  }
  assert.equal(roleSlug('BA'), 'role-ba');
  assert.equal(TOOLS.length, 5);
});

test('commandsFor applies QA/UX conditionals', () => {
  assert.ok(!commandsFor('QA', { qa: { approach: 'manual' } }).includes('specforge-playwright'));
  assert.ok(commandsFor('QA', { qa: { approach: 'automated' } }).includes('specforge-playwright'));
  assert.ok(!commandsFor('UX', { ux: { figmaEnabled: false } }).includes('specforge-setupfigmamcp'));
  assert.ok(commandsFor('UX', { ux: { figmaEnabled: true } }).includes('specforge-setupfigmamcp'));
  assert.ok(commandsFor('Dev', {}).includes('specforge-implement'));
});

test('steps include Role Options only when QA or UX selected', () => {
  assert.deepEqual(stepsFor({ roles: ['Dev'] }), ['Welcome', 'Target Project', 'Roles', 'Skills', 'Tools', 'Preview / Download']);
  assert.deepEqual(stepsFor({ roles: ['Dev', 'QA'] }), ['Welcome', 'Target Project', 'Roles', 'Role Options', 'Skills', 'Tools', 'Preview / Download']);
});

test('validation: at least one role and one tool', () => {
  assert.match(errorFor('Roles', { roles: [] }), /at least one role/i);
  assert.equal(errorFor('Roles', { roles: ['BA'] }), '');
  assert.match(errorFor('Tools', { tools: [] }), /at least one tool/i);
  assert.equal(errorFor('Tools', { tools: ['GitHub Copilot'] }), '');
  assert.equal(errorFor('Welcome', {}), '');
});
