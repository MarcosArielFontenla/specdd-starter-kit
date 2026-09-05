import { createHash } from 'node:crypto';
import { structuralValidator } from '@specdd/project-model';
import { validateControlPlaneDefinition, type ControlPlaneDefinition } from '@specdd/control-plane-model';
import { validateResult, type EvalResult } from '@specdd/eval-adapters';
import resultSchema from '@specdd/eval-adapters/schema/result' with { type: 'json' };
import eventSchema from '../schema/event.schema.json' with { type: 'json' };
import type { RunEvent, RunBinding, TelemetryAdapter } from './types.js';
export * from './types.js';

export const MAX_EVENTS = 10000;
export const MAX_EVENT_BYTES = 16384;
export const MAX_RUN_BYTES = 8 * 1024 * 1024;
const structure = structuralValidator(eventSchema, [resultSchema]);
const timeValid = (time: string): boolean => Number.isFinite(Date.parse(time)) && new Date(time).toISOString() === time;
const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, stable(item)])) : value;
export function controlPlaneFingerprint(definition: ControlPlaneDefinition): string {
  if (!validateControlPlaneDefinition(definition).valid) throw new Error('Invalid control plane');
  return createHash('sha256').update(JSON.stringify(stable(definition))).digest('hex');
}
function fail(message: string): never { throw new Error(message); }
export function assertEvent(value: unknown): asserts value is RunEvent {
  const errors = structure(value);
  if (errors.length) fail('Invalid event: ' + errors.map(e => e.path + ': ' + e.message).join('; '));
  const event = value as RunEvent;
  if (!timeValid(event.timestamp)) fail('Invalid timestamp');
  if (Buffer.byteLength(JSON.stringify(event)) > MAX_EVENT_BYTES) fail('Event size limit');
  if (event.event.startsWith('workflow.')) {
    if (event.nodeRef !== null || event.agentRef !== null || event.harnessRef !== null || event.capabilityRefs.length) fail('Workflow event cannot assert node/agent context');
  } else if (event.nodeRef === null) fail('Node reference required');
  if (event.event.startsWith('agent.run.') && event.agentRef === null) fail('Agent reference required');
  if (event.event === 'eval.completed') {
    const result = event.data.result;
    if (!validateResult(result) || result.runId !== event.runId || result.inputRef !== event.inputRef || result.observedAt !== event.timestamp) fail('Eval result identity/time mismatch');
  }
  if (event.event === 'artifact.created' || event.event === 'artifact.updated') {
    const path = event.data.path;
    if (path.startsWith('/') || path.includes('\\') || path.includes(':') || path.split('/').some(part => !part || part === '.' || part === '..')) fail('Unsafe artifact path');
  }
  if (event.event.startsWith('approval.') && 'evidence' in event.data && event.data.evidence.bytes === 0) fail('Approval requires nonempty observed evidence');
}

function identity(event: RunEvent): string {
  return JSON.stringify([event.runId, event.workflowRef, event.graphRef, event.controlPlaneSha256, event.inputRef]);
}
function executionIdentity(event: RunEvent): string {
  return JSON.stringify([event.nodeRef, event.agentRef, [...event.capabilityRefs].sort(), event.runtime, event.model, event.harnessRef]);
}
function operationKey(event: RunEvent): string | null {
  if (event.event.startsWith('agent.run.') && 'attempt' in event.data) return JSON.stringify(['agent', event.nodeRef, event.data.attempt]);
  if (event.event === 'eval.started') return JSON.stringify(['eval', event.nodeRef, event.data.evalRef, event.data.attempt]);
  if (event.event === 'eval.completed') return JSON.stringify(['eval', event.nodeRef, event.data.result.evalRef, event.data.attempt]);
  if ('requestId' in event.data) return JSON.stringify(['approval', event.nodeRef, event.data.approvalRef, event.data.requestId]);
  return null;
}
function starts(event: RunEvent): boolean { return event.event.endsWith('.started') || event.event === 'approval.requested'; }

/** Strict observation consistency, not execution/authorization enforcement. */
export function summarizeRun(values: unknown): {
  runId: string; workflowRef: string; graphRef: string; inputRef: string;
  controlPlaneSha256: string; reportedStatus: 'unknown' | 'running' | 'success' | 'failed' | 'cancelled';
  coverage: 'partial' | 'observed-lifecycle'; gaps: string[]; durationMs: number | null;
  eventCount: number; runtimes: string[]; models: string[];
  operations: { nodeRef: string | null; event: string; durationMs: number | null; startEventId: string | null; endEventId: string | null }[];
  evals: EvalResult[]; approvals: RunEvent[]; artifacts: RunEvent[]; failures: RunEvent[];
} {
  if (!Array.isArray(values) || !values.length || values.length > MAX_EVENTS) fail('Run event count limit');
  values.forEach(assertEvent);
  const events = values as RunEvent[];
  if (Buffer.byteLength(JSON.stringify(events)) > MAX_RUN_BYTES) fail('Run size limit');
  const first = events[0]!;
  const ids = new Set<string>();
  const sourceIds = new Set<string>();
  const open = new Map<string, RunEvent>();
  const closed = new Set<string>();
  const gaps: string[] = [];
  const operations: ReturnType<typeof summarizeRun>['operations'] = [];
  let workflowStart: RunEvent | undefined;
  let workflowEnd: Extract<RunEvent, { event: 'workflow.completed' }> | undefined;
  let previous = -Infinity;
  for (const event of events) {
    if (identity(event) !== identity(first)) fail('Mixed run identity');
    const sourceId = JSON.stringify([event.source.adapter, event.source.eventId]);
    if (ids.has(event.id) || sourceIds.has(sourceId)) fail('Duplicate event identity');
    ids.add(event.id); sourceIds.add(sourceId);
    const current = Date.parse(event.timestamp);
    if (current < previous) fail('Events are not chronological');
    previous = current;
    if (workflowEnd) fail('Event after workflow completion');
    if (event.event === 'workflow.started') {
      if (workflowStart || ids.size !== 1) fail('Workflow start must be first and unique');
      workflowStart = event;
    }
    if (event.event === 'workflow.completed') workflowEnd = event;
    const key = operationKey(event);
    if (key === null) continue;
    if (closed.has(key)) fail('Duplicate or restarted completed operation');
    if (starts(event)) {
      if (open.has(key)) fail('Duplicate operation start');
      open.set(key, event);
    } else {
      const start = open.get(key);
      if (start && executionIdentity(start) !== executionIdentity(event)) fail('Operation execution identity changed');
      if (start && event.event.startsWith('approval.') && 'evidence' in start.data && 'evidence' in event.data && (start.data.evidence.sha256 !== event.data.evidence.sha256 || start.data.evidence.bytes !== event.data.evidence.bytes)) fail('Approval subject evidence changed');
      if (!start) gaps.push('Missing start/request for ' + event.id);
      operations.push({ nodeRef: event.nodeRef, event: event.event, durationMs: start ? current - Date.parse(start.timestamp) : null, startEventId: start?.id ?? null, endEventId: event.id });
      open.delete(key); closed.add(key);
    }
  }
  for (const event of open.values()) {
    gaps.push('Missing completion/decision for ' + event.id);
    operations.push({ nodeRef: event.nodeRef, event: event.event, durationMs: null, startEventId: event.id, endEventId: null });
  }
  if (!workflowStart) gaps.push('Missing workflow start');
  if (!workflowEnd) gaps.push('Missing workflow completion');
  return {
    runId: first.runId, workflowRef: first.workflowRef, graphRef: first.graphRef, inputRef: first.inputRef, controlPlaneSha256: first.controlPlaneSha256,
    reportedStatus: workflowEnd?.data.status ?? (workflowStart ? 'running' : 'unknown'),
    coverage: gaps.length ? 'partial' : 'observed-lifecycle', gaps,
    durationMs: workflowStart && workflowEnd ? Date.parse(workflowEnd.timestamp) - Date.parse(workflowStart.timestamp) : null,
    eventCount: events.length,
    runtimes: [...new Set(events.flatMap(e => e.runtime === null ? [] : [e.runtime]))].sort(),
    models: [...new Set(events.flatMap(e => e.model === null ? [] : [e.model]))].sort(),
    operations,
    evals: events.flatMap(e => e.event === 'eval.completed' ? [structuredClone(e.data.result)] : []),
    approvals: structuredClone(events.filter(e => e.event.startsWith('approval.'))),
    artifacts: structuredClone(events.filter(e => e.event.startsWith('artifact.'))),
    failures: structuredClone(events.filter(e => e.event === 'agent.run.failed' || e.event === 'approval.rejected' || (e.event === 'eval.completed' && e.data.result.outcome !== 'pass') || (e.event === 'workflow.completed' && e.data.status !== 'success'))),
  };
}

export function assertGraphBinding(events: RunEvent[], definition: ControlPlaneDefinition): void {
  summarizeRun(events);
  const fingerprint = controlPlaneFingerprint(definition);
  for (const event of events) {
    const workflow = definition.workflows.find(w => w.id === event.workflowRef);
    const graph = definition.graphs.find(g => g.id === event.graphRef);
    if (event.controlPlaneSha256 !== fingerprint || !workflow || !graph || workflow.graphRef !== graph.id) fail('Control plane binding mismatch');
    const node = graph.nodes.find(n => n.id === event.nodeRef);
    if (!event.event.startsWith('workflow.') && !node) fail('Unknown graph node');
    const role = definition.agentRoles.find(r => r.id === event.agentRef);
    if (event.agentRef !== null && (!role || role.harnessRef !== event.harnessRef || JSON.stringify([...role.capabilityBindingRefs].sort()) !== JSON.stringify([...event.capabilityRefs].sort()))) fail('Agent/capability/harness binding mismatch');
    if (event.harnessRef !== null && !definition.harnesses.some(h => h.id === event.harnessRef && h.enabled)) fail('Unknown or disabled harness');
    if (event.capabilityRefs.some(id => !definition.capabilityBindings.some(c => c.id === id && c.enabled))) fail('Unknown or disabled capability');
    if (event.event.startsWith('agent.run.') && (node?.kind !== 'agent' || node.agentRoleRef !== event.agentRef)) fail('Agent node mismatch');
    if ('approvalRef' in event.data && (node?.kind !== 'approval' || node.approvalRef !== event.data.approvalRef)) fail('Approval node mismatch');
    if (event.event === 'eval.started' || event.event === 'eval.completed') {
      const evalRef = event.event === 'eval.started' ? event.data.evalRef : event.data.result.evalRef;
      if (node?.kind !== 'eval' || !definition.evalGates.some(g => g.id === node.evalGateRef && g.evalRef === evalRef)) fail('Eval node mismatch');
    }
    if (event.event === 'artifact.created' || event.event === 'artifact.updated') {
      const data = event.data;
      const artifact = definition.artifactContracts.find(a => a.id === data.artifactRef);
      if (!artifact || artifact.path !== data.path || !node || !(node.outputArtifactRefs.includes(artifact.id) || (node.kind === 'artifact' && node.artifactContractRef === artifact.id))) fail('Artifact binding mismatch');
    }
  }
}

export interface EvalObservation { result: EvalResult; startedAt: string | null; attempt: number; eventId: string }
/** Works for any already-normalized Phase 6 runtime result, not guessed provider payloads. */
export const evalResultTelemetry: TelemetryAdapter<EvalObservation> = {
  id: 'eval-result-v1',
  normalize(observation, binding: RunBinding) {
    if (!observation || !validateResult(observation.result)) fail('Invalid eval observation');
    const base = { ...structuredClone(binding), schemaVersion: '1.0.0' as const, kind: 'SpecDDRunEvent' as const };
    const events: RunEvent[] = [];
    if (observation.startedAt !== null) events.push({ ...base, id: observation.eventId + '.start', timestamp: observation.startedAt, source: { adapter: 'eval-result-v1', eventId: observation.eventId + '.start' }, event: 'eval.started', data: { attempt: observation.attempt, evalRef: observation.result.evalRef } });
    events.push({ ...base, id: observation.eventId + '.end', timestamp: observation.result.observedAt, source: { adapter: 'eval-result-v1', eventId: observation.eventId + '.end' }, event: 'eval.completed', data: { attempt: observation.attempt, result: structuredClone(observation.result) } });
    summarizeRun(events);
    return events;
  },
};
