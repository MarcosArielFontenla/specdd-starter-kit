import { createHash } from 'node:crypto';
import { structuralValidator } from '@specdd/project-model';
import { assertEval, definitionFingerprint } from '@specdd/eval-adapters';
import { assertGraphBinding, summarizeRun, type RunEvent } from '@specdd/run-history';
import planSchema from '../schema/plan.schema.json' with { type: 'json' };
import datasetSchema from '../schema/dataset.schema.json' with { type: 'json' };
import evalSchema from '@specdd/eval-adapters/schema' with { type: 'json' };
import resultSchema from '@specdd/eval-adapters/schema/result' with { type: 'json' };
import eventSchema from '@specdd/run-history/schema' with { type: 'json' };
import controlSchema from '@specdd/control-plane-model/schema' with { type: 'json' };
import graphSchema from '@specdd/control-plane-model/schema/graph' with { type: 'json' };
import policySchema from '@specdd/control-plane-model/schema/policy' with { type: 'json' };
import type { BenchmarkPlan, Configuration, Dataset, Sample, SampleMetrics, Statistics } from './types.js';
export * from './types.js';

const planStructure = structuralValidator(planSchema, [evalSchema]);
const datasetStructure = structuralValidator(datasetSchema, [resultSchema, eventSchema, graphSchema, policySchema, controlSchema]);
const stable = (v: unknown): unknown => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, item]) => [k, stable(item)])) : v;
export function fingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
function bounded(value: unknown): void {
  if (Buffer.byteLength(JSON.stringify(value)) > 8 * 1024 * 1024) throw new Error('Benchmark artifact exceeds 8 MiB');
}
export function assertPlan(value: unknown): asserts value is BenchmarkPlan {
  bounded(value);
  const errors = planStructure(value);
  if (errors.length) throw new Error('Invalid benchmark plan: ' + errors.map(e => e.path + ': ' + e.message).join('; '));
  const plan = value as BenchmarkPlan;
  assertEval(plan.eval);
  const ids = plan.configurations.map(c => c.id);
  if (new Set(ids).size !== ids.length || !ids.includes(plan.baselineRef)) throw new Error('Duplicate configuration or missing baseline');
  const profiles = plan.configurations.map(({ id: _id, ...config }) => fingerprint({ ...config, capabilityRefs: [...config.capabilityRefs].sort() }));
  if (new Set(profiles).size !== profiles.length) throw new Error('Configurations must differ beyond their IDs');
}
function same(a: unknown, b: unknown): boolean { return fingerprint(a) === fingerprint(b); }
function measure(plan: BenchmarkPlan, config: Configuration, sample: Sample): SampleMetrics {
  assertGraphBinding(sample.events, sample.controlPlane);
  const summary = summarizeRun(sample.events);
  if (sample.configurationSha256 !== fingerprint(config) || sample.taskSha256 !== plan.task.sha256 || summary.inputRef !== plan.task.inputRef ||
      summary.workflowRef !== plan.workflowRef || summary.graphRef !== config.graphRef || summary.controlPlaneSha256 !== config.controlPlaneSha256) throw new Error('Incompatible task/configuration/graph identity');
  const events = sample.events.filter(e => e.nodeRef === config.nodeRef && (e.event === 'eval.started' || e.event === 'eval.completed'));
  const attempts = new Map<number, { start: RunEvent | undefined; end: Extract<RunEvent, { event: 'eval.completed' }> | undefined }>();
  const evalHash = definitionFingerprint(plan.eval);
  for (const event of events) {
    if (event.runtime !== config.runtime || event.model !== config.model || event.harnessRef !== config.harnessRef || !same([...event.capabilityRefs].sort(), [...config.capabilityRefs].sort())) throw new Error('Observed execution context does not match configuration');
    if (event.event !== 'eval.started' && event.event !== 'eval.completed') continue;
    const attempt = event.data.attempt;
    const pair = attempts.get(attempt) ?? { start: undefined, end: undefined };
    if (event.event === 'eval.started') {
      if (event.data.evalRef !== plan.eval.id) throw new Error('Incompatible evaluator');
      pair.start = event;
    } else {
      const result = event.data.result;
      if (result.evalRef !== plan.eval.id || result.evalVersion !== plan.eval.version || result.definitionSha256 !== evalHash || result.evidence.bytes < 1) throw new Error('Incompatible evaluator or absent evidence');
      if (result.outcome !== 'error') {
        const label = plan.eval.labels.find(l => l.id === result.label);
        if (!label || result.score !== label.score || result.outcome !== (label.score >= plan.eval.passingScore ? 'pass' : 'fail')) throw new Error('Score/label/outcome contradicts canonical evaluator');
      }
      pair.end = event;
    }
    attempts.set(attempt, pair);
  }
  const ordered = [...attempts.entries()].sort(([a], [b]) => a - b);
  const reasons: string[] = [];
  if (!ordered.length) reasons.push('No selected eval observations');
  let lastEnd = -Infinity;
  for (let i = 0; i < ordered.length; i++) {
    const [attempt, pair] = ordered[i]!;
    if (attempt !== i + 1) reasons.push('Missing attempt before ' + attempt);
    if (!pair.start || !pair.end) reasons.push('Missing start or completion for attempt ' + attempt);
    if (pair.start && Date.parse(pair.start.timestamp) < lastEnd) reasons.push('Overlapping eval attempts');
    if (pair.end) {
      lastEnd = Date.parse(pair.end.timestamp);
      if (pair.end.data.result.outcome === 'pass' && i < ordered.length - 1) throw new Error('Retry after passing result would permit cherry-picking');
    }
  }
  const first = ordered[0]?.[1].start;
  const last = ordered.at(-1)?.[1].end;
  const complete = !reasons.length && first !== undefined && last !== undefined;
  return {
    configurationRef: config.id, repetition: sample.repetition, runId: summary.runId,
    status: complete ? 'measured' : 'incomplete', reasons, runCoverage: summary.coverage,
    score: complete ? last.data.result.score : null,
    passed: complete ? Number(last.data.result.outcome === 'pass') : null,
    executionError: complete ? Number(last.data.result.outcome === 'error') : null,
    latencyMs: complete ? Date.parse(last.timestamp) - Date.parse(first.timestamp) : null,
    retries: complete ? ordered.length - 1 : null,
    cost: complete ? sample.cost?.amount ?? null : null, currency: sample.cost?.currency ?? null,
    eventsSha256: fingerprint(sample.events),
  };
}
export function statistics(values: (number | null)[], expected: number): Statistics {
  if (!Number.isSafeInteger(expected) || expected < 1 || values.length > expected || values.some(v => v !== null && !Number.isFinite(v))) throw new Error('Invalid statistic population');
  const measured = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
  const n = measured.length;
  return { expected, observed: n, mean: n ? measured.reduce((sum, n) => sum + n / measured.length, 0) : null,
    median: n ? (n % 2 ? measured[Math.floor(n / 2)]! : measured[n / 2 - 1]! / 2 + measured[n / 2]! / 2) : null,
    min: n ? measured[0]! : null, max: n ? measured[n - 1]! : null };
}

/** Descriptive comparisons only. Does not run commands, rank models or change baselines. */
export function compareBenchmark(planValue: unknown, datasetValue: unknown) {
  assertPlan(planValue); bounded(datasetValue);
  const errors = datasetStructure(datasetValue);
  if (errors.length) throw new Error('Invalid benchmark dataset: ' + errors.map(e => e.path + ': ' + e.message).join('; '));
  const plan = planValue;
  const dataset = datasetValue as Dataset;
  if (dataset.planSha256 !== fingerprint(plan)) throw new Error('Dataset does not match pinned plan');
  const slots = new Set<string>(); const runs = new Set<string>(); const currencies = new Set<string>();
  const rows: SampleMetrics[] = [];
  for (const sample of dataset.samples) {
    const config = plan.configurations.find(c => c.id === sample.configurationRef);
    if (!config || sample.repetition > plan.repetitions) throw new Error('Unknown configuration or excess repetition');
    const slot = config.id + ':' + sample.repetition;
    const row = measure(plan, config, sample);
    if (slots.has(slot) || runs.has(row.runId)) throw new Error('Duplicate repetition or replayed run');
    slots.add(slot); runs.add(row.runId);
    if (sample.cost) currencies.add(sample.cost.currency);
    rows.push(row);
  }
  if (currencies.size > 1) throw new Error('Mixed currencies are not comparable');
  rows.sort((a, b) => a.configurationRef < b.configurationRef ? -1 : a.configurationRef > b.configurationRef ? 1 : a.repetition - b.repetition);
  const metrics = ['score', 'passed', 'executionError', 'latencyMs', 'retries', 'cost'] as const;
  const groups = plan.configurations.map(config => {
    const samples = rows.filter(r => r.configurationRef === config.id);
    const missing = Array.from({ length: plan.repetitions }, (_, i) => i + 1).filter(r => !slots.has(config.id + ':' + r));
    return { configurationRef: config.id, configurationSha256: fingerprint(config), configuration: structuredClone(config),
      complete: !missing.length && samples.every(s => s.status === 'measured'), missingRepetitions: missing,
      metrics: Object.fromEntries(metrics.map(key => [key, statistics(samples.map(s => s[key]), plan.repetitions)])) as Record<typeof metrics[number], Statistics>,
      humanInterventions: null, defectRate: null };
  });
  const baseline = groups.find(g => g.configurationRef === plan.baselineRef)!;
  const comparisons = groups.filter(g => g !== baseline).map(group => ({
    baselineRef: baseline.configurationRef, candidateRef: group.configurationRef,
    changedDimensions: Object.keys(group.configuration).filter(k => k !== 'id' && !same(group.configuration[k as keyof Configuration], baseline.configuration[k as keyof Configuration])),
    metrics: Object.fromEntries(metrics.map(key => {
      const a = baseline.metrics[key]; const b = group.metrics[key];
      const comparable = a.observed === a.expected && b.observed === b.expected;
      return [key, { comparable, deltaMean: comparable ? b.mean! - a.mean! : null }];
    })),
  }));
  return { kind: 'SpecDDBenchmarkReport' as const, schemaVersion: '1.0.0' as const,
    benchmarkRef: plan.id, planSha256: fingerprint(plan), datasetSha256: fingerprint(dataset), scope: plan.scope,
    status: groups.every(g => g.complete) ? 'complete' : 'incomplete', currency: [...currencies][0] ?? null,
    groups, comparisons, samples: rows,
    limits: ['Descriptive observations, not statistical significance or proof of model superiority',
      'Quality means this canonical eval only; latency covers its node slice, not the whole workflow',
      'Null metrics are unknown; error scores are not imputed and remain in the pass-rate denominator',
      'Prompt/execution/environment identity is caller-attested; hashes do not authenticate runtime execution',
      'Human interventions and defect rate are not measured in eval-node scope'] };
}
