import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { lstatSync, realpathSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import type { ControlStore } from './store.js';
import type { PublicationBinding, PublicationInspector, PublicationRecord, PublicationSource, Publisher } from './types.js';
import { canonicalJson, publicationBinding, publicationRemoteMatches, sha256 } from './validation.js';

export class O4PublicationCoordinator {
  readonly binding: PublicationBinding;
  #controllers = new Map<string, AbortController>();
  #active = new Set<Promise<unknown>>();
  constructor(readonly options: { store: ControlStore; binding: PublicationBinding; inspector: PublicationInspector; publisher?: Publisher }) {
    this.binding = publicationBinding(options.binding);
  }
  get canPublish(): boolean { return Boolean(this.options.publisher); }
  get canReconcile(): boolean { return Boolean(this.options.publisher?.reconcile); }
  async prepare(runId: string): Promise<PublicationRecord> {
    const run = this.options.store.run(runId); if (!run) throw new Error('RUN_NOT_FOUND');
    const execution = this.options.store.execution(runId); if (!execution || execution.state !== 'completed') throw new Error('EXECUTION_NOT_PUBLISHABLE');
    const project = this.options.store.project(run.projectId); if (!project) throw new Error('PROJECT_NOT_FOUND');
    const source = await this.options.inspector.inspect({ projectRoot: project.root, binding: this.binding, runId, attempt: execution.attempt });
    return this.options.store.requestPublication(runId, this.binding, source);
  }
  async approve(runId: string, expectedSubjectSha256: string): Promise<PublicationRecord> {
    const publication = this.options.store.publication(runId);
    if (!publication || publication.state !== 'awaiting-approval') throw new Error('PUBLICATION_NOT_AWAITING_APPROVAL');
    if (publication.bindingSha256 !== sha256(canonicalJson(this.binding))) throw new Error('PUBLICATION_BINDING_CHANGED');
    const run = this.options.store.run(runId); if (!run) throw new Error('RUN_NOT_FOUND');
    const execution = this.options.store.execution(runId); if (!execution) throw new Error('EXECUTION_NOT_FOUND');
    const project = this.options.store.project(run.projectId); if (!project) throw new Error('PROJECT_NOT_FOUND');
    const current = await this.options.inspector.inspect({ projectRoot: project.root, binding: this.binding, runId, attempt: execution.attempt });
    const approvedSource = { baseRevision: publication.subject.baseRevision, remoteUrl: publication.subject.remoteUrl,
      headBranch: publication.subject.headBranch };
    if (canonicalJson(current) !== canonicalJson(approvedSource)) throw new Error('PUBLICATION_SOURCE_DRIFT');
    return this.options.store.approvePublication(runId, expectedSubjectSha256);
  }
  reject(runId: string): PublicationRecord { return this.options.store.rejectPublication(runId); }
  async publish(runId: string): Promise<PublicationRecord> {
    const publisher = this.options.publisher; if (!publisher) throw new Error('O4_PUBLISHER_NOT_CONFIGURED');
    const publication = this.options.store.publication(runId);
    if (!publication || publication.state !== 'approved') throw new Error('PUBLICATION_NOT_EXACTLY_APPROVED');
    const run = this.options.store.run(runId); if (!run) throw new Error('RUN_NOT_FOUND');
    const execution = this.options.store.execution(runId); if (!execution?.diff) throw new Error('EXECUTION_NOT_PUBLISHABLE');
    const project = this.options.store.project(run.projectId); if (!project) throw new Error('PROJECT_NOT_FOUND');
    const current = await this.options.inspector.inspect({ projectRoot: project.root, binding: this.binding, runId, attempt: execution.attempt });
    const approvedSource = { baseRevision: publication.subject.baseRevision, remoteUrl: publication.subject.remoteUrl,
      headBranch: publication.subject.headBranch };
    if (canonicalJson(current) !== canonicalJson(approvedSource)) throw new Error('PUBLICATION_SOURCE_DRIFT');
    const operationId = `publish-${randomUUID().toLowerCase()}`;
    const started = this.options.store.beginPublication(runId, operationId), controller = new AbortController();
    this.#controllers.set(runId, controller);
    const work = publisher.publish({ projectRoot: project.root, worktreeRoot: join(execution.workspacePath, 'worktree'), diff: execution.diff,
      subject: publication.subject, operationId, prepared: headRevision => { this.options.store.publicationHeadPrepared(runId, operationId, headRevision); },
      signal: controller.signal })
      .then(result => this.options.store.publicationSucceeded(runId, operationId, result.providerRef, result.receiptSha256))
      .catch(() => { try { this.options.store.publicationFailed(runId, operationId, 'PUBLICATION_OUTCOME_UNKNOWN'); } catch {} })
      .finally(() => { this.#controllers.delete(runId); this.#active.delete(work); });
    this.#active.add(work); return started;
  }
  async reconcile(runId: string): Promise<PublicationRecord> {
    const reconcile = this.options.publisher?.reconcile; if (!reconcile) throw new Error('PUBLICATION_RECONCILIATION_NOT_CONFIGURED');
    const publication = this.options.store.publication(runId);
    if (!publication || publication.state !== 'needs-attention' || publication.errorCode !== 'PUBLICATION_OUTCOME_UNKNOWN' ||
        !publication.operationId) throw new Error('PUBLICATION_NOT_RECONCILABLE');
    if (publication.bindingSha256 !== sha256(canonicalJson(this.binding))) throw new Error('PUBLICATION_BINDING_CHANGED');
    const result = await reconcile.call(this.options.publisher, { subject: publication.subject, operationId: publication.operationId,
      expectedHeadRevision: publication.expectedHeadRevision });
    if (result.status === 'published') return this.options.store.publicationReconciledSucceeded(runId, publication.operationId,
      result.result.providerRef, result.result.receiptSha256);
    if (result.status === 'absent') return this.options.store.publicationReconciledAbsent(runId, publication.operationId);
    return this.options.store.publicationReconciledConflict(runId, publication.operationId);
  }
  async close(): Promise<void> {
    for (const controller of this.#controllers.values()) controller.abort();
    await Promise.allSettled(this.#active);
  }
}

export class GitPublicationInspector implements PublicationInspector {
  readonly executable: string;
  constructor(executableValue: string, readonly timeoutMs = 10000) {
    if (!isAbsolute(executableValue)) throw new Error('GIT_EXECUTABLE_MUST_BE_ABSOLUTE');
    this.executable = realpathSync(resolve(executableValue));
    if (!lstatSync(this.executable).isFile()) throw new Error('GIT_EXECUTABLE_NOT_FILE');
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60000) throw new Error('INVALID_GIT_TIMEOUT');
  }
  async inspect(input: { projectRoot: string; binding: PublicationBinding; runId: string; attempt: number }): Promise<PublicationSource> {
    const root = realpathSync(resolve(input.projectRoot));
    const topLevel = realpathSync(await this.#git(root, ['rev-parse', '--show-toplevel']));
    if (topLevel.toLowerCase() !== root.toLowerCase()) throw new Error('PROJECT_ROOT_NOT_GIT_TOPLEVEL');
    const status = await this.#git(root, ['status', '--porcelain=v1', '--untracked-files=all'], true);
    if (status !== '') throw new Error('PROJECT_SOURCE_NOT_CLEAN');
    const currentBranch = await this.#git(root, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
    if (currentBranch !== input.binding.baseBranch) throw new Error('PUBLICATION_BASE_BRANCH_MISMATCH');
    const baseRevision = await this.#git(root, ['rev-parse', '--verify', 'HEAD^{commit}']);
    if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(baseRevision)) throw new Error('INVALID_PUBLICATION_BASE_REVISION');
    const remoteUrl = await this.#git(root, ['remote', 'get-url', input.binding.remoteName]);
    if (!publicationRemoteMatches(input.binding, remoteUrl)) throw new Error('PUBLICATION_REMOTE_MISMATCH');
    const headBranch = `${input.binding.headPrefix}${input.runId}-a${input.attempt}`;
    await this.#git(root, ['check-ref-format', '--branch', headBranch]);
    return { baseRevision, remoteUrl, headBranch };
  }
  #git(cwd: string, args: string[], allowEmpty = false): Promise<string> {
    const allowed = ['SystemRoot', 'WINDIR', 'ComSpec', 'PATH', 'PATHEXT', 'TEMP', 'TMP'];
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.some(item => item.toLowerCase() === key.toLowerCase())));
    return new Promise((resolvePromise, reject) => {
      const child = spawn(this.executable, args, { cwd, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '', stderr = '', bytes = 0, settled = false;
      const finish = (error?: Error) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolvePromise(stdout.trim()); };
      const capture = (chunk: Buffer, target: 'stdout' | 'stderr') => {
        bytes += chunk.length; if (bytes > 65536) { child.kill(); finish(new Error('GIT_OUTPUT_LIMIT_EXCEEDED')); return; }
        if (target === 'stdout') stdout += chunk.toString('utf8'); else stderr += chunk.toString('utf8');
      };
      child.stdout.on('data', chunk => capture(chunk, 'stdout')); child.stderr.on('data', chunk => capture(chunk, 'stderr'));
      child.once('error', () => finish(new Error('GIT_LAUNCH_FAILED')));
      child.once('close', code => {
        if (code !== 0) finish(new Error(`GIT_INSPECTION_FAILED_${String(code)}`));
        else if (!allowEmpty && stdout.trim() === '') finish(new Error('GIT_EMPTY_OUTPUT'));
        else finish();
      });
      const timer = setTimeout(() => { child.kill(); finish(new Error('GIT_INSPECTION_TIMEOUT')); }, this.timeoutMs);
      void stderr;
    });
  }
}
