import type { PublicationSubject, Publisher, PublisherResult, WorkspaceDiff } from './types.js';
import { canonicalJson, publicationSubject, sha256 } from './validation.js';

export interface CliInvocation { args: string[]; stdin?: string; signal?: AbortSignal }
export interface CliResult { exitCode: number; stdout: string; stderr: string }
export interface GitHubCliTransport { run(invocation: CliInvocation): Promise<CliResult> }
export interface GitHubPullRequestObservation {
  number: number; url: string; isDraft: boolean; state: string; headRefName: string; baseRefName: string; headRefOid: string; body: string;
}
export interface GitHubObservation { branchRevision: string | null; pullRequests: GitHubPullRequestObservation[] }
export interface PreparedRemoteBranch { headRevision: string; push(signal?: AbortSignal): Promise<void> }
export interface RemoteBranchPreparer {
  prepare(input: { projectRoot: string; worktreeRoot: string; diff: WorkspaceDiff; subject: PublicationSubject;
    operationId: string; signal?: AbortSignal }): Promise<PreparedRemoteBranch>;
}

export class GitHubCliGateway {
  constructor(readonly transport: GitHubCliTransport) {}
  async observe(subject: PublicationSubject, signal?: AbortSignal): Promise<GitHubObservation> {
    githubSubject(subject); const repo = `${subject.owner}/${subject.repository}`;
    const encodedHead = encodeURIComponent(subject.headBranch);
    const branchResult = await this.transport.run({ args: ['api', '--method', 'GET',
      `repos/${repo}/git/matching-refs/heads/${encodedHead}`], ...(signal ? { signal } : {}) });
    if (branchResult.exitCode !== 0) throw new Error('GITHUB_BRANCH_OBSERVATION_FAILED');
    const branchRows = parseArray(branchResult.stdout, 'GITHUB_BRANCH_RESPONSE_INVALID');
    const exactRef = `refs/heads/${subject.headBranch}`;
    const exactBranches = branchRows.filter(row => record(row).ref === exactRef);
    if (exactBranches.length > 1) throw new Error('GITHUB_BRANCH_RESPONSE_INVALID');
    const branchRevision = exactBranches.length === 0 ? null : revision(record(record(exactBranches[0]).object).sha);
    const prResult = await this.transport.run({ args: ['pr', 'list', '--repo', repo, '--state', 'all', '--head', subject.headBranch,
      '--base', subject.baseBranch, '--limit', '10', '--json', 'number,url,isDraft,state,headRefName,baseRefName,headRefOid,body'],
      ...(signal ? { signal } : {}) });
    if (prResult.exitCode !== 0) throw new Error('GITHUB_PR_OBSERVATION_FAILED');
    const rows = parseArray(prResult.stdout, 'GITHUB_PR_RESPONSE_INVALID');
    if (rows.length > 10) throw new Error('GITHUB_PR_RESPONSE_INVALID');
    const pullRequests = rows.map(row => pullRequest(record(row), subject));
    return { branchRevision, pullRequests };
  }
  async createDraft(subject: PublicationSubject, operationId: string, signal?: AbortSignal): Promise<string> {
    githubSubject(subject); operation(operationId); const repo = `${subject.owner}/${subject.repository}`;
    const body = `${operationMarker(subject, operationId)}\n\nSpecControl approved publication\n\n- Run: ${subject.runId}\n- Attempt: ${subject.executionAttempt}\n- Subject: ${sha256(canonicalJson(subject))}\n- Diff: ${subject.diffSha256}\n- Evidence: ${subject.evidenceSha256}\n`;
    const result = await this.transport.run({ args: ['pr', 'create', '--draft', '--repo', repo, '--base', subject.baseBranch,
      '--head', subject.headBranch, '--title', `SpecControl: ${subject.runId}`, '--body-file', '-'], stdin: body,
      ...(signal ? { signal } : {}) });
    if (result.exitCode !== 0) throw new Error('GITHUB_DRAFT_PR_CREATE_FAILED');
    const url = result.stdout.trim();
    if (!exactPullRequestUrl(url, subject)) throw new Error('GITHUB_DRAFT_PR_RESPONSE_INVALID');
    return url;
  }
}

export class GitHubDraftPublisher implements Publisher {
  constructor(readonly options: { gateway: GitHubCliGateway; branches: RemoteBranchPreparer }) {}
  async publish(input: Parameters<Publisher['publish']>[0]): Promise<PublisherResult> {
    githubSubject(input.subject); operation(input.operationId);
    const prepared = await this.options.branches.prepare(input);
    const expectedHead = revision(prepared.headRevision); input.prepared(expectedHead);
    let observation = await this.options.gateway.observe(input.subject, input.signal);
    const existing = exactPullRequest(observation, input.subject, input.operationId, expectedHead);
    if (existing) return receipt(input.subject, input.operationId, expectedHead, existing);
    if (observation.pullRequests.length > 0 || (observation.branchRevision && observation.branchRevision !== expectedHead))
      throw new Error('GITHUB_PUBLICATION_CONFLICT');
    if (!observation.branchRevision) await prepared.push(input.signal);
    observation = await this.options.gateway.observe(input.subject, input.signal);
    if (observation.branchRevision !== expectedHead || observation.pullRequests.length > 0) throw new Error('GITHUB_BRANCH_RECONCILIATION_FAILED');
    await this.options.gateway.createDraft(input.subject, input.operationId, input.signal);
    observation = await this.options.gateway.observe(input.subject, input.signal);
    const created = exactPullRequest(observation, input.subject, input.operationId, expectedHead);
    if (!created) throw new Error('GITHUB_DRAFT_PR_RECONCILIATION_FAILED');
    return receipt(input.subject, input.operationId, expectedHead, created);
  }
  async reconcile(input: { subject: PublicationSubject; operationId: string; expectedHeadRevision: string | null }) {
    githubSubject(input.subject); operation(input.operationId);
    const observation = await this.options.gateway.observe(input.subject);
    if (input.expectedHeadRevision === null)
      return !observation.branchRevision && observation.pullRequests.length === 0
        ? { status: 'absent' as const }
        : { status: 'conflict' as const };
    const expectedHead = revision(input.expectedHeadRevision);
    const published = exactPullRequest(observation, input.subject, input.operationId, expectedHead);
    if (published) return { status: 'published' as const, result: receipt(input.subject, input.operationId, expectedHead, published) };
    if (!observation.branchRevision && observation.pullRequests.length === 0) return { status: 'absent' as const };
    return { status: 'conflict' as const };
  }
}

function exactPullRequest(observation: GitHubObservation, subject: PublicationSubject, operationId: string,
    headRevision: string): GitHubPullRequestObservation | null {
  const exact = observation.pullRequests.filter(pr => pr.isDraft && pr.state.toUpperCase() === 'OPEN' &&
    pr.headRefName === subject.headBranch && pr.baseRefName === subject.baseBranch && pr.headRefOid === headRevision &&
    pr.body.includes(operationMarker(subject, operationId)));
  if (exact.length > 1) throw new Error('GITHUB_MULTIPLE_DRAFT_PRS');
  if (exact.length === 1 && (observation.pullRequests.length !== 1 || observation.branchRevision !== headRevision))
    throw new Error('GITHUB_PUBLICATION_CONFLICT');
  return exact[0] ?? null;
}
function receipt(subject: PublicationSubject, operationId: string, headRevision: string, pr: GitHubPullRequestObservation): PublisherResult {
  const value = { schemaVersion: '1.0.0', kind: 'SpecControlGitHubPublicationReceipt', operationId,
    subjectSha256: sha256(canonicalJson(subject)), repository: `${subject.owner}/${subject.repository}`,
    baseBranch: subject.baseBranch, headBranch: subject.headBranch, headRevision, pullRequestNumber: pr.number,
    pullRequestUrl: pr.url, draft: true };
  return { providerRef: pr.url, receiptSha256: sha256(canonicalJson(value)) };
}
function githubSubject(subject: PublicationSubject): void {
  publicationSubject(subject);
  if (subject.provider !== 'github' || subject.host !== 'github.com' || subject.localRemotePath !== null || subject.draft !== true)
    throw new Error('GITHUB_SUBJECT_REQUIRED');
}
function pullRequest(row: Record<string, unknown>, subject: PublicationSubject): GitHubPullRequestObservation {
  if (!Number.isInteger(row.number) || Number(row.number) < 1 || typeof row.url !== 'string' ||
      !exactPullRequestUrl(row.url, subject) ||
      typeof row.isDraft !== 'boolean' || typeof row.state !== 'string' || typeof row.headRefName !== 'string' ||
      typeof row.baseRefName !== 'string' || typeof row.headRefOid !== 'string' || typeof row.body !== 'string' || row.body.length > 65536)
    throw new Error('GITHUB_PR_RESPONSE_INVALID');
  return { number: Number(row.number), url: row.url, isDraft: row.isDraft, state: row.state,
    headRefName: row.headRefName, baseRefName: row.baseRefName, headRefOid: revision(row.headRefOid), body: row.body };
}
function operationMarker(subject: PublicationSubject, operationId: string): string {
  return `<!-- speccontrol-operation:${operationId};subject:${sha256(canonicalJson(subject))} -->`;
}
function operation(value: string): void {
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(value)) throw new Error('INVALID_PUBLICATION_OPERATION');
}
function exactPullRequestUrl(value: string, subject: PublicationSubject): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.toLowerCase() === 'github.com' && url.username === '' && url.password === '' &&
      url.port === '' && url.search === '' && url.hash === '' &&
      new RegExp(`^/${escapeRegex(subject.owner)}/${escapeRegex(subject.repository)}/pull/[1-9][0-9]*$`, 'i').test(url.pathname);
  } catch { return false; }
}
function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function revision(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(value)) throw new Error('INVALID_GITHUB_REVISION');
  return value;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('GITHUB_RESPONSE_INVALID');
  return value as Record<string, unknown>;
}
function parseArray(value: string, error: string): unknown[] {
  if (value.length > 256 * 1024) throw new Error(error);
  try { const parsed = JSON.parse(value); if (!Array.isArray(parsed)) throw new Error(error); return parsed; }
  catch { throw new Error(error); }
}
