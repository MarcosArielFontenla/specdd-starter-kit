import { componentId } from './ids.js';
import {
  PROJECT_DEFINITION_KIND,
  PROJECT_DEFINITION_VERSION,
  type ContextFinding,
  type LegacyCompilationContext,
  type LegacyWizardInput,
  type ProjectDefinition,
} from './types.js';
import { validateProjectDefinition } from './validate.js';

const pathForDomain = (id: string) => `.agents/skills/${id}/SKILL.md`;
const rubricForDomain = (id: string) => `.agents/evals/rubrics/${id}.yaml`;
const specForEntity = (id: string) => `.agents/specs/${id}.spec.yaml`;

function selectedFindings(input: LegacyWizardInput): ContextFinding[] {
  if (!input.contextReview || typeof input.contextReview !== 'object') return [];
  const review = input.contextReview as Record<string, unknown>;
  const findings: ContextFinding[] = [];
  for (const group of ['stack', 'architecture', 'domains', 'entities', 'features'] as const) {
    const items = review[group];
    if (!Array.isArray(items)) continue;
    for (const raw of items) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;
      const value = String(item.value ?? item.label ?? '').trim();
      if (!value) continue;
      const status = ['unknown', 'planned', 'implemented', 'architectural'].includes(String(item.status))
        ? String(item.status) as ContextFinding['status']
        : 'unknown';
      const confidence = ['low', 'medium', 'high', 'unknown'].includes(String(item.confidence))
        ? String(item.confidence) as ContextFinding['confidence']
        : undefined;
      findings.push({
        group,
        value,
        selected: Boolean(item.selected),
        status,
        ...(typeof item.source === 'string' && item.source ? { source: item.source } : {}),
        ...(confidence ? { confidence } : {}),
      });
    }
  }
  return findings;
}

export function createProjectDefinitionFromWizardInput(input: LegacyWizardInput): ProjectDefinition {
  const scenario = input.scenario ?? 'greenfield';
  const domains = (input.domains ?? []).map((name) => ({ id: componentId(name), name }));
  const entities = (input.entities ?? []).map((name) => ({ id: componentId(name), name, domainRefs: [] }));
  const features = (input.features ?? []).map((name) => ({ id: componentId(name), name, domainRefs: [], entityRefs: [] }));
  const capabilities = domains.map((domain) => ({
    id: `domain-${domain.id}`,
    source: pathForDomain(domain.id),
    enabled: true,
  }));
  const entitySpecs = entities.map((entity) => ({
    id: `entity-${entity.id}`,
    kind: 'entity' as const,
    path: specForEntity(entity.id),
    status: 'placeholder' as const,
    targetRefs: [entity.id],
  }));
  const featureSpecs = features.length > 0 ? [{
    id: 'features',
    kind: 'feature' as const,
    path: 'specs/features-spec.md',
    status: 'draft' as const,
    targetRefs: features.map((feature) => feature.id),
  }] : [];
  const specs = [...entitySpecs, ...featureSpecs];
  const capabilityRefs = capabilities.map((capability) => capability.id);
  const specRefs = specs.map((spec) => spec.id);
  const approved = input.contextReview && typeof input.contextReview === 'object'
    ? Boolean((input.contextReview as Record<string, unknown>).approved)
    : false;

  return {
    schemaVersion: PROJECT_DEFINITION_VERSION,
    kind: PROJECT_DEFINITION_KIND,
    metadata: {
      id: componentId(input.project.name),
      name: input.project.name,
      ...(input.project.description ? { description: input.project.description } : {}),
    },
    project: {
      scenario,
      description: input.project.description ?? '',
      problem: input.project.problem ?? '',
      personas: [...(input.personas ?? [])],
      outcomes: { user: input.outcomes?.user ?? '', business: input.outcomes?.business ?? '' },
      constraints: { business: input.constraints?.business ?? '', technical: input.constraints?.technical ?? '' },
      domains,
      entities,
      features,
      principles: [...(input.principles ?? [])],
      security: {
        classification: input.security?.classification ?? 'unspecified',
        owaspControls: [...(input.security?.owaspControls ?? [])],
      },
      contextReview: {
        required: scenario === 'brownfield',
        status: scenario === 'brownfield' ? (approved ? 'approved' : 'pending') : 'not-required',
        findings: selectedFindings(input),
      },
    },
    architecture: {
      patterns: [...(input.architecture ?? [])],
      stack: {
        languages: [...(input.stack?.languages ?? [])],
        frontend: input.stack?.frontend ?? '',
        backend: input.stack?.backend ?? '',
        testing: input.stack?.testing ?? '',
        database: input.stack?.database ?? '',
        infrastructure: input.stack?.infra ?? '',
        swagger: input.stack?.swagger ?? false,
        accessibility: input.stack?.a11y ?? false,
      },
      decisionRefs: [],
    },
    harness: {
      contractVersion: '1.0.0',
      sourceRoot: '.agents',
      primerPath: 'AGENTS.md',
      tools: [...(input.tools ?? [])],
      mcpServers: [...(input.mcp ?? [])],
    },
    capabilities,
    specs,
    workflows: [
      {
        id: 'spec-first-feature',
        path: '.agents/workflows/spec-first-feature.md',
        status: 'active',
        triggers: ['new-primary-entity', 'cross-domain-feature'],
        capabilityRefs,
        specRefs,
      },
      {
        id: 'skill-review',
        path: '.agents/workflows/skill-review.md',
        status: 'active',
        triggers: ['skill-drift'],
        capabilityRefs,
        specRefs: [],
      },
      ...(scenario === 'brownfield' ? [{
        id: 'spec-converge',
        path: '.agents/workflows/spec-converge.md',
        status: 'active' as const,
        triggers: ['brownfield-adoption'],
        capabilityRefs,
        specRefs,
      }] : []),
    ],
    evals: domains.map((domain) => ({
      id: `domain-${domain.id}`,
      path: rubricForDomain(domain.id),
      mode: 'log_only',
      capabilityRefs: [`domain-${domain.id}`],
    })),
    policies: [
      { id: 'project-constitution', path: 'context/constitution.md', scope: 'project', enforcement: 'instruction' },
      { id: 'spec-approval', path: '.agents/scripts/validate-spec.ps1', scope: 'specification', enforcement: 'validator' },
    ],
    telemetry: {
      mode: 'best_effort',
      eventContractPath: '.agents/telemetry/EVENTS.md',
      eventTypes: ['session_start', 'context_injected', 'rule_violation', 'task_completed', 'session_summary'],
    },
    deployment: { enabled: false },
    runtime: {
      ...(input.model ? { preferredModel: input.model } : {}),
      adapters: (input.tools ?? []).map((tool) => ({ id: componentId(tool), kind: componentId(tool), enabled: true })),
    },
    provenance: { source: 'wizard' },
  };
}

export function createLegacyCompilationContext(input: LegacyWizardInput): LegacyCompilationContext {
  return {
    ...(input.analysisDepth !== undefined ? { analysisDepth: input.analysisDepth } : {}),
    ...(input.analysis !== undefined ? { analysis: input.analysis } : {}),
    ...(input.existingPaths !== undefined ? { existingPaths: [...input.existingPaths] } : {}),
    ...(input.legacyAck !== undefined ? { legacyAck: input.legacyAck } : {}),
    ...(input.contextReview !== undefined ? { contextReview: input.contextReview } : {}),
  };
}

export function toHarnessV1Input(definition: ProjectDefinition, context: LegacyCompilationContext = {}): LegacyWizardInput {
  const validation = validateProjectDefinition(definition);
  if (!validation.valid) {
    const summary = validation.diagnostics.map((diagnostic) => `${diagnostic.code} ${diagnostic.path}`).join(', ');
    throw new TypeError(`Cannot compile invalid Project Definition: ${summary}`);
  }
  if (definition.project.scenario === 'brownfield' && context.contextReview === undefined) {
    throw new TypeError('Brownfield Harness v1 compilation requires contextReview in the compilation context.');
  }
  return {
    scenario: definition.project.scenario,
    ...(context.analysisDepth !== undefined ? { analysisDepth: context.analysisDepth } : {}),
    ...(context.analysis !== undefined ? { analysis: context.analysis } : {}),
    ...(context.existingPaths !== undefined ? { existingPaths: [...context.existingPaths] } : {}),
    ...(context.legacyAck !== undefined ? { legacyAck: context.legacyAck } : {}),
    ...(context.contextReview !== undefined ? { contextReview: context.contextReview } : { contextReview: null }),
    project: {
      name: definition.metadata.name,
      description: definition.project.description,
      problem: definition.project.problem,
    },
    personas: [...definition.project.personas],
    outcomes: { ...definition.project.outcomes },
    constraints: { ...definition.project.constraints },
    domains: definition.project.domains.map((domain) => domain.name),
    entities: definition.project.entities.map((entity) => entity.name),
    features: definition.project.features.map((feature) => feature.name),
    architecture: [...definition.architecture.patterns],
    stack: {
      languages: [...definition.architecture.stack.languages],
      frontend: definition.architecture.stack.frontend,
      backend: definition.architecture.stack.backend,
      testing: definition.architecture.stack.testing,
      database: definition.architecture.stack.database,
      infra: definition.architecture.stack.infrastructure,
      swagger: definition.architecture.stack.swagger,
      a11y: definition.architecture.stack.accessibility,
    },
    principles: [...definition.project.principles],
    mcp: [...definition.harness.mcpServers],
    tools: [...definition.harness.tools],
    model: definition.runtime.preferredModel ?? '',
    security: {
      classification: definition.project.security.classification,
      owaspControls: [...definition.project.security.owaspControls],
    },
  };
}
