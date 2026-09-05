import type { ComponentId, Diagnostic, Extensions } from '@specdd/project-model';

export const CAPABILITY_PACK_KIND = 'SpecDDCapabilityPack' as const;
export const CAPABILITY_PACK_SCHEMA_VERSION = '1.0.0' as const;

export type CapabilityLifecycle = 'draft' | 'active' | 'deprecated';

export interface CapabilityMetadata {
  id: ComponentId;
  name: string;
  description: string;
  version: string;
  extensions?: Extensions;
}

export interface CapabilityRole {
  id: ComponentId;
  title: string;
  scope: string;
  extensions?: Extensions;
}

export interface CapabilitySkill {
  id: ComponentId;
  path: string;
  version: string;
  extensions?: Extensions;
}

export interface CapabilityPlaybook {
  id: ComponentId;
  path: string;
  skillRef: ComponentId;
  extensions?: Extensions;
}

export interface CapabilityWorkflow {
  id: ComponentId;
  path: string;
  triggers: string[];
  skillRefs: ComponentId[];
  contextRefs: ComponentId[];
  extensions?: Extensions;
}

export interface CapabilityPolicy {
  id: ComponentId;
  effect: 'require' | 'forbid' | 'verify';
  statement: string;
  extensions?: Extensions;
}

export interface CapabilityEval {
  id: ComponentId;
  path: string;
  mode: 'disabled' | 'log_only' | 'enforced';
  targetRefs: ComponentId[];
  extensions?: Extensions;
}

export interface CapabilityContext {
  id: ComponentId;
  path: string;
  required: boolean;
  extensions?: Extensions;
}

export interface CapabilitySubagent {
  id: ComponentId;
  path: string;
  status: 'inactive';
  roleRef: ComponentId;
  skillRefs: ComponentId[];
  workflowRefs: ComponentId[];
  extensions?: Extensions;
}

export interface CapabilityRoute {
  id: ComponentId;
  match: string;
  priority: number;
  skillRef: ComponentId;
  workflowRoot: string;
  extensions?: Extensions;
}

export interface CapabilityDependency {
  id: ComponentId;
  kind: 'harness' | 'capability';
  versionRange: string;
  required: boolean;
  extensions?: Extensions;
}

export interface CapabilityPack {
  schemaVersion: typeof CAPABILITY_PACK_SCHEMA_VERSION;
  kind: typeof CAPABILITY_PACK_KIND;
  lifecycle: CapabilityLifecycle;
  metadata: CapabilityMetadata;
  role: CapabilityRole;
  skills: CapabilitySkill[];
  playbooks: CapabilityPlaybook[];
  workflows: CapabilityWorkflow[];
  policies: CapabilityPolicy[];
  evals: CapabilityEval[];
  context: CapabilityContext[];
  subagents: CapabilitySubagent[];
  routing: CapabilityRoute[];
  dependencies: CapabilityDependency[];
  extensions?: Extensions;
}

export interface CapabilityPackSource extends Omit<CapabilityPack, 'schemaVersion' | 'kind'> {}

export interface LegacyRoleDescriptor {
  role: {
    id: ComponentId;
    title: string;
    scope: string;
    must: string[];
    never: string[];
    verification: string;
  };
  selectedPlaybooks: string[];
  commands: string[];
}

export interface CapabilityMigrationResult {
  pack: CapabilityPack | null;
  diagnostics: Diagnostic[];
}
