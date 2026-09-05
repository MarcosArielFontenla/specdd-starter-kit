import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

test('adversarial node kinds return diagnostics without throwing', async () => {
  for (const kind of ['constructor', '__proto__', 'toString', null, 42]) {
    const value = JSON.parse(await readFile(new URL('../examples/feature-delivery.control-plane.json', import.meta.url), 'utf8'));
    value.graphs[0].nodes[0].kind = kind;
    assert.equal(validateControlPlaneDefinition(value).valid, false);
  }
});
import { fileURLToPath } from 'node:url';

import {
  createControlGraph,
  createControlPlaneDefinition,
  createPolicyRule,
  isControlPlaneDefinition,
  validateControlPlaneDefinition,
} from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const readJson = async (path) => JSON.parse(await readFile(resolve(here, path), 'utf8'));
const full = async () => readJson('../examples/feature-delivery.control-plane.json');

test('minimal and feature-delivery examples validate', async () => {
  for (const name of ['minimal.control-plane.json', 'feature-delivery.control-plane.json']) {
    const definition = await readJson(`../examples/${name}`);
    assert.deepEqual(validateControlPlaneDefinition(definition), { valid: true, diagnostics: [] }, name);
    assert.equal(isControlPlaneDefinition(definition), true);
  }
});

test('aggregate, graph and policy schemas are versioned JSON Schema 2020-12 contracts', async () => {
  const [aggregate, graph, policy] = await Promise.all([
    readJson('../schema/control-plane.schema.json'),
    readJson('../schema/graph.schema.json'),
    readJson('../schema/policy.schema.json'),
  ]);
  assert.equal(aggregate.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(aggregate.properties.schemaVersion.const, '1.0.0');
  assert.equal(aggregate.properties.graphs.items.$ref, 'graph.schema.json');
  assert.equal(aggregate.properties.policies.items.$ref, 'policy.schema.json');
  assert.equal(graph.$schema, aggregate.$schema);
  assert.equal(policy.$schema, aggregate.$schema);
});

test('factories preserve typed canonical content without aliasing inputs', async () => {
  const example = await full();
  const { schemaVersion, kind, ...source } = example;
  const definition = createControlPlaneDefinition(source);
  const graph = createControlGraph(example.graphs[0]);
  const policy = createPolicyRule(example.policies[0]);
  assert.equal(schemaVersion, '1.0.0');
  assert.equal(kind, 'SpecDDControlPlane');
  assert.equal(validateControlPlaneDefinition(definition).valid, true);
  graph.name = 'Changed clone';
  policy.action = 'changed-clone';
  assert.notEqual(example.graphs[0].name, graph.name);
  assert.notEqual(example.policies[0].action, policy.action);
});

test('validator resolves typed nodes and all internal contract references', async () => {
  const definition = await full();
  definition.graphs[0].nodes[0].kind = 'approval';
  definition.graphs[0].nodes[0].approvalRef = 'missing-approval';
  const result = validateControlPlaneDefinition(definition);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some(({ code, path }) => code === 'CONTROL_UNKNOWN_PROPERTY' && path.endsWith('/agentRoleRef')));
  assert.ok(result.diagnostics.some(({ code, path }) => code === 'CONTROL_UNKNOWN_REFERENCE' && path.endsWith('/approvalRef')));
});

test('validator rejects cycles, unreachable nodes and outgoing terminal routes', async () => {
  const definition = await full();
  definition.graphs[0].edges.push({ id: 'cycle-back', from: 'record-evidence', to: 'specify', on: 'always' });
  definition.graphs[0].nodes.push({
    id: 'orphan', name: 'Orphan', kind: 'agent', agentRoleRef: 'planner',
    inputArtifactRefs: [], outputArtifactRefs: [], policyRefs: [],
  });
  const result = validateControlPlaneDefinition(definition);
  assert.ok(result.diagnostics.some(({ code }) => code === 'CONTROL_GRAPH_CYCLE'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'CONTROL_UNREACHABLE_NODE'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'CONTROL_TERMINAL_HAS_OUTGOING'));
});

test('edge outcomes must match the source node kind', async () => {
  const definition = await full();
  definition.graphs[0].edges[1].on = 'success';
  const result = validateControlPlaneDefinition(definition);
  assert.ok(result.diagnostics.some(({ code }) => code === 'CONTROL_INVALID_EDGE_OUTCOME'));
});

test('failure routes stay inside their graph and route targets must resolve', async () => {
  const definition = await full();
  definition.failureRoutes[1].graphRef = 'missing-graph';
  definition.failureRoutes[1].targetNodeRef = 'missing-node';
  const result = validateControlPlaneDefinition(definition);
  assert.ok(result.diagnostics.some(({ code }) => code === 'CONTROL_FAILURE_ROUTE_GRAPH_MISMATCH'));
  assert.ok(result.diagnostics.filter(({ code }) => code === 'CONTROL_UNKNOWN_REFERENCE').length >= 2);
});

test('approvals remain human and retries remain finite with valid backoff', async () => {
  const definition = await full();
  definition.approvals[0].mode = 'automatic';
  definition.retries[0].maxAttempts = 0;
  definition.retries[0].backoff.strategy = 'none';
  definition.retries[0].backoff.initialDelaySeconds = 1;
  const result = validateControlPlaneDefinition(definition);
  assert.ok(result.diagnostics.some(({ code }) => code === 'CONTROL_APPROVAL_NOT_HUMAN'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'CONTROL_INVALID_RETRY_ATTEMPTS'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'CONTROL_INVALID_BACKOFF_NONE'));
});

test('paths, extensions, trigger shape and unknown properties fail closed', async () => {
  const definition = await full();
  definition.project.source = '../outside.json';
  definition.metadata.extensions = { unscoped: true };
  definition.workflows[0].triggers[0].event = 'should-not-exist';
  definition.runtimeHints[0].vendor = 'hidden-runtime';
  const result = validateControlPlaneDefinition(definition);
  assert.ok(result.diagnostics.some(({ code }) => code === 'CONTROL_INVALID_PATH'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'CONTROL_UNNAMESPACED_EXTENSION'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'CONTROL_MANUAL_TRIGGER_EVENT'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'CONTROL_UNKNOWN_PROPERTY'));
});

test('canonical schemas, types and examples contain no Warp-specific state', async () => {
  const texts = await Promise.all([
    readFile(resolve(here, '../schema/control-plane.schema.json'), 'utf8'),
    readFile(resolve(here, '../schema/graph.schema.json'), 'utf8'),
    readFile(resolve(here, '../schema/policy.schema.json'), 'utf8'),
    readFile(resolve(here, '../src/types.ts'), 'utf8'),
    readFile(resolve(here, '../examples/feature-delivery.control-plane.json'), 'utf8'),
  ]);
  assert.equal(/warp|factory\.yaml|foreman|scorer/i.test(texts.join('\n')), false);
});
