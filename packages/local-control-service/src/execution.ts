import { dirname, resolve } from 'node:path';
import type { Developer, ExecutionBinding, ExecutionRecord, Reviewer } from './types.js';
import type { ControlStore } from './store.js';
import { StructuredCheckRunner } from './checks.js';
import { IsolatedWorkspace } from './workspace.js';
import { canonicalJson, sha256 } from './validation.js';

export class O3ExecutionCoordinator {
  readonly bindingSha256: string;
  readonly workspace: IsolatedWorkspace;
  readonly checks: StructuredCheckRunner;
  #controllers = new Map<string, AbortController>();
  #active = new Set<Promise<unknown>>();
  constructor(readonly options: { store: ControlStore; binding: ExecutionBinding; developer: Developer; reviewer: Reviewer }) {
    this.bindingSha256 = sha256(canonicalJson(options.binding));
    this.workspace = new IsolatedWorkspace(resolve(dirname(options.store.path), 'workspaces'), options.binding);
    this.checks = new StructuredCheckRunner(options.binding.checks);
  }
  start(runId: string): ExecutionRecord {
    const executionRoot = resolve(this.workspace.root, runId);
    const execution = this.options.store.startExecution(runId, this.bindingSha256, executionRoot);
    this.#schedule(runId, runId); return execution;
  }
  retry(runId: string): ExecutionRecord {
    const current = this.options.store.execution(runId); if (!current) throw new Error('EXECUTION_NOT_FOUND');
    const workspaceKey = `${runId}-attempt-${current.attempt + 1}`;
    const executionRoot = resolve(this.workspace.root, workspaceKey);
    const execution = this.options.store.retryExecution(runId, this.bindingSha256, executionRoot);
    this.#schedule(runId, workspaceKey); return execution;
  }
  #schedule(runId: string, workspaceKey: string): void {
    const controller = new AbortController(); this.#controllers.set(runId, controller);
    const work = this.#run(runId, workspaceKey, controller.signal).catch(error => {
      try { this.options.store.executionFailed(runId, executionErrorCode(error)); } catch {}
    }).finally(() => { this.#controllers.delete(runId); this.#active.delete(work); });
    this.#active.add(work);
  }
  cancel(runId: string): void {
    const controller = this.#controllers.get(runId); if (!controller) throw new Error('EXECUTION_NOT_CANCELLABLE'); controller.abort();
    this.options.store.executionFailed(runId, 'OPERATOR_CANCELLED');
  }
  async close(): Promise<void> { for (const controller of this.#controllers.values()) controller.abort(); await Promise.allSettled(this.#active); }
  async #run(runId: string, workspaceKey: string, signal: AbortSignal): Promise<void> {
    const run = this.options.store.run(runId); if (!run?.artifact) throw new Error('APPROVED_ARTIFACT_MISSING');
    const project = this.options.store.project(run.projectId); if (!project) throw new Error('PROJECT_NOT_FOUND');
    const prepared = this.workspace.prepare(workspaceKey, project.root);
    this.options.store.workspacePrepared(runId, prepared.baselineSha256);
    const developed = await this.options.developer.develop({ workspaceRoot: prepared.worktreeRoot, plan: run.artifact, task: run.task, signal });
    const diff = this.workspace.diff(prepared.executionRoot), actual = [...diff.added, ...diff.modified, ...diff.deleted].map(x => x.path).sort();
    const declared = [...developed.artifact.changedFiles].sort();
    if (actual.length < 1) throw new Error('DEVELOPER_EMPTY_DIFF');
    if (canonicalJson(actual) !== canonicalJson(declared)) throw new Error('DEVELOPER_DIFF_MISMATCH');
    this.options.store.developerCompleted(runId, developed.artifact, developed.receipt, diff);
    const reviewed = await this.options.reviewer.review({ executionRoot: prepared.executionRoot, plan: run.artifact, task: run.task, diff, signal });
    if (reviewed.receipt.threadRefSha256 === developed.receipt.threadRefSha256) throw new Error('REVIEWER_SESSION_NOT_DISTINCT');
    const reviewState = this.options.store.reviewCompleted(runId, reviewed.artifact, reviewed.receipt);
    if (reviewState.state !== 'checking') return;
    const checks = await this.checks.run(prepared.worktreeRoot, signal);
    this.options.store.checksCompleted(runId, checks);
  }
}

function executionErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/^[A-Z0-9_]{3,80}$/.test(message)) return message;
  if (error instanceof SyntaxError) return 'ROLE_ARTIFACT_JSON_INVALID';
  return 'EXECUTION_FAILED';
}
