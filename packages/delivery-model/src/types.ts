export const STAGES = ['source-gate', 'build', 'deploy-staging', 'smoke', 'approve-promotion', 'deploy-production', 'post-deploy'] as const;
export type Stage = typeof STAGES[number];
export type Operation = 'verify-source' | 'build' | 'deploy' | 'verify';
export interface Reference { id: string; source: string; version: string }
export interface Environment { id: string; class: 'staging' | 'production' | 'local-rehearsal'; adapterRef: string; destinationRef: string }
export interface DeliveryDefinition {
  kind: 'SpecDDDeliveryDefinition'; schemaVersion: '1.0.0'; lifecycle: 'draft'; id: string; name: string; version: string;
  project: Reference; harness: Reference; provider: Reference & { sha256: string };
  release: { repositoryRef: string; sourceRevision: string; artifactSha256: string | null; sourceGate: 'merged-source' | 'fixture-source' };
  graphRef: string; artifactRoot: string; buildAdapterRef: string;
  adapters: { id: string; version: string; operations: Operation[] }[];
  /** Ordered staging and promotion destinations; both local-rehearsal or staging/production. */
  environments: Environment[];
  checks: { source: string; smoke: string; postDeploy: string }; evalMaxAttempts: number; rollbackInstructions: string;
}
export interface DeliveryReceipt {
  kind: 'SpecDDDeliveryReceipt'; schemaVersion: '1.0.0'; id: string; runId: string;
  deliveryRef: string; deliverySha256: string; stage: Stage; attempt: number;
  adapterRef: string | null; environmentRef: string | null; sourceRevision: string;
  artifactSha256: string | null; origin: 'local-observation' | 'imported-attestation';
  startedAt: string; endedAt: string | null; outcome: 'unknown' | 'success' | 'failed' | 'cancelled';
  evidence: { sha256: string; bytes: number } | null;
}
export interface ActionBinding {
  nodeRef: Stage; operation: Operation | 'human-approval'; adapterRef: string | null;
  environmentRef: string | null; receiptArtifactRef: string;
}
