import { isComponentId, type Diagnostic, type ValidationResult } from '@specdd/project-model';
import { structuralValidator } from '@specdd/project-model';
import schema from '../schema/control-plane.schema.json' with { type: 'json' };
import graphSchema from '../schema/graph.schema.json' with { type: 'json' };
import policySchema from '../schema/policy.schema.json' with { type: 'json' };
const validateStructure = structuralValidator(schema, [graphSchema, policySchema]);
import {
  CONTROL_PLANE_KIND,
  CONTROL_PLANE_SCHEMA_VERSION,
  type ControlPlaneDefinition,
} from './types.js';

type UnknownRecord = Record<string, unknown>;
type ErrorSink = (code: string, path: string, message: string) => void;
type Collection = { ids: Set<string>; items: UnknownRecord[] };
type GraphReferences = {
  roles: Set<string>;
  approvals: Set<string>;
  evalGates: Set<string>;
  artifacts: Set<string>;
  policies: Set<string>;
  retries: Set<string>;
  failureRoutes: Set<string>;
  runtimeHints: Set<string>;
};

const TOP_LEVEL_KEYS = new Set([
  'schemaVersion', 'kind', 'lifecycle', 'metadata', 'project', 'harnesses',
  'capabilityBindings', 'agentRoles', 'workflows', 'graphs', 'approvals', 'policies',
  'failureRoutes', 'retries', 'evalGates', 'artifactContracts', 'runtimeHints',
  'extensions',
]);

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null && !Array.isArray(value);
const portablePath = (value: string): boolean => {
  const normalized = value.replaceAll('\\', '/');
  return normalized.length > 0 && !normalized.startsWith('/') && !/^[a-zA-Z]:\//.test(normalized) && !normalized.split('/').includes('..');
};

export function validateControlPlaneDefinition(value: unknown): ValidationResult {
  const diagnostics: Diagnostic[] = validateStructure(value);
  const error: ErrorSink = (code, path, message) => diagnostics.push({ code, severity: 'error', path, message });
  if (!isRecord(value)) {
    error('CONTROL_DOCUMENT_TYPE', '/', 'Control Plane definition must be a JSON object.');
    return { valid: false, diagnostics };
  }

  validateKeys(value, TOP_LEVEL_KEYS, '/', error);
  if (value.schemaVersion !== CONTROL_PLANE_SCHEMA_VERSION) error('CONTROL_UNSUPPORTED_VERSION', '/schemaVersion', `Expected schemaVersion '${CONTROL_PLANE_SCHEMA_VERSION}'.`);
  if (value.kind !== CONTROL_PLANE_KIND) error('CONTROL_INVALID_KIND', '/kind', `Expected kind '${CONTROL_PLANE_KIND}'.`);
  requireEnum(value, 'lifecycle', ['draft', 'active', 'deprecated'], '/lifecycle', error);

  const metadata = requireRecord(value, 'metadata', '/metadata', error);
  const project = requireRecord(value, 'project', '/project', error);
  if (metadata) {
    validateKeys(metadata, keys('id', 'name', 'description', 'version', 'extensions'), '/metadata', error);
    validateId(metadata.id, '/metadata/id', error);
    requireString(metadata, 'name', '/metadata/name', error);
    requireString(metadata, 'description', '/metadata/description', error);
    requireSemver(metadata, 'version', '/metadata/version', error);
    validateExtensions(metadata.extensions, '/metadata/extensions', error);
  }
  if (project) {
    validateKeys(project, keys('id', 'source', 'version', 'extensions'), '/project', error);
    validateId(project.id, '/project/id', error);
    validatePath(project.source, '/project/source', error);
    requireSemver(project, 'version', '/project/version', error);
    validateExtensions(project.extensions, '/project/extensions', error);
  }

  const harnesses = collect(value, 'harnesses', error);
  const capabilities = collect(value, 'capabilityBindings', error);
  const roles = collect(value, 'agentRoles', error);
  const workflows = collect(value, 'workflows', error);
  const graphs = collect(value, 'graphs', error);
  const approvals = collect(value, 'approvals', error);
  const policies = collect(value, 'policies', error);
  const failureRoutes = collect(value, 'failureRoutes', error);
  const retries = collect(value, 'retries', error);
  const evalGates = collect(value, 'evalGates', error);
  const artifacts = collect(value, 'artifactContracts', error);
  const runtimeHints = collect(value, 'runtimeHints', error);

  if (harnesses.items.length === 0) error('CONTROL_HARNESS_REQUIRED', '/harnesses', 'At least one Harness binding is required.');
  if (roles.items.length === 0) error('CONTROL_AGENT_ROLE_REQUIRED', '/agentRoles', 'At least one agent role is required.');
  if (workflows.items.length === 0) error('CONTROL_WORKFLOW_REQUIRED', '/workflows', 'At least one workflow is required.');
  if (graphs.items.length === 0) error('CONTROL_GRAPH_REQUIRED', '/graphs', 'At least one graph is required.');

  harnesses.items.forEach((item, index) => {
    const path = `/harnesses/${index}`;
    validateKeys(item, keys('id', 'source', 'contractVersion', 'enabled', 'extensions'), path, error);
    validatePath(item.source, `${path}/source`, error);
    requireSemver(item, 'contractVersion', `${path}/contractVersion`, error);
    requireBoolean(item, 'enabled', `${path}/enabled`, error);
    validateExtensions(item.extensions, `${path}/extensions`, error);
  });
  capabilities.items.forEach((item, index) => {
    const path = `/capabilityBindings/${index}`;
    validateKeys(item, keys('id', 'source', 'version', 'enabled', 'extensions'), path, error);
    validatePath(item.source, `${path}/source`, error);
    requireSemver(item, 'version', `${path}/version`, error);
    requireBoolean(item, 'enabled', `${path}/enabled`, error);
    validateExtensions(item.extensions, `${path}/extensions`, error);
  });
  artifacts.items.forEach((item, index) => {
    const path = `/artifactContracts/${index}`;
    validateKeys(item, keys('id', 'name', 'kind', 'path', 'required', 'schemaRef', 'extensions'), path, error);
    requireString(item, 'name', `${path}/name`, error);
    requireEnum(item, 'kind', ['input', 'output', 'evidence'], `${path}/kind`, error);
    validatePath(item.path, `${path}/path`, error);
    requireBoolean(item, 'required', `${path}/required`, error);
    optionalPath(item, 'schemaRef', `${path}/schemaRef`, error);
    validateExtensions(item.extensions, `${path}/extensions`, error);
  });
  runtimeHints.items.forEach((item, index) => {
    const path = `/runtimeHints/${index}`;
    validateKeys(item, keys('id', 'execution', 'isolation', 'network', 'interactive', 'extensions'), path, error);
    requireEnum(item, 'execution', ['local', 'remote', 'either'], `${path}/execution`, error);
    requireEnum(item, 'isolation', ['none', 'process', 'worktree', 'container'], `${path}/isolation`, error);
    requireEnum(item, 'network', ['denied', 'restricted', 'allowed'], `${path}/network`, error);
    requireBoolean(item, 'interactive', `${path}/interactive`, error);
    validateExtensions(item.extensions, `${path}/extensions`, error);
  });
  retries.items.forEach((item, index) => validateRetry(item, `/retries/${index}`, error));
  approvals.items.forEach((item, index) => {
    const path = `/approvals/${index}`;
    validateKeys(item, keys('id', 'name', 'mode', 'required', 'instructions', 'artifactRefs', 'extensions'), path, error);
    requireString(item, 'name', `${path}/name`, error);
    if (item.mode !== 'human') error('CONTROL_APPROVAL_NOT_HUMAN', `${path}/mode`, 'Phase 3 approvals must be human.');
    requireBoolean(item, 'required', `${path}/required`, error);
    requireString(item, 'instructions', `${path}/instructions`, error);
    validateReferenceArray(item, 'artifactRefs', artifacts.ids, 'artifact', `${path}/artifactRefs`, error);
    validateExtensions(item.extensions, `${path}/extensions`, error);
  });
  evalGates.items.forEach((item, index) => {
    const path = `/evalGates/${index}`;
    validateKeys(item, keys('id', 'evalRef', 'mode', 'requiredOutcome', 'extensions'), path, error);
    validateId(item.evalRef, `${path}/evalRef`, error);
    requireEnum(item, 'mode', ['advisory', 'required'], `${path}/mode`, error);
    if (item.requiredOutcome !== 'pass') error('CONTROL_INVALID_EVAL_OUTCOME', `${path}/requiredOutcome`, "Eval gates require the outcome 'pass'.");
    validateExtensions(item.extensions, `${path}/extensions`, error);
  });

  const subjectIds = new Set([...roles.ids, ...workflows.ids]);
  policies.items.forEach((item, index) => {
    const path = `/policies/${index}`;
    validateKeys(item, keys('id', 'category', 'effect', 'subjectRefs', 'action', 'resource', 'enforcement', 'condition', 'extensions'), path, error);
    requireEnum(item, 'category', ['permission', 'risk', 'transition'], `${path}/category`, error);
    requireEnum(item, 'effect', ['allow', 'deny', 'require'], `${path}/effect`, error);
    validateReferenceArray(item, 'subjectRefs', subjectIds, 'agent role or workflow', `${path}/subjectRefs`, error);
    requireString(item, 'action', `${path}/action`, error);
    requireString(item, 'resource', `${path}/resource`, error);
    requireEnum(item, 'enforcement', ['instruction', 'validator', 'runtime', 'human'], `${path}/enforcement`, error);
    optionalString(item, 'condition', `${path}/condition`, error);
    validateExtensions(item.extensions, `${path}/extensions`, error);
  });
  roles.items.forEach((item, index) => {
    const path = `/agentRoles/${index}`;
    validateKeys(item, keys('id', 'title', 'purpose', 'harnessRef', 'capabilityBindingRefs', 'policyRefs', 'runtimeHintRef', 'extensions'), path, error);
    requireString(item, 'title', `${path}/title`, error);
    requireString(item, 'purpose', `${path}/purpose`, error);
    requireReference(item, 'harnessRef', harnesses.ids, 'Harness', `${path}/harnessRef`, error);
    validateReferenceArray(item, 'capabilityBindingRefs', capabilities.ids, 'capability binding', `${path}/capabilityBindingRefs`, error);
    validateReferenceArray(item, 'policyRefs', policies.ids, 'policy', `${path}/policyRefs`, error);
    optionalReference(item, 'runtimeHintRef', runtimeHints.ids, 'runtime hint', `${path}/runtimeHintRef`, error);
    validateExtensions(item.extensions, `${path}/extensions`, error);
  });

  const graphRecords = new Map<string, UnknownRecord>();
  graphs.items.forEach((item) => { if (typeof item.id === 'string') graphRecords.set(item.id, item); });
  failureRoutes.items.forEach((item, index) => {
    const path = `/failureRoutes/${index}`;
    validateKeys(item, keys('id', 'graphRef', 'strategy', 'targetNodeRef', 'reason', 'extensions'), path, error);
    requireReference(item, 'graphRef', graphs.ids, 'graph', `${path}/graphRef`, error);
    requireEnum(item, 'strategy', ['stop', 'route'], `${path}/strategy`, error);
    requireString(item, 'reason', `${path}/reason`, error);
    if (item.strategy === 'route') {
      if (typeof item.targetNodeRef !== 'string') error('CONTROL_FAILURE_TARGET_REQUIRED', `${path}/targetNodeRef`, 'Route failure strategy requires a target node.');
    } else if (item.targetNodeRef !== undefined) {
      error('CONTROL_FAILURE_TARGET_FORBIDDEN', `${path}/targetNodeRef`, 'Stop failure strategy cannot declare a target node.');
    }
    validateExtensions(item.extensions, `${path}/extensions`, error);
  });

  const globalNodeIds = new Set<string>();
  graphs.items.forEach((graph, index) => validateGraph(
    graph,
    `/graphs/${index}`,
    { roles: roles.ids, approvals: approvals.ids, evalGates: evalGates.ids, artifacts: artifacts.ids, policies: policies.ids, retries: retries.ids, failureRoutes: failureRoutes.ids, runtimeHints: runtimeHints.ids },
    failureRoutes.items,
    globalNodeIds,
    error,
  ));

  failureRoutes.items.forEach((item, index) => {
    if (item.strategy !== 'route' || typeof item.graphRef !== 'string' || typeof item.targetNodeRef !== 'string') return;
    const graph = graphRecords.get(item.graphRef);
    const nodeIds = graph && Array.isArray(graph.nodes)
      ? new Set(graph.nodes.filter(isRecord).map((node) => node.id).filter((id): id is string => typeof id === 'string'))
      : new Set<string>();
    if (!nodeIds.has(item.targetNodeRef)) error('CONTROL_UNKNOWN_REFERENCE', `/failureRoutes/${index}/targetNodeRef`, `Unknown node reference '${item.targetNodeRef}' in graph '${item.graphRef}'.`);
  });

  workflows.items.forEach((item, index) => {
    const path = `/workflows/${index}`;
    validateKeys(item, keys('id', 'name', 'purpose', 'graphRef', 'triggers', 'inputArtifactRefs', 'outputArtifactRefs', 'policyRefs', 'extensions'), path, error);
    requireString(item, 'name', `${path}/name`, error);
    requireString(item, 'purpose', `${path}/purpose`, error);
    requireReference(item, 'graphRef', graphs.ids, 'graph', `${path}/graphRef`, error);
    const triggers = requireArray(item, 'triggers', `${path}/triggers`, error);
    if (triggers.length === 0) error('CONTROL_TRIGGER_REQUIRED', `${path}/triggers`, 'A workflow requires at least one trigger.');
    triggers.forEach((trigger, triggerIndex) => validateTrigger(trigger, `${path}/triggers/${triggerIndex}`, error));
    validateReferenceArray(item, 'inputArtifactRefs', artifacts.ids, 'artifact', `${path}/inputArtifactRefs`, error);
    validateReferenceArray(item, 'outputArtifactRefs', artifacts.ids, 'artifact', `${path}/outputArtifactRefs`, error);
    validateReferenceArray(item, 'policyRefs', policies.ids, 'policy', `${path}/policyRefs`, error);
    validateExtensions(item.extensions, `${path}/extensions`, error);
  });

  validateExtensions(value.extensions, '/extensions', error);
  return { valid: diagnostics.length === 0, diagnostics };
}

export function isControlPlaneDefinition(value: unknown): value is ControlPlaneDefinition {
  return validateControlPlaneDefinition(value).valid;
}

function validateGraph(
  graph: UnknownRecord,
  path: string,
  refs: GraphReferences,
  failureRoutes: UnknownRecord[],
  globalNodeIds: Set<string>,
  error: ErrorSink,
): void {
  validateKeys(graph, keys('id', 'name', 'description', 'entryNodeId', 'terminalNodeIds', 'nodes', 'edges', 'extensions'), path, error);
  requireString(graph, 'name', `${path}/name`, error);
  requireString(graph, 'description', `${path}/description`, error);
  const nodes = collectAt(graph, 'nodes', `${path}/nodes`, error);
  const edges = collectAt(graph, 'edges', `${path}/edges`, error);
  nodes.items.forEach((node, index) => {
    const nodePath = `${path}/nodes/${index}`;
    if (typeof node.id === 'string') {
      if (globalNodeIds.has(node.id)) error('CONTROL_DUPLICATE_NODE_ID', `${nodePath}/id`, `Node ID '${node.id}' must be unique across the definition.`);
      globalNodeIds.add(node.id);
    }
    validateNode(node, nodePath, refs, error);
  });
  const entry = graph.entryNodeId;
  if (typeof entry !== 'string' || !nodes.ids.has(entry)) error('CONTROL_UNKNOWN_REFERENCE', `${path}/entryNodeId`, `Entry node '${String(entry)}' does not exist in this graph.`);
  const terminals = requireStringArray(graph, 'terminalNodeIds', `${path}/terminalNodeIds`, error);
  if (terminals.length === 0) error('CONTROL_TERMINAL_REQUIRED', `${path}/terminalNodeIds`, 'A graph requires at least one terminal node.');
  terminals.forEach((id, index) => { if (!nodes.ids.has(id)) error('CONTROL_UNKNOWN_REFERENCE', `${path}/terminalNodeIds/${index}`, `Unknown terminal node '${id}'.`); });

  const adjacency = new Map<string, string[]>();
  const nodeKinds = new Map<string, string>();
  nodes.ids.forEach((id) => adjacency.set(id, []));
  nodes.items.forEach((node) => { if (typeof node.id === 'string' && typeof node.kind === 'string') nodeKinds.set(node.id, node.kind); });
  edges.items.forEach((edge, index) => {
    const edgePath = `${path}/edges/${index}`;
    validateKeys(edge, keys('id', 'from', 'to', 'on', 'extensions'), edgePath, error);
    const from = requireReference(edge, 'from', nodes.ids, 'node', `${edgePath}/from`, error);
    const to = requireReference(edge, 'to', nodes.ids, 'node', `${edgePath}/to`, error);
    requireEnum(edge, 'on', ['success', 'approved', 'rejected', 'pass', 'fail', 'always'], `${edgePath}/on`, error);
    if (from && to) {
      adjacency.get(from)?.push(to);
      const outcomes: Record<string, string[]> = {
        agent: ['success', 'always'],
        artifact: ['success', 'always'],
        approval: ['approved', 'rejected', 'always'],
        eval: ['pass', 'fail', 'always'],
      };
      const kind = nodeKinds.get(from) || '';
      const allowed = Object.hasOwn(outcomes, kind) ? outcomes[kind]! : [];
      if (typeof edge.on === 'string' && !allowed.includes(edge.on)) error('CONTROL_INVALID_EDGE_OUTCOME', `${edgePath}/on`, `Outcome '${edge.on}' is not valid for a ${nodeKinds.get(from)} node.`);
    }
    validateExtensions(edge.extensions, `${edgePath}/extensions`, error);
  });
  const graphId = typeof graph.id === 'string' ? graph.id : '';
  nodes.items.forEach((node) => {
    if (typeof node.id !== 'string' || typeof node.failureRouteRef !== 'string') return;
    const route = failureRoutes.find((candidate) => candidate.id === node.failureRouteRef);
    if (route && route.graphRef !== graphId) {
      error('CONTROL_FAILURE_ROUTE_GRAPH_MISMATCH', `${path}/nodes/${nodes.items.indexOf(node)}/failureRouteRef`, 'Failure route belongs to a different graph.');
    } else if (route && route.strategy === 'route' && typeof route.targetNodeRef === 'string' && nodes.ids.has(route.targetNodeRef)) {
      adjacency.get(node.id)?.push(route.targetNodeRef);
    }
  });
  for (const terminal of terminals) {
    if ((adjacency.get(terminal)?.length || 0) > 0) error('CONTROL_TERMINAL_HAS_OUTGOING', `${path}/terminalNodeIds`, `Terminal node '${terminal}' has an outgoing route.`);
  }
  if (typeof entry === 'string' && nodes.ids.has(entry)) {
    const reachable = walk(entry, adjacency);
    nodes.ids.forEach((id) => { if (!reachable.has(id)) error('CONTROL_UNREACHABLE_NODE', `${path}/nodes`, `Node '${id}' is unreachable from entry '${entry}'.`); });
  }
  if (hasCycle(adjacency)) error('CONTROL_GRAPH_CYCLE', path, 'Phase 3 graphs must be acyclic; use a bounded retry rule instead of a cycle.');
  validateExtensions(graph.extensions, `${path}/extensions`, error);
}

function validateNode(node: UnknownRecord, path: string, refs: GraphReferences, error: ErrorSink): void {
  const common = ['id', 'name', 'kind', 'inputArtifactRefs', 'outputArtifactRefs', 'policyRefs', 'retryRef', 'failureRouteRef', 'runtimeHintRef', 'extensions'];
  const expected: Record<string, [string, string, Set<string>]> = {
    agent: ['agentRoleRef', 'agent role', refs.roles],
    approval: ['approvalRef', 'approval', refs.approvals],
    eval: ['evalGateRef', 'eval gate', refs.evalGates],
    artifact: ['artifactContractRef', 'artifact', refs.artifacts],
  };
  if (typeof node.kind !== 'string' || !Object.hasOwn(expected, node.kind)) {
    error('CONTROL_INVALID_NODE_KIND', `${path}/kind`, 'Expected node kind: agent, approval, eval, or artifact.');
    validateKeys(node, keys(...common), path, error);
  } else {
    const [field, label, known] = expected[node.kind]!;
    validateKeys(node, keys(...common, field), path, error);
    requireReference(node, field, known, label, `${path}/${field}`, error);
  }
  requireString(node, 'name', `${path}/name`, error);
  validateReferenceArray(node, 'inputArtifactRefs', refs.artifacts, 'artifact', `${path}/inputArtifactRefs`, error);
  validateReferenceArray(node, 'outputArtifactRefs', refs.artifacts, 'artifact', `${path}/outputArtifactRefs`, error);
  validateReferenceArray(node, 'policyRefs', refs.policies, 'policy', `${path}/policyRefs`, error);
  optionalReference(node, 'retryRef', refs.retries, 'retry rule', `${path}/retryRef`, error);
  optionalReference(node, 'failureRouteRef', refs.failureRoutes, 'failure route', `${path}/failureRouteRef`, error);
  optionalReference(node, 'runtimeHintRef', refs.runtimeHints, 'runtime hint', `${path}/runtimeHintRef`, error);
  validateExtensions(node.extensions, `${path}/extensions`, error);
}

function validateRetry(item: UnknownRecord, path: string, error: ErrorSink): void {
  validateKeys(item, keys('id', 'maxAttempts', 'backoff', 'extensions'), path, error);
  if (!Number.isInteger(item.maxAttempts) || Number(item.maxAttempts) < 1 || Number(item.maxAttempts) > 10) error('CONTROL_INVALID_RETRY_ATTEMPTS', `${path}/maxAttempts`, 'maxAttempts must be an integer from 1 to 10.');
  const backoff = requireRecord(item, 'backoff', `${path}/backoff`, error);
  if (backoff) {
    validateKeys(backoff, keys('strategy', 'initialDelaySeconds', 'maxDelaySeconds', 'extensions'), `${path}/backoff`, error);
    requireEnum(backoff, 'strategy', ['none', 'fixed', 'exponential'], `${path}/backoff/strategy`, error);
    const initial = requireNonNegativeNumber(backoff, 'initialDelaySeconds', `${path}/backoff/initialDelaySeconds`, error);
    const max = requireNonNegativeNumber(backoff, 'maxDelaySeconds', `${path}/backoff/maxDelaySeconds`, error);
    if (initial !== null && max !== null && max < initial) error('CONTROL_INVALID_BACKOFF_RANGE', `${path}/backoff/maxDelaySeconds`, 'maxDelaySeconds must be greater than or equal to initialDelaySeconds.');
    if (backoff.strategy === 'none' && (initial !== 0 || max !== 0)) error('CONTROL_INVALID_BACKOFF_NONE', `${path}/backoff`, 'A none backoff must use zero delays.');
    validateExtensions(backoff.extensions, `${path}/backoff/extensions`, error);
  }
  validateExtensions(item.extensions, `${path}/extensions`, error);
}

function validateTrigger(value: unknown, path: string, error: ErrorSink): void {
  if (!isRecord(value)) { error('CONTROL_EXPECTED_OBJECT', path, 'Expected an object.'); return; }
  validateKeys(value, keys('kind', 'event', 'extensions'), path, error);
  requireEnum(value, 'kind', ['manual', 'event'], `${path}/kind`, error);
  if (value.kind === 'event') requireString(value, 'event', `${path}/event`, error);
  if (value.kind === 'manual' && value.event !== undefined) error('CONTROL_MANUAL_TRIGGER_EVENT', `${path}/event`, 'A manual trigger cannot declare an event.');
  validateExtensions(value.extensions, `${path}/extensions`, error);
}

function collect(parent: UnknownRecord, key: string, error: ErrorSink): Collection {
  return collectAt(parent, key, `/${key}`, error);
}

function collectAt(parent: UnknownRecord, key: string, path: string, error: ErrorSink): Collection {
  const values = requireArray(parent, key, path, error);
  const ids = new Set<string>();
  const items: UnknownRecord[] = [];
  values.forEach((value, index) => {
    if (!isRecord(value)) { error('CONTROL_EXPECTED_OBJECT', `${path}/${index}`, 'Expected an object.'); return; }
    items.push(value);
    if (validateId(value.id, `${path}/${index}/id`, error)) {
      if (ids.has(value.id)) error('CONTROL_DUPLICATE_ID', `${path}/${index}/id`, `Duplicate ID '${value.id}'.`);
      ids.add(value.id);
    }
  });
  return { ids, items };
}

function keys(...values: string[]): Set<string> { return new Set(values); }
function validateKeys(value: UnknownRecord, allowed: Set<string>, path: string, error: ErrorSink): void {
  Object.keys(value).forEach((key) => { if (!allowed.has(key)) error('CONTROL_UNKNOWN_PROPERTY', `${path === '/' ? '' : path}/${key}`, `Unknown property '${key}'.`); });
}
function requireRecord(parent: UnknownRecord, key: string, path: string, error: ErrorSink): UnknownRecord | null {
  const value = parent[key];
  if (!isRecord(value)) { error('CONTROL_EXPECTED_OBJECT', path, 'Expected an object.'); return null; }
  return value;
}
function requireArray(parent: UnknownRecord, key: string, path: string, error: ErrorSink): unknown[] {
  const value = parent[key];
  if (!Array.isArray(value)) { error('CONTROL_EXPECTED_ARRAY', path, 'Expected an array.'); return []; }
  return value;
}
function requireString(parent: UnknownRecord, key: string, path: string, error: ErrorSink): void {
  if (typeof parent[key] !== 'string' || parent[key].trim() === '') error('CONTROL_EXPECTED_STRING', path, 'Expected a non-empty string.');
}
function optionalString(parent: UnknownRecord, key: string, path: string, error: ErrorSink): void {
  if (parent[key] !== undefined && (typeof parent[key] !== 'string' || parent[key].trim() === '')) error('CONTROL_EXPECTED_STRING', path, 'Expected a non-empty string.');
}
function requireBoolean(parent: UnknownRecord, key: string, path: string, error: ErrorSink): void {
  if (typeof parent[key] !== 'boolean') error('CONTROL_EXPECTED_BOOLEAN', path, 'Expected a boolean.');
}
function requireEnum(parent: UnknownRecord, key: string, allowed: readonly string[], path: string, error: ErrorSink): void {
  if (typeof parent[key] !== 'string' || !allowed.includes(parent[key])) error('CONTROL_INVALID_ENUM', path, `Expected one of: ${allowed.join(', ')}.`);
}
function requireSemver(parent: UnknownRecord, key: string, path: string, error: ErrorSink): void {
  if (typeof parent[key] !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(parent[key])) error('CONTROL_INVALID_VERSION', path, 'Expected a semantic version.');
}
function requireNonNegativeNumber(parent: UnknownRecord, key: string, path: string, error: ErrorSink): number | null {
  const value = parent[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) { error('CONTROL_EXPECTED_NON_NEGATIVE_NUMBER', path, 'Expected a non-negative number.'); return null; }
  return value;
}
function requireStringArray(parent: UnknownRecord, key: string, path: string, error: ErrorSink): string[] {
  const value = parent[key];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) { error('CONTROL_EXPECTED_STRING_ARRAY', path, 'Expected an array of strings.'); return []; }
  if (new Set(value).size !== value.length) error('CONTROL_DUPLICATE_REFERENCE', path, 'Reference arrays cannot contain duplicates.');
  return value;
}
function validateId(value: unknown, path: string, error: ErrorSink): value is string {
  if (typeof value !== 'string' || !isComponentId(value)) { error('CONTROL_INVALID_ID', path, 'Expected a lower-case path-safe component ID.'); return false; }
  return true;
}
function validatePath(value: unknown, path: string, error: ErrorSink): void {
  if (typeof value !== 'string' || !portablePath(value)) error('CONTROL_INVALID_PATH', path, 'Expected a safe repository-relative path.');
}
function optionalPath(parent: UnknownRecord, key: string, path: string, error: ErrorSink): void {
  if (parent[key] !== undefined) validatePath(parent[key], path, error);
}
function requireReference(parent: UnknownRecord, key: string, known: Set<string>, label: string, path: string, error: ErrorSink): string | null {
  const value = parent[key];
  if (typeof value !== 'string') { error('CONTROL_EXPECTED_REFERENCE', path, `Expected a ${label} ID.`); return null; }
  if (!known.has(value)) { error('CONTROL_UNKNOWN_REFERENCE', path, `Unknown ${label} reference '${value}'.`); return null; }
  return value;
}
function optionalReference(parent: UnknownRecord, key: string, known: Set<string>, label: string, path: string, error: ErrorSink): void {
  if (parent[key] !== undefined) requireReference(parent, key, known, label, path, error);
}
function validateReferenceArray(parent: UnknownRecord, key: string, known: Set<string>, label: string, path: string, error: ErrorSink): void {
  requireStringArray(parent, key, path, error).forEach((value, index) => { if (!known.has(value)) error('CONTROL_UNKNOWN_REFERENCE', `${path}/${index}`, `Unknown ${label} reference '${value}'.`); });
}
function validateExtensions(value: unknown, path: string, error: ErrorSink): void {
  if (value === undefined) return;
  if (!isRecord(value)) { error('CONTROL_INVALID_EXTENSIONS', path, 'Extensions must be an object.'); return; }
  Object.keys(value).forEach((key) => { if (!/^[a-z0-9][a-z0-9.-]*\/[a-z0-9][a-z0-9._-]*$/.test(key)) error('CONTROL_UNNAMESPACED_EXTENSION', `${path}/${key}`, "Extension keys must use the form 'namespace/key'."); });
}
function walk(start: string, adjacency: Map<string, string[]>): Set<string> {
  const visited = new Set<string>();
  const pending = [start];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    pending.push(...(adjacency.get(current) || []));
  }
  return visited;
}
function hasCycle(adjacency: Map<string, string[]>): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (node: string): boolean => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of adjacency.get(node) || []) if (visit(next)) return true;
    visiting.delete(node);
    visited.add(node);
    return false;
  };
  return [...adjacency.keys()].some(visit);
}
