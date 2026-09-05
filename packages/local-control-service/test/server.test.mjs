import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ControlStore, O4PublicationCoordinator, createLocalServer } from '../dist/index.js';

const artifact = { schemaVersion: '1.0.0', kind: 'SpecControlPlanArtifact', summary: 'A safe plan',
  specMarkdown: '## Spec\nOne rule.', planMarkdown: '## Plan\nOne step.', assumptions: [], filesToInspect: ['README.md'] };
const receipt = { runtime: 'fake-test-only', model: 'none', threadRefSha256: 'a'.repeat(64), turnRefSha256: 'b'.repeat(64) };
const publicationBinding = { schemaVersion: '1.0.0', kind: 'SpecControlPublicationBinding', provider: 'github', host: 'github.com',
  owner: 'specdd-fixtures', repository: 'sample', remoteName: 'origin', baseBranch: 'main', headPrefix: 'codex/speccontrol/', localRemotePath: null };
function fixture(t) {
  const root = realpathSync(tmpdir()), dir = mkdtempSync(join(root, 'speccontrol-http-'));
  const store = new ControlStore(join(dir, 'state', 'state.sqlite')); store.registerProject('fixture', dir);
  return { dir, root, store };
}
function cleanup(t, service, store, dir, root) {
  t.after(async () => {
    await service.close();
    store.close();
    assert.equal(dirname(realpathSync(dir)), root);
    rmSync(dir, { recursive: true });
  });
}
async function session(service) {
  const address = await service.listen();
  const bootstrap = await fetch(address.bootstrapUrl, { redirect: 'manual' });
  assert.equal(bootstrap.status, 303);
  const cookie = bootstrap.headers.get('set-cookie').split(';')[0];
  return { ...address, cookie };
}
const request = (context, path, options = {}) => fetch(context.origin + path, { ...options,
  headers: { Cookie: context.cookie, ...(options.headers ?? {}) } });

function completedRun(store, dir, id = 'run-web-publish') {
  store.createRun('fixture', { title: 'Publish from web', description: 'Exercise the local publication approval gate.' }, id);
  const planned = store.completePlanning(id, artifact, receipt); store.approve(id, planned.artifactSha256);
  store.startExecution(id, 'd'.repeat(64), join(dir, 'workspaces', id)); store.workspacePrepared(id, 'e'.repeat(64));
  store.developerCompleted(id, { schemaVersion: '1.0.0', kind: 'SpecControlDeveloperArtifact', summary: 'Changed README.',
    changedFiles: ['README.md'], limitations: [] }, receipt,
    { added: [], modified: [{ path: 'README.md', bytes: 4, sha256: '1'.repeat(64), beforeSha256: '2'.repeat(64) }], deleted: [] });
  store.reviewCompleted(id, { schemaVersion: '1.0.0', kind: 'SpecControlReviewArtifact', verdict: 'pass', summary: 'Review passed.', findings: [] },
    { ...receipt, threadRefSha256: 'c'.repeat(64) });
  store.checksCompleted(id, [{ id: 'unit', status: 'passed', exitCode: 0, durationMs: 1, outputSha256: '3'.repeat(64), outputBytes: 0 }]);
}

test('loopback session, CSRF and exact approval gate work end to end', async (t) => {
  const { dir, root, store } = fixture(t);
  const planner = { async plan() { return { artifact, receipt }; } };
  const service = createLocalServer({ store, planner, projectId: 'fixture' }); cleanup(t, service, store, dir, root);
  const context = await session(service);
  assert.equal((await fetch(context.origin + '/api/runs')).status, 401);
  assert.equal((await fetch(context.bootstrapUrl, { redirect: 'manual' })).status, 401);
  const page = await request(context, '/speccontrol');
  assert.equal(page.status, 200);
  assert.ok(page.headers.get('content-security-policy').includes("script-src 'self'"));
  const body = await page.text();
  assert.ok(!body.includes('window.__SPECCONTROL__'));
  const csrf = /data-csrf="([a-f0-9]{64})"/.exec(body)[1];
  const task = { title: 'Prepare a fixture plan', description: 'Create a read-only specification and plan.' };
  assert.equal((await request(context, '/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: context.origin }, body: JSON.stringify(task) })).status, 403);
  const createdResponse = await request(context, '/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: context.origin, 'X-SpecControl-CSRF': csrf }, body: JSON.stringify(task) });
  assert.equal(createdResponse.status, 202);
  const id = (await createdResponse.json()).run.id;
  let run;
  for (let i = 0; i < 20; i++) { run = (await (await request(context, `/api/runs/${id}`)).json()).run; if (run.state !== 'planning') break; await new Promise(r => setTimeout(r, 10)); }
  assert.equal(run.state, 'awaiting-approval');
  const wrong = await request(context, `/api/runs/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: context.origin, 'X-SpecControl-CSRF': csrf }, body: JSON.stringify({ artifactSha256: 'c'.repeat(64) }) });
  assert.equal(wrong.status, 409);
  const approved = await request(context, `/api/runs/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: context.origin, 'X-SpecControl-CSRF': csrf }, body: JSON.stringify({ artifactSha256: run.artifactSha256 }) });
  assert.equal(approved.status, 200);
  assert.equal((await approved.json()).run.state, 'approved');
  const replay = await request(context, `/api/runs/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: context.origin, 'X-SpecControl-CSRF': csrf }, body: JSON.stringify({ artifactSha256: run.artifactSha256 }) });
  assert.equal(replay.status, 409);
});

test('operator cancellation wins by state transition and preserves the failure', async (t) => {
  const { dir, root, store } = fixture(t);
  const planner = { plan({ signal }) { return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true })); } };
  const service = createLocalServer({ store, planner, projectId: 'fixture' }); cleanup(t, service, store, dir, root);
  const context = await session(service);
  const body = await (await request(context, '/speccontrol')).text();
  const csrf = /data-csrf="([a-f0-9]{64})"/.exec(body)[1];
  const headers = { 'Content-Type': 'application/json', Origin: context.origin, 'X-SpecControl-CSRF': csrf };
  const created = await request(context, '/api/runs', { method: 'POST', headers, body: JSON.stringify({ title: 'Cancel fixture plan', description: 'Keep the planner pending until cancellation.' }) });
  const id = (await created.json()).run.id;
  const cancelled = await request(context, `/api/runs/${id}/cancel`, { method: 'POST', headers, body: '{}' });
  assert.equal(cancelled.status, 200);
  assert.equal((await cancelled.json()).run.errorCode, 'OPERATOR_CANCELLED');
  await new Promise(r => setTimeout(r, 10));
  assert.equal(store.run(id).state, 'needs-attention');
  assert.equal((await request(context, `/api/runs/${id}/cancel`, { method: 'POST', headers, body: '{}' })).status, 409);
});

test('web publication gate revalidates source and exposes no publish action', async (t) => {
  const { dir, root, store } = fixture(t); completedRun(store, dir);
  let revision = '4'.repeat(40);
  const inspector = { async inspect() { return { baseRevision: revision, remoteUrl: 'https://github.com/specdd-fixtures/sample.git',
    headBranch: 'codex/speccontrol/run-web-publish-a1' }; } };
  const publication = new O4PublicationCoordinator({ store, binding: publicationBinding, inspector });
  const planner = { async plan() { return { artifact, receipt }; } };
  const service = createLocalServer({ store, planner, projectId: 'fixture', publication }); cleanup(t, service, store, dir, root);
  const context = await session(service), page = await request(context, '/speccontrol'), body = await page.text();
  assert.match(body, /data-publication-enabled="true"/);
  const csrf = /data-csrf="([a-f0-9]{64})"/.exec(body)[1];
  const headers = { 'Content-Type': 'application/json', Origin: context.origin, 'X-SpecControl-CSRF': csrf };
  const preparedResponse = await request(context, '/api/runs/run-web-publish/prepare-publication', { method: 'POST', headers, body: '{}' });
  assert.equal(preparedResponse.status, 201); const prepared = (await preparedResponse.json()).publication;
  assert.equal(prepared.state, 'awaiting-approval');
  revision = '5'.repeat(40);
  const stale = await request(context, '/api/runs/run-web-publish/approve-publication', { method: 'POST', headers,
    body: JSON.stringify({ subjectSha256: prepared.subjectSha256 }) });
  assert.equal(stale.status, 409); assert.equal((await stale.json()).error, 'PUBLICATION_SOURCE_DRIFT');
  revision = '4'.repeat(40);
  const approved = await request(context, '/api/runs/run-web-publish/approve-publication', { method: 'POST', headers,
    body: JSON.stringify({ subjectSha256: prepared.subjectSha256 }) });
  assert.equal(approved.status, 200); assert.equal((await approved.json()).publication.state, 'approved');
  const absent = await request(context, '/api/runs/run-web-publish/publish', { method: 'POST', headers, body: '{}' });
  assert.equal(absent.status, 404);
});

test('publisher ambiguity is preserved, cannot replay and reconciles absent back to approved', async (t) => {
  const { dir, root, store } = fixture(t); completedRun(store, dir, 'run-failed-publish');
  const source = { baseRevision: '4'.repeat(40), remoteUrl: 'https://github.com/specdd-fixtures/sample.git',
    headBranch: 'codex/speccontrol/run-failed-publish-a1' };
  const publication = new O4PublicationCoordinator({ store, binding: publicationBinding,
    inspector: { async inspect() { return source; } }, publisher: {
      async publish(input) { input.prepared('7'.repeat(40)); throw new Error('SIMULATED_AMBIGUOUS_FAILURE'); },
      async reconcile(input) {
        assert.equal(input.expectedHeadRevision, '7'.repeat(40)); assert.match(input.operationId, /^publish-/);
        return { status: 'absent' };
      },
    } });
  const service = createLocalServer({ store, planner: { async plan() { return { artifact, receipt }; } }, projectId: 'fixture', publication });
  cleanup(t, service, store, dir, root); const context = await session(service);
  const html = await (await request(context, '/speccontrol')).text(), csrf = /data-csrf="([a-f0-9]{64})"/.exec(html)[1];
  const headers = { 'Content-Type': 'application/json', Origin: context.origin, 'X-SpecControl-CSRF': csrf };
  const prepared = await request(context, '/api/runs/run-failed-publish/prepare-publication', { method: 'POST', headers, body: '{}' });
  const subjectSha256 = (await prepared.json()).publication.subjectSha256;
  assert.equal((await request(context, '/api/runs/run-failed-publish/approve-publication', { method: 'POST', headers,
    body: JSON.stringify({ subjectSha256 }) })).status, 200);
  assert.equal((await request(context, '/api/runs/run-failed-publish/publish', { method: 'POST', headers, body: '{}' })).status, 202);
  let record;
  for (let i = 0; i < 20; i++) {
    record = (await (await request(context, '/api/runs/run-failed-publish')).json()).run.publication;
    if (record.state !== 'publishing') break; await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(record.state, 'needs-attention'); assert.equal(record.errorCode, 'PUBLICATION_OUTCOME_UNKNOWN');
  assert.equal(record.expectedHeadRevision, '7'.repeat(40));
  const replay = await request(context, '/api/runs/run-failed-publish/publish', { method: 'POST', headers, body: '{}' });
  assert.equal(replay.status, 409); assert.equal((await replay.json()).error, 'PUBLICATION_NOT_EXACTLY_APPROVED');
  const reconciled = await request(context, '/api/runs/run-failed-publish/reconcile-publication', { method: 'POST', headers, body: '{}' });
  assert.equal(reconciled.status, 200); const reconciledRecord = (await reconciled.json()).publication;
  assert.equal(reconciledRecord.state, 'approved'); assert.equal(reconciledRecord.operationId, null);
  assert.equal(reconciledRecord.expectedHeadRevision, null); assert.equal(reconciledRecord.errorCode, null);
});

test('pre-head publication failure reconciles absent without an expected revision', async (t) => {
  const { dir, root, store } = fixture(t); completedRun(store, dir, 'run-pre-head-failure');
  const source = { baseRevision: '4'.repeat(40), remoteUrl: 'https://github.com/specdd-fixtures/sample.git',
    headBranch: 'codex/speccontrol/run-pre-head-failure-a1' };
  const publication = new O4PublicationCoordinator({ store, binding: publicationBinding,
    inspector: { async inspect() { return source; } }, publisher: {
      async publish() { throw new Error('SIMULATED_PRE_HEAD_FAILURE'); },
      async reconcile(input) {
        assert.equal(input.expectedHeadRevision, null); assert.match(input.operationId, /^publish-/);
        return { status: 'absent' };
      },
    } });
  const service = createLocalServer({ store, planner: { async plan() { return { artifact, receipt }; } }, projectId: 'fixture', publication });
  cleanup(t, service, store, dir, root); const context = await session(service);
  const html = await (await request(context, '/speccontrol')).text(), csrf = /data-csrf="([a-f0-9]{64})"/.exec(html)[1];
  const headers = { 'Content-Type': 'application/json', Origin: context.origin, 'X-SpecControl-CSRF': csrf };
  const prepared = await request(context, '/api/runs/run-pre-head-failure/prepare-publication', { method: 'POST', headers, body: '{}' });
  const subjectSha256 = (await prepared.json()).publication.subjectSha256;
  assert.equal((await request(context, '/api/runs/run-pre-head-failure/approve-publication', { method: 'POST', headers,
    body: JSON.stringify({ subjectSha256 }) })).status, 200);
  assert.equal((await request(context, '/api/runs/run-pre-head-failure/publish', { method: 'POST', headers, body: '{}' })).status, 202);
  let record;
  for (let i = 0; i < 20; i++) {
    record = (await (await request(context, '/api/runs/run-pre-head-failure')).json()).run.publication;
    if (record.state !== 'publishing') break; await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(record.state, 'needs-attention'); assert.equal(record.expectedHeadRevision, null);
  const reconciled = await request(context, '/api/runs/run-pre-head-failure/reconcile-publication', { method: 'POST', headers, body: '{}' });
  assert.equal(reconciled.status, 200); const reconciledRecord = (await reconciled.json()).publication;
  assert.equal(reconciledRecord.state, 'approved'); assert.equal(reconciledRecord.operationId, null);
  assert.equal(reconciledRecord.expectedHeadRevision, null); assert.equal(reconciledRecord.errorCode, null);
});
