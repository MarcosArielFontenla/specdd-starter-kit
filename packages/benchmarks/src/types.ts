import type { EvalDefinition, Evidence } from '@specdd/eval-adapters';
import type { ControlPlaneDefinition } from '@specdd/control-plane-model';
import type { RunEvent } from '@specdd/run-history';

export interface Configuration {
  id: string; graphRef: string; nodeRef: string; controlPlaneSha256: string;
  runtime: string | null; model: string | null; harnessRef: string | null;
  capabilityRefs: string[]; promptStrategyRef: string | null;
  environmentRef: string; executionRef: string;
}
export interface BenchmarkPlan {
  kind: 'SpecDDBenchmark'; schemaVersion: '1.0.0'; id: string; version: string;
  scope: 'eval-node'; task: { id: string; inputRef: string; sha256: string };
  workflowRef: string; eval: EvalDefinition; repetitions: number;
  baselineRef: string; configurations: Configuration[];
}
export interface Sample {
  configurationRef: string; configurationSha256: string; taskSha256: string;
  repetition: number; controlPlane: ControlPlaneDefinition; events: RunEvent[];
  cost: { amount: number; currency: string; evidence: Evidence } | null;
}
export interface Dataset {
  kind: 'SpecDDBenchmarkDataset'; schemaVersion: '1.0.0'; planSha256: string;
  samples: Sample[];
}
export interface Statistics {
  expected: number; observed: number; mean: number | null;
  median: number | null; min: number | null; max: number | null;
}
export interface SampleMetrics {
  configurationRef: string; repetition: number; runId: string;
  status: 'measured' | 'incomplete'; reasons: string[];
  runCoverage: string; score: number | null; passed: number | null;
  executionError: number | null; latencyMs: number | null; retries: number | null;
  cost: number | null; currency: string | null; eventsSha256: string;
}

