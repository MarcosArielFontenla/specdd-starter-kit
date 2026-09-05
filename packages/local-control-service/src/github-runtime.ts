import { spawn } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, realpathSync } from 'node:fs';
import { isAbsolute, join, parse, relative, resolve } from 'node:path';
import type { CliInvocation, CliResult, GitHubCliTransport, PreparedRemoteBranch, RemoteBranchPreparer } from './github-publisher.js';
import { applyPublicationDiff } from './local-git-publisher.js';
import type { PublicationSubject } from './types.js';
import { canonicalJson, pathsOverlap, publicationRemoteMatches, publicationSubject, safeId } from './validation.js';

type RuntimeKind = 'github-cli' | 'git';

export class BoundedGitHubCliTransport implements GitHubCliTransport {
  readonly process: BoundedProcess;
  constructor(options: { executable: string; timeoutMs?: number; fixedArgs?: readonly string[] }) {
    this.process = new BoundedProcess({ ...options, kind: 'github-cli', outputLimitBytes: 256 * 1024, stdinLimitBytes: 96 * 1024 });
  }
  run(invocation: CliInvocation): Promise<CliResult> {
    githubCliInvocation(invocation);
    return this.process.run(invocation.args, invocation.stdin, invocation.signal);
  }
}

export interface GitHubRemotePusher {
  push(input: { checkout: string; subject: PublicationSubject; signal?: AbortSignal }): Promise<void>;
}

export class GitHubGitPusher implements GitHubRemotePusher {
  readonly process: BoundedProcess;
  constructor(options: { executable: string; timeoutMs?: number; fixedArgs?: readonly string[] }) {
    this.process = new BoundedProcess({ ...options, kind: 'git', outputLimitBytes: 128 * 1024, stdinLimitBytes: 0 });
  }
  async push(input: { checkout: string; subject: PublicationSubject; signal?: AbortSignal }): Promise<void> {
    githubSubject(input.subject); const checkout = realpathSync(resolve(input.checkout));
    const ref = `refs/heads/${input.subject.headBranch}`;
    const result = await this.process.run(['-C', checkout, 'push', `--force-with-lease=${ref}:`, input.subject.remoteUrl, `HEAD:${ref}`],
      undefined, input.signal);
    if (result.exitCode !== 0) throw new Error('GITHUB_GIT_PUSH_FAILED');
  }
}

export class GitHubBranchPreparer implements RemoteBranchPreparer {
  readonly root: string;
  readonly process: BoundedProcess;
  readonly pusher: GitHubRemotePusher;
  constructor(options: { executable: string; root: string; pusher?: GitHubRemotePusher; timeoutMs?: number; fixedArgs?: readonly string[] }) {
    const absoluteRoot = resolve(options.root);
    if (absoluteRoot === parse(absoluteRoot).root) throw new Error('DEDICATED_PUBLICATION_DIRECTORY_REQUIRED');
    mkdirSync(absoluteRoot, { recursive: true }); this.root = realpathSync(absoluteRoot);
    const runtime = { executable: options.executable, ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
      ...(options.fixedArgs === undefined ? {} : { fixedArgs: options.fixedArgs }) };
    this.process = new BoundedProcess({ ...runtime, kind: 'git', outputLimitBytes: 128 * 1024, stdinLimitBytes: 0 });
    this.pusher = options.pusher ?? new GitHubGitPusher(runtime);
  }
  async prepare(input: Parameters<RemoteBranchPreparer['prepare']>[0]): Promise<PreparedRemoteBranch> {
    githubSubject(input.subject); const operationId = safeId(input.operationId, 'operation');
    const projectRoot = realpathSync(resolve(input.projectRoot)), worktreeRoot = realpathSync(resolve(input.worktreeRoot));
    if (pathsOverlap(this.root, projectRoot) || pathsOverlap(this.root, worktreeRoot) || pathsOverlap(projectRoot, worktreeRoot))
      throw new Error('PUBLICATION_PATHS_MUST_NOT_OVERLAP');
    const operationRoot = resolve(this.root, operationId), operationRelative = relative(this.root, operationRoot);
    if (operationRelative.startsWith('..') || isAbsolute(operationRelative) || existsSync(operationRoot))
      throw new Error('PUBLICATION_OPERATION_ALREADY_EXISTS');
    const topLevel = realpathSync(await this.#git(['-C', projectRoot, 'rev-parse', '--show-toplevel'], input.signal, false));
    if (topLevel.toLowerCase() !== projectRoot.toLowerCase()) throw new Error('PROJECT_ROOT_NOT_GIT_TOPLEVEL');
    if (await this.#git(['-C', projectRoot, 'status', '--porcelain=v1', '--untracked-files=all'], input.signal) !== '')
      throw new Error('PROJECT_SOURCE_NOT_CLEAN');
    if (await this.#git(['-C', projectRoot, 'symbolic-ref', '--quiet', '--short', 'HEAD'], input.signal, false) !== input.subject.baseBranch)
      throw new Error('PUBLICATION_BASE_BRANCH_MISMATCH');
    if (await this.#git(['-C', projectRoot, 'rev-parse', '--verify', 'HEAD^{commit}'], input.signal, false) !== input.subject.baseRevision)
      throw new Error('PUBLICATION_BASE_REVISION_DRIFT');
    const sourceRemote = await this.#git(['-C', projectRoot, 'remote', 'get-url', input.subject.remoteName], input.signal, false);
    if (!publicationRemoteMatches({ schemaVersion: '1.0.0', kind: 'SpecControlPublicationBinding', provider: 'github', host: 'github.com',
      owner: input.subject.owner, repository: input.subject.repository, remoteName: input.subject.remoteName,
      baseBranch: input.subject.baseBranch, headPrefix: `${input.subject.headBranch.split('/').slice(0, -1).join('/')}/`,
      localRemotePath: null }, sourceRemote)) throw new Error('PUBLICATION_REMOTE_MISMATCH');
    mkdirSync(operationRoot); const checkout = join(operationRoot, 'checkout');
    await this.#git(['clone', '--no-hardlinks', '--no-checkout', projectRoot, checkout], input.signal);
    await this.#git(['-C', checkout, 'config', 'core.longpaths', 'true'], input.signal);
    await this.#git(['-C', checkout, 'checkout', '--detach', input.subject.baseRevision], input.signal);
    const baseRevision = await this.#git(['-C', checkout, 'rev-parse', '--verify', 'HEAD^{commit}'], input.signal, false);
    if (baseRevision !== input.subject.baseRevision) throw new Error('PUBLICATION_BASE_REVISION_DRIFT');
    await this.#git(['-C', checkout, 'checkout', '-b', input.subject.headBranch], input.signal);
    applyPublicationDiff(checkout, worktreeRoot, input.diff, projectRoot);
    await this.#git(['-C', checkout, 'add', '--all'], input.signal);
    const staged = (await this.#git(['-C', checkout, 'diff', '--cached', '--name-only', '-z'], input.signal)).split('\0').filter(Boolean).sort();
    const expected = [...input.diff.added, ...input.diff.modified, ...input.diff.deleted].map(item => item.path).sort();
    if (canonicalJson(staged) !== canonicalJson(expected)) throw new Error('PUBLICATION_STAGED_DIFF_MISMATCH');
    const hookSink = process.platform === 'win32' ? 'NUL' : '/dev/null';
    await this.#git(['-C', checkout, '-c', 'user.name=SpecControl Local', '-c', 'user.email=speccontrol@invalid.local',
      '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${hookSink}`, 'commit', '-m', `SpecControl ${input.subject.runId}`], input.signal);
    const headRevision = await this.#git(['-C', checkout, 'rev-parse', '--verify', 'HEAD^{commit}'], input.signal, false);
    revision(headRevision);
    return { headRevision, push: async signal => this.pusher.push({ checkout, subject: input.subject, ...(signal ? { signal } : {}) }) };
  }
  async #git(args: string[], signal?: AbortSignal, allowEmpty = true): Promise<string> {
    const result = await this.process.run(args, undefined, signal);
    if (result.exitCode !== 0) throw new Error('GITHUB_GIT_PREPARATION_FAILED');
    const output = result.stdout.trim(); if (!allowEmpty && output === '') throw new Error('GIT_EMPTY_OUTPUT');
    return output;
  }
}

export class BoundedProcess {
  readonly executable: string;
  readonly fixedArgs: readonly string[];
  readonly timeoutMs: number;
  constructor(readonly options: { executable: string; kind: RuntimeKind; timeoutMs?: number; outputLimitBytes: number;
      stdinLimitBytes: number; fixedArgs?: readonly string[] }) {
    if (!isAbsolute(options.executable)) throw new Error('RUNTIME_EXECUTABLE_MUST_BE_ABSOLUTE');
    this.executable = realpathSync(resolve(options.executable));
    if (!lstatSync(this.executable).isFile()) throw new Error('RUNTIME_EXECUTABLE_NOT_FILE');
    this.fixedArgs = options.fixedArgs ?? [];
    if (this.fixedArgs.some(arg => typeof arg !== 'string' || arg.length > 1000 || /[\0\r\n]/.test(arg))) throw new Error('INVALID_FIXED_RUNTIME_ARGUMENT');
    this.timeoutMs = options.timeoutMs ?? 30000;
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs < 100 || this.timeoutMs > 120000) throw new Error('INVALID_RUNTIME_TIMEOUT');
  }
  run(args: string[], stdin?: string, signal?: AbortSignal): Promise<CliResult> {
    if (signal?.aborted) return Promise.reject(new Error('PUBLICATION_ABORTED'));
    if (!Array.isArray(args) || args.some(arg => typeof arg !== 'string' || arg.length > 1000 || /[\0\r\n]/.test(arg)))
      return Promise.reject(new Error('INVALID_RUNTIME_ARGUMENT'));
    const stdinBytes = stdin === undefined ? 0 : Buffer.byteLength(stdin, 'utf8');
    if (stdinBytes > this.options.stdinLimitBytes) return Promise.reject(new Error('RUNTIME_STDIN_LIMIT_EXCEEDED'));
    const allowed = ['SystemRoot', 'WINDIR', 'ComSpec', 'PATH', 'PATHEXT', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA',
      'HOME', 'XDG_CONFIG_HOME', 'SSH_AUTH_SOCK'];
    if (this.options.kind === 'github-cli') allowed.push('GH_TOKEN', 'GITHUB_TOKEN', 'GH_HOST', 'GH_CONFIG_DIR');
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.some(item => item.toLowerCase() === key.toLowerCase())));
    if (this.options.kind === 'git') Object.assign(env, { GIT_TERMINAL_PROMPT: '0' });
    return new Promise((resolvePromise, reject) => {
      const child = spawn(this.executable, [...this.fixedArgs, ...args], { env, shell: false, windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '', stderr = '', bytes = 0, settled = false, timer: NodeJS.Timeout | undefined;
      const finish = (error?: Error, exitCode = -1) => {
        if (settled) return; settled = true; if (timer) clearTimeout(timer); signal?.removeEventListener('abort', abort);
        error ? reject(error) : resolvePromise({ exitCode, stdout, stderr });
      };
      const capture = (chunk: Buffer, target: 'stdout' | 'stderr') => {
        bytes += chunk.length;
        if (bytes > this.options.outputLimitBytes) { child.kill(); finish(new Error('RUNTIME_OUTPUT_LIMIT_EXCEEDED')); return; }
        if (target === 'stdout') stdout += chunk.toString('utf8'); else stderr += chunk.toString('utf8');
      };
      child.stdout.on('data', chunk => capture(chunk, 'stdout')); child.stderr.on('data', chunk => capture(chunk, 'stderr'));
      child.stdin.once('error', () => finish(new Error('RUNTIME_STDIN_FAILED')));
      child.once('error', () => finish(new Error('RUNTIME_LAUNCH_FAILED')));
      child.once('close', code => finish(undefined, code ?? -1));
      const abort = () => { child.kill(); finish(new Error('PUBLICATION_ABORTED')); };
      timer = setTimeout(() => { child.kill(); finish(new Error('RUNTIME_TIMEOUT')); }, this.timeoutMs);
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) { abort(); return; }
      if (stdin !== undefined) child.stdin.end(stdin, 'utf8'); else child.stdin.end();
    });
  }
}

function githubCliInvocation(input: CliInvocation): void {
  const args = input.args;
  const observationPath = /^repos\/([^/]+)\/([^/]+)\/git\/matching-refs\/heads\/(.+)$/.exec(args[3] ?? '');
  const observation = args[0] === 'api' && args[1] === '--method' && args[2] === 'GET' && args.length === 4 && observationPath &&
    repo(`${observationPath[1]}/${observationPath[2]}`) && encodedRef(observationPath[3]);
  const list = args[0] === 'pr' && args[1] === 'list' && args.length === 14 && args[2] === '--repo' && repo(args[3]) &&
    args[4] === '--state' && args[5] === 'all' && args[6] === '--head' && ref(args[7]) && args[8] === '--base' && ref(args[9]) &&
    args[10] === '--limit' && args[11] === '10' && args[12] === '--json' &&
    args[13] === 'number,url,isDraft,state,headRefName,baseRefName,headRefOid,body';
  const create = args[0] === 'pr' && args[1] === 'create' && args.length === 13 && args[2] === '--draft' && args[3] === '--repo' &&
    repo(args[4]) && args[5] === '--base' && ref(args[6]) && args[7] === '--head' && ref(args[8]) && args[9] === '--title' &&
    /^SpecControl: [a-z0-9][a-z0-9._-]{0,127}$/.test(args[10] ?? '') && args[11] === '--body-file' && args[12] === '-' &&
    typeof input.stdin === 'string' && input.stdin.includes('<!-- speccontrol-operation:');
  if ((!observation && !list && !create) || (input.stdin !== undefined && !create)) throw new Error('GITHUB_CLI_INVOCATION_NOT_ALLOWED');
}
function repo(value: string | undefined): boolean {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) return false;
  return value.split('/').every(part => part !== '.' && part !== '..' && part.length <= 100);
}
function ref(value: string | undefined): boolean {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 && !value.startsWith('/') && !value.endsWith('/') &&
    !value.endsWith('.') && !value.includes('..') && !value.includes('//') && !value.includes('@{') &&
    !/[~^:?*[\\\s\x00-\x1f\x7f]/.test(value) && !value.split('/').some(part => part.startsWith('.') || part.toLowerCase().endsWith('.lock'));
}
function encodedRef(value: string | undefined): boolean {
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9_.~-]|%[A-Fa-f0-9]{2})+$/.test(value)) return false;
  try { return ref(decodeURIComponent(value)); } catch { return false; }
}
function githubSubject(subject: PublicationSubject): void {
  publicationSubject(subject);
  if (subject.provider !== 'github' || subject.host !== 'github.com' || subject.localRemotePath !== null ||
      !publicationRemoteMatches({ schemaVersion: '1.0.0', kind: 'SpecControlPublicationBinding', provider: 'github', host: 'github.com',
        owner: subject.owner, repository: subject.repository, remoteName: subject.remoteName, baseBranch: subject.baseBranch,
        headPrefix: `${subject.headBranch.split('/').slice(0, -1).join('/')}/`, localRemotePath: null }, subject.remoteUrl))
    throw new Error('GITHUB_SUBJECT_REQUIRED');
}
function revision(value: string): void {
  if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(value)) throw new Error('INVALID_GITHUB_REVISION');
}
