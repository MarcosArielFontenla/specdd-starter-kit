import { isComponentId, type Diagnostic, type ValidationResult } from '@specdd/project-model';
import { structuralValidator } from '@specdd/project-model';
import schema from '../schema/capability-pack.schema.json' with { type: 'json' };
const validateStructure = structuralValidator(schema);
import {
  CAPABILITY_PACK_KIND,
  CAPABILITY_PACK_SCHEMA_VERSION,
  type CapabilityPack,
} from './types.js';

type UnknownRecord = Record<string, unknown>;
type ErrorSink = (code: string, path: string, message: string) => void;

const TOP_LEVEL_KEYS = new Set([
  'schemaVersion', 'kind', 'lifecycle', 'metadata', 'role', 'skills', 'playbooks',
  'workflows', 'policies', 'evals', 'context', 'subagents', 'routing', 'dependencies',
  'extensions',
]);

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null && !Array.isArray(value);

const isPortablePath = (value: string): boolean => {
  const normalized = value.replaceAll('\\', '/');
  return normalized.length > 0
    && !normalized.startsWith('/')
    && !/^[a-zA-Z]:\//.test(normalized)
    && !normalized.split('/').includes('..');
};

export function validateCapabilityPack(value: unknown): ValidationResult {
  const diagnostics: Diagnostic[] = validateStructure(value);
  const error: ErrorSink = (code, path, message) => diagnostics.push({ code, severity: 'error', path, message });

  if (!isRecord(value)) {
    error('CAPABILITY_DOCUMENT_TYPE', '/', 'Capability Pack must be a JSON object.');
    return { valid: false, diagnostics };
  }
  for (const key of Object.keys(value)) {
    if (!TOP_LEVEL_KEYS.has(key)) error('CAPABILITY_UNKNOWN_PROPERTY', `/${key}`, `Unknown top-level property '${key}'.`);
  }
  if (value.schemaVersion !== CAPABILITY_PACK_SCHEMA_VERSION) {
    error('CAPABILITY_UNSUPPORTED_VERSION', '/schemaVersion', `Expected schemaVersion '${CAPABILITY_PACK_SCHEMA_VERSION}'.`);
  }
  if (value.kind !== CAPABILITY_PACK_KIND) error('CAPABILITY_INVALID_KIND', '/kind', `Expected kind '${CAPABILITY_PACK_KIND}'.`);
  requireEnum(value, 'lifecycle', ['draft', 'active', 'deprecated'], '/lifecycle', error);

  const metadata = requireRecord(value, 'metadata', '/metadata', error);
  const role = requireRecord(value, 'role', '/role', error);
  const skills = requireArray(value, 'skills', '/skills', error);
  const playbooks = requireArray(value, 'playbooks', '/playbooks', error);
  const workflows = requireArray(value, 'workflows', '/workflows', error);
  const policies = requireArray(value, 'policies', '/policies', error);
  const evals = requireArray(value, 'evals', '/evals', error);
  const contexts = requireArray(value, 'context', '/context', error);
  const subagents = requireArray(value, 'subagents', '/subagents', error);
  const routing = requireArray(value, 'routing', '/routing', error);
  const dependencies = requireArray(value, 'dependencies', '/dependencies', error);

  if (metadata) {
    validateId(metadata.id, '/metadata/id', error);
    requireNonEmptyString(metadata, 'name', '/metadata/name', error);
    requireNonEmptyString(metadata, 'description', '/metadata/description', error);
    requireSemver(metadata, 'version', '/metadata/version', error);
    validateExtensions(metadata.extensions, '/metadata/extensions', error);
  }
  if (role) {
    validateId(role.id, '/role/id', error);
    requireNonEmptyString(role, 'title', '/role/title', error);
    requireNonEmptyString(role, 'scope', '/role/scope', error);
    validateExtensions(role.extensions, '/role/extensions', error);
  }

  if (skills.length === 0) error('CAPABILITY_SKILL_REQUIRED', '/skills', 'A Capability Pack requires at least one skill.');
  if (policies.length === 0) error('CAPABILITY_POLICY_REQUIRED', '/policies', 'A Capability Pack requires at least one policy.');
  if (evals.length === 0) error('CAPABILITY_EVAL_REQUIRED', '/evals', 'A Capability Pack requires at least one eval.');
  if (contexts.length === 0) error('CAPABILITY_CONTEXT_REQUIRED', '/context', 'A Capability Pack requires at least one context reference.');
  if (routing.length === 0) error('CAPABILITY_ROUTE_REQUIRED', '/routing', 'A Capability Pack requires at least one route.');

  const skillIds = validateCollection(skills, '/skills', error, (item, path) => {
    validatePath(item.path, `${path}/path`, error);
    requireSemver(item, 'version', `${path}/version`, error);
  });
  validateCollection(playbooks, '/playbooks', error, (item, path) => {
    validatePath(item.path, `${path}/path`, error);
    requireReference(item, 'skillRef', skillIds, 'skill', `${path}/skillRef`, error);
  });
  const contextIds = validateCollection(contexts, '/context', error, (item, path) => {
    validatePath(item.path, `${path}/path`, error);
    requireBoolean(item, 'required', `${path}/required`, error);
  });
  const workflowIds = validateCollection(workflows, '/workflows', error, (item, path) => {
    validatePath(item.path, `${path}/path`, error);
    requireStringArray(item, 'triggers', `${path}/triggers`, error);
    validateReferenceArray(item, 'skillRefs', skillIds, 'skill', `${path}/skillRefs`, error);
    validateReferenceArray(item, 'contextRefs', contextIds, 'context', `${path}/contextRefs`, error);
  });
  validateCollection(policies, '/policies', error, (item, path) => {
    requireEnum(item, 'effect', ['require', 'forbid', 'verify'], `${path}/effect`, error);
    requireNonEmptyString(item, 'statement', `${path}/statement`, error);
  });
  validateCollection(evals, '/evals', error, (item, path) => {
    validatePath(item.path, `${path}/path`, error);
    requireEnum(item, 'mode', ['disabled', 'log_only', 'enforced'], `${path}/mode`, error);
    validateReferenceArray(item, 'targetRefs', skillIds, 'skill', `${path}/targetRefs`, error);
  });
  validateCollection(subagents, '/subagents', error, (item, path) => {
    validatePath(item.path, `${path}/path`, error);
    if (item.status !== 'inactive') error('CAPABILITY_SUBAGENT_ACTIVE', `${path}/status`, 'Phase 2 Capability Pack subagents must remain inactive.');
    if (role && item.roleRef !== role.id) error('CAPABILITY_ROLE_REFERENCE', `${path}/roleRef`, `Subagent roleRef must resolve to '${String(role.id)}'.`);
    validateReferenceArray(item, 'skillRefs', skillIds, 'skill', `${path}/skillRefs`, error);
    validateReferenceArray(item, 'workflowRefs', workflowIds, 'workflow', `${path}/workflowRefs`, error);
  });
  validateCollection(routing, '/routing', error, (item, path) => {
    requireNonEmptyString(item, 'match', `${path}/match`, error);
    if (!Number.isInteger(item.priority) || Number(item.priority) < 0 || Number(item.priority) > 1000) {
      error('CAPABILITY_INVALID_PRIORITY', `${path}/priority`, 'Route priority must be an integer from 0 to 1000.');
    }
    requireReference(item, 'skillRef', skillIds, 'skill', `${path}/skillRef`, error);
    validatePath(item.workflowRoot, `${path}/workflowRoot`, error);
  });
  validateCollection(dependencies, '/dependencies', error, (item, path) => {
    requireEnum(item, 'kind', ['harness', 'capability'], `${path}/kind`, error);
    requireNonEmptyString(item, 'versionRange', `${path}/versionRange`, error);
    requireBoolean(item, 'required', `${path}/required`, error);
    if (metadata && item.kind === 'capability' && item.id === metadata.id) {
      error('CAPABILITY_SELF_DEPENDENCY', `${path}/id`, 'A Capability Pack cannot depend on itself.');
    }
  });

  validateExtensions(value.extensions, '/extensions', error);
  return { valid: diagnostics.length === 0, diagnostics };
}

export function isCapabilityPack(value: unknown): value is CapabilityPack {
  return validateCapabilityPack(value).valid;
}

function requireRecord(parent: UnknownRecord, key: string, path: string, error: ErrorSink): UnknownRecord | null {
  const value = parent[key];
  if (!isRecord(value)) { error('CAPABILITY_EXPECTED_OBJECT', path, 'Expected an object.'); return null; }
  return value;
}

function requireArray(parent: UnknownRecord, key: string, path: string, error: ErrorSink): unknown[] {
  const value = parent[key];
  if (!Array.isArray(value)) { error('CAPABILITY_EXPECTED_ARRAY', path, 'Expected an array.'); return []; }
  return value;
}

function requireNonEmptyString(parent: UnknownRecord, key: string, path: string, error: ErrorSink): void {
  if (typeof parent[key] !== 'string' || parent[key].trim() === '') error('CAPABILITY_EXPECTED_STRING', path, 'Expected a non-empty string.');
}

function requireBoolean(parent: UnknownRecord, key: string, path: string, error: ErrorSink): void {
  if (typeof parent[key] !== 'boolean') error('CAPABILITY_EXPECTED_BOOLEAN', path, 'Expected a boolean.');
}

function requireEnum(parent: UnknownRecord, key: string, allowed: readonly string[], path: string, error: ErrorSink): void {
  if (typeof parent[key] !== 'string' || !allowed.includes(parent[key])) error('CAPABILITY_INVALID_ENUM', path, `Expected one of: ${allowed.join(', ')}.`);
}

function requireSemver(parent: UnknownRecord, key: string, path: string, error: ErrorSink): void {
  if (typeof parent[key] !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(parent[key])) {
    error('CAPABILITY_INVALID_VERSION', path, 'Expected a semantic version.');
  }
}

function requireStringArray(parent: UnknownRecord, key: string, path: string, error: ErrorSink): string[] {
  const value = parent[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    error('CAPABILITY_EXPECTED_STRING_ARRAY', path, 'Expected an array of strings.');
    return [];
  }
  return value;
}

function validateId(value: unknown, path: string, error: ErrorSink): value is string {
  if (typeof value !== 'string' || !isComponentId(value)) {
    error('CAPABILITY_INVALID_ID', path, 'Expected a lower-case path-safe component ID.');
    return false;
  }
  return true;
}

function validatePath(value: unknown, path: string, error: ErrorSink): void {
  if (typeof value !== 'string' || !isPortablePath(value)) error('CAPABILITY_INVALID_PATH', path, 'Expected a safe repository-relative path.');
}

function validateCollection(values: unknown[], path: string, error: ErrorSink, visit: (item: UnknownRecord, path: string) => void): Set<string> {
  const ids = new Set<string>();
  values.forEach((value, index) => {
    const itemPath = `${path}/${index}`;
    if (!isRecord(value)) { error('CAPABILITY_EXPECTED_OBJECT', itemPath, 'Expected an object.'); return; }
    if (validateId(value.id, `${itemPath}/id`, error)) {
      if (ids.has(value.id)) error('CAPABILITY_DUPLICATE_ID', `${itemPath}/id`, `Duplicate ID '${value.id}'.`);
      ids.add(value.id);
    }
    visit(value, itemPath);
    validateExtensions(value.extensions, `${itemPath}/extensions`, error);
  });
  return ids;
}

function requireReference(parent: UnknownRecord, key: string, known: Set<string>, kind: string, path: string, error: ErrorSink): void {
  const value = parent[key];
  if (typeof value !== 'string') { error('CAPABILITY_EXPECTED_REFERENCE', path, `Expected a ${kind} ID.`); return; }
  if (!known.has(value)) error('CAPABILITY_UNKNOWN_REFERENCE', path, `Unknown ${kind} reference '${value}'.`);
}

function validateReferenceArray(parent: UnknownRecord, key: string, known: Set<string>, kind: string, path: string, error: ErrorSink): void {
  const values = requireStringArray(parent, key, path, error);
  values.forEach((value, index) => {
    if (!known.has(value)) error('CAPABILITY_UNKNOWN_REFERENCE', `${path}/${index}`, `Unknown ${kind} reference '${value}'.`);
  });
}

function validateExtensions(value: unknown, path: string, error: ErrorSink): void {
  if (value === undefined) return;
  if (!isRecord(value)) { error('CAPABILITY_INVALID_EXTENSIONS', path, 'Extensions must be an object.'); return; }
  for (const key of Object.keys(value)) {
    if (!/^[a-z0-9][a-z0-9.-]*\/[a-z0-9][a-z0-9._-]*$/.test(key)) {
      error('CAPABILITY_UNNAMESPACED_EXTENSION', `${path}/${key}`, "Extension keys must use the form 'namespace/key'.");
    }
  }
}
