import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

test('published schema rejects unknown nested role fields', async () => {
  const value = JSON.parse(await readFile(new URL('../examples/minimal.capability.json', import.meta.url), 'utf8'));
  value.role.vendor = 'warp';
  assert.equal(validateCapabilityPack(value).valid, false);
});
import { fileURLToPath } from 'node:url';

import {
  createCapabilityPackFromRoleDescriptor,
  isCapabilityPack,
  migrateLegacyRolePack,
  validateCapabilityPack,
} from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const readJson = async (path) => JSON.parse(await readFile(resolve(here, path), 'utf8'));

const role = {
  role: {
    id: 'qa',
    title: 'Quality Analyst',
    scope: 'Test design and validation.',
    must: ['Derive tests from acceptance criteria'],
    never: ['Fabricate results'],
    verification: 'Acceptance checks pass.',
  },
  selectedPlaybooks: ['test-case-generation'],
  commands: ['specforge-testcases', 'specforge-validate'],
};

test('minimal and representative examples validate', async () => {
  for (const name of ['minimal.capability.json', 'qa.capability.json']) {
    const pack = await readJson(`../examples/${name}`);
    assert.deepEqual(validateCapabilityPack(pack), { valid: true, diagnostics: [] }, name);
    assert.equal(isCapabilityPack(pack), true);
  }
});

test('schema is JSON Schema 2020-12 and requires every capability section', async () => {
  const schema = await readJson('../schema/capability-pack.schema.json');
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.properties.schemaVersion.const, '1.0.0');
  for (const key of ['role', 'skills', 'playbooks', 'workflows', 'policies', 'evals', 'context', 'subagents', 'routing']) {
    assert.ok(schema.required.includes(key), key);
  }
});

test('role descriptor maps to a self-contained active Capability Pack', () => {
  const pack = createCapabilityPackFromRoleDescriptor(role);
  assert.deepEqual(validateCapabilityPack(pack), { valid: true, diagnostics: [] });
  assert.equal(pack.metadata.id, 'role-qa');
  assert.equal(pack.lifecycle, 'active');
  assert.deepEqual(pack.playbooks.map(({ id }) => id), ['test-case-generation']);
  assert.deepEqual(pack.workflows.map(({ id }) => id), ['specforge-testcases', 'specforge-validate']);
  assert.ok(pack.policies.some(({ effect }) => effect === 'require'));
  assert.ok(pack.policies.some(({ effect }) => effect === 'forbid'));
  assert.equal(pack.subagents[0].status, 'inactive');
  assert.equal(pack.routing[0].skillRef, 'role-qa');
});

test('legacy Role Pack migration is draft and explicitly inferred', () => {
  const result = migrateLegacyRolePack(role);
  assert.ok(result.pack);
  assert.equal(result.pack.lifecycle, 'draft');
  assert.ok(result.diagnostics.some(({ code, severity }) => code === 'INFERRED_LEGACY_ROLE_PACK' && severity === 'warning'));
  assert.equal(result.diagnostics.some(({ severity }) => severity === 'error'), false);
});

test('validator rejects broken references, duplicate IDs and unsafe paths', () => {
  const pack = createCapabilityPackFromRoleDescriptor(role);
  pack.skills.push({ ...pack.skills[0] });
  pack.playbooks[0].skillRef = 'missing';
  pack.workflows[0].contextRefs = ['missing'];
  pack.routing[0].workflowRoot = '../escape';
  const result = validateCapabilityPack(pack);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some(({ code }) => code === 'CAPABILITY_DUPLICATE_ID'));
  assert.ok(result.diagnostics.filter(({ code }) => code === 'CAPABILITY_UNKNOWN_REFERENCE').length >= 2);
  assert.ok(result.diagnostics.some(({ code }) => code === 'CAPABILITY_INVALID_PATH'));
});

test('validator keeps subagents inactive and rejects capability self-dependency', () => {
  const pack = createCapabilityPackFromRoleDescriptor(role);
  pack.subagents[0].status = 'active';
  pack.dependencies.push({ id: 'role-qa', kind: 'capability', versionRange: '^1.0.0', required: true });
  const result = validateCapabilityPack(pack);
  assert.ok(result.diagnostics.some(({ code }) => code === 'CAPABILITY_SUBAGENT_ACTIVE'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'CAPABILITY_SELF_DEPENDENCY'));
});

test('schema, types source and examples contain no Warp-specific contract state', async () => {
  const texts = await Promise.all([
    readFile(resolve(here, '../schema/capability-pack.schema.json'), 'utf8'),
    readFile(resolve(here, '../src/types.ts'), 'utf8'),
    readFile(resolve(here, '../examples/qa.capability.json'), 'utf8'),
  ]);
  assert.equal(/warp|factory\.yaml|foreman|scorer/i.test(texts.join('\n')), false);
});
