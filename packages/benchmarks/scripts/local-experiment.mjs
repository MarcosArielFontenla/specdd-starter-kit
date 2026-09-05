// Fixed local acceptance experiment, not an arbitrary plan executor.
import { readFile, mkdir, writeFile, lstat } from 'node:fs/promises';
import { resolve, dirname, parse, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpus, platform, arch } from 'node:os';
import { localResult } from '@specdd/eval-adapters';
import { controlPlaneFingerprint, evalResultTelemetry } from '@specdd/run-history';
import { writeRun } from '@specdd/run-history/store';
import { assertPlan, fingerprint, compareBenchmark } from '../dist/index.js';

const [destination, ...extra] = process.argv.slice(2);
if (!destination || extra.length) throw new Error('Usage: local-experiment.mjs NEW-output-directory');
const root = resolve(destination);
if (root === parse(root).root) throw new Error('Use a dedicated new directory');
for (let p = root; ; p = dirname(p)) {
  try { if ((await lstat(p)).isSymbolicLink()) throw new Error('Symlink/junction output paths rejected'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (dirname(p) === p) break;
}
const fixtures = ['score.test.mjs', 'invalid.test.mjs'].map(name => fileURLToPath(new URL('../examples/tasks/' + name, import.meta.url)));
const implementation = fileURLToPath(import.meta.resolve('@specdd/eval-adapters'));
const pinnedPaths = [...fixtures, implementation];
async function taskHash() {
  const parts = await Promise.all(pinnedPaths.map(async (path, i) => ({ file: i, sha256: createHash('sha256').update(await readFile(path)).digest('hex') })));
  return fingerprint(parts);
}
const sha256 = await taskHash();
const control = JSON.parse(await readFile(new URL('../../control-plane-model/examples/minimal.control-plane.json', import.meta.url), 'utf8'));
control.metadata.id = 'benchmark-local-control';
control.graphs[0].nodes[0] = { id: 'evaluate', name: 'Evaluate pinned score fixtures', kind: 'eval', evalGateRef: 'score-conformance', inputArtifactRefs: [], outputArtifactRefs: [], policyRefs: [] };
control.graphs[0].entryNodeId = 'evaluate'; control.graphs[0].terminalNodeIds = ['evaluate'];
control.evalGates = [{ id: 'score-conformance', evalRef: 'score-conformance', mode: 'required', requiredOutcome: 'pass' }];
const controlHash = controlPlaneFingerprint(control);
const environment = { node: process.version, platform: platform(), arch: arch(), cpus: cpus().length };
const profiles = [{ id: 'default', flags: [] }, { id: 'serial', flags: ['--test-concurrency=1'] }].map(profile => ({
  ...profile, executionRef: 'sha256:' + fingerprint({ node: process.version, flags: ['--test', ...profile.flags], taskSha256: sha256 }),
}));
const plan = { kind: 'SpecDDBenchmark', schemaVersion: '1.0.0', id: 'local-score-conformance', version: '1.0.0', scope: 'eval-node',
  task: { id: 'score-fixtures', inputRef: 'sha256:' + sha256, sha256 }, workflowRef: 'manual-review', repetitions: 3, baselineRef: 'default',
  eval: { kind: 'SpecDDEval', schemaVersion: '1.0.0', id: 'score-conformance', version: '1.0.0', name: 'Pinned score fixture conformance', method: 'mechanical',
    rubric: 'Run both pinned canonical score-normalization test files. Completed exit zero passes; nonzero fails. This measures fixture conformance only.',
    labels: [{ id: 'passed', description: 'Both fixed tests passed', score: 1 }, { id: 'failed', description: 'A fixed test failed', score: 0 }], passingScore: 1 },
  configurations: profiles.map(p => ({ id: p.id, graphRef: 'manual-review-graph', nodeRef: 'evaluate', controlPlaneSha256: controlHash,
    runtime: 'node-test', model: null, harnessRef: null, capabilityRefs: [], promptStrategyRef: null, environmentRef: 'sha256:' + fingerprint(environment), executionRef: p.executionRef })) };
assertPlan(plan);
// Exclusive directory creation precedes execution; an existing experiment is never overwritten.
await mkdir(dirname(root), { recursive: true });
await mkdir(root, { mode: 0o700 });
const save = (name, data) => writeFile(join(root, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
await save('plan.json', plan);
await save('environment.json', { ...environment, profiles, taskFiles: ['score.test.mjs', 'invalid.test.mjs', '@specdd/eval-adapters implementation'], warmup: 'none', order: 'alternating per repetition', limits: 'Inherited environment and system load not fully captured' });
const samples = [];
const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
for (let repetition = 1; repetition <= plan.repetitions; repetition++) {
  for (const profile of repetition % 2 ? profiles : [...profiles].reverse()) {
    if (await taskHash() !== sha256) throw new Error('Pinned task changed before execution');
    const config = plan.configurations.find(c => c.id === profile.id);
    const runId = 'local-' + profile.id + '-' + repetition;
    const startedAt = new Date().toISOString();
    const child = spawnSync(process.execPath, ['--test', ...profile.flags, ...fixtures], { env, shell: false, windowsHide: true, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 });
    const result = localResult(plan.eval, { runId, inputRef: plan.task.inputRef, observedAt: new Date().toISOString() },
      { exitCode: child.status, signal: child.signal, timedOut: child.error?.code === 'ETIMEDOUT', launchError: child.error?.message ?? null, stdout: child.stdout ?? '', stderr: child.stderr ?? '' }, { passLabel: 'passed', failLabel: 'failed' });
    if (await taskHash() !== sha256) throw new Error('Pinned task changed during execution');
    const events = evalResultTelemetry.normalize({ result, startedAt, attempt: 1, eventId: 'evaluation' }, {
      runId, workflowRef: plan.workflowRef, graphRef: config.graphRef, nodeRef: config.nodeRef, controlPlaneSha256: controlHash,
      inputRef: plan.task.inputRef, agentRef: null, capabilityRefs: [], runtime: config.runtime, model: null, harnessRef: null });
    await writeRun(join(root, 'runs'), events, control);
    samples.push({ configurationRef: config.id, configurationSha256: fingerprint(config), taskSha256: sha256, repetition, controlPlane: control, events, cost: null });
  }
}
const dataset = { kind: 'SpecDDBenchmarkDataset', schemaVersion: '1.0.0', planSha256: fingerprint(plan), samples };
const report = compareBenchmark(plan, dataset);
await save('dataset.json', dataset); await save('report.json', report);
console.log(JSON.stringify({ directory: root, status: report.status, groups: report.groups.map(g => ({ configuration: g.configurationRef, metrics: g.metrics })) }, null, 2));
process.exitCode = report.status !== 'complete' ? 2 : report.samples.some(s => s.passed !== 1) ? 1 : 0;
