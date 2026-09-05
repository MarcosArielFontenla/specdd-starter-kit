import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ControlStore, canonicalJson, planArtifact, sha256 } from '../dist/index.js';

const receipt = { runtime: 'test-planner', model: 'none', threadRefSha256: 'a'.repeat(64), turnRefSha256: 'b'.repeat(64) };
const artifact = { schemaVersion: '1.0.0', kind: 'SpecControlPlanArtifact', summary: 'Bounded fixture change',
  specMarkdown: '## Spec\nRequire an explicit value.', planMarkdown: '## Plan\nInspect and test.', assumptions: ['Timezone remains unknown.'], filesToInspect: ['src/rules.txt'] };
const publicationBinding = { schemaVersion: '1.0.0', kind: 'SpecControlPublicationBinding', provider: 'github', host: 'github.com',
  owner: 'specdd-fixtures', repository: 'sample', remoteName: 'origin', baseBranch: 'main', headPrefix: 'codex/speccontrol/', localRemotePath: null };

function fixture(t) {
  const root = realpathSync(tmpdir()), dir = mkdtempSync(join(root, 'speccontrol-store-'));
  t.after(() => { assert.equal(dirname(realpathSync(dir)), root); rmSync(dir, { recursive: true }); });
  return { dir, db: join(dir, 'state', 'state.sqlite') };
}

function completedRun(store, dir, id = 'run-publish') {
  store.registerProject('fixture', dir);
  store.createRun('fixture', { title: 'Publish fixture change', description: 'Prepare an exact publication subject.' }, id);
  const planned = store.completePlanning(id, artifact, receipt); store.approve(id, planned.artifactSha256);
  store.startExecution(id, 'd'.repeat(64), join(dir, 'workspaces', id)); store.workspacePrepared(id, 'e'.repeat(64));
  store.developerCompleted(id, { schemaVersion: '1.0.0', kind: 'SpecControlDeveloperArtifact', summary: 'Changed one file.',
    changedFiles: ['src/rules.txt'], limitations: [] }, receipt,
    { added: [], modified: [{ path: 'src/rules.txt', bytes: 4, sha256: '1'.repeat(64), beforeSha256: '2'.repeat(64) }], deleted: [] });
  store.reviewCompleted(id, { schemaVersion: '1.0.0', kind: 'SpecControlReviewArtifact', verdict: 'pass', summary: 'Ready to publish.', findings: [] },
    { ...receipt, threadRefSha256: 'c'.repeat(64) });
  store.checksCompleted(id, [{ id: 'unit', status: 'passed', exitCode: 0, durationMs: 1, outputSha256: '3'.repeat(64), outputBytes: 0 }]);
  return store.run(id);
}

test('artifact validation is deterministic and rejects unsafe paths', () => {
  assert.equal(sha256(canonicalJson(artifact)), sha256(canonicalJson({ ...artifact })));
  assert.equal(planArtifact(artifact).kind, 'SpecControlPlanArtifact');
  assert.throws(() => planArtifact({ ...artifact, filesToInspect: ['../secret'] }), /INVALID_PLAN_FILE_PATH/);
  assert.throws(() => planArtifact({ ...artifact, filesToInspect: ['C:\\secret'] }), /INVALID_PLAN_FILE_PATH/);
});

test('planning pauses persistently and approval binds the exact artifact hash', (t) => {
  const { dir, db } = fixture(t);
  let store = new ControlStore(db);
  const project = store.registerProject('fixture', dir);
  assert.equal(store.registerProject('fixture', dir).rootSha256, project.rootSha256);
  const created = store.createRun('fixture', { title: 'Validate appointment', description: 'Define a bounded validation change.' }, 'run-one');
  assert.equal(created.state, 'planning');
  const paused = store.completePlanning('run-one', artifact, receipt);
  assert.equal(paused.state, 'awaiting-approval');
  assert.match(paused.artifactSha256, /^[a-f0-9]{64}$/);
  assert.throws(() => store.approve('run-one', 'c'.repeat(64)), /ARTIFACT_HASH_MISMATCH/);
  const approved = store.approve('run-one', paused.artifactSha256);
  assert.equal(approved.state, 'approved');
  assert.equal(approved.approval.artifactSha256, paused.artifactSha256);
  assert.throws(() => store.approve('run-one', paused.artifactSha256), /RUN_NOT_AWAITING_APPROVAL/);
  assert.throws(() => store.createRun('fixture', created.task, 'run-two'), /ACTIVE_RUN_EXISTS/);
  store.close();
  store = new ControlStore(db);
  assert.equal(store.run('run-one').state, 'approved');
  assert.equal(store.run('run-one').artifactSha256, paused.artifactSha256);
  store.close();
});

test('startup reconciles interrupted planning without retrying it', (t) => {
  const { dir, db } = fixture(t);
  let store = new ControlStore(db);
  store.registerProject('fixture', dir);
  store.createRun('fixture', { title: 'Interrupted planner', description: 'Exercise restart reconciliation safely.' }, 'run-crash');
  store.close();
  store = new ControlStore(db);
  assert.equal(store.reconcileInterruptedPlanning(), 1);
  const run = store.run('run-crash');
  assert.equal(run.state, 'needs-attention');
  assert.equal(run.errorCode, 'SERVICE_RESTARTED_DURING_PLANNING');
  assert.equal(store.reconcileInterruptedPlanning(), 0);
  store.close();
});

test('publication approval binds the complete O3 evidence and rejects replay', (t) => {
  const { dir, db } = fixture(t), store = new ControlStore(db); completedRun(store, dir);
  const source = { baseRevision: '4'.repeat(40), remoteUrl: 'git@github.com:specdd-fixtures/sample.git',
    headBranch: 'codex/speccontrol/run-publish-a1' };
  const publication = store.requestPublication('run-publish', publicationBinding, source);
  assert.equal(publication.state, 'awaiting-approval'); assert.equal(publication.subject.draft, true);
  assert.equal(publication.subject.diffSha256, store.execution('run-publish').diffSha256);
  assert.throws(() => store.approvePublication('run-publish', '5'.repeat(64)), /PUBLICATION_SUBJECT_HASH_MISMATCH/);
  const approved = store.approvePublication('run-publish', publication.subjectSha256);
  assert.equal(approved.state, 'approved'); assert.equal(approved.approval.subjectSha256, publication.subjectSha256);
  assert.throws(() => store.approvePublication('run-publish', publication.subjectSha256), /PUBLICATION_NOT_AWAITING_APPROVAL/);
  assert.throws(() => store.requestPublication('run-publish', publicationBinding, source), /PUBLICATION_ALREADY_EXISTS/);
  store.close();
});

test('publication intent is persisted before an effect and restart fails closed', (t) => {
  const { dir, db } = fixture(t); let store = new ControlStore(db); completedRun(store, dir);
  const source = { baseRevision: '4'.repeat(40), remoteUrl: 'https://github.com/specdd-fixtures/sample.git',
    headBranch: 'codex/speccontrol/run-publish-a1' };
  const requested = store.requestPublication('run-publish', publicationBinding, source);
  store.approvePublication('run-publish', requested.subjectSha256);
  const publishing = store.beginPublication('run-publish', 'publish-op-one');
  assert.equal(publishing.state, 'publishing'); assert.equal(publishing.operationId, 'publish-op-one');
  store.close(); store = new ControlStore(db);
  assert.equal(store.reconcileInterruptedPublications(), 1);
  assert.equal(store.publication('run-publish').errorCode, 'PUBLICATION_OUTCOME_UNKNOWN');
  assert.equal(store.reconcileInterruptedPublications(), 0);
  assert.throws(() => store.beginPublication('run-publish', 'publish-op-two'), /PUBLICATION_NOT_EXACTLY_APPROVED/);
  store.close();
});

test('publication preparation rejects a mismatched target or branch', (t) => {
  const { dir, db } = fixture(t), store = new ControlStore(db); completedRun(store, dir);
  assert.throws(() => store.requestPublication('run-publish', publicationBinding,
    { baseRevision: '4'.repeat(40), remoteUrl: 'https://github.com/other/sample.git', headBranch: 'codex/speccontrol/run-publish-a1' }), /PUBLICATION_REMOTE_MISMATCH/);
  assert.throws(() => store.requestPublication('run-publish', publicationBinding,
    { baseRevision: '4'.repeat(40), remoteUrl: 'https://github.com/specdd-fixtures/sample.git', headBranch: 'codex/speccontrol/wrong' }), /PUBLICATION_HEAD_BRANCH_MISMATCH/);
  store.close();
});

test('successful publication transition is create-once and operation-bound', (t) => {
  const { dir, db } = fixture(t), store = new ControlStore(db); completedRun(store, dir);
  const source = { baseRevision: '4'.repeat(40), remoteUrl: 'ssh://git@github.com/specdd-fixtures/sample.git',
    headBranch: 'codex/speccontrol/run-publish-a1' };
  const requested = store.requestPublication('run-publish', publicationBinding, source);
  assert.throws(() => store.beginPublication('run-publish', 'publish-op-one'), /PUBLICATION_NOT_EXACTLY_APPROVED/);
  store.approvePublication('run-publish', requested.subjectSha256); store.beginPublication('run-publish', 'publish-op-one');
  assert.throws(() => store.publicationSucceeded('run-publish', 'publish-op-two', 'https://github.com/specdd-fixtures/sample/pull/1', '6'.repeat(64)), /STALE_PUBLICATION_COMPLETION/);
  const published = store.publicationSucceeded('run-publish', 'publish-op-one', 'https://github.com/specdd-fixtures/sample/pull/1', '6'.repeat(64));
  assert.equal(published.state, 'published'); assert.equal(published.receiptSha256, '6'.repeat(64));
  assert.throws(() => store.publicationSucceeded('run-publish', 'publish-op-one', 'https://github.com/specdd-fixtures/sample/pull/1', '6'.repeat(64)), /STALE_PUBLICATION_COMPLETION/);
  store.close();
});

test('rejected publication cannot be approved or started', (t) => {
  const { dir, db } = fixture(t), store = new ControlStore(db); completedRun(store, dir);
  const requested = store.requestPublication('run-publish', publicationBinding,
    { baseRevision: '4'.repeat(40), remoteUrl: 'https://github.com/specdd-fixtures/sample', headBranch: 'codex/speccontrol/run-publish-a1' });
  assert.equal(store.rejectPublication('run-publish').state, 'rejected');
  assert.throws(() => store.approvePublication('run-publish', requested.subjectSha256), /PUBLICATION_NOT_AWAITING_APPROVAL/);
  assert.throws(() => store.beginPublication('run-publish', 'publish-op-one'), /PUBLICATION_NOT_EXACTLY_APPROVED/);
  store.close();
});

test('publication conflict reconciliation is operation-bound and remains stopped', (t) => {
  const { dir, db } = fixture(t), store = new ControlStore(db); completedRun(store, dir);
  const requested = store.requestPublication('run-publish', publicationBinding,
    { baseRevision: '4'.repeat(40), remoteUrl: 'https://github.com/specdd-fixtures/sample.git', headBranch: 'codex/speccontrol/run-publish-a1' });
  store.approvePublication('run-publish', requested.subjectSha256);
  store.beginPublication('run-publish', 'publish-op-one'); store.publicationHeadPrepared('run-publish', 'publish-op-one', '7'.repeat(40));
  store.publicationFailed('run-publish', 'publish-op-one', 'PUBLICATION_OUTCOME_UNKNOWN');
  assert.throws(() => store.publicationReconciledConflict('run-publish', 'publish-op-two'), /STALE_PUBLICATION_RECONCILIATION/);
  const conflicted = store.publicationReconciledConflict('run-publish', 'publish-op-one');
  assert.equal(conflicted.state, 'needs-attention'); assert.equal(conflicted.errorCode, 'PUBLICATION_REMOTE_CONFLICT');
  assert.equal(conflicted.operationId, 'publish-op-one'); assert.equal(conflicted.expectedHeadRevision, '7'.repeat(40));
  assert.throws(() => store.publicationReconciledAbsent('run-publish', 'publish-op-one'), /STALE_PUBLICATION_RECONCILIATION/);
  store.close();
});

test('schema 3 journal migrates forward to publication schema 4', (t) => {
  const { db } = fixture(t); let store = new ControlStore(db); store.close();
  const legacy = new DatabaseSync(db);
  legacy.exec("DROP TABLE publication_approvals; DROP TABLE publications; UPDATE metadata SET value='3' WHERE key='schema_version';");
  legacy.close();
  store = new ControlStore(db); store.close();
  const migrated = new DatabaseSync(db, { readOnly: true });
  assert.equal(migrated.prepare("SELECT value FROM metadata WHERE key='schema_version'").get().value, '4');
  assert.equal(migrated.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name IN ('publications','publication_approvals')").get().count, 2);
  assert.equal(migrated.prepare("SELECT COUNT(*) AS count FROM pragma_table_info('publications') WHERE name='expected_head_revision'").get().count, 1);
  assert.equal(migrated.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  migrated.close();
});
