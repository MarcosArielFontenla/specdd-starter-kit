import type { Artifact, ArtifactReference, Actor, Envelope } from './types.js';

export const RELATION_KINDS = ['depends-on', 'derives-from', 'refines', 'validates', 'implements', 'supersedes', 'blocks', 'relates-to'] as const;
export type RelationKind = typeof RELATION_KINDS[number];
export interface GraphAssertion {
  id: string;
  kind: RelationKind;
  from: string;
  to: string;
  provenance: { actor: Actor; at: string; sourceRefs: string[] };
}
export interface ArtifactGraphDefinition {
  schemaVersion: '1.0.0';
  kind: 'SpecForgeArtifactGraph';
  projectRef: Envelope['projectRef'];
  nodes: ArtifactReference[];
  assertions: GraphAssertion[];
}
export interface GraphEdge {
  id: string; kind: RelationKind; from: string; to: string;
  origin: { kind: 'artifact'; artifactId: string; revision: number } | { kind: 'graph'; provenance: GraphAssertion['provenance'] };
}
export interface TraceOptions {
  direction?: 'outgoing' | 'incoming' | 'both';
  kinds?: RelationKind[];
  maxDepth?: number;
}
export interface TraceResult {
  snapshotSha256: string;
  nodes: Array<{artifactId: string; depth: number}>;
  edges: GraphEdge[];
  truncated: boolean;
}
export interface QuestionResult {
  snapshotSha256: string;
  questions: Array<{artifactId: string; depth: number; blocking: boolean}>;
  truncated: boolean;
}
export interface ArtifactGraphView {
  readonly definitionSha256: string;
  readonly snapshotSha256: string;
  snapshot(): { definition: ArtifactGraphDefinition; artifacts: Artifact[]; edges: GraphEdge[] };
  neighbors(id: string, options?: Omit<TraceOptions, 'maxDepth'>): TraceResult;
  trace(id: string, options?: TraceOptions): TraceResult;
  impact(id: string, maxDepth?: number): TraceResult;
  openQuestions(id: string, maxDepth?: number): QuestionResult;
  blockers(id: string, maxDepth?: number): QuestionResult & {declaredBlocks: GraphEdge[]};
  replacements(id: string): GraphEdge[];
}
