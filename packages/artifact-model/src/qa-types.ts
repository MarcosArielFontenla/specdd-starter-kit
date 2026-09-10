import type { CapabilityPack } from '@specdd/capability-model';
import type { Actor, Artifact, ArtifactContext, ArtifactReference, QualityRiskContent, TestCaseContent, TestScenarioContent } from './types.js';
import type { ArtifactGraphDefinition } from './graph-types.js';

export type QAAgentAction = 'analyze-approved-spec' | 'suggest-test-scenarios' | 'suggest-test-cases' | 'assess-quality-risks';
export interface QACapabilitySource { pack: CapabilityPack; files: Record<string,string>; dependencies: Array<{id:string;kind:'harness'|'capability';versionRange:string}> }
export interface QAActionInput { runId:string; action:QAAgentAction; targetId:string; graph:ArtifactGraphDefinition; context:ArtifactContext; capability:QACapabilitySource }
export interface QASuggestion { id:string; supportArtifactIds:string[] }
export interface QAActionOutput {
  schemaVersion:'1.0.0'; requestSha256:string;
  gaps:Array<QASuggestion & {description:string}>;
  scenarios:Array<QASuggestion & TestScenarioContent>;
  testCases:Array<QASuggestion & Omit<TestCaseContent,'automationStatus'> & {automationStatus:'manual'|'candidate'}>;
  risks:Array<QASuggestion & QualityRiskContent>;
}
export interface QAApprovalInput { targetId:string; graph:ArtifactGraphDefinition; context:ArtifactContext }
export interface QAApprovalReceipt { schemaVersion:'1.0.0'; kind:'SpecForgeQAApproval'; targetId:string; subjectSha256:string; beforeSnapshotSha256:string; beforeArtifactSha256:string; afterArtifactSha256:string; afterSnapshotSha256:string; eventId:string; actor:Actor; at:string }
export interface QAApprovalResult { artifact:Artifact; receipt:QAApprovalReceipt }
export interface QACoverageMetadata { id:string; title:string; at:string }
export interface QACoverageEntry { acceptanceCriterionId:string; testCaseRefs:ArtifactReference[] }
