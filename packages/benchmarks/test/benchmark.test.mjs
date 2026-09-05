import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { localResult } from '@specdd/eval-adapters';
import { controlPlaneFingerprint, evalResultTelemetry } from '@specdd/run-history';
import { assertPlan, compareBenchmark, fingerprint, statistics } from '../dist/index.js';

const seed = JSON.parse(await readFile(new URL('../../control-plane-model/examples/minimal.control-plane.json', import.meta.url), 'utf8'));
const at = n => new Date(Date.UTC(2026, 8, 4) + n).toISOString();
function fixture() {
  const control = structuredClone(seed);
  control.graphs[0].nodes[0] = { id: 'evaluate', kind: 'eval', name: 'Fixture eval', evalGateRef: 'quality', inputArtifactRefs: [], outputArtifactRefs: [], policyRefs: [] };
  control.graphs[0].entryNodeId = 'evaluate'; control.graphs[0].terminalNodeIds = ['evaluate'];
  control.evalGates = [{ id: 'quality', evalRef: 'quality', mode: 'required', requiredOutcome: 'pass' }];
  const plan = { kind: 'SpecDDBenchmark', schemaVersion: '1.0.0', id: 'synthetic', version: '1.0.0', scope: 'eval-node',
    task: { id: 'synthetic-task', inputRef: 'fixture:synthetic', sha256: 'a'.repeat(64) }, workflowRef: 'manual-review', repetitions: 2, baselineRef: 'a',
    eval: { kind: 'SpecDDEval', schemaVersion: '1.0.0', id: 'quality', version: '1.0.0', name: 'Synthetic criterion', method: 'mechanical', rubric: 'Explicitly synthetic fixture',
      labels: [{ id: 'pass', description: 'Pass', score: 1 }, { id: 'fail', description: 'Fail', score: 0 }], passingScore: 1 },
    configurations: ['a', 'b'].map(id => ({ id, graphRef: 'manual-review-graph', nodeRef: 'evaluate', controlPlaneSha256: controlPlaneFingerprint(control), runtime: 'fixture', model: null,
      harnessRef: null, capabilityRefs: [], promptStrategyRef: null, environmentRef: 'fixture-environment', executionRef: 'profile-' + id })) };
  const samples = plan.configurations.flatMap(config => [1, 2].map(repetition => {
    const runId = config.id + '-' + repetition;
    const result = localResult(plan.eval, { runId, inputRef: plan.task.inputRef, observedAt: at(config.id === 'a' ? 100 : 200) },
      { exitCode: 0, signal: null, timedOut: false, launchError: null, stdout: 'SYNTHETIC EVIDENCE ONLY', stderr: '' }, { passLabel: 'pass', failLabel: 'fail' });
    const events = evalResultTelemetry.normalize({ result, startedAt: at(0), attempt: 1, eventId: 'eval' },
      { runId, workflowRef: plan.workflowRef, graphRef: config.graphRef, controlPlaneSha256: config.controlPlaneSha256, inputRef: plan.task.inputRef,
        nodeRef: config.nodeRef, agentRef: null, capabilityRefs: [], runtime: config.runtime, model: null, harnessRef: null });
    return { configurationRef: config.id, configurationSha256: fingerprint(config), taskSha256: plan.task.sha256, repetition, controlPlane: control, events, cost: null };
  }));
  return { plan, dataset: { kind: 'SpecDDBenchmarkDataset', schemaVersion: '1.0.0', planSha256: fingerprint(plan), samples } };
}
const resultOf = sample => sample.events.at(-1).data.result;
test('balanced synthetic eval slices produce deterministic scoped statistics and deltas', () => {
  const { plan, dataset } = fixture(); const report = compareBenchmark(plan, dataset);
  assert.equal(report.status, 'complete');
  assert.equal(report.groups[0].metrics.score.mean, 1);
  assert.equal(report.comparisons[0].metrics.latencyMs.deltaMean, 100);
  assert.deepEqual(report.comparisons[0].changedDimensions, ['executionRef']);
  assert.equal(report.samples[0].runCoverage, 'partial');
  assert.deepEqual(compareBenchmark(plan, dataset), report);
  assert.equal(report.groups[0].humanInterventions, null);
  assert.equal(report.groups[0].defectRate, null);
});
test('plan rejects unknown nested fields, invalid scope, duplicate profiles and invalid baseline', () => {
  for (const mutate of [p => p.secret = 1, p => p.task.extra = 1, p => p.configurations[0].extra = 1, p => p.scope = 'whole-workflow',
    p => p.baselineRef = 'missing', p => p.repetitions = 0, p => p.configurations[1].id = 'a', p => p.configurations[1].executionRef = 'profile-a',
    p => { p.configurations[0].capabilityRefs = ['x', 'y']; p.configurations[1].capabilityRefs = ['y', 'x']; p.configurations[1].executionRef = 'profile-a'; }]) {
    const { plan } = fixture(); mutate(plan); assert.throws(() => assertPlan(plan));
  }
});
test('dataset rejects unknown nested properties and stale plan identity', () => {
  for (const mutate of [d => d.extra = 1, d => d.samples[0].extra = 1, d => d.planSha256 = 'b'.repeat(64), d => d.samples[0].events[0].data.extra = 1]) {
    const { plan, dataset } = fixture(); mutate(dataset); assert.throws(() => compareBenchmark(plan, dataset));
  }
});
test('missing repetitions stay explicit and disable affected comparisons', () => {
  const { plan, dataset } = fixture(); dataset.samples.pop();
  const report = compareBenchmark(plan, dataset);
  assert.equal(report.status, 'incomplete');
  assert.deepEqual(report.groups[1].missingRepetitions, [2]);
  assert.equal(report.groups[1].metrics.score.observed, 1);
  assert.equal(report.comparisons[0].metrics.score.deltaMean, null);
});
test('empty dataset cannot become an empty passing benchmark', () => {
  const { plan, dataset } = fixture(); dataset.samples = [];
  const report = compareBenchmark(plan, dataset);
  assert.equal(report.status, 'incomplete');
  assert.equal(report.groups[0].metrics.passed.mean, null);
  assert.equal(report.groups[0].metrics.passed.expected, 2);
});
test('duplicate slots, replayed runs, unknown groups and excess repetitions reject', () => {
  for (const mutate of [d => d.samples.push(structuredClone(d.samples[0])), d => d.samples[1].events = structuredClone(d.samples[0].events),
    d => d.samples[0].configurationRef = 'missing', d => d.samples[0].repetition = 3]) {
    const { plan, dataset } = fixture(); mutate(dataset); assert.throws(() => compareBenchmark(plan, dataset));
  }
});
test('task, graph and configuration fingerprints cannot be relabeled', () => {
  for (const mutate of [s => s.taskSha256 = 'b'.repeat(64), s => s.configurationSha256 = 'b'.repeat(64), s => s.controlPlane.metadata.description += 'changed',
    s => { s.events.forEach(e => e.inputRef = 'different'); resultOf(s).inputRef = 'different'; }]) {
    const { plan, dataset } = fixture(); mutate(dataset.samples[0]); assert.throws(() => compareBenchmark(plan, dataset));
  }
});
test('runtime and model observations must match pinned configuration', () => {
  for (const key of ['runtime', 'model']) {
    const { plan, dataset } = fixture(); dataset.samples[0].events.forEach(e => e[key] = 'different');
    assert.throws(() => compareBenchmark(plan, dataset), /execution context/);
  }
});
test('evaluator fingerprint/version and label-score-outcome contradictions reject', () => {
  for (const mutate of [r => r.evalVersion = '2', r => r.definitionSha256 = 'b'.repeat(64), r => r.score = 0.3, r => r.outcome = 'fail',
    r => r.label = 'unknown', r => r.evidence.bytes = 0]) {
    const { plan, dataset } = fixture(); mutate(resultOf(dataset.samples[0])); assert.throws(() => compareBenchmark(plan, dataset));
  }
});
test('failures remain in pass denominator; errors have missing score, not artificial zero', () => {
  const { plan, dataset } = fixture();
  Object.assign(resultOf(dataset.samples[0]), { outcome: 'fail', score: 0, label: 'fail' });
  Object.assign(resultOf(dataset.samples[1]), { outcome: 'error', score: null, label: null, error: 'Fixture timeout' });
  const report = compareBenchmark(plan, dataset);
  assert.equal(report.status, 'complete');
  assert.equal(report.groups[0].metrics.passed.mean, 0);
  assert.equal(report.groups[0].metrics.executionError.mean, 0.5);
  assert.equal(report.groups[0].metrics.score.observed, 1);
  assert.equal(report.comparisons[0].metrics.score.comparable, false);
});
test('missing selected-node starts/ends invalidate the sample measurement', () => {
  for (const index of [0, 1]) {
    const { plan, dataset } = fixture(); dataset.samples[0].events.splice(index, 1);
    const report = compareBenchmark(plan, dataset);
    assert.equal(report.status, 'incomplete');
    assert.equal(report.samples[0].latencyMs, null);
    assert.equal(report.samples[0].score, null);
  }
});
test('attempt gaps cannot be counted as zero retries', () => {
  const { plan, dataset } = fixture(); dataset.samples[0].events.forEach(e => e.data.attempt = 2);
  const report = compareBenchmark(plan, dataset);
  assert.equal(report.samples[0].status, 'incomplete');
  assert.equal(report.samples[0].retries, null);
});
test('contiguous failed-then-passed attempts retain retries and total slice latency', () => {
  const { plan, dataset } = fixture(); const sample = dataset.samples[0];
  const extra = structuredClone(sample.events);
  sample.events.forEach(e => e.timestamp = at(e.event === 'eval.started' ? 0 : 50));
  Object.assign(resultOf(sample), { observedAt: at(50), outcome: 'fail', score: 0, label: 'fail' });
  extra.forEach(e => { e.id += '-retry'; e.source.eventId += '-retry'; e.data.attempt = 2; e.timestamp = at(e.event === 'eval.started' ? 60 : 200); });
  extra[1].data.result.observedAt = at(200); sample.events.push(...extra);
  const report = compareBenchmark(plan, dataset);
  assert.equal(report.samples[0].retries, 1);
  assert.equal(report.samples[0].latencyMs, 200);
  assert.equal(report.samples[0].passed, 1);
});
test('retry after pass is rejected to prevent selective reporting', () => {
  const { plan, dataset } = fixture(); const sample = dataset.samples[0]; const extra = structuredClone(sample.events);
  extra.forEach(e => { e.id += '-retry'; e.source.eventId += '-retry'; e.data.attempt = 2; e.timestamp = at(e.event === 'eval.started' ? 200 : 300); });
  extra[1].data.result.observedAt = at(300); sample.events.push(...extra);
  assert.throws(() => compareBenchmark(plan, dataset), /cherry-picking/);
});
test('unknown costs stay null, while observed zero costs need explicit evidence', () => {
  const { plan, dataset } = fixture();
  const unknown = compareBenchmark(plan, dataset);
  assert.equal(unknown.currency, null); assert.equal(unknown.groups[0].metrics.cost.mean, null);
  for (const sample of dataset.samples) sample.cost = { amount: 0, currency: 'USD', evidence: { sha256: 'a'.repeat(64), bytes: 1 } };
  const known = compareBenchmark(plan, dataset);
  assert.equal(known.groups[0].metrics.cost.mean, 0); assert.equal(known.comparisons[0].metrics.cost.deltaMean, 0);
});
test('negative/nonfinite costs, empty cost evidence and mixed currency reject', () => {
  for (const amount of [-1, NaN, Infinity]) {
    const { plan, dataset } = fixture(); dataset.samples[0].cost = { amount, currency: 'USD', evidence: { sha256: 'a'.repeat(64), bytes: 1 } };
    assert.throws(() => compareBenchmark(plan, dataset));
  }
  const { plan, dataset } = fixture();
  dataset.samples[0].cost = { amount: 1, currency: 'USD', evidence: { sha256: 'a'.repeat(64), bytes: 1 } };
  dataset.samples[1].cost = { amount: 1, currency: 'EUR', evidence: { sha256: 'a'.repeat(64), bytes: 1 } };
  assert.throws(() => compareBenchmark(plan, dataset), /currencies/);
  dataset.samples[1].cost = null; dataset.samples[0].cost.evidence.bytes = 0;
  assert.throws(() => compareBenchmark(plan, dataset));
});
test('statistics expose missing count and known medians without inventing values', () => {
  assert.deepEqual(statistics([0, null, 2, 4], 4), { expected: 4, observed: 3, mean: 2, median: 2, min: 0, max: 4 });
  assert.equal(statistics([0, 2], 2).median, 1);
  assert.throws(() => statistics([Infinity], 1)); assert.throws(() => statistics([1, 2], 1));
});
test('fingerprints are order-independent for object keys; projections do not alias input', () => {
  const { plan, dataset } = fixture();
  assert.equal(fingerprint(plan), fingerprint(Object.fromEntries(Object.entries(plan).reverse())));
  const report = compareBenchmark(plan, dataset); report.groups[0].configuration.runtime = 'mutated';
  assert.equal(plan.configurations[0].runtime, 'fixture');
});

test('reviewed real report is exactly regenerated from the retained plan/dataset', async () => {
  const load = async name => JSON.parse(await readFile(new URL('../examples/local/' + name, import.meta.url), 'utf8'));
  const plan = await load('plan.json'); const dataset = await load('dataset.json');
  const report = compareBenchmark(plan, dataset);
  assert.deepEqual(report, await load('report.json'));
  assert.equal(report.samples.length, 6);
  assert.ok(report.samples.every(s => s.passed === 1));
  assert.equal(report.groups[0].metrics.cost.observed, 0);
});
test('read-only CLI reports incomplete populations with exit 2, not success', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'specdd-benchmark-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const { plan, dataset } = fixture(); dataset.samples.pop();
  const planPath = join(directory, 'plan.json'); const datasetPath = join(directory, 'dataset.json');
  await writeFile(planPath, JSON.stringify(plan)); await writeFile(datasetPath, JSON.stringify(dataset));
  const child = spawnSync(process.execPath, ['scripts/compare.mjs', planPath, datasetPath], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
  assert.equal(child.status, 2, child.stderr);
  assert.equal(JSON.parse(child.stdout).status, 'incomplete');
  assert.equal(await readFile(datasetPath, 'utf8'), JSON.stringify(dataset));
});
test('fixed local experiment runs real profiles and refuses to overwrite evidence', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'specdd-benchmark-host-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const destination = join(directory, 'experiment');
  const child = spawnSync(process.execPath, ['scripts/local-experiment.mjs', destination], { encoding: 'utf8', windowsHide: true, timeout: 60000 });
  assert.equal(child.status, 0, child.stderr);
  const load = async name => JSON.parse(await readFile(join(destination, name), 'utf8'));
  const plan = await load('plan.json'); const dataset = await load('dataset.json'); const report = await load('report.json');
  assert.deepEqual(compareBenchmark(plan, dataset), report);
  assert.equal(dataset.samples.length, 6);
  assert.ok(dataset.samples.every(s => s.events.length === 2 && s.cost === null));
  assert.notEqual(plan.configurations[0].executionRef, plan.configurations[1].executionRef);
  const duplicate = spawnSync(process.execPath, ['scripts/local-experiment.mjs', destination], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
  assert.notEqual(duplicate.status, 0); assert.match(duplicate.stderr, /EEXIST/);
  assert.deepEqual(await load('report.json'), report);
});
