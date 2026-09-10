import type { Actor, ArtifactReference } from './types.js';
import type { BAApprovalInput, BAApprovalReceipt } from './ba-types.js';

export interface SpecDDCanonicalSpec {
  schemaVersion: '1.0.0'; kind: 'SpecDDCanonicalSpec'; projectId: string;
  path: string; revision: number; previousContentSha256: string | null;
  content: string; contentSha256: string;
  source: {
    artifact: ArtifactReference; baApprovalReceiptSha256: string;
    graphSnapshotSha256: string; projectionSubjectSha256: string;
  };
  appliedBy: Actor; appliedAt: string;
}

export interface SpecDDProjectionMapping {
  status: 'complete' | 'partial';
  mapped: Array<{sourceArtifactId: string; sourceRevision: number; targetSections: string[]}>;
  incomplete: Array<{code: string; targetSection: string; reason: string}>;
  unsupported: Array<{artifactId: string; artifactType: string; reason: string}>;
}

export interface SpecDDProjectionProposal {
  schemaVersion: '1.0.0'; kind: 'SpecDDProjectionProposal'; id: string;
  createdAt: string; projectId: string;
  source: {
    artifact: ArtifactReference; baApprovalReceiptSha256: string;
    graphSnapshotSha256: string;
  };
  destination: {path: string; baseContentSha256: string | null};
  content: string; contentSha256: string; diff: string;
  mapping: SpecDDProjectionMapping;
}

export interface SpecDDProjectionReceipt {
  schemaVersion: '1.0.0'; kind: 'SpecDDProjectionReceipt';
  projectionId: string; projectionSubjectSha256: string;
  projectId: string; path: string; previousContentSha256: string | null;
  appliedContentSha256: string; canonicalRevision: number;
  sourceArtifact: ArtifactReference; baApprovalReceiptSha256: string;
  graphSnapshotSha256: string; actor: Actor; at: string;
}

export interface SpecDDProjectionInput extends BAApprovalInput {
  approval: BAApprovalReceipt;
  current: SpecDDCanonicalSpec | null;
}
