// Explicit host for a human-approved Node test, not a sandbox or graph executor.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { assertEval } from '@specdd/eval-adapters';
import { assertGraphBinding, controlPlaneFingerprint, evalResultTelemetry, summarizeRun } from '../dist/index.js';
import { writeRun, readBoundedFile, readRun } from '../dist/store.js';

const [evalPath, testPath, controlPath, workflowRef, nodeRef, inputRef, runId, directory, passLabel, failLabel, ...extra] = process.argv.slice(2);
if (extra.length || ![evalPath, testPath, controlPath, workflowRef, nodeRef, inputRef, runId, directory, passLabel, failLabel].every(Boolean)) {
  throw new Error('Usage: record-local-eval.mjs eval.json approved-test.mjs control.json workflow node input-ref run-id directory pass-label fail-label');
}
const definition = JSON.parse(await readBoundedFile(evalPath));
assertEval(definition);
const control = JSON.parse(await readBoundedFile(controlPath));
const workflow = control.workflows?.find(w => w.id === workflowRef);
const binding = { runId, workflowRef, graphRef: workflow?.graphRef, controlPlaneSha256: controlPlaneFingerprint(control), inputRef, nodeRef,
  agentRef: null, capabilityRefs: [], runtime: 'node-test', model: null, harnessRef: null };
const startedAt = new Date().toISOString();
// Check all graph references before the approved process is executed.
assertGraphBinding([{ ...binding, schemaVersion: '1.0.0', kind: 'SpecDDRunEvent', id: 'local-eval.start', timestamp: startedAt,
  source: { adapter: 'eval-result-v1', eventId: 'local-eval.start' }, event: 'eval.started', data: { attempt: 1, evalRef: definition.id } }], control);
// Refuse an existing export before execution too. writeRun is the final race-safe gate.
try { await readRun(directory, runId); throw new Error('Run export already exists'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const env = { ...process.env };
delete env.NODE_TEST_CONTEXT;
const wrapper = fileURLToPath(new URL('../../eval-adapters/scripts/run-local.mjs', import.meta.url));
const child = spawnSync(process.execPath, [wrapper, resolve(evalPath), resolve(testPath), inputRef, runId, passLabel, failLabel],
  { shell: false, env, windowsHide: true, encoding: 'utf8', timeout: 40000, maxBuffer: 1024 * 1024 });
if (child.error || child.signal || child.status === null) throw new Error('Eval host did not return a completed observation; no export published');
const result = JSON.parse(child.stdout);
const events = evalResultTelemetry.normalize({ result, startedAt, attempt: 1, eventId: 'local-eval' }, binding);
if (child.status !== (result.outcome === 'pass' ? 0 : 1)) throw new Error('Eval host exit/result mismatch');
const path = await writeRun(directory, events, control);
const summary = summarizeRun(await readRun(directory, runId, control));
console.log(JSON.stringify({ path, summary }, null, 2));
process.exitCode = result.outcome === 'pass' ? 0 : 1;
