import type { EvalResult, Evidence } from '@specdd/eval-adapters';

export interface RunBinding {
  runId: string;
  workflowRef: string;
  graphRef: string;
  controlPlaneSha256: string;
  inputRef: string;
  nodeRef: string | null;
  agentRef: string | null;
  capabilityRefs: string[];
  runtime: string | null;
  model: string | null;
  harnessRef: string | null;
}
export interface Payloads {
  'workflow.started': Record<string, never>;
  'workflow.completed': { status: 'success' | 'failed' | 'cancelled' };
  'agent.run.started': { attempt: number };
  'agent.run.completed': { attempt: number };
  'agent.run.failed': { attempt: number; code: string };
  'eval.started': { attempt: number; evalRef: string };
  'eval.completed': { attempt: number; result: EvalResult };
  'approval.requested': { requestId: string; approvalRef: string; evidence: Evidence };
  'approval.granted': { requestId: string; approvalRef: string; actorRef: string; evidence: Evidence };
  'approval.rejected': { requestId: string; approvalRef: string; actorRef: string; evidence: Evidence };
  'artifact.created': { artifactRef: string; path: string; evidence: Evidence };
  'artifact.updated': { artifactRef: string; path: string; evidence: Evidence };
}
export type EventName = keyof Payloads;
export type RunEvent = { [K in EventName]: RunBinding & {
  schemaVersion: '1.0.0'; kind: 'SpecDDRunEvent'; id: string; timestamp: string;
  source: { adapter: string; eventId: string };
  event: K; data: Payloads[K];
} }[EventName];
export interface TelemetryAdapter<T> {
  readonly id: string;
  normalize(observation: T, binding: RunBinding): RunEvent[];
}

