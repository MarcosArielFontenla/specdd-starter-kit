import type { CapabilityPack } from '@specdd/capability-model';
import type { ArtifactContext, Artifact, Actor, BusinessRuleContent, AcceptanceCriterion } from './types.js';
import type { ArtifactGraphDefinition } from './graph-types.js';

export type BAAgentAction = 'analyze-requirement' | 'refine-wording' | 'suggest-acceptance-criteria';
export interface BACapabilitySource {
  pack: CapabilityPack;
  files: Record<string, string>;
  /** Host attestations of available dependency requirements, not installation proofs. */
  dependencies: Array<{id: string; kind: 'harness' | 'capability'; versionRange: string}>;
}
export interface BAActionInput {
  runId: string; action: BAAgentAction; targetId: string;
  graph: ArtifactGraphDefinition; context: ArtifactContext; capability: BACapabilitySource;
}
export interface BASuggestion { id: string; supportArtifactIds: string[] }
export interface BAActionOutput {
  schemaVersion: '1.0.0'; requestSha256: string;
  wording: (BASuggestion & {description: string}) | null;
  ambiguities: Array<BASuggestion & {description: string}>;
  questions: Array<BASuggestion & {question: string; blocking: boolean}>;
  rules: Array<BASuggestion & BusinessRuleContent>;
  criteria: Array<BASuggestion & AcceptanceCriterion>;
}
export interface BAApprovalInput { targetId: string; graph: ArtifactGraphDefinition; context: ArtifactContext }
export interface BAApprovalReceipt {
  schemaVersion: '1.0.0'; kind: 'SpecForgeBAApproval';
  targetId: string; subjectSha256: string; beforeSnapshotSha256: string;
  beforeArtifactSha256: string; afterArtifactSha256: string; afterSnapshotSha256: string;
  eventId: string; actor: Actor; at: string;
}
export interface BAApprovalResult { artifact: Artifact; receipt: BAApprovalReceipt }
