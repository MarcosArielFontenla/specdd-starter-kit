import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ControlStore, GitPublicationInspector, LocalGitPublisher, O4PublicationCoordinator, createLocalServer,
  githubRemoteMatches, publicationBinding, sha256 } from '../dist/index.js';

const locator = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['git'], { encoding: 'utf8' });
const gitExecutable = locator.status === 0 ? locator.stdout.split(/\r?\n/).find(Boolean) : undefined;
const binding = { schemaVersion: '1.0.0', kind: 'SpecControlPublicationBinding', provider: 'github', host: 'github.com',
  owner: 'specdd-fixtures', repository: 'sample', remoteName: 'origin', baseBranch: 'main', headPrefix: 'codex/speccontrol/', localRemotePath: null };

function git(root, args) {
  const result = spawnSync(gitExecutable, args, { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
}

test('real Git inspector binds a clean exact root and rejects later drift', { skip: !gitExecutable }, async (t) => {
  const parent = realpathSync(tmpdir()), root = mkdtempSync(join(parent, 'speccontrol-git-'));
  t.after(() => { assert.equal(dirname(realpathSync(root)), parent); rmSync(root, { recursive: true }); });
  git(root, ['init', '-b', 'main']);
  git(root, ['config', 'user.name', 'SpecControl Test']); git(root, ['config', 'user.email', 'test@invalid.local']);
  writeFileSync(join(root, 'README.md'), 'fixture\n'); git(root, ['add', 'README.md']);
  git(root, ['-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture']);
  git(root, ['remote', 'add', 'origin', 'https://github.com/specdd-fixtures/sample.git']);
  const inspector = new GitPublicationInspector(gitExecutable);
  const source = await inspector.inspect({ projectRoot: root, binding, runId: 'run-one', attempt: 2 });
  assert.equal(source.baseRevision, git(root, ['rev-parse', 'HEAD']));
  assert.equal(source.headBranch, 'codex/speccontrol/run-one-a2');
  assert.equal(githubRemoteMatches(binding, source.remoteUrl), true);
  writeFileSync(join(root, 'untracked.txt'), 'drift\n');
  await assert.rejects(() => inspector.inspect({ projectRoot: root, binding, runId: 'run-one', attempt: 2 }), /PROJECT_SOURCE_NOT_CLEAN/);
});

test('publication binding rejects unsafe refs and non-GitHub targets', () => {
  assert.equal(publicationBinding(binding).provider, 'github');
  assert.throws(() => publicationBinding({ ...binding, headPrefix: '../escape/' }), /INVALID_PUBLICATION_HEADPREFIX/);
  assert.throws(() => publicationBinding({ ...binding, baseBranch: 'main/' }), /INVALID_PUBLICATION_BASEBRANCH/);
  assert.throws(() => publicationBinding({ ...binding, baseBranch: 'refs.lock' }), /INVALID_PUBLICATION_BASEBRANCH/);
  assert.throws(() => publicationBinding({ ...binding, host: 'example.com' }), /INVALID_PUBLICATION_BINDING_IDENTITY/);
  assert.throws(() => publicationBinding({ ...binding, provider: 'local-git', host: 'local', localRemotePath: '\\\\server\\share\\repo.git' }), /INVALID_PUBLICATION_LOCAL_REMOTE/);
});

test('full web flow publishes one exact commit to a temporary local bare remote', { skip: !gitExecutable }, async (t) => {
  const tempRoot = realpathSync(tmpdir()), root = mkdtempSync(join(tempRoot, 'speccontrol-o4b-'));
  const source = join(root, 'source'), remote = join(root, 'remote.git'), state = join(root, 'state'), publicationRoot = join(root, 'publication');
  mkdirSync(source); git(root, ['init', '--bare', remote]); git(source, ['init', '-b', 'main']);
  git(source, ['config', 'user.name', 'SpecControl Test']); git(source, ['config', 'user.email', 'test@invalid.local']);
  const baseline = Buffer.from('before\n'), changed = Buffer.from('after\n');
  writeFileSync(join(source, 'README.md'), baseline); git(source, ['add', 'README.md']);
  git(source, ['-c', 'commit.gpgsign=false', 'commit', '-m', 'baseline']); git(source, ['remote', 'add', 'origin', realpathSync(remote)]);
  git(source, ['push', '-u', 'origin', 'main']); const baseRevision = git(source, ['rev-parse', 'HEAD']);
  const store = new ControlStore(join(state, 'state.sqlite')); store.registerProject('fixture', source);
  const runId = 'run-local-publish';
  store.createRun('fixture', { title: 'Publish local fixture', description: 'Exercise the complete offline web publication path.' }, runId);
  const planned = store.completePlanning(runId, { schemaVersion: '1.0.0', kind: 'SpecControlPlanArtifact', summary: 'Change README.',
    specMarkdown: '## Spec\nChange one fixture file.', planMarkdown: '## Plan\nEdit and verify.', assumptions: [], filesToInspect: ['README.md'] },
    { runtime: 'fixture', model: 'none', threadRefSha256: 'a'.repeat(64), turnRefSha256: 'b'.repeat(64) });
  store.approve(runId, planned.artifactSha256);
  const executionRoot = join(state, 'workspaces', runId), worktree = join(executionRoot, 'worktree'); mkdirSync(worktree, { recursive: true });
  writeFileSync(join(worktree, 'README.md'), changed);
  store.startExecution(runId, 'c'.repeat(64), executionRoot); store.workspacePrepared(runId, 'd'.repeat(64));
  const receipt = { runtime: 'fixture', model: 'none', threadRefSha256: 'e'.repeat(64), turnRefSha256: 'f'.repeat(64) };
  const diff = { added: [], modified: [{ path: 'README.md', bytes: changed.length, sha256: sha256(changed), beforeSha256: sha256(baseline) }], deleted: [] };
  store.developerCompleted(runId, { schemaVersion: '1.0.0', kind: 'SpecControlDeveloperArtifact', summary: 'Changed README.', changedFiles: ['README.md'], limitations: [] }, receipt, diff);
  store.reviewCompleted(runId, { schemaVersion: '1.0.0', kind: 'SpecControlReviewArtifact', verdict: 'pass', summary: 'Exact fixture diff.', findings: [] },
    { ...receipt, threadRefSha256: '1'.repeat(64) });
  store.checksCompleted(runId, [{ id: 'unit', status: 'passed', exitCode: 0, durationMs: 1, outputSha256: '2'.repeat(64), outputBytes: 0 }]);
  const localBinding = { ...binding, provider: 'local-git', host: 'local', owner: 'local-fixture', repository: 'sample', localRemotePath: realpathSync(remote) };
  const localPublisher = new LocalGitPublisher({ executable: gitExecutable, root: publicationRoot });
  const coordinator = new O4PublicationCoordinator({ store, binding: localBinding, inspector: new GitPublicationInspector(gitExecutable),
    publisher: localPublisher });
  const service = createLocalServer({ store, planner: { async plan() { throw new Error('NOT_USED'); } }, projectId: 'fixture', publication: coordinator });
  t.after(async () => { await service.close(); store.close(); assert.equal(dirname(realpathSync(root)), tempRoot); rmSync(root, { recursive: true }); });
  const address = await service.listen(), bootstrap = await fetch(address.bootstrapUrl, { redirect: 'manual' });
  assert.equal(bootstrap.status, 303); const cookie = bootstrap.headers.get('set-cookie').split(';')[0];
  const page = await fetch(address.origin + '/speccontrol', { headers: { Cookie: cookie } }), html = await page.text();
  assert.match(html, /data-publishing-enabled="true"/); const csrf = /data-csrf="([a-f0-9]{64})"/.exec(html)[1];
  const headers = { Cookie: cookie, Origin: address.origin, 'Content-Type': 'application/json', 'X-SpecControl-CSRF': csrf };
  const action = async (name, body = {}) => {
    const response = await fetch(`${address.origin}/api/runs/${runId}/${name}`, { method: 'POST', headers, body: JSON.stringify(body) });
    return { status: response.status, payload: await response.json() };
  };
  const prepared = await action('prepare-publication'); assert.equal(prepared.status, 201);
  assert.equal(prepared.payload.publication.subject.baseRevision, baseRevision);
  const approved = await action('approve-publication', { subjectSha256: prepared.payload.publication.subjectSha256 });
  assert.equal(approved.status, 200); assert.equal(approved.payload.publication.state, 'approved');
  const started = await action('publish'); assert.equal(started.status, 202); assert.equal(started.payload.publication.state, 'publishing');
  let publication;
  for (let i = 0; i < 100; i++) {
    const response = await fetch(`${address.origin}/api/runs/${runId}`, { headers: { Cookie: cookie } }); publication = (await response.json()).run.publication;
    if (publication.state !== 'publishing') break; await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.equal(publication.state, 'published', JSON.stringify(publication)); assert.match(publication.providerRef, /^local-git:/);
  const remoteCommit = git(root, ['--git-dir', remote, 'rev-parse', `refs/heads/${publication.subject.headBranch}`]);
  assert.notEqual(remoteCommit, baseRevision); assert.equal(git(root, ['--git-dir', remote, 'show', `${remoteCommit}:README.md`]), 'after');
  assert.equal(git(root, ['--git-dir', remote, 'show', `${baseRevision}:README.md`]), 'before');
  assert.equal(existsSync(join(publicationRoot, publication.operationId, 'receipt.json')), true);
  await assert.rejects(() => localPublisher.publish({ projectRoot: source, worktreeRoot: worktree,
    diff: { added: [{ path: '.git/config', bytes: 1, sha256: '3'.repeat(64) }], modified: [], deleted: [] },
    subject: { ...publication.subject, headBranch: 'codex/speccontrol/metadata-path' }, operationId: 'publish-metadata-path' }),
    /PUBLICATION_GIT_METADATA_PATH_NOT_ALLOWED/);
  await assert.rejects(() => localPublisher.publish({ projectRoot: source, worktreeRoot: worktree, diff,
    subject: publication.subject, operationId: 'publish-duplicate-local' }), /PUBLICATION_HEAD_ALREADY_EXISTS/);
  const replay = await action('publish'); assert.equal(replay.status, 409); assert.equal(replay.payload.error, 'PUBLICATION_NOT_EXACTLY_APPROVED');
});
