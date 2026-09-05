import test from 'node:test';
import assert from 'node:assert/strict';
import { GitHubCliGateway, GitHubDraftPublisher, canonicalJson, sha256 } from '../dist/index.js';

const expectedHead = '7'.repeat(40);
const subject = {
  schemaVersion: '1.0.0', kind: 'SpecControlPublicationSubject', runId: 'run-github', projectId: 'fixture', executionAttempt: 1,
  projectRootSha256: '1'.repeat(64), artifactSha256: '2'.repeat(64), executionBindingSha256: '3'.repeat(64),
  baselineSha256: '4'.repeat(64), diffSha256: '5'.repeat(64), evidenceSha256: '6'.repeat(64),
  publicationBindingSha256: '8'.repeat(64), provider: 'github', host: 'github.com', owner: 'specdd-fixtures',
  repository: 'sample', remoteName: 'origin', remoteUrl: 'https://github.com/specdd-fixtures/sample.git',
  baseBranch: 'main', baseRevision: '9'.repeat(40), headBranch: 'codex/speccontrol/run-github-a1', localRemotePath: null, draft: true,
};
const diff = { added: [], modified: [], deleted: [] };
const operationId = 'publish-operation-one';
const marker = `<!-- speccontrol-operation:${operationId};subject:${sha256(canonicalJson(subject))} -->`;

function pullRequest(overrides = {}) {
  return { number: 17, url: 'https://github.com/specdd-fixtures/sample/pull/17', isDraft: true, state: 'OPEN',
    headRefName: subject.headBranch, baseRefName: subject.baseBranch, headRefOid: expectedHead, body: marker, ...overrides };
}

function fakeRemote(initial = {}) {
  const state = { branchRevision: null, pullRequests: [], creates: 0, pushes: 0, ...initial };
  const invocations = [];
  const transport = { async run(invocation) {
    invocations.push(structuredClone(invocation));
    if (invocation.args[0] === 'api') {
      const rows = state.branchRevision ? [{ ref: `refs/heads/${subject.headBranch}`, object: { sha: state.branchRevision } }] : [];
      return { exitCode: 0, stdout: JSON.stringify(rows), stderr: '' };
    }
    if (invocation.args[0] === 'pr' && invocation.args[1] === 'list')
      return { exitCode: 0, stdout: JSON.stringify(state.pullRequests), stderr: '' };
    if (invocation.args[0] === 'pr' && invocation.args[1] === 'create') {
      state.creates += 1; state.pullRequests = [pullRequest()];
      return { exitCode: 0, stdout: `${pullRequest().url}\n`, stderr: '' };
    }
    throw new Error('UNEXPECTED_FAKE_INVOCATION');
  } };
  const branches = { async prepare() { return { headRevision: expectedHead, async push() {
    state.pushes += 1; state.branchRevision = expectedHead;
  } }; } };
  return { state, invocations, gateway: new GitHubCliGateway(transport), branches };
}

function input(prepared = () => {}) {
  return { projectRoot: 'C:\\fixture', worktreeRoot: 'C:\\fixture-worktree', diff, subject,
    operationId, prepared };
}

test('GitHub draft adapter publishes through injected offline boundaries and pins the exact head first', async () => {
  const remote = fakeRemote(), events = [];
  const branches = { async prepare() { events.push('prepare'); return { headRevision: expectedHead, async push() {
    events.push('push'); remote.state.pushes += 1; remote.state.branchRevision = expectedHead;
  } }; } };
  const gateway = new GitHubCliGateway({ async run(invocation) {
    events.push(invocation.args.slice(0, 2).join(' ')); return remote.gateway.transport.run(invocation);
  } });
  const publisher = new GitHubDraftPublisher({ gateway, branches });
  const result = await publisher.publish(input(head => { events.push('pin'); assert.equal(head, expectedHead); }));
  assert.equal(result.providerRef, pullRequest().url); assert.match(result.receiptSha256, /^[a-f0-9]{64}$/);
  assert.equal(remote.state.pushes, 1); assert.equal(remote.state.creates, 1);
  assert.ok(events.indexOf('pin') < events.indexOf('push'));
  const create = remote.invocations.find(call => call.args[0] === 'pr' && call.args[1] === 'create');
  assert.ok(create); assert.ok(create.args.includes('--draft')); assert.deepEqual(create.args.slice(-2), ['--body-file', '-']);
  assert.match(create.stdin, /SpecControl approved publication/); assert.ok(create.stdin.includes(marker));
  assert.equal(remote.invocations.some(call => call.args.some(arg => /token|secret|password/i.test(arg))), false);
});

test('GitHub draft adapter is idempotent for one exact existing open draft', async () => {
  const remote = fakeRemote({ branchRevision: expectedHead, pullRequests: [pullRequest()] });
  const publisher = new GitHubDraftPublisher({ gateway: remote.gateway, branches: remote.branches });
  const first = await publisher.publish(input()), second = await publisher.publish(input());
  assert.deepEqual(first, second); assert.equal(remote.state.pushes, 0); assert.equal(remote.state.creates, 0);
});

test('GitHub reconciliation distinguishes published, absent and conflicting remote state', async (t) => {
  const cases = [
    { name: 'published', initial: { branchRevision: expectedHead, pullRequests: [pullRequest()] }, expected: 'published' },
    { name: 'absent', initial: {}, expected: 'absent' },
    { name: 'wrong branch revision', initial: { branchRevision: 'a'.repeat(40) }, expected: 'conflict' },
    { name: 'closed draft', initial: { branchRevision: expectedHead, pullRequests: [pullRequest({ state: 'CLOSED' })] }, expected: 'conflict' },
    { name: 'non-draft PR', initial: { branchRevision: expectedHead, pullRequests: [pullRequest({ isDraft: false })] }, expected: 'conflict' },
    { name: 'different operation marker', initial: { branchRevision: expectedHead,
      pullRequests: [pullRequest({ body: '<!-- speccontrol-operation:other;subject:wrong -->' })] }, expected: 'conflict' },
  ];
  for (const item of cases) await t.test(item.name, async () => {
    const remote = fakeRemote(item.initial), publisher = new GitHubDraftPublisher({ gateway: remote.gateway, branches: remote.branches });
    const result = await publisher.reconcile({ subject, operationId, expectedHeadRevision: expectedHead });
    assert.equal(result.status, item.expected);
  });
});

test('pre-head GitHub reconciliation returns absent only for an empty exact remote state', async (t) => {
  const cases = [
    { name: 'branch and PR absent', initial: {}, expected: 'absent' },
    { name: 'branch present', initial: { branchRevision: expectedHead }, expected: 'conflict' },
    { name: 'PR present without branch', initial: { pullRequests: [pullRequest()] }, expected: 'conflict' },
  ];
  for (const item of cases) await t.test(item.name, async () => {
    const remote = fakeRemote(item.initial), publisher = new GitHubDraftPublisher({ gateway: remote.gateway, branches: remote.branches });
    const result = await publisher.reconcile({ subject, operationId, expectedHeadRevision: null });
    assert.equal(result.status, item.expected);
  });
});

test('GitHub adapter fails closed on additional PRs, malformed JSON and mismatched create URLs', async () => {
  const conflict = fakeRemote({ branchRevision: expectedHead, pullRequests: [pullRequest(), pullRequest({ number: 18,
    url: 'https://github.com/specdd-fixtures/sample/pull/18', state: 'CLOSED' })] });
  await assert.rejects(() => new GitHubDraftPublisher({ gateway: conflict.gateway, branches: conflict.branches }).publish(input()),
    /GITHUB_PUBLICATION_CONFLICT/);
  const oversized = new GitHubCliGateway({ async run() { return { exitCode: 0, stdout: 'x'.repeat(256 * 1024 + 1), stderr: '' }; } });
  await assert.rejects(() => oversized.observe(subject), /GITHUB_BRANCH_RESPONSE_INVALID/);
  const badUrl = new GitHubCliGateway({ async run(invocation) {
    if (invocation.args[1] === 'create') return { exitCode: 0, stdout: 'https://github.com/other/repo/pull/1', stderr: '' };
    return { exitCode: 0, stdout: '[]', stderr: '' };
  } });
  await assert.rejects(() => badUrl.createDraft(subject, operationId), /GITHUB_DRAFT_PR_RESPONSE_INVALID/);
});
