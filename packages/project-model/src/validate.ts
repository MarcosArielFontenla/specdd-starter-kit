import {
  PROJECT_DEFINITION_KIND,
  PROJECT_DEFINITION_VERSION,
  type Diagnostic,
  type ProjectDefinition,
  type ValidationResult,
} from './types.js';
import { isComponentId } from './ids.js';
import { structuralValidator } from './structural.js';
import schema from '../schema/project-definition.schema.json' with { type: 'json' };
const validateStructure = structuralValidator(schema);

type UnknownRecord = Record<string, unknown>;

const TOP_LEVEL_KEYS = new Set([
  'schemaVersion', 'kind', 'metadata', 'project', 'architecture', 'harness',
  'capabilities', 'specs', 'workflows', 'evals', 'policies', 'telemetry',
  'deployment', 'runtime', 'provenance', 'extensions',
]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPortablePath(value: string): boolean {
  const normalized = value.replaceAll('\\', '/');
  return normalized.length > 0
    && !normalized.startsWith('/')
    && !/^[a-zA-Z]:\//.test(normalized)
    && !normalized.split('/').includes('..');
}

export function validateProjectDefinition(value: unknown): ValidationResult {
  const diagnostics: Diagnostic[] = validateStructure(value);
  const error = (code: string, path: string, message: string) => {
    diagnostics.push({ code, severity: 'error', path, message });
  };

  if (!isRecord(value)) {
    error('DOCUMENT_TYPE', '/', 'Project Definition must be a JSON object.');
    return { valid: false, diagnostics };
  }

  for (const key of Object.keys(value)) {
    if (!TOP_LEVEL_KEYS.has(key)) error('UNKNOWN_PROPERTY', `/${key}`, `Unknown top-level property '${key}'. Use a namespaced extension instead.`);
  }

  if (value.schemaVersion !== PROJECT_DEFINITION_VERSION) {
    error('UNSUPPORTED_SCHEMA_VERSION', '/schemaVersion', `Expected schemaVersion '${PROJECT_DEFINITION_VERSION}'.`);
  }
  if (value.kind !== PROJECT_DEFINITION_KIND) {
    error('INVALID_KIND', '/kind', `Expected kind '${PROJECT_DEFINITION_KIND}'.`);
  }

  const metadata = requireRecord(value, 'metadata', '/metadata', error);
  const project = requireRecord(value, 'project', '/project', error);
  const architecture = requireRecord(value, 'architecture', '/architecture', error);
  const harness = requireRecord(value, 'harness', '/harness', error);
  const telemetry = requireRecord(value, 'telemetry', '/telemetry', error);
  const deployment = requireRecord(value, 'deployment', '/deployment', error);
  const runtime = requireRecord(value, 'runtime', '/runtime', error);
  const provenance = requireRecord(value, 'provenance', '/provenance', error);

  const capabilities = requireArray(value, 'capabilities', '/capabilities', error);
  const specs = requireArray(value, 'specs', '/specs', error);
  const workflows = requireArray(value, 'workflows', '/workflows', error);
  const evals = requireArray(value, 'evals', '/evals', error);
  const policies = requireArray(value, 'policies', '/policies', error);

  if (metadata) {
    validateId(metadata.id, '/metadata/id', error);
    requireNonEmptyString(metadata, 'name', '/metadata/name', error);
    validateOptionalExtensions(metadata.extensions, '/metadata/extensions', error);
  }

  const domainIds = new Set<string>();
  const entityIds = new Set<string>();
  const featureIds = new Set<string>();
  const capabilityIds = validateIdentifiedCollection(capabilities, '/capabilities', error, (item, path) => {
    requireNonEmptyString(item, 'source', `${path}/source`, error);
    requireBoolean(item, 'enabled', `${path}/enabled`, error);
  });
  const specIds = validateIdentifiedCollection(specs, '/specs', error, (item, path) => {
    validatePortablePathField(item, 'path', `${path}/path`, error);
    requireEnum(item, 'kind', ['project', 'entity', 'feature', 'other'], `${path}/kind`, error);
    requireEnum(item, 'status', ['placeholder', 'draft', 'approved', 'active', 'inactive'], `${path}/status`, error);
    requireStringArray(item, 'targetRefs', `${path}/targetRefs`, error);
  });
  validateIdentifiedCollection(policies, '/policies', error, (item, path) => {
    validatePortablePathField(item, 'path', `${path}/path`, error);
    requireNonEmptyString(item, 'scope', `${path}/scope`, error);
    requireEnum(item, 'enforcement', ['instruction', 'validator', 'runtime', 'repository', 'human'], `${path}/enforcement`, error);
  });

  if (project) {
    requireEnum(project, 'scenario', ['greenfield', 'brownfield'], '/project/scenario', error);
    requireString(project, 'description', '/project/description', error);
    requireString(project, 'problem', '/project/problem', error);
    requireStringArray(project, 'personas', '/project/personas', error);
    requireStringArray(project, 'principles', '/project/principles', error);
    validateStringPair(project.outcomes, '/project/outcomes', 'user', 'business', error);
    validateStringPair(project.constraints, '/project/constraints', 'business', 'technical', error);

    const domains = requireArray(project, 'domains', '/project/domains', error);
    const entities = requireArray(project, 'entities', '/project/entities', error);
    const features = requireArray(project, 'features', '/project/features', error);
    for (const id of validateNamedCollection(domains, '/project/domains', error)) domainIds.add(id);
    if (domains.length === 0) error('DOMAIN_REQUIRED', '/project/domains', 'Harness v1 requires at least one domain.');
    for (const id of validateNamedCollection(entities, '/project/entities', error, 'domainRefs')) entityIds.add(id);
    for (const id of validateNamedCollection(features, '/project/features', error, 'domainRefs', 'entityRefs')) featureIds.add(id);

    forEachRecord(entities, '/project/entities', error, (entity, path) => {
      validateReferences(entity.domainRefs, domainIds, `${path}/domainRefs`, 'domain', error);
    });
    forEachRecord(features, '/project/features', error, (feature, path) => {
      validateReferences(feature.domainRefs, domainIds, `${path}/domainRefs`, 'domain', error);
      validateReferences(feature.entityRefs, entityIds, `${path}/entityRefs`, 'entity', error);
    });

    const security = requireRecord(project, 'security', '/project/security', error);
    if (security) {
      requireNonEmptyString(security, 'classification', '/project/security/classification', error);
      requireStringArray(security, 'owaspControls', '/project/security/owaspControls', error);
    }
    const review = requireRecord(project, 'contextReview', '/project/contextReview', error);
    if (review) {
      requireBoolean(review, 'required', '/project/contextReview/required', error);
      requireEnum(review, 'status', ['not-required', 'pending', 'approved'], '/project/contextReview/status', error);
      const findings = requireArray(review, 'findings', '/project/contextReview/findings', error);
      forEachRecord(findings, '/project/contextReview/findings', error, (finding, path) => {
        requireEnum(finding, 'group', ['stack', 'architecture', 'domains', 'entities', 'features'], `${path}/group`, error);
        requireNonEmptyString(finding, 'value', `${path}/value`, error);
        requireBoolean(finding, 'selected', `${path}/selected`, error);
        requireEnum(finding, 'status', ['unknown', 'planned', 'implemented', 'architectural'], `${path}/status`, error);
      });
      if (project.scenario === 'brownfield' && review.required !== true) {
        error('BROWNFIELD_REVIEW_REQUIRED', '/project/contextReview/required', 'Brownfield definitions must require explicit context review.');
      }
      if (project.scenario === 'greenfield' && (review.required !== false || review.status !== 'not-required')) {
        error('GREENFIELD_REVIEW_STATE', '/project/contextReview', "Greenfield context review must be { required: false, status: 'not-required' }.");
      }
    }
  }

  if (architecture) {
    requireStringArray(architecture, 'patterns', '/architecture/patterns', error);
    requireStringArray(architecture, 'decisionRefs', '/architecture/decisionRefs', error);
    const stack = requireRecord(architecture, 'stack', '/architecture/stack', error);
    if (stack) {
      requireStringArray(stack, 'languages', '/architecture/stack/languages', error);
      for (const key of ['frontend', 'backend', 'testing', 'database', 'infrastructure'] as const) {
        requireString(stack, key, `/architecture/stack/${key}`, error);
      }
      requireBoolean(stack, 'swagger', '/architecture/stack/swagger', error);
      requireBoolean(stack, 'accessibility', '/architecture/stack/accessibility', error);
    }
  }

  if (harness) {
    requireNonEmptyString(harness, 'contractVersion', '/harness/contractVersion', error);
    validatePortablePathField(harness, 'sourceRoot', '/harness/sourceRoot', error);
    validatePortablePathField(harness, 'primerPath', '/harness/primerPath', error);
    requireStringArray(harness, 'tools', '/harness/tools', error);
    requireStringArray(harness, 'mcpServers', '/harness/mcpServers', error);
    if (harness.contractVersion === '1.0.0' && (harness.sourceRoot !== '.agents' || harness.primerPath !== 'AGENTS.md')) {
      error('HARNESS_V1_LAYOUT', '/harness', "Harness v1 requires sourceRoot '.agents' and primerPath 'AGENTS.md'.");
    }
  }

  const allTargets = new Set([...domainIds, ...entityIds, ...featureIds]);
  forEachRecord(specs, '/specs', error, (spec, path) => validateReferences(spec.targetRefs, allTargets, `${path}/targetRefs`, 'project target', error));

  validateIdentifiedCollection(workflows, '/workflows', error, (item, path) => {
    validatePortablePathField(item, 'path', `${path}/path`, error);
    requireEnum(item, 'status', ['placeholder', 'draft', 'approved', 'active', 'inactive'], `${path}/status`, error);
    requireStringArray(item, 'triggers', `${path}/triggers`, error);
    requireStringArray(item, 'capabilityRefs', `${path}/capabilityRefs`, error);
    requireStringArray(item, 'specRefs', `${path}/specRefs`, error);
    validateReferences(item.capabilityRefs, capabilityIds, `${path}/capabilityRefs`, 'capability', error);
    validateReferences(item.specRefs, specIds, `${path}/specRefs`, 'spec', error);
  });

  validateIdentifiedCollection(evals, '/evals', error, (item, path) => {
    validatePortablePathField(item, 'path', `${path}/path`, error);
    requireEnum(item, 'mode', ['disabled', 'log_only', 'enforced'], `${path}/mode`, error);
    requireStringArray(item, 'capabilityRefs', `${path}/capabilityRefs`, error);
    validateReferences(item.capabilityRefs, capabilityIds, `${path}/capabilityRefs`, 'capability', error);
  });

  if (telemetry) {
    requireEnum(telemetry, 'mode', ['disabled', 'best_effort', 'required'], '/telemetry/mode', error);
    if (telemetry.eventContractPath !== undefined && (typeof telemetry.eventContractPath !== 'string' || !isPortablePath(telemetry.eventContractPath))) {
      error('INVALID_PATH', '/telemetry/eventContractPath', 'Telemetry event contract path must be a safe relative path.');
    }
    requireStringArray(telemetry, 'eventTypes', '/telemetry/eventTypes', error);
  }

  if (deployment) {
    requireBoolean(deployment, 'enabled', '/deployment/enabled', error);
    if (deployment.provider !== undefined && typeof deployment.provider !== 'string') error('EXPECTED_STRING', '/deployment/provider', 'Expected a string.');
    if (deployment.manifestPath !== undefined && (typeof deployment.manifestPath !== 'string' || !isPortablePath(deployment.manifestPath))) {
      error('INVALID_PATH', '/deployment/manifestPath', 'Deployment manifest path must be a safe relative path.');
    }
  }

  if (runtime) {
    if (runtime.preferredModel !== undefined && typeof runtime.preferredModel !== 'string') error('EXPECTED_STRING', '/runtime/preferredModel', 'Expected a string.');
    const adapters = requireArray(runtime, 'adapters', '/runtime/adapters', error);
    validateIdentifiedCollection(adapters, '/runtime/adapters', error, (item, path) => {
      requireNonEmptyString(item, 'kind', `${path}/kind`, error);
      requireBoolean(item, 'enabled', `${path}/enabled`, error);
    });
  }

  if (provenance) {
    requireEnum(provenance, 'source', ['wizard', 'scaffold-manifest', 'file'], '/provenance/source', error);
    if (provenance.receipt !== undefined) {
      if (!isRecord(provenance.receipt)) error('EXPECTED_OBJECT', '/provenance/receipt', 'Expected an object.');
      else {
        requireNumber(provenance.receipt, 'schemaVersion', '/provenance/receipt/schemaVersion', error);
        for (const key of ['generatedFiles', 'skippedPaths', 'replacedPaths'] as const) requireStringArray(provenance.receipt, key, `/provenance/receipt/${key}`, error);
      }
    }
  }

  validateOptionalExtensions(value.extensions, '/extensions', error);

  return { valid: diagnostics.every((diagnostic) => diagnostic.severity !== 'error'), diagnostics };
}

export function isProjectDefinition(value: unknown): value is ProjectDefinition {
  return validateProjectDefinition(value).valid;
}

type ErrorSink = (code: string, path: string, message: string) => void;

function requireRecord(parent: UnknownRecord, key: string, path: string, error: ErrorSink): UnknownRecord | null {
  const value = parent[key];
  if (!isRecord(value)) { error('EXPECTED_OBJECT', path, 'Expected an object.'); return null; }
  return value;
}

function requireArray(parent: UnknownRecord, key: string, path: string, error: ErrorSink): unknown[] {
  const value = parent[key];
  if (!Array.isArray(value)) { error('EXPECTED_ARRAY', path, 'Expected an array.'); return []; }
  return value;
}

function requireString(parent: UnknownRecord, key: string, path: string, error: ErrorSink): void {
  if (typeof parent[key] !== 'string') error('EXPECTED_STRING', path, 'Expected a string.');
}

function requireNonEmptyString(parent: UnknownRecord, key: string, path: string, error: ErrorSink): void {
  if (typeof parent[key] !== 'string' || parent[key].trim() === '') error('EXPECTED_NON_EMPTY_STRING', path, 'Expected a non-empty string.');
}

function requireBoolean(parent: UnknownRecord, key: string, path: string, error: ErrorSink): void {
  if (typeof parent[key] !== 'boolean') error('EXPECTED_BOOLEAN', path, 'Expected a boolean.');
}

function requireNumber(parent: UnknownRecord, key: string, path: string, error: ErrorSink): void {
  if (typeof parent[key] !== 'number' || !Number.isFinite(parent[key])) error('EXPECTED_NUMBER', path, 'Expected a finite number.');
}

function requireEnum(parent: UnknownRecord, key: string, allowed: readonly string[], path: string, error: ErrorSink): void {
  if (typeof parent[key] !== 'string' || !allowed.includes(parent[key])) error('INVALID_ENUM_VALUE', path, `Expected one of: ${allowed.join(', ')}.`);
}

function requireStringArray(parent: UnknownRecord, key: string, path: string, error: ErrorSink): string[] {
  const value = parent[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    error('EXPECTED_STRING_ARRAY', path, 'Expected an array of strings.');
    return [];
  }
  return value;
}

function validateId(value: unknown, path: string, error: ErrorSink): value is string {
  if (typeof value !== 'string' || !isComponentId(value)) {
    error('INVALID_ID', path, 'Expected a lower-case path-safe component ID.');
    return false;
  }
  return true;
}

function validatePortablePathField(parent: UnknownRecord, key: string, path: string, error: ErrorSink): void {
  const value = parent[key];
  if (typeof value !== 'string' || !isPortablePath(value)) error('INVALID_PATH', path, 'Expected a safe relative path without parent traversal.');
}

function validateNamedCollection(values: unknown[], path: string, error: ErrorSink, ...referenceFields: string[]): Set<string> {
  return validateIdentifiedCollection(values, path, error, (item, itemPath) => {
    requireNonEmptyString(item, 'name', `${itemPath}/name`, error);
    for (const field of referenceFields) requireStringArray(item, field, `${itemPath}/${field}`, error);
  });
}

function validateIdentifiedCollection(values: unknown[], path: string, error: ErrorSink, validate: (item: UnknownRecord, path: string) => void): Set<string> {
  const ids = new Set<string>();
  forEachRecord(values, path, error, (item, itemPath) => {
    if (validateId(item.id, `${itemPath}/id`, error)) {
      if (ids.has(item.id)) error('DUPLICATE_ID', `${itemPath}/id`, `Duplicate ID '${item.id}'.`);
      ids.add(item.id);
    }
    validate(item, itemPath);
    validateOptionalExtensions(item.extensions, `${itemPath}/extensions`, error);
  });
  return ids;
}

function forEachRecord(values: unknown[], path: string, error: ErrorSink, visit: (item: UnknownRecord, path: string) => void): void {
  values.forEach((value, index) => {
    const itemPath = `${path}/${index}`;
    if (!isRecord(value)) error('EXPECTED_OBJECT', itemPath, 'Expected an object.');
    else visit(value, itemPath);
  });
}

function validateReferences(value: unknown, known: Set<string>, path: string, kind: string, error: ErrorSink): void {
  if (!Array.isArray(value)) return;
  value.forEach((reference, index) => {
    if (typeof reference === 'string' && !known.has(reference)) error('UNKNOWN_REFERENCE', `${path}/${index}`, `Unknown ${kind} reference '${reference}'.`);
  });
}

function validateStringPair(value: unknown, path: string, first: string, second: string, error: ErrorSink): void {
  if (!isRecord(value)) { error('EXPECTED_OBJECT', path, 'Expected an object.'); return; }
  requireString(value, first, `${path}/${first}`, error);
  requireString(value, second, `${path}/${second}`, error);
}

function validateOptionalExtensions(value: unknown, path: string, error: ErrorSink): void {
  if (value === undefined) return;
  if (!isRecord(value)) { error('INVALID_EXTENSIONS', path, 'Extensions must be an object.'); return; }
  for (const key of Object.keys(value)) {
    if (!/^[a-z0-9][a-z0-9.-]*\/[a-z0-9][a-z0-9._-]*$/.test(key)) {
      error('UNNAMESPACED_EXTENSION', `${path}/${key}`, "Extension keys must use the form 'namespace/key'.");
    }
  }
}
