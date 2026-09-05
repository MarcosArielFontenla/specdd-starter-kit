import type { ControlPlaneDefinition } from '@specdd/control-plane-model';
import type { Diagnostic } from '@specdd/project-model';

export const WARP_ADAPTER_KIND = 'SpecDDWarpAdapterConfig' as const;
export const WARP_ADAPTER_VERSION = '1.0.0' as const;
export const WARP_FACTORY_SCHEMA_VERSION = 'v1alpha1' as const;
export const WARP_FOREMAN_ID = 'specdd-foreman' as const;

export type WarpHarnessType = 'oz' | 'claude' | 'claude-code' | 'codex' | 'gemini';
export type WarpAgentType = 'CUSTOM' | 'TRIAGE' | 'SPEC' | 'IMPLEMENT' | 'REVIEW' | 'VERIFY';
export type WarpTriggerProvider = 'github';
export type WarpGithubEvent = 'issue_created';

export interface WarpModelExecution {
  model: string;
  harness?: never;
}

export interface WarpHarnessExecution {
  model?: never;
  harness: {
    type: WarpHarnessType;
    model?: string;
    reasoningLevel?: string;
  };
}

export type WarpExecution = WarpModelExecution | WarpHarnessExecution;

export interface WarpRepository {
  owner: string;
  name: string;
}

export interface WarpAgentBinding {
  roleRef: string;
  agentType: WarpAgentType;
  execution?: WarpExecution;
  environmentId?: string;
}

export interface WarpTriggerBinding {
  sourceEvent: string;
  provider: WarpTriggerProvider;
  event: WarpGithubEvent;
}

export interface WarpAutomationBinding {
  workflowRef: string;
  enabled: false;
  triggers: WarpTriggerBinding[];
}

export interface WarpAdapterConfig {
  schemaVersion: typeof WARP_ADAPTER_VERSION;
  kind: typeof WARP_ADAPTER_KIND;
  factoryName: string;
  repositories: WarpRepository[];
  agentDefaults: WarpExecution;
  agentBindings: WarpAgentBinding[];
  automations: WarpAutomationBinding[];
}

export type WarpProjectionStatus = 'exact' | 'instruction-only' | 'unsupported';

export interface WarpMappingItem {
  sourceKind: string;
  sourceRef: string;
  target: string | null;
  status: WarpProjectionStatus;
  note: string;
}

export interface WarpUnsupportedFeature {
  code: string;
  sourcePath: string;
  feature: string;
  impact: string;
  deferredTo: string;
}

export interface WarpProjectionReport {
  adapterVersion: typeof WARP_ADAPTER_VERSION;
  targetSchemaVersion: typeof WARP_FACTORY_SCHEMA_VERSION;
  source: Pick<ControlPlaneDefinition['metadata'], 'id' | 'version'>;
  generatedFiles: string[];
  mappings: WarpMappingItem[];
  unsupportedFeatures: WarpUnsupportedFeature[];
  externalWritesPerformed: false;
  automationsEnabled: false;
}

export interface WarpCompilationResult {
  valid: boolean;
  files: Record<string, string>;
  diagnostics: Diagnostic[];
  report: WarpProjectionReport | null;
  reportMarkdown: string;
}
