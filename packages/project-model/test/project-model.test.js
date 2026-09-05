import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  createLegacyCompilationContext,
  createProjectDefinitionFromWizardInput,
  isProjectDefinition,
  migrateScaffoldManifest,
  toHarnessV1Input,
  validateProjectDefinition,
} from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const readJson = async (path) => JSON.parse(await readFile(resolve(here, path), 'utf8'));

test('published schema rejects nested unknown fields and wrong types', async () => {
  for (const mutate of [
    value => { value.metadata.vendor = 'warp'; },
    value => { value.metadata.labels = 42; },
    value => { value.project.personas = 42; },
    value => { value.provenance.migratedFrom = 42; },
  ]) {
    const value = await readJson('../examples/minimal.project.json');
    mutate(value);
    assert.equal(validateProjectDefinition(value).valid, false);
  }
});

const wizardInput = {
  scenario: 'greenfield',
  analysisDepth: 'structural',
  analysis: null,
  existingPaths: [],
  legacyAck: false,
  contextReview: null,
  project: { name: 'Acme Shop', description: 'Commerce', problem: 'Manual orders' },
  personas: ['Buyer'],
  outcomes: { user: 'Fast checkout', business: 'Fewer abandoned carts' },
  constraints: { business: 'Pilot in Q4', technical: 'Node 20+' },
  domains: ['Orders'],
  entities: ['Order'],
  features: ['Order audit'],
  architecture: ['Modular monolith'],
  stack: { languages: ['TypeScript'], frontend: 'React', backend: 'Node.js', testing: 'Node test', database: 'PostgreSQL', infra: 'Docker', swagger: true, a11y: true },
  principles: ['Specifications are the source of truth'],
  mcp: ['postgresql'],
  tools: ['Codex'],
  model: 'team-default',
  security: { classification: 'internal', owaspControls: ['A01 Broken Access Control'] },
};

test('minimal and full examples satisfy canonical validation', async () => {
  for (const name of ['minimal.project.json', 'full.project.json']) {
    const document = await readJson(`../examples/${name}`);
    assert.deepEqual(validateProjectDefinition(document), { valid: true, diagnostics: [] }, name);
    assert.equal(isProjectDefinition(document), true);
  }
});

test('schema is versioned JSON Schema 2020-12 and covers every canonical section', async () => {
  const schema = await readJson('../schema/project-definition.schema.json');
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.properties.schemaVersion.const, '1.0.0');
  assert.deepEqual(schema.required, [
    'schemaVersion', 'kind', 'metadata', 'project', 'architecture', 'harness',
    'capabilities', 'specs', 'workflows', 'evals', 'policies', 'telemetry',
    'deployment', 'runtime', 'provenance',
  ]);
});

test('validation emits stable diagnostics for version, unknown fields, IDs and references', () => {
  const definition = createProjectDefinitionFromWizardInput(wizardInput);
  definition.schemaVersion = '2.0.0';
  definition.metadata.id = 'Not Safe';
  definition.project.domains.push({ id: 'orders', name: 'Duplicate' });
  definition.project.features[0].domainRefs = ['missing-domain'];
  definition.workflows[0].capabilityRefs = ['missing-capability'];
  definition.unknown = true;
  const result = validateProjectDefinition(definition);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some(({ code, path }) => code === 'UNKNOWN_PROPERTY' && path === '/unknown'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'UNSUPPORTED_SCHEMA_VERSION'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'INVALID_ID'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'DUPLICATE_ID'));
  assert.ok(result.diagnostics.filter(({ code }) => code === 'UNKNOWN_REFERENCE').length >= 2);
});

test('Harness v1 validation requires at least one domain', () => {
  const definition = createProjectDefinitionFromWizardInput({ ...wizardInput, domains: [] });
  const result = validateProjectDefinition(definition);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some(({ code, path }) => code === 'DOMAIN_REQUIRED' && path === '/project/domains'));
});

test('brownfield review is explicit and greenfield cannot carry an approved review', () => {
  const brownfield = createProjectDefinitionFromWizardInput({ ...wizardInput, scenario: 'brownfield', contextReview: null });
  assert.equal(brownfield.project.contextReview.status, 'pending');
  assert.equal(validateProjectDefinition(brownfield).valid, true);

  const greenfield = createProjectDefinitionFromWizardInput(wizardInput);
  greenfield.project.contextReview = { required: true, status: 'approved', findings: [] };
  const result = validateProjectDefinition(greenfield);
  assert.ok(result.diagnostics.some(({ code }) => code === 'GREENFIELD_REVIEW_STATE'));
});

test('wizard input round-trips through the canonical model into the same Harness v1 input', () => {
  const definition = createProjectDefinitionFromWizardInput(wizardInput);
  const projected = toHarnessV1Input(definition, createLegacyCompilationContext(wizardInput));
  assert.deepEqual(projected, wizardInput);
});

test('brownfield compilation requires evidence context', () => {
  const definition = createProjectDefinitionFromWizardInput({ ...wizardInput, scenario: 'brownfield', contextReview: { approved: true } });
  assert.throws(() => toHarnessV1Input(definition), /requires contextReview/);
});

test('schema 2 receipt migration preserves representable intent and receipt metadata', () => {
  const manifest = {
    schemaVersion: 2,
    scenario: 'brownfield',
    contextReview: {
      approved: true,
      statuses: { domains: [{ value: 'Orders', selected: true, status: 'implemented' }] },
    },
    selected: {
      domains: ['Orders'], entities: ['Order'], features: ['Order audit'],
      architecture: ['Modular monolith'],
      stack: { languages: ['TypeScript'], backend: 'Node.js', infra: 'Docker', swagger: true },
    },
    generatedFiles: [
      'AGENTS.md', '.agents/skills/orders/SKILL.md', '.agents/specs/order.spec.yaml',
      '.agents/evals/rubrics/orders.yaml', '.agents/workflows/spec-first-feature.md',
      '.agents/workflows/spec-converge.md', 'specs/features-spec.md',
    ],
    skippedPaths: ['README.md'],
    replacedPaths: ['AGENTS.md'],
    fidelity: { fingerprintAlgorithm: 'fnv1a32-utf8', source: { pathFingerprint: 'abc123' } },
  };
  const result = migrateScaffoldManifest(manifest, { project: { id: 'acme-orders', name: 'Acme Orders' } });
  assert.ok(result.definition);
  assert.equal(result.definition.project.contextReview.status, 'approved');
  assert.deepEqual(result.definition.project.domains.map(({ name }) => name), ['Orders']);
  assert.equal(result.definition.provenance.receipt.fingerprintAlgorithm, 'fnv1a32-utf8');
  assert.ok(result.diagnostics.some(({ code, severity }) => code === 'MIGRATION_LOSSY_SOURCE' && severity === 'warning'));
  assert.equal(result.diagnostics.some(({ severity }) => severity === 'error'), false);
});

test('schema 1 receipt remains importable', () => {
  const result = migrateScaffoldManifest({
    schemaVersion: 1,
    scenario: 'greenfield',
    selected: { domains: ['Core'], entities: [], features: [], architecture: [], stack: {} },
    generatedFiles: ['AGENTS.md', '.agents/skills/core/SKILL.md'],
    skippedPaths: [], replacedPaths: [],
  }, { project: { id: 'legacy-project', name: 'Legacy Project' } });
  assert.ok(result.definition);
  assert.equal(result.definition.provenance.migratedFrom.schemaVersion, 1);
});

test('migration rejects missing identity and unsupported receipt versions without inventing data', () => {
  const manifest = { schemaVersion: 99, selected: {}, generatedFiles: [] };
  const result = migrateScaffoldManifest(manifest);
  assert.equal(result.definition, null);
  assert.ok(result.diagnostics.some(({ code }) => code === 'MIGRATION_UNSUPPORTED_VERSION'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'MIGRATION_PROJECT_ID_REQUIRED'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'MIGRATION_PROJECT_NAME_REQUIRED'));
});

test('canonical schema and examples contain no Warp-specific state', async () => {
  const texts = await Promise.all([
    readFile(resolve(here, '../schema/project-definition.schema.json'), 'utf8'),
    readFile(resolve(here, '../examples/minimal.project.json'), 'utf8'),
    readFile(resolve(here, '../examples/full.project.json'), 'utf8'),
  ]);
  assert.equal(/warp|factory\.yaml|foreman|scorer/i.test(texts.join('\n')), false);
});
