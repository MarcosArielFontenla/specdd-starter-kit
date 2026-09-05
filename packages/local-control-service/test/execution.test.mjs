import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ControlStore, IsolatedWorkspace, O3ExecutionCoordinator, StructuredCheckRunner, appServerArgs, appServerThreadParameters, canonicalJson, executionBinding, pathsOverlap, sha256 } from '../dist/index.js';

const source = realpathSync(fileURLToPath(new URL('../fixtures/o3-project', import.meta.url)));
const artifact = { schemaVersion: '1.0.0', kind: 'SpecControlPlanArtifact', summary: 'Normalize customer names',
  specMarkdown: '## Spec\nFollow every rule in README.md.', planMarkdown: '## Plan\nUpdate src/appointment.mjs and run the declared test.',
  assumptions: [], filesToInspect: ['README.md', 'src/appointment.mjs', 'test/appointment.test.mjs'] };
const plannerReceipt = { runtime: 'fake-planner', model: 'none', threadRefSha256: '1'.repeat(64), turnRefSha256: '2'.repeat(64) };
const developerReceipt = { runtime: 'fake-developer', model: 'none', threadRefSha256: '3'.repeat(64), turnRefSha256: '4'.repeat(64) };
const reviewerReceipt = { runtime: 'fake-reviewer', model: 'none', threadRefSha256: '5'.repeat(64), turnRefSha256: '6'.repeat(64) };

function fixture(t) {
  const tempRoot = realpathSync(tmpdir()), dir = mkdtempSync(join(tempRoot, 'speccontrol-o3-'));
  const store = new ControlStore(join(dir, 'state', 'state.sqlite'));
  store.registerProject('fixture', source);
  const run = store.createRun('fixture', { title: 'Normalize customer name', description: 'Implement the complete synthetic fixture contract.' }, 'run-o3');
  const paused = store.completePlanning(run.id, artifact, plannerReceipt); store.approve(run.id, paused.artifactSha256);
  t.after(() => { store.close(); assert.equal(dirname(realpathSync(dir)), tempRoot); rmSync(dir, { recursive: true }); });
  return { dir, store };
}

function binding() {
  return executionBinding({ schemaVersion: '1.0.0', kind: 'SpecControlExecutionBinding', maxSourceFiles: 100,
    maxSourceBytes: 1024 * 1024, developerModel: 'gpt-5.6-luna', reviewerModel: 'gpt-5.6-luna', roleTimeoutMs: 30000,
    checks: [{ id: 'appointment-unit', executable: process.execPath, args: ['--test', 'test/appointment.test.mjs'], timeoutMs: 10000 }] });
}

async function waitForTerminal(store, runId) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const execution = store.execution(runId);
    if (['completed', 'needs-attention'].includes(execution.state)) return execution;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('TEST_EXECUTION_TIMEOUT');
}

test('O3 uses an isolated copy, distinct review and structured passing check', async (t) => {
  const { store } = fixture(t), before = readFileSync(join(source, 'src', 'appointment.mjs'), 'utf8');
  const developer = { async develop({ workspaceRoot }) {
    mkdirSync(join(workspaceRoot, '.git'));
    writeFileSync(join(workspaceRoot, 'src', 'appointment.mjs'), `export function normalizeCustomerName(value) {\n  if (typeof value !== 'string' || !value.trim()) throw new TypeError('CUSTOMER_NAME_REQUIRED');\n  return value.trim();\n}\n`);
    return { artifact: { schemaVersion: '1.0.0', kind: 'SpecControlDeveloperArtifact', summary: 'Implemented the approved rule.',
      changedFiles: ['src/appointment.mjs'], limitations: [] }, receipt: developerReceipt };
  } };
  const reviewer = { async review({ executionRoot, diff }) {
    assert.match(executionRoot, /run-o3$/); assert.deepEqual(diff.modified.map(x => x.path), ['src/appointment.mjs']);
    return { artifact: { schemaVersion: '1.0.0', kind: 'SpecControlReviewArtifact', verdict: 'pass', summary: 'The change matches the fixture contract.', findings: [] }, receipt: reviewerReceipt };
  } };
  const coordinator = new O3ExecutionCoordinator({ store, binding: binding(), developer, reviewer });
  assert.equal(coordinator.start('run-o3').state, 'preparing');
  let execution;
  for (let attempt = 0; attempt < 100; attempt++) {
    execution = store.execution('run-o3'); if (['completed', 'needs-attention'].includes(execution.state)) break;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.equal(execution.state, 'completed'); assert.equal(execution.checks[0].status, 'passed');
  assert.match(execution.evidenceSha256, /^[a-f0-9]{64}$/); assert.equal(execution.diff.modified[0].path, 'src/appointment.mjs');
  assert.equal(readFileSync(join(source, 'src', 'appointment.mjs'), 'utf8'), before);
  assert.throws(() => coordinator.start('run-o3'), /EXECUTION_EXISTS/);
  await coordinator.close();
});

test('an explicit retry archives failed evidence and uses a fresh isolated workspace', async (t) => {
  const { store } = fixture(t); let calls = 0;
  const developer = { async develop({ workspaceRoot }) {
    calls++;
    if (calls === 1) {
      mkdirSync(join(workspaceRoot, '.git'), { recursive: true });
      writeFileSync(join(workspaceRoot, '.git', 'runtime-state'), 'unexpected');
    }
    writeFileSync(join(workspaceRoot, 'src', 'appointment.mjs'), `export function normalizeCustomerName(value) {\n  if (typeof value !== 'string' || !value.trim()) throw new TypeError('CUSTOMER_NAME_REQUIRED');\n  return value.trim();\n}\n`);
    return { artifact: { schemaVersion: '1.0.0', kind: 'SpecControlDeveloperArtifact', summary: 'Implemented the approved rule.',
      changedFiles: ['src/appointment.mjs'], limitations: [] }, receipt: developerReceipt };
  } };
  const reviewer = { async review() {
    return { artifact: { schemaVersion: '1.0.0', kind: 'SpecControlReviewArtifact', verdict: 'pass', summary: 'Approved.', findings: [] }, receipt: reviewerReceipt };
  } };
  const coordinator = new O3ExecutionCoordinator({ store, binding: binding(), developer, reviewer });
  coordinator.start('run-o3'); await waitForTerminal(store, 'run-o3');
  assert.equal(store.execution('run-o3').errorCode, 'WORKSPACE_EXCLUDED_PATH_CREATED');
  assert.equal(store.execution('run-o3').attempt, 1);
  assert.equal(coordinator.retry('run-o3').attempt, 2); await waitForTerminal(store, 'run-o3');
  assert.equal(store.execution('run-o3').state, 'completed', JSON.stringify(store.execution('run-o3')));
  assert.deepEqual(store.executionAttempts('run-o3').map(x => ({ attempt: x.attempt, state: x.state, errorCode: x.errorCode })),
    [{ attempt: 1, state: 'needs-attention', errorCode: 'WORKSPACE_EXCLUDED_PATH_CREATED' }]);
  await coordinator.close();
});

test('review failure is terminal and cannot advance to checks', (t) => {
  const { dir, store } = fixture(t), bindingSha = sha256(canonicalJson(binding()));
  store.startExecution('run-o3', bindingSha, join(dir, 'workspaces', 'run-o3'));
  store.workspacePrepared('run-o3', 'a'.repeat(64));
  store.developerCompleted('run-o3', { schemaVersion: '1.0.0', kind: 'SpecControlDeveloperArtifact', summary: 'A bounded change.', changedFiles: ['src/appointment.mjs'], limitations: [] },
    developerReceipt, { added: [], modified: [{ path: 'src/appointment.mjs', bytes: 10, sha256: 'b'.repeat(64), beforeSha256: 'c'.repeat(64) }], deleted: [] });
  const stopped = store.reviewCompleted('run-o3', { schemaVersion: '1.0.0', kind: 'SpecControlReviewArtifact', verdict: 'fail',
    summary: 'Blocking mismatch.', findings: [{ severity: 'blocking', path: 'src/appointment.mjs', message: 'The rule is incomplete.' }] }, reviewerReceipt);
  assert.equal(stopped.state, 'needs-attention'); assert.equal(stopped.errorCode, 'REVIEW_FAILED');
  assert.throws(() => store.checksCompleted('run-o3', []), /STALE_EXECUTION_TRANSITION/);
  assert.equal(store.reconcileInterruptedExecutions(), 0);
});

test('Developer receipt mismatch fails before Reviewer and preserves the source', async (t) => {
  const { store } = fixture(t), before = readFileSync(join(source, 'src', 'appointment.mjs'), 'utf8'); let reviewed = false;
  const developer = { async develop({ workspaceRoot }) {
    writeFileSync(join(workspaceRoot, 'src', 'appointment.mjs'), 'export const changed = true;\n');
    return { artifact: { schemaVersion: '1.0.0', kind: 'SpecControlDeveloperArtifact', summary: 'Incorrect receipt.', changedFiles: ['README.md'], limitations: [] }, receipt: developerReceipt };
  } };
  const reviewer = { async review() { reviewed = true; throw new Error('SHOULD_NOT_REVIEW'); } };
  const coordinator = new O3ExecutionCoordinator({ store, binding: binding(), developer, reviewer }); coordinator.start('run-o3');
  await coordinator.close();
  assert.equal(store.execution('run-o3').state, 'needs-attention');
  assert.equal(store.execution('run-o3').errorCode, 'DEVELOPER_DIFF_MISMATCH'); assert.equal(reviewed, false);
  assert.equal(readFileSync(join(source, 'src', 'appointment.mjs'), 'utf8'), before);
});

test('startup reconciliation stops an interrupted execution without retry', (t) => {
  const { dir, store } = fixture(t), bindingSha = sha256(canonicalJson(binding()));
  store.startExecution('run-o3', bindingSha, join(dir, 'workspaces', 'run-o3'));
  store.workspacePrepared('run-o3', 'a'.repeat(64));
  assert.equal(store.reconcileInterruptedExecutions(), 1);
  assert.equal(store.execution('run-o3').state, 'needs-attention');
  assert.equal(store.execution('run-o3').errorCode, 'SERVICE_RESTARTED_DURING_EXECUTION');
  assert.equal(store.reconcileInterruptedExecutions(), 0);
});

test('execution binding rejects relative executables and shell control characters', () => {
  const valid = binding(); assert.equal(valid.checks[0].executable, process.execPath);
  assert.throws(() => executionBinding({ ...valid, checks: [{ ...valid.checks[0], executable: 'node' }] }), /INVALID_CHECK_EXECUTABLE/);
  assert.throws(() => executionBinding({ ...valid, checks: [{ ...valid.checks[0], args: ['ok\nnext'] }] }), /INVALID_CHECK_ARGS/);
});

test('isolated source snapshot excludes bin while preserving restore metadata in obj', (t) => {
  const tempRoot = realpathSync(tmpdir()), dir = mkdtempSync(join(tempRoot, 'speccontrol-bin-exclusion-'));
  t.after(() => { assert.equal(dirname(realpathSync(dir)), tempRoot); rmSync(dir, { recursive: true }); });
  const sourceRoot = join(dir, 'source');
  mkdirSync(join(sourceRoot, 'src'), { recursive: true });
  mkdirSync(join(sourceRoot, 'bin', 'Release'), { recursive: true });
  mkdirSync(join(sourceRoot, 'obj'), { recursive: true });
  writeFileSync(join(sourceRoot, 'src', 'domain.cs'), 'public sealed class Domain {}\n');
  writeFileSync(join(sourceRoot, 'bin', 'Release', 'generated.dll'), Buffer.alloc(2048));
  writeFileSync(join(sourceRoot, 'obj', 'project.assets.json'), '{}\n');

  const workspace = new IsolatedWorkspace(join(dir, 'workspaces'), { maxSourceFiles: 2, maxSourceBytes: 1024 });
  const prepared = workspace.prepare('run-bin-exclusion', sourceRoot);

  assert.equal(existsSync(join(prepared.worktreeRoot, 'bin')), false);
  assert.equal(readFileSync(join(prepared.worktreeRoot, 'obj', 'project.assets.json'), 'utf8'), '{}\n');
  assert.equal(readFileSync(join(prepared.worktreeRoot, 'src', 'domain.cs'), 'utf8'), 'public sealed class Domain {}\n');
});

test('structured checks inherit only required profile locations', async () => {
  const profileLocations = process.platform === 'win32'
    ? ['USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA']
    : ['HOME'];
  const required = profileLocations.filter(key => process.env[key]);
  assert.ok(required.length > 0);
  const sentinel = 'SPECCONTROL_UNAUTHORIZED_ENV_SENTINEL';
  const previous = process.env[sentinel];
  process.env[sentinel] = 'must-not-cross-check-boundary';
  try {
    const child = `const required=${JSON.stringify(required)}; if(required.some(key => !process.env[key])) process.exit(2); if(process.env.${sentinel}) process.exit(3);`;
    const runner = new StructuredCheckRunner([{ id: 'environment-boundary', executable: process.execPath,
      args: ['-e', child], timeoutMs: 10000 }]);
    const [result] = await runner.run(source);
    assert.equal(result.status, 'passed');
    assert.equal(result.exitCode, 0);
  } finally {
    if (previous === undefined) delete process.env[sentinel]; else process.env[sentinel] = previous;
  }
});

test('App Server roles use the sandbox values supported by the installed protocol', () => {
  const developer = appServerThreadParameters({ cwd: source, model: 'gpt-5.6-luna', sandbox: 'workspace-write', serviceName: 'speccontrol_developer' });
  const reviewer = appServerThreadParameters({ cwd: source, model: 'gpt-5.6-luna', sandbox: 'read-only', serviceName: 'speccontrol_reviewer' });
  assert.equal(developer.sandbox, 'workspace-write'); assert.equal(reviewer.sandbox, 'read-only');
  assert.equal('permissions' in developer, false); assert.equal(developer.approvalPolicy, 'never');
  assert.deepEqual(appServerArgs('unelevated').slice(-2), ['-c', 'windows.sandbox="unelevated"']);
  assert.equal(pathsOverlap(join(source, '.specdd-control'), source), true);
  assert.equal(pathsOverlap(join(dirname(source), 'private-state'), source), false);
});
