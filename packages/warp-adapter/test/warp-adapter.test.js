import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  compileWarpFactory,
  isWarpAdapterConfig,
  validateWarpAdapterConfig,
} from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const readText = (path) => readFile(resolve(here, path), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));
const fixture = async () => ({
  source: await readJson('../examples/issue-to-draft-pr.control-plane.json'),
  config: await readJson('../examples/warp-adapter.config.json'),
});

test('rejects malformed exclusive execution fields in defaults and agent bindings', async () => {
  for (const execution of [{ model: 42, harness: { type: 'codex' } }, { model: 'auto', harness: 42 }, { model: 42 }, { model: '' }, { harness: 42 }, { model: undefined }]) {
    for (const location of ['defaults', 'binding']) {
      const { source, config } = await fixture();
      if (location === 'defaults') config.agentDefaults = execution;
      else config.agentBindings[0].execution = execution;
      assert.equal(validateWarpAdapterConfig(config).valid, false);
      assert.deepEqual(compileWarpFactory(source, config).files, {});
    }
  }
});

test('rejects disabled referenced Harness and capability independently', async () => {
  for (const collection of ['harnesses', 'capabilityBindings']) {
    const { source, config } = await fixture();
    source[collection][0].enabled = false;
    const result = compileWarpFactory(source, config);
    assert.equal(result.valid, false);
    assert.deepEqual(result.files, {});
    assert.ok(result.diagnostics.some(item => item.code === 'WARP_DISABLED_BINDING'));
  }
});

test('instructions preserve complete canonical contracts, including retry parameters', async () => {
  const { source, config } = await fixture();
  const before = compileWarpFactory(source, config);
  source.retries[0].maxAttempts += 1;
  const after = compileWarpFactory(source, config);
  assert.equal(after.valid, true);
  assert.notEqual(before.files['agents/specdd-foreman/agent.md'], after.files['agents/specdd-foreman/agent.md']);
  const contracts = JSON.parse(after.files['agents/specdd-foreman/agent.md'].split('```json\n')[1].split('\n```')[0]);
  for (const key of ['retries', 'failureRoutes', 'artifactContracts', 'policies', 'approvals', 'evalGates', 'runtimeHints']) {
    assert.deepEqual(contracts[key], source[key]);
  }
});

test('representative source and adapter configuration compile successfully', async () => {
  const { source, config } = await fixture();
  assert.deepEqual(validateWarpAdapterConfig(config), { valid: true, diagnostics: [] });
  assert.equal(isWarpAdapterConfig(config), true);
  const result = compileWarpFactory(source, config);
  assert.equal(result.valid, true);
  assert.deepEqual(Object.keys(result.files), [
    'agents/developer/agent.md',
    'agents/planner/agent.md',
    'agents/reviewer/agent.md',
    'agents/specdd-foreman/agent.md',
    'automations/issue-to-draft-pr/automation.md',
    'factory.yaml',
  ]);
  assert.equal(result.report.externalWritesPerformed, false);
  assert.equal(result.report.automationsEnabled, false);
});

test('checked-in Factory example and unsupported report are byte-identical compiler output', async () => {
  const { source, config } = await fixture();
  const result = compileWarpFactory(source, config);
  for (const [path, actual] of Object.entries(result.files)) {
    assert.equal(actual, await readText(`../examples/generated-factory/${path}`), path);
  }
  assert.equal(result.reportMarkdown, await readText('../examples/unsupported-features.md'));
});

test('compilation is deterministic and emits exactly one foreman', async () => {
  const { source, config } = await fixture();
  const first = compileWarpFactory(source, config);
  const second = compileWarpFactory(structuredClone(source), structuredClone(config));
  assert.deepEqual(second, first);
  const agentFiles = Object.entries(first.files).filter(([path]) => path.startsWith('agents/'));
  assert.equal(agentFiles.filter(([, content]) => content.includes('agentType: FOREMAN')).length, 1);
  assert.ok(first.files['agents/specdd-foreman/agent.md'].includes('not a canonical SpecDD agent role'));
});

test('event bindings are explicit and generated automations remain disabled', async () => {
  const { source, config } = await fixture();
  const result = compileWarpFactory(source, config);
  const automation = result.files['automations/issue-to-draft-pr/automation.md'];
  assert.match(automation, /enabled: false/);
  assert.match(automation, /provider: github/);
  assert.match(automation, /event: "issue_created"/);
  assert.doesNotMatch(Object.keys(result.files).join('\n'), /scorers\//);
});

test('required evals stop in foreman instructions and are reported, never converted to scorers', async () => {
  const { source, config } = await fixture();
  const result = compileWarpFactory(source, config);
  assert.match(result.files['agents/specdd-foreman/agent.md'], /STOP for canonical eval/);
  assert.ok(result.report.unsupportedFeatures.some(({ code, deferredTo }) => code === 'WARP_EVAL_GATE_UNSUPPORTED' && deferredTo.includes('Phase 6')));
  assert.ok(result.diagnostics.some(({ code, severity }) => code === 'WARP_EVAL_GATE_UNSUPPORTED' && severity === 'warning'));
});

test('runtime policies, approvals, retries, failures, artifacts and hints report non-equivalence', async () => {
  const { source, config } = await fixture();
  const codes = new Set(compileWarpFactory(source, config).report.unsupportedFeatures.map(({ code }) => code));
  for (const code of [
    'WARP_APPROVAL_INSTRUCTIONS_ONLY',
    'WARP_RUNTIME_POLICY_UNSUPPORTED',
    'WARP_RETRY_UNSUPPORTED',
    'WARP_FAILURE_ROUTE_INSTRUCTIONS_ONLY',
    'WARP_ARTIFACT_VALIDATION_UNSUPPORTED',
    'WARP_RUNTIME_HINT_NOT_ENFORCED',
    'WARP_GRAPH_INSTRUCTIONS_ONLY',
  ]) assert.ok(codes.has(code), code);
});

test('invalid canonical input fails closed without generated files', async () => {
  const { source, config } = await fixture();
  source.graphs[0].entryNodeId = 'missing';
  const result = compileWarpFactory(source, config);
  assert.equal(result.valid, false);
  assert.deepEqual(result.files, {});
  assert.equal(result.report, null);
  assert.ok(result.diagnostics.some(({ code }) => code === 'CONTROL_UNKNOWN_REFERENCE'));
});

test('invalid or unresolved adapter bindings fail closed', async () => {
  const { source, config } = await fixture();
  config.agentDefaults.harness = { type: 'codex' };
  let result = compileWarpFactory(source, config);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some(({ code }) => code === 'WARP_CONFIG_EXECUTION_EXCLUSIVE'));

  const fresh = await fixture();
  fresh.config.agentBindings[0].roleRef = 'missing-role';
  result = compileWarpFactory(fresh.source, fresh.config);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some(({ code }) => code === 'WARP_UNKNOWN_ROLE_BINDING'));
});

test('manual and unbound event triggers never create guessed automations', async () => {
  const { source, config } = await fixture();
  source.workflows[0].triggers = [
    { kind: 'manual' },
    { kind: 'event', event: 'pull-request.created' },
  ];
  config.automations = [];
  const result = compileWarpFactory(source, config);
  assert.equal(result.valid, true);
  assert.equal(Object.keys(result.files).some((path) => path.startsWith('automations/')), false);
  const codes = result.report.unsupportedFeatures.map(({ code }) => code);
  assert.ok(codes.includes('WARP_MANUAL_TRIGGER_NOT_AUTOMATED'));
  assert.ok(codes.includes('WARP_EVENT_TRIGGER_UNBOUND'));
});

test('Warp harness selection remains adapter-owned and canonical sources stay vendor-neutral', async () => {
  const { source, config } = await fixture();
  delete config.agentDefaults.model;
  config.agentDefaults.harness = { type: 'codex', model: 'gpt-example', reasoningLevel: 'high' };
  const result = compileWarpFactory(source, config);
  assert.match(result.files['factory.yaml'], /harness:\n    type: codex\n    model: "gpt-example"\n    reasoningLevel: "high"/);
  const canonical = await Promise.all([
    readText('../../control-plane-model/src/types.ts'),
    readText('../../control-plane-model/schema/control-plane.schema.json'),
    readText('../../control-plane-model/examples/feature-delivery.control-plane.json'),
  ]);
  assert.equal(/factory\.yaml|schemaVersion: v1alpha1|agentType: FOREMAN/i.test(canonical.join('\n')), false);
});

test('unknown config properties, duplicate repositories and enabled automations are rejected', async () => {
  const { config } = await fixture();
  config.secret = 'must-not-exist';
  config.repositories.push(structuredClone(config.repositories[0]));
  config.automations[0].enabled = true;
  config.automations[0].triggers[0].provider = 'linear';
  const result = validateWarpAdapterConfig(config);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some(({ code }) => code === 'WARP_CONFIG_UNKNOWN_PROPERTY'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'WARP_CONFIG_DUPLICATE_REPOSITORY'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'WARP_CONFIG_AUTOMATION_MUST_BE_DISABLED'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'WARP_CONFIG_INVALID_PROVIDER'));
});
