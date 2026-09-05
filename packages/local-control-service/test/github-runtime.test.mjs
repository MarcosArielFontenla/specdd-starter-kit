import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BoundedGitHubCliTransport, GitHubBranchPreparer, GitHubCliGateway, GitHubGitPusher, sha256 } from '../dist/index.js';

const locator = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['git'], { encoding: 'utf8' });
const gitExecutable = locator.status === 0 ? locator.stdout.split(/\r?\n/).find(Boolean) : undefined;

function fixture(t, prefix) {
  const parent = realpathSync(tmpdir()), root = mkdtempSync(join(parent, prefix));
  t.after(() => { assert.equal(dirname(realpathSync(root)), parent); rmSync(root, { recursive: true }); });
  return root;
}
function git(cwd, args) {
  const result = spawnSync(gitExecutable, args, { cwd, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
}
function githubSubject(baseRevision, overrides = {}) {
  return { schemaVersion: '1.0.0', kind: 'SpecControlPublicationSubject', runId: 'run-runtime', projectId: 'fixture', executionAttempt: 1,
    projectRootSha256: '1'.repeat(64), artifactSha256: '2'.repeat(64), executionBindingSha256: '3'.repeat(64),
    baselineSha256: '4'.repeat(64), diffSha256: '5'.repeat(64), evidenceSha256: '6'.repeat(64),
    publicationBindingSha256: '8'.repeat(64), provider: 'github', host: 'github.com', owner: 'specdd-fixtures', repository: 'sample',
    remoteName: 'origin', remoteUrl: 'https://github.com/specdd-fixtures/sample.git', baseBranch: 'main', baseRevision,
    headBranch: 'codex/speccontrol/run-runtime-a1', localRemotePath: null, draft: true, ...overrides };
}

test('bounded GitHub CLI transport executes only the adapter allowlist through a fake local process', async (t) => {
  const root = fixture(t, 'speccontrol-fake-gh-'), script = join(root, 'fake-gh.mjs');
  writeFileSync(script, `let body=''; for await (const chunk of process.stdin) body += chunk;
const args=process.argv.slice(2);
if(args[0]==='api') console.log('[]');
else if(args[0]==='pr'&&args[1]==='list') console.log('[]');
else if(args[0]==='pr'&&args[1]==='create'&&body.includes('speccontrol-operation:publish-operation-one')) console.log('https://github.com/specdd-fixtures/sample/pull/17');
else process.exitCode=9;\n`);
  const transport = new BoundedGitHubCliTransport({ executable: process.execPath, fixedArgs: [script], timeoutMs: 2000 });
  const gateway = new GitHubCliGateway(transport), subject = githubSubject('9'.repeat(40));
  assert.deepEqual(await gateway.observe(subject), { branchRevision: null, pullRequests: [] });
  assert.equal(await gateway.createDraft(subject, 'publish-operation-one'), 'https://github.com/specdd-fixtures/sample/pull/17');
  assert.throws(() => transport.run({ args: ['auth', 'status'] }), /GITHUB_CLI_INVOCATION_NOT_ALLOWED/);
  assert.throws(() => transport.run({ args: ['pr', 'create'], stdin: 'unsafe' }), /GITHUB_CLI_INVOCATION_NOT_ALLOWED/);
  assert.throws(() => transport.run({ args: ['api', '--method', 'GET', 'repos/../sample/git/matching-refs/heads/main'] }),
    /GITHUB_CLI_INVOCATION_NOT_ALLOWED/);
  assert.throws(() => transport.run({ args: ['api', '--method', 'GET', 'repos/specdd-fixtures/sample/git/matching-refs/heads/main%0Aevil'] }),
    /GITHUB_CLI_INVOCATION_NOT_ALLOWED/);
});

test('bounded process enforces timeout and output limits without invoking GitHub', async (t) => {
  const root = fixture(t, 'speccontrol-fake-gh-limits-'), slow = join(root, 'slow.mjs'), loud = join(root, 'loud.mjs');
  writeFileSync(slow, `setTimeout(() => console.log('[]'), 5000);\n`);
  writeFileSync(loud, `process.stdout.write('x'.repeat(300000));\n`);
  const invocation = { args: ['api', '--method', 'GET', 'repos/specdd-fixtures/sample/git/matching-refs/heads/main'] };
  const slowTransport = new BoundedGitHubCliTransport({ executable: process.execPath, fixedArgs: [slow], timeoutMs: 100 });
  await assert.rejects(() => slowTransport.run(invocation), /RUNTIME_TIMEOUT/);
  const loudTransport = new BoundedGitHubCliTransport({ executable: process.execPath, fixedArgs: [loud], timeoutMs: 2000 });
  await assert.rejects(() => loudTransport.run(invocation), /RUNTIME_OUTPUT_LIMIT_EXCEEDED/);
});

test('GitHub branch preparer creates an exact commit locally and delegates one create-only push', { skip: !gitExecutable }, async (t) => {
  const root = fixture(t, 'speccontrol-github-branch-'), source = join(root, 'source'), worktree = join(root, 'worktree');
  const publicationRoot = join(root, 'publication'), remote = join(root, 'remote.git'); mkdirSync(source); mkdirSync(worktree);
  git(root, ['init', '--bare', remote]); git(source, ['init', '-b', 'main']);
  git(source, ['config', 'user.name', 'SpecControl Test']); git(source, ['config', 'user.email', 'test@invalid.local']);
  git(source, ['config', 'core.longpaths', 'true']);
  const before = Buffer.from('before\n'), after = Buffer.from('after\n'); writeFileSync(join(source, 'README.md'), before);
  const longRelative = join('backend', 'src', 'Bloom.Infrastructure', 'Persistence', 'Migrations',
    '20260610205837_AddAppointmentReminderSentAt.Designer.cs');
  mkdirSync(dirname(join(source, longRelative)), { recursive: true }); writeFileSync(join(source, longRelative), 'tracked long path\n');
  git(source, ['add', 'README.md', longRelative]); git(source, ['-c', 'commit.gpgsign=false', 'commit', '-m', 'baseline']);
  git(source, ['remote', 'add', 'origin', 'https://github.com/specdd-fixtures/sample.git']);
  const baseRevision = git(source, ['rev-parse', 'HEAD']); writeFileSync(join(worktree, 'README.md'), after);
  const subject = githubSubject(baseRevision), diff = { added: [], modified: [{ path: 'README.md', bytes: after.length,
    sha256: sha256(after), beforeSha256: sha256(before) }], deleted: [] };
  let pushes = 0;
  const pusher = { async push(input) {
    pushes += 1; assert.equal(input.subject, subject);
    const ref = `refs/heads/${subject.headBranch}`;
    git(input.checkout, ['push', `--force-with-lease=${ref}:`, remote, `HEAD:${ref}`]);
  } };
  const prepared = await new GitHubBranchPreparer({ executable: gitExecutable, root: publicationRoot, pusher })
    .prepare({ projectRoot: source, worktreeRoot: worktree, diff, subject, operationId: 'publish-operation-one' });
  const checkout = join(publicationRoot, 'publish-operation-one', 'checkout');
  assert.equal(git(checkout, ['config', '--bool', 'core.longpaths']), 'true');
  assert.equal(existsSync(join(checkout, longRelative)), true);
  assert.match(prepared.headRevision, /^[a-f0-9]{40}$/); assert.notEqual(prepared.headRevision, baseRevision);
  await prepared.push(); assert.equal(pushes, 1);
  assert.equal(git(root, ['--git-dir', remote, 'rev-parse', `refs/heads/${subject.headBranch}`]), prepared.headRevision);
  assert.equal(git(root, ['--git-dir', remote, 'show', `${prepared.headRevision}:README.md`]), 'after');
  assert.equal(git(source, ['status', '--porcelain']), ''); assert.equal(git(source, ['rev-parse', 'HEAD']), baseRevision);
  writeFileSync(join(source, 'untracked.txt'), 'drift\n');
  await assert.rejects(() => new GitHubBranchPreparer({ executable: gitExecutable, root: join(root, 'publication-two'), pusher })
    .prepare({ projectRoot: source, worktreeRoot: worktree, diff, subject, operationId: 'publish-operation-two' }),
    /PROJECT_SOURCE_NOT_CLEAN/);
});

test('GitHub Git pusher builds a create-only lease command through a fake local executable', async (t) => {
  const root = fixture(t, 'speccontrol-fake-git-push-'), checkout = join(root, 'checkout'), script = join(root, 'fake-git.mjs');
  mkdirSync(checkout); const subject = githubSubject('9'.repeat(40)), ref = `refs/heads/${subject.headBranch}`;
  writeFileSync(script, `const a=process.argv.slice(2); const expected=${JSON.stringify(['-C', realpathSync(checkout), 'push', `--force-with-lease=${ref}:`, subject.remoteUrl, `HEAD:${ref}`])}; if(JSON.stringify(a)!==JSON.stringify(expected)) { console.error(JSON.stringify(a)); process.exitCode=8; }\n`);
  const pusher = new GitHubGitPusher({ executable: process.execPath, fixedArgs: [script], timeoutMs: 2000 });
  await pusher.push({ checkout, subject });
});

test('service startup wires GitHub publication flags without invoking the configured fake CLI', { skip: !gitExecutable }, async (t) => {
  const root = fixture(t, 'speccontrol-github-startup-'), project = join(root, 'project'), state = join(root, 'state');
  const publicationRoot = join(root, 'publication'), bindingPath = join(root, 'publication.json'), executionPath = join(root, 'execution.json');
  mkdirSync(project); git(project, ['init', '-b', 'main']); git(project, ['config', 'user.name', 'SpecControl Test']);
  git(project, ['config', 'user.email', 'test@invalid.local']); writeFileSync(join(project, 'README.md'), 'fixture\n');
  git(project, ['add', 'README.md']); git(project, ['-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture']);
  git(project, ['remote', 'add', 'origin', 'https://github.com/specdd-fixtures/sample.git']);
  writeFileSync(bindingPath, JSON.stringify({ schemaVersion: '1.0.0', kind: 'SpecControlPublicationBinding', provider: 'github',
    host: 'github.com', owner: 'specdd-fixtures', repository: 'sample', remoteName: 'origin', baseBranch: 'main',
    headPrefix: 'codex/speccontrol/', localRemotePath: null }));
  writeFileSync(executionPath, JSON.stringify({ schemaVersion: '1.0.0', kind: 'SpecControlExecutionBinding', maxSourceFiles: 10,
    maxSourceBytes: 100000, developerModel: 'fake-model', reviewerModel: 'fake-model', roleTimeoutMs: 1000,
    checks: [{ id: 'node-version', executable: process.execPath, args: ['--version'], timeoutMs: 1000 }] }));
  const serve = fileURLToPath(new URL('../scripts/serve.mjs', import.meta.url));
  const args = [serve, '--project-id', 'fixture', '--project-root', project, '--state-dir', state, '--codex', process.execPath,
    '--execution-binding', executionPath, '--windows-sandbox', 'unelevated', '--publication-binding', bindingPath,
    '--git', gitExecutable, '--github-cli', process.execPath, '--github-publication-root', publicationRoot, '--port', '0'];
  const child = spawn(process.execPath, args, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  await new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`STARTUP_TIMEOUT ${stderr}`)); }, 5000);
    child.stdout.on('data', chunk => {
      stdout += chunk.toString('utf8');
      if (stdout.includes('O4 publisher: github')) child.kill('SIGTERM');
    });
    child.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', () => { clearTimeout(timer); stdout.includes('O4 publisher: github') ? resolvePromise() : reject(new Error(stderr)); });
  });
  assert.match(stdout, /O4-A: enabled; O4 publisher: github/);
});
