import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, realpathSync } from 'node:fs';
import { basename, dirname, parse, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CheckResult, DeveloperArtifact, ExecutionAttemptSummary, ExecutionRecord, ExecutionState, PlanArtifact, PlannerReceipt, ProjectRecord, PublicationBinding, PublicationRecord, PublicationSource, PublicationState, PublicationSubject, ReviewArtifact, RunRecord, RunState, WorkspaceDiff } from './types.js';
import { canonicalJson, developerArtifact, planArtifact, plannerReceipt, planningTask, projectRoot, publicationBinding, publicationRemoteMatches, publicationSource, publicationSubject, reviewArtifact, safeId, sha256 } from './validation.js';

type Row = Record<string, unknown>;
const now = () => new Date().toISOString();
function stateDirectory(path: string): string {
  const absolute = resolve(path);
  if (absolute === parse(absolute).root) throw new Error('DEDICATED_STATE_DIRECTORY_REQUIRED');
  mkdirSync(absolute, { recursive: true });
  return realpathSync(absolute);
}
function json<T>(value: unknown): T { return JSON.parse(String(value)) as T; }

export class ControlStore {
  readonly path: string;
  #db: DatabaseSync;
  constructor(path: string) {
    const directory = stateDirectory(dirname(resolve(path)));
    this.path = resolve(directory, basename(resolve(path)));
    this.#db = new DatabaseSync(this.path, { timeout: 1000 });
    this.#db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
      INSERT OR IGNORE INTO metadata VALUES ('schema_version','1');
      CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, root TEXT UNIQUE NOT NULL, root_sha256 TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), state TEXT NOT NULL,
        version INTEGER NOT NULL, task_json TEXT NOT NULL, artifact_json TEXT, artifact_sha256 TEXT, receipt_json TEXT,
        error_code TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT;
      CREATE UNIQUE INDEX IF NOT EXISTS one_active_run ON runs(project_id)
        WHERE state IN ('planning','awaiting-approval','approved');
      CREATE TABLE IF NOT EXISTS approvals(run_id TEXT PRIMARY KEY REFERENCES runs(id), actor_ref TEXT NOT NULL,
        artifact_sha256 TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS executions(run_id TEXT PRIMARY KEY REFERENCES runs(id), attempt INTEGER NOT NULL DEFAULT 1, state TEXT NOT NULL,
        version INTEGER NOT NULL, binding_sha256 TEXT NOT NULL, workspace_path TEXT NOT NULL,
        baseline_sha256 TEXT, diff_json TEXT, diff_sha256 TEXT, developer_artifact_json TEXT,
        developer_receipt_json TEXT, review_json TEXT, reviewer_receipt_json TEXT, checks_json TEXT,
        evidence_sha256 TEXT, error_code TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT;`);
    const schema = String(this.#db.prepare("SELECT value FROM metadata WHERE key='schema_version'").get()?.value ?? '');
    if (!['1', '2', '3', '4'].includes(schema)) throw new Error('UNSUPPORTED_STORE_SCHEMA');
    if (schema === '1' || schema === '2') {
      const columns = this.#db.prepare('PRAGMA table_info(executions)').all().map(row => String(row.name));
      if (!columns.includes('attempt')) this.#db.exec('ALTER TABLE executions ADD COLUMN attempt INTEGER NOT NULL DEFAULT 1');
    }
    this.#db.exec(`CREATE TABLE IF NOT EXISTS execution_attempts(run_id TEXT NOT NULL REFERENCES runs(id),
      attempt INTEGER NOT NULL, record_json TEXT NOT NULL, archived_at TEXT NOT NULL,
      PRIMARY KEY(run_id, attempt)) STRICT;
      CREATE TABLE IF NOT EXISTS publications(run_id TEXT PRIMARY KEY REFERENCES runs(id), state TEXT NOT NULL,
        version INTEGER NOT NULL, binding_sha256 TEXT NOT NULL, subject_json TEXT NOT NULL, subject_sha256 TEXT NOT NULL,
        operation_id TEXT, expected_head_revision TEXT, provider_ref TEXT, receipt_sha256 TEXT, error_code TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS publication_approvals(run_id TEXT PRIMARY KEY REFERENCES publications(run_id), actor_ref TEXT NOT NULL,
        subject_sha256 TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;`);
    const publicationColumns = this.#db.prepare('PRAGMA table_info(publications)').all().map(row => String(row.name));
    if (!publicationColumns.includes('expected_head_revision')) this.#db.exec('ALTER TABLE publications ADD COLUMN expected_head_revision TEXT');
    if (schema !== '4') this.#db.prepare("UPDATE metadata SET value='4' WHERE key='schema_version'").run();
  }
  close(): void { this.#db.close(); }
  registerProject(idValue: string, rootValue: string): ProjectRecord {
    const id = safeId(idValue, 'project'), root = projectRoot(rootValue), createdAt = now();
    const rootSha256 = sha256(root.toLowerCase());
    try { this.#db.prepare('INSERT INTO projects VALUES (?,?,?,?)').run(id, root, rootSha256, createdAt); }
    catch (error) {
      const existing = this.project(id);
      if (!existing || existing.root !== root || existing.rootSha256 !== rootSha256) throw error;
      return existing;
    }
    return { id, root, rootSha256, createdAt };
  }
  project(idValue: string): ProjectRecord | null {
    const row = this.#db.prepare('SELECT * FROM projects WHERE id=?').get(safeId(idValue, 'project'));
    return row ? { id: String(row.id), root: String(row.root), rootSha256: String(row.root_sha256), createdAt: String(row.created_at) } : null;
  }
  createRun(projectIdValue: string, taskValue: unknown, idValue = `run-${randomUUID().toLowerCase()}`): RunRecord {
    const projectId = safeId(projectIdValue, 'project'), id = safeId(idValue, 'run'), task = planningTask(taskValue);
    if (!this.project(projectId)) throw new Error('PROJECT_NOT_FOUND');
    const active = this.#db.prepare(`SELECT id FROM runs WHERE project_id=? AND state IN ('planning','awaiting-approval','approved')`).get(projectId);
    if (active) throw new Error('ACTIVE_RUN_EXISTS');
    const timestamp = now();
    try { this.#db.prepare('INSERT INTO runs VALUES (?,?,?,1,?,NULL,NULL,NULL,NULL,?,?)')
      .run(id, projectId, 'planning', canonicalJson(task), timestamp, timestamp); }
    catch { throw new Error('RUN_CREATE_FAILED'); }
    return this.run(id)!;
  }
  completePlanning(idValue: string, artifactValue: unknown, receipt: PlannerReceipt): RunRecord {
    const id = safeId(idValue, 'run'), artifact = planArtifact(artifactValue);
    const artifactJson = canonicalJson(artifact), artifactSha256 = sha256(artifactJson);
    const changed = this.#db.prepare(`UPDATE runs SET state='awaiting-approval', version=version+1,
      artifact_json=?, artifact_sha256=?, receipt_json=?, updated_at=? WHERE id=? AND state='planning'`)
      .run(artifactJson, artifactSha256, canonicalJson(plannerReceipt(receipt)), now(), id).changes;
    if (Number(changed) !== 1) throw new Error('STALE_PLANNING_COMPLETION');
    return this.run(id)!;
  }
  planningFailed(idValue: string, code: string): RunRecord {
    const id = safeId(idValue, 'run');
    if (!/^[A-Z0-9_]{3,80}$/.test(code)) throw new Error('INVALID_ERROR_CODE');
    const changed = this.#db.prepare(`UPDATE runs SET state='needs-attention', version=version+1,
      error_code=?, updated_at=? WHERE id=? AND state='planning'`).run(code, now(), id).changes;
    if (Number(changed) !== 1) throw new Error('STALE_PLANNING_FAILURE');
    return this.run(id)!;
  }
  reconcileInterruptedPlanning(): number {
    return Number(this.#db.prepare(`UPDATE runs SET state='needs-attention', version=version+1,
      error_code='SERVICE_RESTARTED_DURING_PLANNING', updated_at=? WHERE state='planning'`).run(now()).changes);
  }
  startExecution(runIdValue: string, bindingSha256: string, workspacePath: string): ExecutionRecord {
    const runId = safeId(runIdValue, 'run');
    if (!/^[a-f0-9]{64}$/.test(bindingSha256)) throw new Error('INVALID_BINDING_HASH');
    const absoluteWorkspace = resolve(workspacePath);
    if (absoluteWorkspace === parse(absoluteWorkspace).root) throw new Error('INVALID_WORKSPACE_PATH');
    this.#db.exec('BEGIN IMMEDIATE');
    try {
      const run = this.run(runId);
      if (!run || run.state !== 'approved' || !run.approval || run.approval.artifactSha256 !== run.artifactSha256)
        throw new Error('RUN_NOT_EXACTLY_APPROVED');
      if (this.execution(runId)) throw new Error('EXECUTION_EXISTS');
      const timestamp = now();
      this.#db.prepare(`INSERT INTO executions(run_id,attempt,state,version,binding_sha256,workspace_path,baseline_sha256,
        diff_json,diff_sha256,developer_artifact_json,developer_receipt_json,review_json,reviewer_receipt_json,
        checks_json,evidence_sha256,error_code,created_at,updated_at)
        VALUES (?, 1, 'preparing', 1, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`)
        .run(runId, bindingSha256, absoluteWorkspace, timestamp, timestamp);
      this.#db.exec('COMMIT');
    } catch (error) { this.#db.exec('ROLLBACK'); throw error; }
    return this.execution(runId)!;
  }
  retryExecution(runIdValue: string, bindingSha256: string, workspacePath: string): ExecutionRecord {
    const runId = safeId(runIdValue, 'run'), current = this.execution(runId);
    if (!current || current.state !== 'needs-attention') throw new Error('EXECUTION_NOT_RETRYABLE');
    if (current.bindingSha256 !== digest(bindingSha256, 'BINDING')) throw new Error('EXECUTION_BINDING_CHANGED');
    const nextAttempt = current.attempt + 1, timestamp = now(), absoluteWorkspace = resolve(workspacePath);
    if (absoluteWorkspace === parse(absoluteWorkspace).root) throw new Error('INVALID_WORKSPACE_PATH');
    this.#db.exec('BEGIN IMMEDIATE');
    try {
      this.#db.prepare('INSERT INTO execution_attempts VALUES (?,?,?,?)')
        .run(runId, current.attempt, canonicalJson(current), timestamp);
      this.#db.prepare('DELETE FROM executions WHERE run_id=? AND state=? AND attempt=?')
        .run(runId, 'needs-attention', current.attempt);
      this.#db.prepare(`INSERT INTO executions(run_id,attempt,state,version,binding_sha256,workspace_path,baseline_sha256,
        diff_json,diff_sha256,developer_artifact_json,developer_receipt_json,review_json,reviewer_receipt_json,
        checks_json,evidence_sha256,error_code,created_at,updated_at)
        VALUES (?, ?, 'preparing', 1, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`)
        .run(runId, nextAttempt, bindingSha256, absoluteWorkspace, timestamp, timestamp);
      this.#db.exec('COMMIT');
    } catch (error) { this.#db.exec('ROLLBACK'); throw error; }
    return this.execution(runId)!;
  }
  workspacePrepared(runIdValue: string, baselineSha256: string): ExecutionRecord {
    return this.#executionTransition(runIdValue, 'preparing', 'developing',
      'baseline_sha256=?, updated_at=?', [digest(baselineSha256, 'BASELINE'), now()]);
  }
  developerCompleted(runIdValue: string, artifact: DeveloperArtifact, receipt: PlannerReceipt, diff: WorkspaceDiff): ExecutionRecord {
    const diffJson = canonicalJson(diff), artifactJson = canonicalJson(developerArtifact(artifact));
    return this.#executionTransition(runIdValue, 'developing', 'reviewing',
      'developer_artifact_json=?, developer_receipt_json=?, diff_json=?, diff_sha256=?, updated_at=?',
      [artifactJson, canonicalJson(plannerReceipt(receipt)), diffJson, sha256(diffJson), now()]);
  }
  reviewCompleted(runIdValue: string, review: ReviewArtifact, receipt: PlannerReceipt): ExecutionRecord {
    review = reviewArtifact(review); receipt = plannerReceipt(receipt);
    const next: ExecutionState = review.verdict === 'pass' ? 'checking' : 'needs-attention';
    const errorCode = review.verdict === 'pass' ? null : 'REVIEW_FAILED';
    return this.#executionTransition(runIdValue, 'reviewing', next,
      'review_json=?, reviewer_receipt_json=?, error_code=?, updated_at=?',
      [canonicalJson(review), canonicalJson(receipt), errorCode, now()]);
  }
  checksCompleted(runIdValue: string, checks: CheckResult[]): ExecutionRecord {
    const passed = checks.length > 0 && checks.every(check => check.status === 'passed');
    const current = this.execution(runIdValue);
    if (!current || !current.diffSha256 || !current.review) throw new Error('EXECUTION_EVIDENCE_INCOMPLETE');
    const evidence = canonicalJson({ bindingSha256: current.bindingSha256, diffSha256: current.diffSha256,
      review: current.review, checks });
    return this.#executionTransition(runIdValue, 'checking', passed ? 'completed' : 'needs-attention',
      'checks_json=?, evidence_sha256=?, error_code=?, updated_at=?',
      [canonicalJson(checks), sha256(evidence), passed ? null : 'CHECK_FAILED', now()]);
  }
  executionFailed(runIdValue: string, code: string): ExecutionRecord {
    const runId = safeId(runIdValue, 'run');
    if (!/^[A-Z0-9_]{3,80}$/.test(code)) throw new Error('INVALID_ERROR_CODE');
    const changed = this.#db.prepare(`UPDATE executions SET state='needs-attention', version=version+1,
      error_code=?, updated_at=? WHERE run_id=? AND state IN ('preparing','developing','reviewing','checking')`)
      .run(code, now(), runId).changes;
    if (Number(changed) !== 1) throw new Error('EXECUTION_NOT_ACTIVE');
    return this.execution(runId)!;
  }
  reconcileInterruptedExecutions(): number {
    return Number(this.#db.prepare(`UPDATE executions SET state='needs-attention', version=version+1,
      error_code='SERVICE_RESTARTED_DURING_EXECUTION', updated_at=?
      WHERE state IN ('preparing','developing','reviewing','checking')`).run(now()).changes);
  }
  execution(runIdValue: string): ExecutionRecord | null {
    const row = this.#db.prepare('SELECT * FROM executions WHERE run_id=?').get(safeId(runIdValue, 'run'));
    if (!row) return null;
    return { runId: String(row.run_id), workspacePath: String(row.workspace_path), attempt: Number(row.attempt), state: String(row.state) as ExecutionState, version: Number(row.version),
      bindingSha256: String(row.binding_sha256), baselineSha256: row.baseline_sha256 ? String(row.baseline_sha256) : null,
      diff: row.diff_json ? json<WorkspaceDiff>(row.diff_json) : null, diffSha256: row.diff_sha256 ? String(row.diff_sha256) : null,
      developerArtifact: row.developer_artifact_json ? json<DeveloperArtifact>(row.developer_artifact_json) : null,
      developerReceipt: row.developer_receipt_json ? json<PlannerReceipt>(row.developer_receipt_json) : null,
      review: row.review_json ? json<ReviewArtifact>(row.review_json) : null,
      reviewerReceipt: row.reviewer_receipt_json ? json<PlannerReceipt>(row.reviewer_receipt_json) : null,
      checks: row.checks_json ? json<CheckResult[]>(row.checks_json) : null,
      evidenceSha256: row.evidence_sha256 ? String(row.evidence_sha256) : null,
      errorCode: row.error_code ? String(row.error_code) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
  }
  executionAttempts(runIdValue: string): ExecutionAttemptSummary[] {
    const rows = this.#db.prepare('SELECT attempt, record_json, archived_at FROM execution_attempts WHERE run_id=? ORDER BY attempt')
      .all(safeId(runIdValue, 'run'));
    return rows.map(row => {
      const record = json<ExecutionRecord>(row.record_json);
      return { attempt: Number(row.attempt), state: record.state, errorCode: record.errorCode, archivedAt: String(row.archived_at) };
    });
  }
  requestPublication(runIdValue: string, bindingValue: unknown, sourceValue: unknown): PublicationRecord {
    const runId = safeId(runIdValue, 'run'), binding = publicationBinding(bindingValue), source = publicationSource(sourceValue);
    const run = this.run(runId), execution = this.execution(runId);
    if (!run || run.state !== 'approved' || !run.approval || run.approval.artifactSha256 !== run.artifactSha256)
      throw new Error('RUN_NOT_EXACTLY_APPROVED');
    if (!execution || execution.state !== 'completed' || !execution.baselineSha256 || !execution.diffSha256 || !execution.evidenceSha256)
      throw new Error('EXECUTION_NOT_PUBLISHABLE');
    const project = this.project(run.projectId); if (!project) throw new Error('PROJECT_NOT_FOUND');
    const expectedHead = `${binding.headPrefix}${run.id}-a${execution.attempt}`;
    if (source.headBranch !== expectedHead) throw new Error('PUBLICATION_HEAD_BRANCH_MISMATCH');
    if (!publicationRemoteMatches(binding, source.remoteUrl)) throw new Error('PUBLICATION_REMOTE_MISMATCH');
    const bindingSha256 = sha256(canonicalJson(binding));
    const subject = publicationSubject({ schemaVersion: '1.0.0', kind: 'SpecControlPublicationSubject',
      runId: run.id, projectId: run.projectId, executionAttempt: execution.attempt, projectRootSha256: project.rootSha256,
      artifactSha256: run.artifactSha256!, executionBindingSha256: execution.bindingSha256,
      baselineSha256: execution.baselineSha256, diffSha256: execution.diffSha256, evidenceSha256: execution.evidenceSha256,
      publicationBindingSha256: bindingSha256, provider: binding.provider, host: binding.host, owner: binding.owner,
      repository: binding.repository, remoteName: binding.remoteName, remoteUrl: source.remoteUrl,
      baseBranch: binding.baseBranch, baseRevision: source.baseRevision, headBranch: source.headBranch,
      localRemotePath: binding.localRemotePath, draft: true });
    const subjectJson = canonicalJson(subject), subjectSha256 = sha256(subjectJson), timestamp = now();
    try { this.#db.prepare(`INSERT INTO publications VALUES (?, 'awaiting-approval', 1, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, ?)`)
      .run(runId, bindingSha256, subjectJson, subjectSha256, timestamp, timestamp); }
    catch { throw new Error('PUBLICATION_ALREADY_EXISTS'); }
    return this.publication(runId)!;
  }
  approvePublication(runIdValue: string, expectedSha256: string, actorRef = 'local-operator'): PublicationRecord {
    const runId = safeId(runIdValue, 'run'), actor = safeId(actorRef, 'actor');
    if (!/^[a-f0-9]{64}$/.test(expectedSha256)) throw new Error('INVALID_PUBLICATION_SUBJECT_HASH');
    this.#db.exec('BEGIN IMMEDIATE');
    try {
      const publication = this.publication(runId);
      if (!publication || publication.state !== 'awaiting-approval') throw new Error('PUBLICATION_NOT_AWAITING_APPROVAL');
      if (publication.subjectSha256 !== expectedSha256) throw new Error('PUBLICATION_SUBJECT_HASH_MISMATCH');
      this.#assertPublicationEvidenceCurrent(publication);
      const timestamp = now();
      this.#db.prepare('INSERT INTO publication_approvals VALUES (?,?,?,?)').run(runId, actor, expectedSha256, timestamp);
      const changed = this.#db.prepare(`UPDATE publications SET state='approved', version=version+1, updated_at=?
        WHERE run_id=? AND state='awaiting-approval' AND subject_sha256=?`).run(timestamp, runId, expectedSha256).changes;
      if (Number(changed) !== 1) throw new Error('STALE_PUBLICATION_APPROVAL');
      this.#db.exec('COMMIT');
    } catch (error) { this.#db.exec('ROLLBACK'); throw error; }
    return this.publication(runId)!;
  }
  rejectPublication(runIdValue: string): PublicationRecord {
    return this.#publicationTransition(runIdValue, 'awaiting-approval', 'rejected', 'updated_at=?', [now()]);
  }
  beginPublication(runIdValue: string, operationIdValue: string): PublicationRecord {
    const operationId = safeId(operationIdValue, 'operation');
    const publication = this.publication(runIdValue);
    if (!publication || publication.state !== 'approved' || !publication.approval ||
        publication.approval.subjectSha256 !== publication.subjectSha256) throw new Error('PUBLICATION_NOT_EXACTLY_APPROVED');
    this.#assertPublicationEvidenceCurrent(publication);
    return this.#publicationTransition(runIdValue, 'approved', 'publishing', 'operation_id=?, updated_at=?', [operationId, now()]);
  }
  publicationHeadPrepared(runIdValue: string, operationIdValue: string, headRevision: string): PublicationRecord {
    const runId = safeId(runIdValue, 'run'), operationId = safeId(operationIdValue, 'operation');
    if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(headRevision)) throw new Error('INVALID_PUBLICATION_HEAD_REVISION');
    const changed = this.#db.prepare(`UPDATE publications SET expected_head_revision=?, version=version+1, updated_at=?
      WHERE run_id=? AND state='publishing' AND operation_id=? AND expected_head_revision IS NULL`)
      .run(headRevision, now(), runId, operationId).changes;
    if (Number(changed) !== 1) throw new Error('STALE_PUBLICATION_PREPARATION');
    return this.publication(runId)!;
  }
  publicationSucceeded(runIdValue: string, operationIdValue: string, providerRef: string, receiptSha256: string): PublicationRecord {
    const runId = safeId(runIdValue, 'run'), operationId = safeId(operationIdValue, 'operation');
    if (typeof providerRef !== 'string' || providerRef.length < 3 || providerRef.length > 500 || /[\0\r\n]/.test(providerRef))
      throw new Error('INVALID_PUBLICATION_PROVIDER_REF');
    const changed = this.#db.prepare(`UPDATE publications SET state='published', version=version+1, provider_ref=?, receipt_sha256=?,
      updated_at=? WHERE run_id=? AND state='publishing' AND operation_id=?`)
      .run(providerRef, digest(receiptSha256, 'PUBLICATION_RECEIPT'), now(), runId, operationId).changes;
    if (Number(changed) !== 1) throw new Error('STALE_PUBLICATION_COMPLETION');
    return this.publication(runId)!;
  }
  publicationFailed(runIdValue: string, operationIdValue: string, code: string): PublicationRecord {
    const runId = safeId(runIdValue, 'run'), operationId = safeId(operationIdValue, 'operation');
    if (!/^[A-Z0-9_]{3,80}$/.test(code)) throw new Error('INVALID_ERROR_CODE');
    const changed = this.#db.prepare(`UPDATE publications SET state='needs-attention', version=version+1, error_code=?, updated_at=?
      WHERE run_id=? AND state='publishing' AND operation_id=?`).run(code, now(), runId, operationId).changes;
    if (Number(changed) !== 1) throw new Error('STALE_PUBLICATION_FAILURE');
    return this.publication(runId)!;
  }
  reconcileInterruptedPublications(): number {
    return Number(this.#db.prepare(`UPDATE publications SET state='needs-attention', version=version+1,
      error_code='PUBLICATION_OUTCOME_UNKNOWN', updated_at=? WHERE state='publishing'`).run(now()).changes);
  }
  publicationReconciledAbsent(runIdValue: string, operationIdValue: string): PublicationRecord {
    const runId = safeId(runIdValue, 'run'), operationId = safeId(operationIdValue, 'operation');
    const changed = this.#db.prepare(`UPDATE publications SET state='approved', version=version+1, operation_id=NULL,
      expected_head_revision=NULL, error_code=NULL, updated_at=? WHERE run_id=? AND state='needs-attention'
      AND error_code='PUBLICATION_OUTCOME_UNKNOWN' AND operation_id=?`).run(now(), runId, operationId).changes;
    if (Number(changed) !== 1) throw new Error('STALE_PUBLICATION_RECONCILIATION');
    return this.publication(runId)!;
  }
  publicationReconciledSucceeded(runIdValue: string, operationIdValue: string, providerRef: string, receiptSha256: string): PublicationRecord {
    const runId = safeId(runIdValue, 'run'), operationId = safeId(operationIdValue, 'operation');
    if (typeof providerRef !== 'string' || providerRef.length < 3 || providerRef.length > 500 || /[\0\r\n]/.test(providerRef))
      throw new Error('INVALID_PUBLICATION_PROVIDER_REF');
    const changed = this.#db.prepare(`UPDATE publications SET state='published', version=version+1, provider_ref=?, receipt_sha256=?,
      error_code=NULL, updated_at=? WHERE run_id=? AND state='needs-attention' AND error_code='PUBLICATION_OUTCOME_UNKNOWN'
      AND operation_id=?`).run(providerRef, digest(receiptSha256, 'PUBLICATION_RECEIPT'), now(), runId, operationId).changes;
    if (Number(changed) !== 1) throw new Error('STALE_PUBLICATION_RECONCILIATION');
    return this.publication(runId)!;
  }
  publicationReconciledConflict(runIdValue: string, operationIdValue: string): PublicationRecord {
    const runId = safeId(runIdValue, 'run'), operationId = safeId(operationIdValue, 'operation');
    const changed = this.#db.prepare(`UPDATE publications SET version=version+1, error_code='PUBLICATION_REMOTE_CONFLICT', updated_at=?
      WHERE run_id=? AND state='needs-attention' AND error_code='PUBLICATION_OUTCOME_UNKNOWN' AND operation_id=?`)
      .run(now(), runId, operationId).changes;
    if (Number(changed) !== 1) throw new Error('STALE_PUBLICATION_RECONCILIATION');
    return this.publication(runId)!;
  }
  publication(runIdValue: string): PublicationRecord | null {
    const row = this.#db.prepare(`SELECT p.*, a.actor_ref, a.subject_sha256 AS approval_sha, a.created_at AS approval_at
      FROM publications p LEFT JOIN publication_approvals a ON a.run_id=p.run_id WHERE p.run_id=?`).get(safeId(runIdValue, 'run'));
    if (!row) return null;
    const subject = publicationSubject(json<PublicationSubject>(row.subject_json)), subjectSha256 = String(row.subject_sha256);
    if (sha256(canonicalJson(subject)) !== subjectSha256 || subject.publicationBindingSha256 !== String(row.binding_sha256) ||
        (row.approval_sha && String(row.approval_sha) !== subjectSha256)) throw new Error('PUBLICATION_SUBJECT_INTEGRITY_FAILED');
    return { runId: String(row.run_id), state: String(row.state) as PublicationState, version: Number(row.version),
      bindingSha256: String(row.binding_sha256), subject, subjectSha256,
      approval: row.actor_ref ? { actorRef: String(row.actor_ref), subjectSha256: String(row.approval_sha), createdAt: String(row.approval_at) } : null,
      operationId: row.operation_id ? String(row.operation_id) : null,
      expectedHeadRevision: row.expected_head_revision ? String(row.expected_head_revision) : null,
      providerRef: row.provider_ref ? String(row.provider_ref) : null,
      receiptSha256: row.receipt_sha256 ? String(row.receipt_sha256) : null, errorCode: row.error_code ? String(row.error_code) : null,
      createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
  }
  approve(idValue: string, expectedSha256: string, actorRef = 'local-operator'): RunRecord {
    const id = safeId(idValue, 'run'), actor = safeId(actorRef, 'actor');
    if (!/^[a-f0-9]{64}$/.test(expectedSha256)) throw new Error('INVALID_ARTIFACT_HASH');
    this.#db.exec('BEGIN IMMEDIATE');
    try {
      const run = this.run(id);
      if (!run || run.state !== 'awaiting-approval') throw new Error('RUN_NOT_AWAITING_APPROVAL');
      if (run.artifactSha256 !== expectedSha256) throw new Error('ARTIFACT_HASH_MISMATCH');
      const timestamp = now();
      this.#db.prepare('INSERT INTO approvals VALUES (?,?,?,?)').run(id, actor, expectedSha256, timestamp);
      const changed = this.#db.prepare(`UPDATE runs SET state='approved', version=version+1, updated_at=?
        WHERE id=? AND state='awaiting-approval' AND artifact_sha256=?`).run(timestamp, id, expectedSha256).changes;
      if (Number(changed) !== 1) throw new Error('STALE_APPROVAL');
      this.#db.exec('COMMIT');
    } catch (error) { this.#db.exec('ROLLBACK'); throw error; }
    return this.run(id)!;
  }
  reject(idValue: string): RunRecord {
    const id = safeId(idValue, 'run');
    const changed = this.#db.prepare(`UPDATE runs SET state='rejected', version=version+1, updated_at=?
      WHERE id=? AND state='awaiting-approval'`).run(now(), id).changes;
    if (Number(changed) !== 1) throw new Error('RUN_NOT_AWAITING_APPROVAL');
    return this.run(id)!;
  }
  run(idValue: string): RunRecord | null {
    const row = this.#db.prepare(`SELECT r.*, a.actor_ref, a.artifact_sha256 AS approval_sha, a.created_at AS approval_at
      FROM runs r LEFT JOIN approvals a ON a.run_id=r.id WHERE r.id=?`).get(safeId(idValue, 'run'));
    return row ? this.#record(row) : null;
  }
  runs(projectIdValue: string): RunRecord[] {
    const rows = this.#db.prepare(`SELECT r.*, a.actor_ref, a.artifact_sha256 AS approval_sha, a.created_at AS approval_at
      FROM runs r LEFT JOIN approvals a ON a.run_id=r.id WHERE r.project_id=? ORDER BY r.created_at DESC`)
      .all(safeId(projectIdValue, 'project'));
    return rows.map(row => this.#record(row));
  }
  #record(row: Row): RunRecord {
    const state = String(row.state) as RunState;
    return { id: String(row.id), projectId: String(row.project_id), state, version: Number(row.version),
      task: json(row.task_json), artifact: row.artifact_json ? json<PlanArtifact>(row.artifact_json) : null,
      artifactSha256: row.artifact_sha256 ? String(row.artifact_sha256) : null,
      plannerReceipt: row.receipt_json ? json<PlannerReceipt>(row.receipt_json) : null,
      approval: row.actor_ref ? { actorRef: String(row.actor_ref), artifactSha256: String(row.approval_sha), createdAt: String(row.approval_at) } : null,
      errorCode: row.error_code ? String(row.error_code) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
  }
  #executionTransition(runIdValue: string, expected: ExecutionState, next: ExecutionState,
    assignments: string, values: unknown[]): ExecutionRecord {
    const runId = safeId(runIdValue, 'run');
    const changed = this.#db.prepare(`UPDATE executions SET state=?, version=version+1, ${assignments}
      WHERE run_id=? AND state=?`).run(next, ...values, runId, expected).changes;
    if (Number(changed) !== 1) throw new Error('STALE_EXECUTION_TRANSITION');
    return this.execution(runId)!;
  }
  #publicationTransition(runIdValue: string, expected: PublicationState, next: PublicationState,
    assignments: string, values: unknown[]): PublicationRecord {
    const runId = safeId(runIdValue, 'run');
    const changed = this.#db.prepare(`UPDATE publications SET state=?, version=version+1, ${assignments}
      WHERE run_id=? AND state=?`).run(next, ...values, runId, expected).changes;
    if (Number(changed) !== 1) throw new Error('STALE_PUBLICATION_TRANSITION');
    return this.publication(runId)!;
  }
  #assertPublicationEvidenceCurrent(publication: PublicationRecord): void {
    const run = this.run(publication.runId), execution = this.execution(publication.runId);
    if (!run || !run.approval || run.approval.artifactSha256 !== run.artifactSha256 || !execution || execution.state !== 'completed')
      throw new Error('PUBLICATION_EVIDENCE_DRIFT');
    const project = this.project(run.projectId), subject = publication.subject;
    if (!project || subject.projectId !== run.projectId || subject.projectRootSha256 !== project.rootSha256 ||
        subject.artifactSha256 !== run.artifactSha256 || subject.executionAttempt !== execution.attempt ||
        subject.executionBindingSha256 !== execution.bindingSha256 || subject.baselineSha256 !== execution.baselineSha256 ||
        subject.diffSha256 !== execution.diffSha256 || subject.evidenceSha256 !== execution.evidenceSha256 ||
        subject.publicationBindingSha256 !== publication.bindingSha256)
      throw new Error('PUBLICATION_EVIDENCE_DRIFT');
  }
}

function digest(value: string, label: string): string {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error(`INVALID_${label}_HASH`);
  return value;
}
