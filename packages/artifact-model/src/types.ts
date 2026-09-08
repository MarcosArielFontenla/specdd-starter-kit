import type { Extensions, ProjectDefinition } from '@specdd/project-model';

export type Actor = { id: string; kind: 'human' | 'agent' | 'system' };
export type Origin = 'human-authored' | 'agent-proposed' | 'human-edited-agent-proposal' | 'imported' | 'generated-from-artifact';
export interface Contribution { actor: Actor; origin: Origin; at: string; sourceRefs: string[] }
export interface AcceptanceCriterion { id: string; given: string; when: string; then: string }
export interface RequirementContent { description: string; acceptanceCriteria: AcceptanceCriterion[] }
export interface QuestionContent {
  question: string;
  blocking: boolean;
  resolution: { answer: string; actor: Actor; at: string } | null;
}
export interface DecisionContent { decision: string; rationale: string }
export interface BusinessRuleContent { statement: string; rationale: string }
export interface ImpactAnalysisContent {
  basisSnapshotSha256: string; root: ArtifactReference; affected: ArtifactReference[]; scope: 'provided-context-only';
}
export type Payload =
  | { type: 'requirement'; content: RequirementContent }
  | { type: 'open-question'; content: QuestionContent }
  | { type: 'decision'; content: DecisionContent }
  | { type: 'business-rule'; content: BusinessRuleContent }
  | { type: 'impact-analysis'; content: ImpactAnalysisContent };
export interface ArtifactReference { projectId: string; artifactId: string; revision: number; sha256: string }
export interface Relationship { kind: 'depends-on' | 'derives-from' | 'relates-to'; target: ArtifactReference }
export type ArtifactStatus = 'draft' | 'under-review' | 'approved' | 'active' | 'superseded';
export type ReviewAction = 'request-review' | 'return-to-draft' | 'approve' | 'activate' | 'supersede';
export interface ReviewEvent {
  id: string; action: ReviewAction; actor: Actor; at: string;
  subjectSha256: string; previousEventSha256: string | null;
}
export interface Envelope {
  schemaVersion: '1.0.0' | '1.1.0'; kind: 'SpecForgeArtifact'; id: string; title: string;
  projectRef: { id: string; definitionSha256: string };
  ownerRole: string; revision: number; previousRevisionSha256: string | null;
  createdAt: string; updatedAt: string; provenance: Contribution[];
  relationships: Relationship[]; status: ArtifactStatus; review: ReviewEvent[];
  extensions?: Extensions;
}
export type Artifact = Envelope & Payload;
export type ArtifactInput = Payload & { id: string; title: string; projectRef: Envelope['projectRef']; ownerRole: string; relationships: Relationship[] };
export interface ArtifactContext { project: ProjectDefinition; artifacts: Artifact[] }
