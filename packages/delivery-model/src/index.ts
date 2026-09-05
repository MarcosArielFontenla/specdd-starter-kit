import { structuralValidator, type Diagnostic } from '@specdd/project-model';
import { validateControlPlaneDefinition, type ControlPlaneDefinition, type GraphNode, type EdgeOutcome } from '@specdd/control-plane-model';
import definitionSchema from '../schema/definition.schema.json' with { type: 'json' };
import receiptSchema from '../schema/receipt.schema.json' with { type: 'json' };
import { STAGES, type DeliveryDefinition, type DeliveryReceipt, type Stage, type ActionBinding, type Operation } from './types.js';
export * from './types.js';
const structure = structuralValidator(definitionSchema), receiptStructure = structuralValidator(receiptSchema);
function bounded(value: unknown): boolean {
  try { const json = JSON.stringify(value); return typeof json === 'string' && new TextEncoder().encode(json).length <= 1024 * 1024; } catch { return false; }
}
const diagnostic = (code: string, path: string, message: string): Diagnostic => ({ code, path, message, severity: 'error' });
const safePath = (p: string) => p.split('/').every(s => /^[A-Za-z0-9_.-]+$/.test(s) && s !== '.' && s !== '..' && !s.endsWith('.') && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s) && !['.git', '.codex'].includes(s.toLowerCase()));
function actionBindings(d: DeliveryDefinition): ActionBinding[] {
  return STAGES.map(nodeRef => {
    const environment = ['deploy-staging', 'smoke'].includes(nodeRef) ? d.environments[0] : ['approve-promotion', 'deploy-production', 'post-deploy'].includes(nodeRef) ? d.environments[1] : undefined;
    const operation: Operation | 'human-approval' = nodeRef === 'source-gate' ? 'verify-source' : nodeRef === 'build' ? 'build' : nodeRef === 'approve-promotion' ? 'human-approval' : nodeRef.startsWith('deploy-') ? 'deploy' : 'verify';
    return { nodeRef, operation, adapterRef: operation === 'human-approval' ? null : environment?.adapterRef ?? d.buildAdapterRef,
      environmentRef: environment?.id ?? null, receiptArtifactRef: nodeRef + '-receipt' };
  });
}
export function validateDeliveryDefinition(value: unknown) {
  if (!bounded(value)) return { valid: false, diagnostics: [diagnostic('DELIVERY_SIZE', '/', 'Expected finite JSON, at most 1 MiB')] };
  const diagnostics = structure(value);
  if (diagnostics.length) return { valid: false, diagnostics };
  const d = value as DeliveryDefinition;
  const fail = (code: string, path: string, message: string) => diagnostics.push(diagnostic(code, path, message));
  for (const [path, v] of [['/project/source', d.project.source], ['/harness/source', d.harness.source], ['/provider/source', d.provider.source], ['/artifactRoot', d.artifactRoot]] as const) {
    if (!safePath(v)) fail('DELIVERY_PATH', path, 'Expected safe repository-relative path');
  }
  if (new Set(d.adapters.map(a => a.id)).size !== d.adapters.length) fail('DELIVERY_DUPLICATE', '/adapters', 'Duplicate adapter IDs');
  if (new Set(d.environments.map(e => e.id)).size !== 2 || new Set(d.environments.map(e => e.destinationRef)).size !== 2) fail('DELIVERY_DESTINATION', '/environments', 'Staging and promotion require distinct environment and destination IDs');
  const [staging, production] = d.environments;
  const rehearsal = staging!.class === 'local-rehearsal' && production!.class === 'local-rehearsal';
  if (!rehearsal && !(staging!.class === 'staging' && production!.class === 'production')) fail('DELIVERY_ENVIRONMENT', '/environments', 'Expected ordered staging/production or two local rehearsal slots');
  if (d.release.sourceGate === 'fixture-source' && !rehearsal) fail('DELIVERY_SOURCE_GATE', '/release/sourceGate', 'Fixture source cannot be promoted to staging/production');
  if (new Set(Object.values(d.checks)).size !== 3) fail('DELIVERY_EVAL', '/checks', 'Source, smoke and post-deploy checks must have distinct identities');
  for (const binding of actionBindings(d)) {
    if (binding.operation === 'human-approval') continue;
    const adapter = d.adapters.find(a => a.id === binding.adapterRef);
    if (!adapter) fail('DELIVERY_ADAPTER_REF', '/adapters', 'Unknown adapter for ' + binding.nodeRef);
    else if (!adapter.operations.includes(binding.operation)) fail('DELIVERY_UNSUPPORTED_OPERATION', '/adapters', binding.nodeRef + ' requires ' + binding.operation);
  }
  return { valid: !diagnostics.length, diagnostics };
}
export function assertDeliveryDefinition(value: unknown): asserts value is DeliveryDefinition {
  const result = validateDeliveryDefinition(value);
  if (!result.valid) throw new Error(result.diagnostics.map(d => d.code + ' ' + d.path + ': ' + d.message).join('; '));
}
function validTime(v: string) { return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v; }
export function validateDeliveryReceipt(value: unknown) {
  if (!bounded(value)) return { valid: false, diagnostics: [diagnostic('DELIVERY_SIZE', '/', 'Receipt exceeds finite JSON limit')] };
  const diagnostics = receiptStructure(value);
  if (diagnostics.length) return { valid: false, diagnostics };
  const r = value as DeliveryReceipt;
  if (!validTime(r.startedAt) || (r.endedAt !== null && (!validTime(r.endedAt) || r.endedAt < r.startedAt))) diagnostics.push(diagnostic('DELIVERY_TIME', '/', 'Invalid receipt chronology'));
  if (r.outcome === 'unknown' ? r.endedAt !== null || r.evidence !== null : r.endedAt === null || r.evidence === null) diagnostics.push(diagnostic('DELIVERY_OUTCOME', '/', 'Unknown observations cannot claim completion; terminal observations need evidence'));
  if (r.outcome === 'success' && r.stage !== 'source-gate' && r.artifactSha256 === null) diagnostics.push(diagnostic('DELIVERY_ARTIFACT', '/artifactSha256', 'Successful build and later stages require artifact identity'));
  return { valid: !diagnostics.length, diagnostics };
}

/** Pure fixed-shape projection, never an executor or permission grant. */
export function compileDelivery(value: unknown) {
  assertDeliveryDefinition(value);
  const d = structuredClone(value), bindings = actionBindings(d);
  const receipt = (stage: Stage) => stage + '-receipt';
  const inputs = (i: number) => i === 0 ? ['release-source'] : Array.from(new Set(['release-source', ...(i > 1 ? [receipt('build')] : []), receipt(STAGES[i - 1]!)]));
  const evalRefs: Partial<Record<Stage, string>> = { 'source-gate': d.checks.source, smoke: d.checks.smoke, 'post-deploy': d.checks.postDeploy };
  const nodes: GraphNode[] = STAGES.map((id, i) => {
    const common = { id, name: id, inputArtifactRefs: id === 'approve-promotion' ? [...inputs(i), 'promotion-subject'] : inputs(i), outputArtifactRefs: [receipt(id)], policyRefs: ['delivery-governance'], failureRouteRef: 'stop-delivery' };
    if (id === 'approve-promotion') return { ...common, kind: 'approval', approvalRef: 'promotion-approval' };
    if (evalRefs[id]) return { ...common, kind: 'eval', evalGateRef: id + '-eval', retryRef: 'eval-retry' };
    return { ...common, name: 'Record evidence: ' + id, kind: 'artifact', artifactContractRef: receipt(id) };
  });
  const definition: ControlPlaneDefinition = {
    kind: 'SpecDDControlPlane', schemaVersion: '1.0.0', lifecycle: 'draft',
    metadata: { id: d.id, name: d.name, description: 'Declarative delivery evidence and gate graph; requires a separate authorized adapter to perform operations.', version: d.version },
    project: d.project, harnesses: [{ id: d.harness.id, source: d.harness.source, contractVersion: d.harness.version, enabled: true }], capabilityBindings: [],
    // Schema 1.0.0 requires a role; this is governance context, never an agent-run node.
    agentRoles: [{ id: 'delivery-steward', title: 'Delivery steward', purpose: 'Review delivery evidence under the project Harness; no automatic agent execution.', harnessRef: d.harness.id, capabilityBindingRefs: [], policyRefs: ['delivery-governance'] }],
    workflows: [{ id: 'controlled-delivery', name: d.name, purpose: 'Order delivery receipts, required evals and human promotion approval.', graphRef: d.graphRef, triggers: [{ kind: 'manual' }], inputArtifactRefs: ['release-source', 'promotion-subject'], outputArtifactRefs: [receipt('post-deploy')], policyRefs: ['delivery-governance'] }],
    graphs: [{ id: d.graphRef, name: d.name, description: 'Seven fixed stages; artifact nodes record receipts, not deploy commands.', entryNodeId: 'source-gate', terminalNodeIds: ['post-deploy'], nodes,
      edges: STAGES.slice(0, -1).map((from, i) => ({ id: 'step-' + i, from, to: STAGES[i + 1]!, on: (from === 'approve-promotion' ? 'approved' : evalRefs[from] ? 'pass' : 'success') as EdgeOutcome })) }],
    approvals: [{ id: 'promotion-approval', name: 'Approve exact release promotion', mode: 'human', required: true, instructions: 'Require approval of delivery fingerprint, source revision, built artifact digest, promotion destination and smoke evidence. Revalidate immediately before dispatch; never infer from a boolean.', artifactRefs: ['promotion-subject', receipt('build'), receipt('smoke')] }],
    policies: [{ id: 'delivery-governance', category: 'permission', effect: 'require', subjectRefs: ['controlled-delivery', 'delivery-steward'], action: 'promote-release', resource: d.environments[1]!.destinationRef, enforcement: 'human', condition: 'Successful pinned-source, build, staging and smoke evidence plus exact promotion approval; this graph alone cannot enforce runtime permissions.' }],
    failureRoutes: [{ id: 'stop-delivery', graphRef: d.graphRef, strategy: 'stop', reason: 'Stop on rejection, failed eval or missing/conflicting receipt; no implicit rollback or production retry.' }],
    retries: [{ id: 'eval-retry', maxAttempts: d.evalMaxAttempts, backoff: { strategy: 'none', initialDelaySeconds: 0, maxDelaySeconds: 0 } }],
    evalGates: Object.entries(evalRefs).map(([stage, evalRef]) => ({ id: stage + '-eval', evalRef, mode: 'required', requiredOutcome: 'pass' })),
    artifactContracts: [
      { id: 'release-source', name: 'Pinned release and source gate evidence', kind: 'input', path: d.artifactRoot + '/release-source.json', required: true },
      { id: 'promotion-subject', name: 'Exact runtime-computed promotion subject', kind: 'input', path: d.artifactRoot + '/promotion-subject.json', required: true },
      ...STAGES.map(stage => ({ id: receipt(stage), name: stage + ' evidence', kind: 'evidence' as const, path: d.artifactRoot + '/' + stage + '.json', required: true }))], runtimeHints: [],
  };
  const validation = validateControlPlaneDefinition(definition);
  if (!validation.valid) throw new Error('Invalid generated graph: ' + JSON.stringify(validation.diagnostics));
  return { kind: 'SpecDDDeliveryProjection' as const, schemaVersion: '1.0.0', delivery: d, definition, bindings,
    executable: false as const, diagnostics: [{ code: 'DELIVERY_EXECUTION_UNAVAILABLE', severity: 'warning' as const, message: 'All adapter capabilities are caller declarations. This package implements no deployment runtime, credentials or remote approval verification.' }],
    limits: ['Artifact nodes record delivery evidence; they do not execute side effects', 'Eval definitions and source/merge evidence require separate validation at execution', 'No credential values, merge, deployment, auto-rollback or authorization are produced'] };
}

/** A valid generic DAG is insufficient: reject any change to this delivery projection. */
export function assertDeliveryProjection(value: unknown, delivery: unknown): void {
  if (!bounded(value)) throw new Error('Invalid projection size');
  const stable = (v: unknown): unknown => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, item]) => [k, stable(item)])) : v;
  if (JSON.stringify(stable(value)) !== JSON.stringify(stable(compileDelivery(delivery)))) throw new Error('Delivery projection changed or belongs to another definition');
}
