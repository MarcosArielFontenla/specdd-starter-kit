export type RunState = 'planning' | 'awaiting-approval' | 'approved' | 'rejected' | 'needs-attention';
export type ExecutionState = 'preparing' | 'developing' | 'reviewing' | 'checking' | 'completed' | 'needs-attention';
export type PublicationState = 'awaiting-approval' | 'approved' | 'rejected' | 'publishing' | 'published' | 'needs-attention';

export interface PlanningTask { title: string; description: string }

export interface PlanArtifact {
  schemaVersion: '1.0.0';
  kind: 'SpecControlPlanArtifact';
  summary: string;
  specMarkdown: string;
  planMarkdown: string;
  assumptions: string[];
  filesToInspect: string[];
}

export interface PlannerReceipt {
  runtime: string;
  model: string;
  threadRefSha256: string;
  turnRefSha256: string;
}

export interface PlannerResult { artifact: PlanArtifact; receipt: PlannerReceipt }

export interface Planner {
  plan(input: { projectRoot: string; task: PlanningTask; signal?: AbortSignal }): Promise<PlannerResult>;
}

export interface CheckDefinition {
  id: string;
  executable: string;
  args: string[];
  timeoutMs: number;
}

export interface ExecutionBinding {
  schemaVersion: '1.0.0';
  kind: 'SpecControlExecutionBinding';
  maxSourceFiles: number;
  maxSourceBytes: number;
  developerModel: string;
  reviewerModel: string;
  roleTimeoutMs: number;
  checks: CheckDefinition[];
}

export type WindowsSandboxMode = 'elevated' | 'unelevated';

export interface FileFingerprint { path: string; bytes: number; sha256: string }
export interface WorkspaceDiff {
  added: FileFingerprint[];
  modified: Array<FileFingerprint & { beforeSha256: string }>;
  deleted: Array<{ path: string; beforeSha256: string }>;
}

export interface DeveloperArtifact {
  schemaVersion: '1.0.0';
  kind: 'SpecControlDeveloperArtifact';
  summary: string;
  changedFiles: string[];
  limitations: string[];
}

export interface ReviewFinding { severity: 'blocking' | 'non-blocking'; path: string; message: string }
export interface ReviewArtifact {
  schemaVersion: '1.0.0';
  kind: 'SpecControlReviewArtifact';
  verdict: 'pass' | 'fail';
  summary: string;
  findings: ReviewFinding[];
}

export interface CheckResult {
  id: string;
  status: 'passed' | 'failed' | 'timed-out' | 'launch-failed';
  exitCode: number | null;
  durationMs: number;
  outputSha256: string;
  outputBytes: number;
}

export interface ExecutionRecord {
  runId: string;
  workspacePath: string;
  attempt: number;
  state: ExecutionState;
  version: number;
  bindingSha256: string;
  baselineSha256: string | null;
  diff: WorkspaceDiff | null;
  diffSha256: string | null;
  developerArtifact: DeveloperArtifact | null;
  developerReceipt: PlannerReceipt | null;
  review: ReviewArtifact | null;
  reviewerReceipt: PlannerReceipt | null;
  checks: CheckResult[] | null;
  evidenceSha256: string | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionAttemptSummary { attempt: number; state: ExecutionState; errorCode: string | null; archivedAt: string }

export interface PublicationBinding {
  schemaVersion: '1.0.0';
  kind: 'SpecControlPublicationBinding';
  provider: 'github' | 'local-git';
  host: 'github.com' | 'local';
  owner: string;
  repository: string;
  remoteName: string;
  baseBranch: string;
  headPrefix: string;
  localRemotePath: string | null;
}

export interface PublicationSource {
  baseRevision: string;
  remoteUrl: string;
  headBranch: string;
}

export interface PublicationSubject {
  schemaVersion: '1.0.0';
  kind: 'SpecControlPublicationSubject';
  runId: string;
  projectId: string;
  executionAttempt: number;
  projectRootSha256: string;
  artifactSha256: string;
  executionBindingSha256: string;
  baselineSha256: string;
  diffSha256: string;
  evidenceSha256: string;
  publicationBindingSha256: string;
  provider: 'github' | 'local-git';
  host: 'github.com' | 'local';
  owner: string;
  repository: string;
  remoteName: string;
  remoteUrl: string;
  baseBranch: string;
  baseRevision: string;
  headBranch: string;
  localRemotePath: string | null;
  draft: true;
}

export interface PublicationRecord {
  runId: string;
  state: PublicationState;
  version: number;
  bindingSha256: string;
  subject: PublicationSubject;
  subjectSha256: string;
  approval: { actorRef: string; subjectSha256: string; createdAt: string } | null;
  operationId: string | null;
  expectedHeadRevision: string | null;
  providerRef: string | null;
  receiptSha256: string | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicationInspector {
  inspect(input: { projectRoot: string; binding: PublicationBinding; runId: string; attempt: number }): Promise<PublicationSource>;
}

export interface PublisherResult { providerRef: string; receiptSha256: string }
export type PublicationReconciliation =
  | { status: 'published'; result: PublisherResult }
  | { status: 'absent' }
  | { status: 'conflict' };
export interface Publisher {
  publish(input: { projectRoot: string; worktreeRoot: string; diff: WorkspaceDiff; subject: PublicationSubject; operationId: string;
    prepared(headRevision: string): void; signal?: AbortSignal }): Promise<PublisherResult>;
  reconcile?(input: { subject: PublicationSubject; operationId: string; expectedHeadRevision: string | null }): Promise<PublicationReconciliation>;
}

export interface Developer {
  develop(input: { workspaceRoot: string; plan: PlanArtifact; task: PlanningTask; signal?: AbortSignal }): Promise<{ artifact: DeveloperArtifact; receipt: PlannerReceipt }>;
}
export interface Reviewer {
  review(input: { executionRoot: string; plan: PlanArtifact; task: PlanningTask; diff: WorkspaceDiff; signal?: AbortSignal }): Promise<{ artifact: ReviewArtifact; receipt: PlannerReceipt }>;
}

export interface ProjectRecord {
  id: string;
  root: string;
  rootSha256: string;
  createdAt: string;
}

export interface RunRecord {
  id: string;
  projectId: string;
  state: RunState;
  version: number;
  task: PlanningTask;
  artifact: PlanArtifact | null;
  artifactSha256: string | null;
  plannerReceipt: PlannerReceipt | null;
  approval: { actorRef: string; artifactSha256: string; createdAt: string } | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
}
