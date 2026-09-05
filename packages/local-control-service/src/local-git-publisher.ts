import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, parse, relative, resolve } from 'node:path';
import type { Publisher, PublisherResult, WorkspaceDiff } from './types.js';
import { canonicalJson, pathsOverlap, safeId, safeRelativePath, sha256 } from './validation.js';

export class LocalGitPublisher implements Publisher {
  readonly executable: string;
  readonly root: string;
  constructor(options: { executable: string; root: string; timeoutMs?: number }) {
    if (!isAbsolute(options.executable)) throw new Error('GIT_EXECUTABLE_MUST_BE_ABSOLUTE');
    this.executable = realpathSync(resolve(options.executable));
    if (!lstatSync(this.executable).isFile()) throw new Error('GIT_EXECUTABLE_NOT_FILE');
    const absoluteRoot = resolve(options.root);
    if (absoluteRoot === parse(absoluteRoot).root) throw new Error('DEDICATED_PUBLICATION_DIRECTORY_REQUIRED');
    mkdirSync(absoluteRoot, { recursive: true }); this.root = realpathSync(absoluteRoot);
    this.timeoutMs = options.timeoutMs ?? 30000;
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs < 100 || this.timeoutMs > 120000) throw new Error('INVALID_GIT_TIMEOUT');
  }
  readonly timeoutMs: number;
  async publish(input: Parameters<Publisher['publish']>[0]): Promise<PublisherResult> {
    if (input.subject.provider !== 'local-git' || !input.subject.localRemotePath) throw new Error('LOCAL_GIT_SUBJECT_REQUIRED');
    const operationId = safeId(input.operationId, 'operation'), projectRoot = realpathSync(resolve(input.projectRoot));
    const worktreeRoot = realpathSync(resolve(input.worktreeRoot)), remote = realpathSync(resolve(input.subject.localRemotePath));
    if (!lstatSync(remote).isDirectory() || pathsOverlap(this.root, projectRoot) || pathsOverlap(this.root, worktreeRoot) ||
        pathsOverlap(this.root, remote) || pathsOverlap(remote, projectRoot) || pathsOverlap(remote, worktreeRoot))
      throw new Error('PUBLICATION_PATHS_MUST_NOT_OVERLAP');
    const operationRoot = resolve(this.root, operationId);
    const operationRelative = relative(this.root, operationRoot);
    if (operationRelative.startsWith('..') || isAbsolute(operationRelative) || existsSync(operationRoot)) throw new Error('PUBLICATION_OPERATION_ALREADY_EXISTS');
    mkdirSync(operationRoot); const checkout = join(operationRoot, 'checkout');
    await this.#git(this.root, ['clone', '--no-hardlinks', '--branch', input.subject.baseBranch, '--single-branch', remote, checkout], input.signal);
    const baseRevision = await this.#git(checkout, ['rev-parse', '--verify', 'HEAD^{commit}'], input.signal);
    if (baseRevision !== input.subject.baseRevision) throw new Error('PUBLICATION_BASE_REVISION_DRIFT');
    const existing = await this.#git(checkout, ['ls-remote', '--heads', 'origin', `refs/heads/${input.subject.headBranch}`], input.signal, true);
    if (existing !== '') throw new Error('PUBLICATION_HEAD_ALREADY_EXISTS');
    await this.#git(checkout, ['checkout', '-b', input.subject.headBranch], input.signal);
    applyPublicationDiff(checkout, worktreeRoot, input.diff, projectRoot);
    await this.#git(checkout, ['add', '--all'], input.signal);
    const staged = (await this.#git(checkout, ['diff', '--cached', '--name-only', '-z'], input.signal)).split('\0').filter(Boolean).sort();
    const expected = [...input.diff.added, ...input.diff.modified, ...input.diff.deleted].map(item => item.path).sort();
    if (canonicalJson(staged) !== canonicalJson(expected)) throw new Error('PUBLICATION_STAGED_DIFF_MISMATCH');
    const hookSink = process.platform === 'win32' ? 'NUL' : '/dev/null';
    await this.#git(checkout, ['-c', 'user.name=SpecControl Local', '-c', 'user.email=speccontrol@invalid.local',
      '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${hookSink}`, 'commit', '-m', `SpecControl ${input.subject.runId}`], input.signal);
    const commit = await this.#git(checkout, ['rev-parse', 'HEAD'], input.signal);
    if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(commit)) throw new Error('INVALID_PUBLICATION_COMMIT');
    input.prepared(commit);
    await this.#git(checkout, ['push', `--force-with-lease=refs/heads/${input.subject.headBranch}:`, 'origin',
      `HEAD:refs/heads/${input.subject.headBranch}`], input.signal);
    const receipt = { schemaVersion: '1.0.0', kind: 'SpecControlLocalPublicationReceipt', operationId,
      subjectSha256: sha256(canonicalJson(input.subject)), baseRevision, commit, headBranch: input.subject.headBranch,
      diffSha256: input.subject.diffSha256, evidenceSha256: input.subject.evidenceSha256,
      remoteSha256: sha256(remote.toLowerCase()), draftSimulation: true };
    const receiptJson = canonicalJson(receipt), receiptSha256 = sha256(receiptJson);
    writeFileSync(join(operationRoot, 'receipt.json'), receiptJson + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    return { providerRef: `local-git:${receipt.remoteSha256}#refs/heads/${input.subject.headBranch}@${commit}`, receiptSha256 };
  }
  #git(cwd: string, args: string[], signal: AbortSignal | undefined, allowEmpty = true): Promise<string> {
    const allowed = ['SystemRoot', 'WINDIR', 'ComSpec', 'PATH', 'PATHEXT', 'TEMP', 'TMP'];
    const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.some(item => item.toLowerCase() === key.toLowerCase()))),
      GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' };
    return new Promise((resolvePromise, reject) => {
      if (signal?.aborted) { reject(new Error('PUBLICATION_ABORTED')); return; }
      const child = spawn(this.executable, args, { cwd, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '', bytes = 0, settled = false;
      const finish = (error?: Error) => { if (settled) return; settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); error ? reject(error) : resolvePromise(stdout.trim()); };
      const capture = (chunk: Buffer) => { bytes += chunk.length; if (bytes > 128 * 1024) { child.kill(); finish(new Error('GIT_OUTPUT_LIMIT_EXCEEDED')); } };
      child.stdout.on('data', chunk => { capture(chunk); stdout += chunk.toString('utf8'); }); child.stderr.on('data', capture);
      child.once('error', () => finish(new Error('GIT_LAUNCH_FAILED')));
      child.once('close', code => code !== 0 ? finish(new Error(`GIT_PUBLICATION_FAILED_${String(code)}`)) :
        (!allowEmpty && stdout.trim() === '' ? finish(new Error('GIT_EMPTY_OUTPUT')) : finish()));
      const abort = () => { child.kill(); finish(new Error('PUBLICATION_ABORTED')); };
      signal?.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(() => { child.kill(); finish(new Error('GIT_PUBLICATION_TIMEOUT')); }, this.timeoutMs);
    });
  }
}

export function applyPublicationDiff(checkout: string, worktree: string, diff: WorkspaceDiff, baselineRoot = checkout): void {
  for (const item of [...diff.added, ...diff.modified, ...diff.deleted]) safeRelativePath(item.path);
  for (const item of diff.added) {
    const target = targetPath(checkout, item.path);
    if (existsSync(targetPath(baselineRoot, item.path)) || existsSync(target)) throw new Error('PUBLICATION_ADDED_PATH_EXISTS');
    copyVerified(worktree, item.path, target, item.sha256, item.bytes);
  }
  for (const item of diff.modified) {
    const target = targetPath(checkout, item.path); verifyFile(targetPath(baselineRoot, item.path), item.beforeSha256);
    copyVerified(worktree, item.path, target, item.sha256, item.bytes);
  }
  for (const item of diff.deleted) {
    const target = targetPath(checkout, item.path); verifyFile(targetPath(baselineRoot, item.path), item.beforeSha256);
    if (!existsSync(target) || !lstatSync(target).isFile() || lstatSync(target).isSymbolicLink()) throw new Error('PUBLICATION_BASE_FILE_MISMATCH');
    unlinkSync(target);
  }
}

function targetPath(root: string, path: string): string {
  const parts = safeRelativePath(path).split('/');
  if (parts[0]?.toLowerCase() === '.git') throw new Error('PUBLICATION_GIT_METADATA_PATH_NOT_ALLOWED');
  let current = root;
  for (const part of parts) {
    current = resolve(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error('PUBLICATION_LINK_PATH_NOT_ALLOWED');
  }
  const target = current;
  if (relative(root, target).startsWith('..')) throw new Error('PUBLICATION_PATH_ESCAPE');
  if (existsSync(target)) {
    const resolvedTarget = realpathSync(target), resolvedRelative = relative(root, resolvedTarget);
    if (resolvedRelative.startsWith('..') || isAbsolute(resolvedRelative)) throw new Error('PUBLICATION_PATH_ESCAPE');
  }
  return target;
}
function verifyFile(path: string, expectedSha256: string): void {
  if (!existsSync(path) || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) throw new Error('PUBLICATION_BASE_FILE_MISMATCH');
  if (sha256(read(path)) !== expectedSha256) throw new Error('PUBLICATION_BASE_FILE_MISMATCH');
}
function copyVerified(worktree: string, relativePath: string, target: string, expectedSha256: string, expectedBytes: number): void {
  const source = targetPath(worktree, relativePath);
  if (!existsSync(source) || !lstatSync(source).isFile() || lstatSync(source).isSymbolicLink()) throw new Error('PUBLICATION_WORKTREE_FILE_MISMATCH');
  const content = read(source); if (content.length !== expectedBytes || sha256(content) !== expectedSha256) throw new Error('PUBLICATION_WORKTREE_FILE_MISMATCH');
  mkdirSync(dirname(target), { recursive: true }); copyFileSync(source, target);
}
function read(path: string): Buffer { return readFileSync(path); }
