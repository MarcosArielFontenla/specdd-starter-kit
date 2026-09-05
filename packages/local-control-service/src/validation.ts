import { createHash } from 'node:crypto';
import { lstatSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, parse, relative, resolve } from 'node:path';
import type { DeveloperArtifact, ExecutionBinding, PlanArtifact, PlannerReceipt, PlanningTask, PublicationBinding, PublicationSource, PublicationSubject, ReviewArtifact } from './types.js';

export function safeId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length > 80 || !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(value))
    throw new Error(`INVALID_${label.toUpperCase()}_ID`);
  return value;
}
export function pathsOverlap(firstValue: string, secondValue: string): boolean {
  const first = resolve(firstValue), second = resolve(secondValue);
  const contains = (parent: string, child: string) => {
    const path = relative(parent, child); return path === '' || (!path.startsWith('..') && !isAbsolute(path));
  };
  return contains(first, second) || contains(second, first);
}
export function planningTask(value: unknown): PlanningTask {
  if (!value || typeof value !== 'object') throw new Error('INVALID_TASK');
  const { title, description } = value as Record<string, unknown>;
  if (typeof title !== 'string' || title.trim().length < 3 || title.length > 160) throw new Error('INVALID_TASK_TITLE');
  if (typeof description !== 'string' || description.trim().length < 10 || description.length > 4000) throw new Error('INVALID_TASK_DESCRIPTION');
  return { title: title.trim(), description: description.trim() };
}
export function projectRoot(value: string): string {
  const root = realpathSync(resolve(value));
  if (root === parse(root).root || !lstatSync(root).isDirectory()) throw new Error('INVALID_PROJECT_ROOT');
  let current = root;
  while (true) {
    if (lstatSync(current).isSymbolicLink()) throw new Error('PROJECT_ROOT_LINK_NOT_ALLOWED');
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return root;
}
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  return '{' + Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => JSON.stringify(key) + ':' + canonicalJson(item)).join(',') + '}';
}
export function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}
export function planArtifact(value: unknown): PlanArtifact {
  if (!value || typeof value !== 'object') throw new Error('INVALID_PLAN_ARTIFACT');
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== '1.0.0' || v.kind !== 'SpecControlPlanArtifact') throw new Error('INVALID_PLAN_ARTIFACT_IDENTITY');
  for (const key of ['summary', 'specMarkdown', 'planMarkdown'] as const) {
    if (typeof v[key] !== 'string' || v[key].length < 3 || v[key].length > 20000) throw new Error(`INVALID_PLAN_${key.toUpperCase()}`);
  }
  for (const key of ['assumptions', 'filesToInspect'] as const) {
    if (!Array.isArray(v[key]) || v[key].length > 100 || v[key].some(x => typeof x !== 'string' || x.length > 500))
      throw new Error(`INVALID_PLAN_${key.toUpperCase()}`);
  }
  for (const path of v.filesToInspect as string[]) {
    if (!path || path.includes('\\') || path.startsWith('/') || /^[A-Za-z]:/.test(path) ||
        path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('INVALID_PLAN_FILE_PATH');
  }
  return value as PlanArtifact;
}

export function executionBinding(value: unknown): ExecutionBinding {
  if (!value || typeof value !== 'object') throw new Error('INVALID_EXECUTION_BINDING');
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== '1.0.0' || v.kind !== 'SpecControlExecutionBinding') throw new Error('INVALID_EXECUTION_BINDING_IDENTITY');
  for (const key of ['maxSourceFiles', 'maxSourceBytes', 'roleTimeoutMs'] as const) {
    if (!Number.isInteger(v[key]) || Number(v[key]) < 1) throw new Error(`INVALID_BINDING_${key.toUpperCase()}`);
  }
  if (Number(v.maxSourceFiles) > 20000 || Number(v.maxSourceBytes) > 200 * 1024 * 1024 || Number(v.roleTimeoutMs) > 10 * 60 * 1000)
    throw new Error('EXECUTION_BINDING_LIMIT_EXCEEDED');
  for (const key of ['developerModel', 'reviewerModel'] as const) {
    if (typeof v[key] !== 'string' || !/^[a-z0-9][a-z0-9.-]{1,80}$/.test(v[key])) throw new Error(`INVALID_BINDING_${key.toUpperCase()}`);
  }
  if (!Array.isArray(v.checks) || v.checks.length < 1 || v.checks.length > 10) throw new Error('INVALID_BINDING_CHECKS');
  const ids = new Set<string>();
  for (const item of v.checks) {
    if (!item || typeof item !== 'object') throw new Error('INVALID_BINDING_CHECK');
    const check = item as Record<string, unknown>, id = safeId(check.id, 'check');
    if (ids.has(id)) throw new Error('DUPLICATE_BINDING_CHECK'); ids.add(id);
    if (typeof check.executable !== 'string' || !/^(?:[A-Za-z]:[\\/]|\\\\)/.test(check.executable) ||
        !lstatSync(realpathSync(check.executable)).isFile()) throw new Error('INVALID_CHECK_EXECUTABLE');
    if (!Array.isArray(check.args) || check.args.length > 40 || check.args.some(arg => typeof arg !== 'string' || arg.length > 500 || /[\0\r\n]/.test(arg)))
      throw new Error('INVALID_CHECK_ARGS');
    if (!Number.isInteger(check.timeoutMs) || Number(check.timeoutMs) < 100 || Number(check.timeoutMs) > 10 * 60 * 1000)
      throw new Error('INVALID_CHECK_TIMEOUT');
  }
  return value as ExecutionBinding;
}

export function developerArtifact(value: unknown): DeveloperArtifact {
  if (!value || typeof value !== 'object') throw new Error('INVALID_DEVELOPER_ARTIFACT');
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== '1.0.0' || v.kind !== 'SpecControlDeveloperArtifact' || typeof v.summary !== 'string' ||
      v.summary.length < 3 || v.summary.length > 10000) throw new Error('INVALID_DEVELOPER_ARTIFACT');
  for (const key of ['changedFiles', 'limitations'] as const) {
    if (!Array.isArray(v[key]) || v[key].length > 100 || v[key].some(x => typeof x !== 'string' || x.length > 500))
      throw new Error(`INVALID_DEVELOPER_${key.toUpperCase()}`);
  }
  for (const path of v.changedFiles as string[]) safeRelativePath(path);
  return value as DeveloperArtifact;
}

export function reviewArtifact(value: unknown): ReviewArtifact {
  if (!value || typeof value !== 'object') throw new Error('INVALID_REVIEW_ARTIFACT');
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== '1.0.0' || v.kind !== 'SpecControlReviewArtifact' || !['pass', 'fail'].includes(String(v.verdict)) ||
      typeof v.summary !== 'string' || v.summary.length < 3 || v.summary.length > 10000 || !Array.isArray(v.findings) || v.findings.length > 100)
    throw new Error('INVALID_REVIEW_ARTIFACT');
  for (const item of v.findings) {
    if (!item || typeof item !== 'object') throw new Error('INVALID_REVIEW_FINDING');
    const finding = item as Record<string, unknown>;
    if (!['blocking', 'non-blocking'].includes(String(finding.severity)) || typeof finding.message !== 'string' ||
        finding.message.length < 3 || finding.message.length > 2000) throw new Error('INVALID_REVIEW_FINDING');
    safeRelativePath(finding.path);
  }
  if (v.verdict === 'pass' && (v.findings as Array<{ severity: string }>).some(x => x.severity === 'blocking'))
    throw new Error('PASS_WITH_BLOCKING_FINDING');
  return value as ReviewArtifact;
}

export function safeRelativePath(path: unknown): string {
  if (typeof path !== 'string' || !path || path.length > 500 || /[\0\r\n]/.test(path) || path.includes('\\') || path.startsWith('/') || /^[A-Za-z]:/.test(path) ||
      path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('INVALID_RELATIVE_PATH');
  return path;
}

export function plannerReceipt(value: unknown): PlannerReceipt {
  if (!value || typeof value !== 'object') throw new Error('INVALID_ROLE_RECEIPT');
  const v = value as Record<string, unknown>;
  if (typeof v.runtime !== 'string' || v.runtime.length < 2 || v.runtime.length > 80 || typeof v.model !== 'string' ||
      v.model.length < 2 || v.model.length > 80 || typeof v.threadRefSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(v.threadRefSha256) ||
      typeof v.turnRefSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(v.turnRefSha256)) throw new Error('INVALID_ROLE_RECEIPT');
  return value as PlannerReceipt;
}

export function publicationBinding(value: unknown): PublicationBinding {
  if (!value || typeof value !== 'object') throw new Error('INVALID_PUBLICATION_BINDING');
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== '1.0.0' || v.kind !== 'SpecControlPublicationBinding' ||
      !((v.provider === 'github' && v.host === 'github.com') || (v.provider === 'local-git' && v.host === 'local')))
    throw new Error('INVALID_PUBLICATION_BINDING_IDENTITY');
  for (const key of ['owner', 'repository'] as const) {
    if (typeof v[key] !== 'string' || !/^[A-Za-z0-9_.-]{1,100}$/.test(v[key]) || v[key] === '.' || v[key] === '..')
      throw new Error(`INVALID_PUBLICATION_${key.toUpperCase()}`);
  }
  if (typeof v.remoteName !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(v.remoteName)) throw new Error('INVALID_PUBLICATION_REMOTE');
  if (!validGitRefPart(v.baseBranch)) throw new Error('INVALID_PUBLICATION_BASEBRANCH');
  if (typeof v.headPrefix !== 'string' || !v.headPrefix.endsWith('/') || !validGitRefPart(`${v.headPrefix}probe`))
    throw new Error('INVALID_PUBLICATION_HEADPREFIX');
  if (v.provider === 'github' && v.localRemotePath !== null) throw new Error('INVALID_PUBLICATION_LOCAL_REMOTE');
  if (v.provider === 'local-git') {
    if (typeof v.localRemotePath !== 'string' || /^[\\/]{2}/.test(v.localRemotePath) || !isAbsolute(v.localRemotePath) ||
        resolve(v.localRemotePath) === parse(resolve(v.localRemotePath)).root)
      throw new Error('INVALID_PUBLICATION_LOCAL_REMOTE');
  }
  return value as PublicationBinding;
}

export function publicationSource(value: unknown): PublicationSource {
  if (!value || typeof value !== 'object') throw new Error('INVALID_PUBLICATION_SOURCE');
  const v = value as Record<string, unknown>;
  if (typeof v.baseRevision !== 'string' || !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(v.baseRevision)) throw new Error('INVALID_PUBLICATION_BASE_REVISION');
  if (typeof v.remoteUrl !== 'string' || v.remoteUrl.length < 10 || v.remoteUrl.length > 500 || /[\0\r\n]/.test(v.remoteUrl)) throw new Error('INVALID_PUBLICATION_REMOTE_URL');
  if (typeof v.headBranch !== 'string' || !validGitRefPart(v.headBranch)) throw new Error('INVALID_PUBLICATION_HEAD_BRANCH');
  return value as PublicationSource;
}

export function publicationRemoteMatches(binding: PublicationBinding, remoteUrl: string): boolean {
  if (binding.provider === 'local-git') {
    if (!binding.localRemotePath || !isAbsolute(remoteUrl)) return false;
    return resolve(binding.localRemotePath).toLowerCase() === resolve(remoteUrl).toLowerCase();
  }
  const expected = `${binding.owner}/${binding.repository}`.toLowerCase();
  const value = remoteUrl.trim().replace(/\.git$/i, '');
  const https = /^https:\/\/github\.com\/([^/]+\/[^/]+)$/i.exec(value);
  const ssh = /^git@github\.com:([^/]+\/[^/]+)$/i.exec(value);
  const sshUrl = /^ssh:\/\/git@github\.com\/([^/]+\/[^/]+)$/i.exec(value);
  return [https?.[1], ssh?.[1], sshUrl?.[1]].some(candidate => candidate?.toLowerCase() === expected);
}
export const githubRemoteMatches = publicationRemoteMatches;

export function publicationSubject(value: unknown): PublicationSubject {
  if (!value || typeof value !== 'object') throw new Error('INVALID_PUBLICATION_SUBJECT');
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== '1.0.0' || v.kind !== 'SpecControlPublicationSubject' ||
      !((v.provider === 'github' && v.host === 'github.com') || (v.provider === 'local-git' && v.host === 'local')) ||
      v.draft !== true) throw new Error('INVALID_PUBLICATION_SUBJECT_IDENTITY');
  safeId(v.runId, 'run'); safeId(v.projectId, 'project');
  if (!Number.isInteger(v.executionAttempt) || Number(v.executionAttempt) < 1) throw new Error('INVALID_PUBLICATION_EXECUTION_ATTEMPT');
  for (const key of ['projectRootSha256', 'artifactSha256', 'executionBindingSha256', 'baselineSha256', 'diffSha256', 'evidenceSha256', 'publicationBindingSha256'] as const)
    if (typeof v[key] !== 'string' || !/^[a-f0-9]{64}$/.test(v[key])) throw new Error(`INVALID_PUBLICATION_${key.toUpperCase()}`);
  publicationBinding({ schemaVersion: '1.0.0', kind: 'SpecControlPublicationBinding', provider: v.provider, host: v.host,
    owner: v.owner, repository: v.repository, remoteName: v.remoteName, baseBranch: v.baseBranch,
    headPrefix: `${String(v.headBranch).split('/').slice(0, -1).join('/')}/`, localRemotePath: v.localRemotePath });
  publicationSource({ baseRevision: v.baseRevision, remoteUrl: v.remoteUrl, headBranch: v.headBranch });
  return value as PublicationSubject;
}

function validGitRefPart(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 && !value.startsWith('/') && !value.endsWith('/') && !value.endsWith('.') &&
    !value.includes('..') && !value.includes('//') && !value.includes('@{') && !/[~^:?*[\\\s\x00-\x1f\x7f]/.test(value) &&
    !value.split('/').some(part => part.startsWith('.') || part.toLowerCase().endsWith('.lock'));
}
