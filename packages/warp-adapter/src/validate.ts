import type { Diagnostic, ValidationResult } from '@specdd/project-model';
import {
  WARP_ADAPTER_KIND,
  WARP_ADAPTER_VERSION,
  WARP_FOREMAN_ID,
  type WarpAdapterConfig,
} from './types.js';

type UnknownRecord = Record<string, unknown>;
type ErrorSink = (code: string, path: string, message: string) => void;

const CONFIG_KEYS = new Set(['schemaVersion', 'kind', 'factoryName', 'repositories', 'agentDefaults', 'agentBindings', 'automations']);
const EXECUTION_KEYS = new Set(['model', 'harness']);
const HARNESS_KEYS = new Set(['type', 'model', 'reasoningLevel']);
const AGENT_TYPES = ['CUSTOM', 'TRIAGE', 'SPEC', 'IMPLEMENT', 'REVIEW', 'VERIFY'];
const HARNESS_TYPES = ['oz', 'claude', 'claude-code', 'codex', 'gemini'];
const PROVIDERS = ['github'];
const GITHUB_EVENTS = ['issue_created'];

export function validateWarpAdapterConfig(value: unknown): ValidationResult {
  const diagnostics: Diagnostic[] = [];
  const error: ErrorSink = (code, path, message) => diagnostics.push({ code, severity: 'error', path, message });
  if (!isRecord(value)) {
    error('WARP_CONFIG_DOCUMENT_TYPE', '/', 'Warp adapter configuration must be a JSON object.');
    return { valid: false, diagnostics };
  }
  validateKeys(value, CONFIG_KEYS, '/', error);
  if (value.schemaVersion !== WARP_ADAPTER_VERSION) error('WARP_CONFIG_UNSUPPORTED_VERSION', '/schemaVersion', `Expected schemaVersion '${WARP_ADAPTER_VERSION}'.`);
  if (value.kind !== WARP_ADAPTER_KIND) error('WARP_CONFIG_INVALID_KIND', '/kind', `Expected kind '${WARP_ADAPTER_KIND}'.`);
  if (typeof value.factoryName !== 'string' || !/^[a-z][a-z0-9-]{1,62}$/.test(value.factoryName)) {
    error('WARP_CONFIG_INVALID_FACTORY_NAME', '/factoryName', 'Expected a lower-case Warp Factory name using letters, numbers, and hyphens.');
  }
  validateRepositories(value.repositories, error);
  validateExecution(value.agentDefaults, '/agentDefaults', error);
  validateAgentBindings(value.agentBindings, error);
  validateAutomations(value.automations, error);
  return { valid: diagnostics.length === 0, diagnostics };
}

export function isWarpAdapterConfig(value: unknown): value is WarpAdapterConfig {
  return validateWarpAdapterConfig(value).valid;
}

function validateRepositories(value: unknown, error: ErrorSink): void {
  if (!Array.isArray(value) || value.length === 0) {
    error('WARP_CONFIG_REPOSITORY_REQUIRED', '/repositories', 'At least one repository is required.');
    return;
  }
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    const path = `/repositories/${index}`;
    if (!isRecord(entry)) { error('WARP_CONFIG_EXPECTED_OBJECT', path, 'Expected a repository object.'); return; }
    validateKeys(entry, new Set(['owner', 'name']), path, error);
    requireToken(entry.owner, `${path}/owner`, error);
    requireToken(entry.name, `${path}/name`, error);
    if (typeof entry.owner === 'string' && typeof entry.name === 'string') {
      const key = `${entry.owner}/${entry.name}`.toLowerCase();
      if (seen.has(key)) error('WARP_CONFIG_DUPLICATE_REPOSITORY', path, `Duplicate repository '${key}'.`);
      seen.add(key);
    }
  });
}

function validateExecution(value: unknown, path: string, error: ErrorSink): void {
  if (!isRecord(value)) { error('WARP_CONFIG_EXPECTED_EXECUTION', path, 'Expected a Warp execution object.'); return; }
  validateKeys(value, EXECUTION_KEYS, path, error);
  const hasModel = Object.hasOwn(value, 'model');
  const hasHarness = Object.hasOwn(value, 'harness');
  if (hasModel === hasHarness) {
    error('WARP_CONFIG_EXECUTION_EXCLUSIVE', path, "Declare exactly one of 'model' or 'harness'.");
    return;
  }
  if (hasModel && (typeof value.model !== 'string' || value.model.trim() === '')) {
    error('WARP_CONFIG_EXPECTED_STRING', `${path}/model`, 'Expected a non-empty model string.');
  }
  if (hasHarness && !isRecord(value.harness)) {
    error('WARP_CONFIG_EXPECTED_EXECUTION', `${path}/harness`, 'Expected a harness object.');
    return;
  }
  if (hasHarness) {
    const harness = value.harness as UnknownRecord;
    validateKeys(harness, HARNESS_KEYS, `${path}/harness`, error);
    if (typeof harness.type !== 'string' || !HARNESS_TYPES.includes(harness.type)) {
      error('WARP_CONFIG_INVALID_HARNESS', `${path}/harness/type`, `Expected one of: ${HARNESS_TYPES.join(', ')}.`);
    }
    optionalString(harness.model, `${path}/harness/model`, error);
    optionalString(harness.reasoningLevel, `${path}/harness/reasoningLevel`, error);
    if (harness.type === 'oz' && harness.reasoningLevel !== undefined) error('WARP_CONFIG_OZ_REASONING_FORBIDDEN', `${path}/harness/reasoningLevel`, 'Warp Agent harness does not accept reasoningLevel.');
  }
}

function validateAgentBindings(value: unknown, error: ErrorSink): void {
  if (!Array.isArray(value)) { error('WARP_CONFIG_EXPECTED_ARRAY', '/agentBindings', 'Expected an array.'); return; }
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    const path = `/agentBindings/${index}`;
    if (!isRecord(entry)) { error('WARP_CONFIG_EXPECTED_OBJECT', path, 'Expected an agent binding object.'); return; }
    validateKeys(entry, new Set(['roleRef', 'agentType', 'execution', 'environmentId']), path, error);
    requireRef(entry.roleRef, `${path}/roleRef`, error);
    if (entry.roleRef === WARP_FOREMAN_ID) error('WARP_CONFIG_RESERVED_ROLE', `${path}/roleRef`, `'${WARP_FOREMAN_ID}' is reserved for adapter infrastructure.`);
    if (typeof entry.roleRef === 'string') {
      if (seen.has(entry.roleRef)) error('WARP_CONFIG_DUPLICATE_ROLE_BINDING', `${path}/roleRef`, `Duplicate role binding '${entry.roleRef}'.`);
      seen.add(entry.roleRef);
    }
    if (typeof entry.agentType !== 'string' || !AGENT_TYPES.includes(entry.agentType)) error('WARP_CONFIG_INVALID_AGENT_TYPE', `${path}/agentType`, `Expected one of: ${AGENT_TYPES.join(', ')}.`);
    if (entry.execution !== undefined) validateExecution(entry.execution, `${path}/execution`, error);
    optionalString(entry.environmentId, `${path}/environmentId`, error);
  });
}

function validateAutomations(value: unknown, error: ErrorSink): void {
  if (!Array.isArray(value)) { error('WARP_CONFIG_EXPECTED_ARRAY', '/automations', 'Expected an array.'); return; }
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    const path = `/automations/${index}`;
    if (!isRecord(entry)) { error('WARP_CONFIG_EXPECTED_OBJECT', path, 'Expected an automation binding object.'); return; }
    validateKeys(entry, new Set(['workflowRef', 'enabled', 'triggers']), path, error);
    requireRef(entry.workflowRef, `${path}/workflowRef`, error);
    if (typeof entry.workflowRef === 'string') {
      if (seen.has(entry.workflowRef)) error('WARP_CONFIG_DUPLICATE_AUTOMATION', `${path}/workflowRef`, `Duplicate workflow automation '${entry.workflowRef}'.`);
      seen.add(entry.workflowRef);
    }
    if (entry.enabled !== false) error('WARP_CONFIG_AUTOMATION_MUST_BE_DISABLED', `${path}/enabled`, 'Phase 4 automations must be explicitly disabled.');
    if (!Array.isArray(entry.triggers) || entry.triggers.length === 0) {
      error('WARP_CONFIG_TRIGGER_REQUIRED', `${path}/triggers`, 'At least one event trigger binding is required.');
      return;
    }
    entry.triggers.forEach((trigger, triggerIndex) => {
      const triggerPath = `${path}/triggers/${triggerIndex}`;
      if (!isRecord(trigger)) { error('WARP_CONFIG_EXPECTED_OBJECT', triggerPath, 'Expected a trigger binding object.'); return; }
      validateKeys(trigger, new Set(['sourceEvent', 'provider', 'event']), triggerPath, error);
      requireRef(trigger.sourceEvent, `${triggerPath}/sourceEvent`, error);
      if (typeof trigger.provider !== 'string' || !PROVIDERS.includes(trigger.provider)) error('WARP_CONFIG_INVALID_PROVIDER', `${triggerPath}/provider`, `Expected one of: ${PROVIDERS.join(', ')}.`);
      if (typeof trigger.event !== 'string' || !GITHUB_EVENTS.includes(trigger.event)) error('WARP_CONFIG_UNSUPPORTED_EVENT', `${triggerPath}/event`, `Phase 4 supports only: ${GITHUB_EVENTS.join(', ')}.`);
    });
  });
}

function isRecord(value: unknown): value is UnknownRecord { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function validateKeys(value: UnknownRecord, allowed: Set<string>, path: string, error: ErrorSink): void {
  Object.keys(value).forEach((key) => { if (!allowed.has(key)) error('WARP_CONFIG_UNKNOWN_PROPERTY', `${path === '/' ? '' : path}/${key}`, `Unknown property '${key}'.`); });
}
function requireToken(value: unknown, path: string, error: ErrorSink): void {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_.-]+$/.test(value)) error('WARP_CONFIG_INVALID_TOKEN', path, 'Expected a non-empty repository token.');
}
function requireRef(value: unknown, path: string, error: ErrorSink): void {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(value)) error('WARP_CONFIG_INVALID_REFERENCE', path, 'Expected a lower-case path-safe reference.');
}
function optionalString(value: unknown, path: string, error: ErrorSink): void {
  if (value !== undefined && (typeof value !== 'string' || value.trim() === '')) error('WARP_CONFIG_EXPECTED_STRING', path, 'Expected a non-empty string.');
}
