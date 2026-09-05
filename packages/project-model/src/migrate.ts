import { createProjectDefinitionFromWizardInput } from './factory.js';
import { isComponentId } from './ids.js';
import type {
  ContextFinding,
  Diagnostic,
  ProjectDefinition,
  ScaffoldManifestMigrationOptions,
  ScaffoldManifestMigrationResult,
} from './types.js';
import { validateProjectDefinition } from './validate.js';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null && !Array.isArray(value);
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export function migrateScaffoldManifest(manifest: unknown, options: ScaffoldManifestMigrationOptions = {}): ScaffoldManifestMigrationResult {
  const diagnostics: Diagnostic[] = [];
  const fail = (code: string, path: string, message: string) => diagnostics.push({ code, severity: 'error' as const, path, message });

  if (!isRecord(manifest)) {
    fail('MIGRATION_INVALID_MANIFEST', '/', 'Scaffold manifest must be an object.');
    return { definition: null, diagnostics };
  }
  const schemaVersion = manifest.schemaVersion;
  if (schemaVersion !== 1 && schemaVersion !== 2) {
    fail('MIGRATION_UNSUPPORTED_VERSION', '/schemaVersion', 'Only scaffold manifest schema versions 1 and 2 are supported.');
  }
  const projectId = options.project?.id;
  const projectName = options.project?.name;
  if (!projectId || !isComponentId(projectId)) {
    fail('MIGRATION_PROJECT_ID_REQUIRED', '/options/project/id', 'A valid caller-supplied project ID is required because the receipt does not contain one.');
  }
  if (!projectName || !projectName.trim()) {
    fail('MIGRATION_PROJECT_NAME_REQUIRED', '/options/project/name', 'A caller-supplied project name is required because the receipt does not contain one.');
  }
  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) return { definition: null, diagnostics };

  if (!isRecord(manifest.selected)) {
    fail('MIGRATION_SELECTED_REQUIRED', '/selected', 'Scaffold manifest must contain selected project data.');
    return { definition: null, diagnostics };
  }
  const selected = manifest.selected;
  const scenario = manifest.scenario === 'brownfield' ? 'brownfield' : manifest.scenario === 'greenfield' || manifest.scenario === undefined ? 'greenfield' : null;
  if (!scenario) {
    fail('MIGRATION_INVALID_SCENARIO', '/scenario', "Scenario must be 'greenfield' or 'brownfield'.");
    return { definition: null, diagnostics };
  }
  const stack = isRecord(selected.stack) ? selected.stack : {};
  const review = isRecord(manifest.contextReview) ? manifest.contextReview : null;
  const findings: ContextFinding[] = [];
  const statuses = review && isRecord(review.statuses) ? review.statuses : {};
  for (const group of ['stack', 'architecture', 'domains', 'entities', 'features'] as const) {
    const items = statuses[group];
    if (!Array.isArray(items)) continue;
    for (const raw of items) {
      if (!isRecord(raw)) continue;
      const value = String(raw.value ?? '').trim();
      if (!value) continue;
      const status = ['unknown', 'planned', 'implemented', 'architectural'].includes(String(raw.status))
        ? String(raw.status) as ContextFinding['status'] : 'unknown';
      findings.push({ group, value, selected: Boolean(raw.selected), status });
    }
  }

  const definition = createProjectDefinitionFromWizardInput({
    scenario,
    project: { name: projectName!, description: options.project?.description ?? '', problem: '' },
    domains: strings(selected.domains),
    entities: strings(selected.entities),
    features: strings(selected.features),
    architecture: strings(selected.architecture),
    stack: {
      languages: strings(stack.languages),
      frontend: typeof stack.frontend === 'string' ? stack.frontend : '',
      backend: typeof stack.backend === 'string' ? stack.backend : '',
      testing: typeof stack.testing === 'string' ? stack.testing : '',
      database: typeof stack.database === 'string' ? stack.database : '',
      infra: typeof stack.infra === 'string' ? stack.infra : '',
      swagger: stack.swagger === true,
      a11y: stack.a11y === true,
    },
    contextReview: scenario === 'brownfield' ? { approved: review?.approved === true } : null,
    security: { classification: 'unspecified', owaspControls: [] },
  });

  definition.metadata.id = projectId!;
  definition.project.contextReview.findings = findings;
  const generatedFiles = strings(manifest.generatedFiles);
  const generated = new Set(generatedFiles);
  definition.capabilities = definition.capabilities.filter((item) => generated.has(item.source));
  definition.specs = definition.specs.filter((item) => generated.has(item.path));
  definition.workflows = definition.workflows
    .filter((item) => generated.has(item.path))
    .map((item) => ({
      ...item,
      capabilityRefs: item.capabilityRefs.filter((id) => definition.capabilities.some((capability) => capability.id === id)),
      specRefs: item.specRefs.filter((id) => definition.specs.some((spec) => spec.id === id)),
    }));
  definition.evals = definition.evals.filter((item) => generated.has(item.path) && definition.capabilities.some((capability) => capability.id === item.capabilityRefs[0]));
  definition.provenance = {
    source: 'scaffold-manifest',
    migratedFrom: { kind: 'scaffold-manifest', schemaVersion: schemaVersion as number },
    receipt: {
      schemaVersion: schemaVersion as number,
      generatedFiles,
      skippedPaths: strings(manifest.skippedPaths),
      replacedPaths: strings(manifest.replacedPaths),
      ...(isRecord(manifest.fidelity) && typeof manifest.fidelity.fingerprintAlgorithm === 'string'
        ? { fingerprintAlgorithm: manifest.fidelity.fingerprintAlgorithm } : {}),
      ...(isRecord(manifest.fidelity) && isRecord(manifest.fidelity.source) && typeof manifest.fidelity.source.pathFingerprint === 'string'
        ? { sourcePathFingerprint: manifest.fidelity.source.pathFingerprint } : {}),
    },
  };

  diagnostics.push({
    code: 'MIGRATION_LOSSY_SOURCE',
    severity: 'warning',
    path: '/',
    message: 'The scaffold receipt does not contain complete project intent; personas, outcomes, constraints, principles, tools, MCP servers, and runtime preferences remain empty.',
  });

  const validation = validateProjectDefinition(definition);
  diagnostics.push(...validation.diagnostics);
  return {
    definition: validation.valid ? definition : null,
    diagnostics,
  };
}
