export const PROJECT_DEFINITION_KIND = 'SpecDDProject' as const;
export const PROJECT_DEFINITION_VERSION = '1.0.0' as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type Extensions = Record<string, JsonValue>;
export type ComponentId = string;

export interface ProjectMetadata {
  id: ComponentId;
  name: string;
  description?: string;
  labels?: string[];
  extensions?: Extensions;
}

export interface NamedComponent {
  id: ComponentId;
  name: string;
  description?: string;
  extensions?: Extensions;
}

export interface EntityComponent extends NamedComponent {
  domainRefs: ComponentId[];
}

export interface FeatureComponent extends NamedComponent {
  domainRefs: ComponentId[];
  entityRefs: ComponentId[];
}

export type ReviewStatus = 'not-required' | 'pending' | 'approved';
export type EvidenceStatus = 'unknown' | 'planned' | 'implemented' | 'architectural';
export type EvidenceConfidence = 'low' | 'medium' | 'high' | 'unknown';

export interface ContextFinding {
  group: 'stack' | 'architecture' | 'domains' | 'entities' | 'features';
  value: string;
  selected: boolean;
  status: EvidenceStatus;
  source?: string;
  confidence?: EvidenceConfidence;
}

export interface ContextReview {
  required: boolean;
  status: ReviewStatus;
  findings: ContextFinding[];
}

export interface ProjectContext {
  scenario: 'greenfield' | 'brownfield';
  description: string;
  problem: string;
  personas: string[];
  outcomes: { user: string; business: string };
  constraints: { business: string; technical: string };
  domains: NamedComponent[];
  entities: EntityComponent[];
  features: FeatureComponent[];
  principles: string[];
  security: { classification: string; owaspControls: string[] };
  contextReview: ContextReview;
  extensions?: Extensions;
}

export interface StackDefinition {
  languages: string[];
  frontend: string;
  backend: string;
  testing: string;
  database: string;
  infrastructure: string;
  swagger: boolean;
  accessibility: boolean;
  extensions?: Extensions;
}

export interface ArchitectureDefinition {
  patterns: string[];
  stack: StackDefinition;
  decisionRefs: ComponentId[];
  extensions?: Extensions;
}

export interface HarnessDefinition {
  contractVersion: string;
  sourceRoot: string;
  primerPath: string;
  tools: string[];
  mcpServers: string[];
  extensions?: Extensions;
}

export interface CapabilityBinding {
  id: ComponentId;
  source: string;
  version?: string;
  enabled: boolean;
  extensions?: Extensions;
}

export type ArtifactStatus = 'placeholder' | 'draft' | 'approved' | 'active' | 'inactive';

export interface SpecArtifact {
  id: ComponentId;
  kind: 'project' | 'entity' | 'feature' | 'other';
  path: string;
  status: ArtifactStatus;
  targetRefs: ComponentId[];
  extensions?: Extensions;
}

export interface WorkflowArtifact {
  id: ComponentId;
  path: string;
  status: ArtifactStatus;
  triggers: string[];
  capabilityRefs: ComponentId[];
  specRefs: ComponentId[];
  extensions?: Extensions;
}

export interface EvalArtifact {
  id: ComponentId;
  path: string;
  mode: 'disabled' | 'log_only' | 'enforced';
  capabilityRefs: ComponentId[];
  extensions?: Extensions;
}

export interface PolicyArtifact {
  id: ComponentId;
  path: string;
  scope: string;
  enforcement: 'instruction' | 'validator' | 'runtime' | 'repository' | 'human';
  extensions?: Extensions;
}

export interface TelemetryDefinition {
  mode: 'disabled' | 'best_effort' | 'required';
  eventContractPath?: string;
  eventTypes: string[];
  extensions?: Extensions;
}

export interface DeploymentDefinition {
  enabled: boolean;
  provider?: string;
  manifestPath?: string;
  extensions?: Extensions;
}

export interface RuntimeAdapterBinding {
  id: ComponentId;
  kind: string;
  enabled: boolean;
  extensions?: Extensions;
}

export interface RuntimeMetadata {
  preferredModel?: string;
  adapters: RuntimeAdapterBinding[];
  extensions?: Extensions;
}

export interface GenerationReceiptReference {
  schemaVersion: number;
  generatedFiles: string[];
  skippedPaths: string[];
  replacedPaths: string[];
  fingerprintAlgorithm?: string;
  sourcePathFingerprint?: string;
}

export interface ProjectProvenance {
  source: 'wizard' | 'scaffold-manifest' | 'file';
  migratedFrom?: { kind: 'scaffold-manifest'; schemaVersion: number };
  receipt?: GenerationReceiptReference;
  extensions?: Extensions;
}

export interface ProjectDefinition {
  schemaVersion: typeof PROJECT_DEFINITION_VERSION;
  kind: typeof PROJECT_DEFINITION_KIND;
  metadata: ProjectMetadata;
  project: ProjectContext;
  architecture: ArchitectureDefinition;
  harness: HarnessDefinition;
  capabilities: CapabilityBinding[];
  specs: SpecArtifact[];
  workflows: WorkflowArtifact[];
  evals: EvalArtifact[];
  policies: PolicyArtifact[];
  telemetry: TelemetryDefinition;
  deployment: DeploymentDefinition;
  runtime: RuntimeMetadata;
  provenance: ProjectProvenance;
  extensions?: Extensions;
}

export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  code: string;
  severity: DiagnosticSeverity;
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  diagnostics: Diagnostic[];
}

export interface LegacyCompilationContext {
  analysisDepth?: string;
  analysis?: unknown;
  existingPaths?: string[];
  legacyAck?: boolean;
  contextReview?: unknown;
}

export interface LegacyWizardInput {
  scenario?: 'greenfield' | 'brownfield';
  analysisDepth?: string;
  analysis?: unknown;
  existingPaths?: string[];
  legacyAck?: boolean;
  contextReview?: unknown;
  project: { name: string; description?: string; problem?: string };
  personas?: string[];
  outcomes?: { user?: string; business?: string };
  constraints?: { business?: string; technical?: string };
  domains?: string[];
  entities?: string[];
  features?: string[];
  architecture?: string[];
  stack?: {
    languages?: string[];
    frontend?: string;
    backend?: string;
    testing?: string;
    database?: string;
    infra?: string;
    swagger?: boolean;
    a11y?: boolean;
  };
  principles?: string[];
  mcp?: string[];
  tools?: string[];
  model?: string;
  security?: { classification?: string; owaspControls?: string[] };
}

export interface ScaffoldManifestMigrationOptions {
  project?: Partial<Pick<ProjectMetadata, 'id' | 'name' | 'description'>>;
}

export interface ScaffoldManifestMigrationResult {
  definition: ProjectDefinition | null;
  diagnostics: Diagnostic[];
}
