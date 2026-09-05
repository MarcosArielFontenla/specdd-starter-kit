import { createHash } from 'node:crypto';
import { structuralValidator } from '@specdd/project-model';
import schema from '../schema/eval.schema.json' with { type: 'json' };
import resultSchema from '../schema/result.schema.json' with { type: 'json' };

export interface EvalDefinition {
  schemaVersion: '1.0.0'; kind: 'SpecDDEval'; id: string; version: string;
  name: string; method: 'mechanical' | 'classification'; rubric: string;
  labels: { id: string; description: string; score: number }[]; passingScore: number;
}
export interface EvalContext { runId: string; inputRef: string; observedAt: string }
export interface EvalAdapter<Observation, Binding> {
  readonly id: string;
  evaluate(definition: EvalDefinition, context: EvalContext, observation: Observation, binding: Binding): EvalResult;
}
export interface Evidence { sha256: string; bytes: number }
export interface EvalResult extends EvalContext {
  schemaVersion: '1.0.0'; kind: 'SpecDDEvalResult'; evalRef: string; evalVersion: string;
  definitionSha256: string; adapter: string; outcome: 'pass' | 'fail' | 'error';
  score: number | null; label: string | null; evidence: Evidence; error: string | null;
}
const structure = structuralValidator(schema);
const resultStructure = structuralValidator(resultSchema);
export function validateResult(value: unknown): boolean {
  if (resultStructure(value).length) return false;
  try { contextValid(value as EvalContext); return true; } catch { return false; }
}
export function validateEval(value: unknown): { valid: boolean; diagnostics: string[] } {
  const diagnostics = structure(value).map(item => `${item.path}: ${item.message}`);
  if (diagnostics.length) return { valid: false, diagnostics };
  const definition = value as EvalDefinition;
  if ([definition.name, definition.rubric, ...definition.labels.map(label => label.description)].some(s => !s.trim())) diagnostics.push('Empty text is not allowed');
  if (new Set(definition.labels.map(label => label.id)).size !== definition.labels.length) diagnostics.push('Duplicate label IDs');
  if (!definition.labels.some(label => label.score >= definition.passingScore) || !definition.labels.some(label => label.score < definition.passingScore)) diagnostics.push('Both passing and failing labels are required');
  return { valid: diagnostics.length === 0, diagnostics };
}
export function assertEval(value: unknown): asserts value is EvalDefinition {
  const result = validateEval(value);
  if (!result.valid) throw new Error(result.diagnostics.join('; '));
}
export function captureEvidence(text: string): Evidence {
  if (typeof text !== 'string') throw new Error('Evidence must be text');
  return { sha256: createHash('sha256').update(text).digest('hex'), bytes: Buffer.byteLength(text) };
}
// Sorted keys make fingerprints independent of JSON object insertion order.
export function definitionFingerprint(definition: EvalDefinition): string {
  assertEval(definition);
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => [k, canonical(v)])) : value;
  return captureEvidence(JSON.stringify(canonical(definition))).sha256;
}
export function normalizeScore(raw: number, min: number, max: number, direction: 'higher' | 'lower' = 'higher'): number {
  if (![raw, min, max].every(Number.isFinite) || max <= min || raw < min || raw > max || !['higher', 'lower'].includes(direction)) throw new Error('Invalid score or scale');
  const score = Number.isFinite(max - min) ? (raw - min) / (max - min) : (raw / 2 - min / 2) / (max / 2 - min / 2);
  return direction === 'higher' ? score : 1 - score;
}
function contextValid(context: EvalContext): void {
  if (!context || typeof context.runId !== 'string' || !context.runId.trim() || typeof context.inputRef !== 'string' || !context.inputRef.trim() || typeof context.observedAt !== 'string' || !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(context.observedAt) || !Number.isFinite(Date.parse(context.observedAt))) throw new Error('Invalid run/input/time identity');
}
export function classificationResult(definition: EvalDefinition, context: EvalContext, labelId: string, evidenceText: string, adapter = 'classification-import'): EvalResult {
  assertEval(definition);
  if (definition.method !== 'classification') throw new Error('Expected classification eval');
  return labeledResult(definition, context, labelId, evidenceText, adapter);
}
function labeledResult(definition: EvalDefinition, context: EvalContext, labelId: string, evidenceText: string, adapter: string): EvalResult {
  assertEval(definition); contextValid(context);
  if (typeof adapter !== 'string' || !adapter.trim()) throw new Error('Adapter identity is required');
  const label = definition.labels.find(item => item.id === labelId);
  if (!label) throw new Error('Unknown or missing classification label');
  if (typeof evidenceText !== 'string' || !evidenceText.trim()) throw new Error('Classification requires evidence');
  return { schemaVersion: '1.0.0', kind: 'SpecDDEvalResult', runId: context.runId, inputRef: context.inputRef, observedAt: context.observedAt, evalRef: definition.id, evalVersion: definition.version,
    definitionSha256: definitionFingerprint(definition), adapter, outcome: label.score >= definition.passingScore ? 'pass' : 'fail',
    score: label.score, label: label.id, evidence: captureEvidence(evidenceText), error: null };
}
export interface LocalObservation { exitCode: number | null; signal: string | null; timedOut: boolean; launchError: string | null; stdout: string; stderr: string }
export const localExitAdapter: EvalAdapter<LocalObservation, { passLabel: string; failLabel: string }> = { id: 'local-exit-v1', evaluate: localResult };
export function localResult(definition: EvalDefinition, context: EvalContext, observation: LocalObservation, binding: { passLabel: string; failLabel: string }): EvalResult {
  assertEval(definition); contextValid(context);
  if (definition.method !== 'mechanical') throw new Error('Local exit adapter requires mechanical eval');
  const pass = definition.labels.find(label => label.id === binding.passLabel);
  const fail = definition.labels.find(label => label.id === binding.failLabel);
  if (!pass || !fail || pass.score < definition.passingScore || fail.score >= definition.passingScore) throw new Error('Invalid local label binding');
  if (!observation || typeof observation.stdout !== 'string' || typeof observation.stderr !== 'string' || typeof observation.timedOut !== 'boolean' || !(observation.signal === null || typeof observation.signal === 'string') || !(observation.launchError === null || typeof observation.launchError === 'string') || !(observation.exitCode === null || Number.isInteger(observation.exitCode))) throw new Error('Invalid local observation');
  const evidenceText = JSON.stringify(observation);
  const result = labeledResult(definition, context, observation.exitCode === 0 ? pass.id : fail.id, evidenceText, 'local-exit-v1');
  if (observation.timedOut || observation.signal !== null || observation.launchError !== null || observation.exitCode === null) {
    return { ...result, outcome: 'error', score: null, label: null, error: 'Execution incomplete: timeout, signal, launch failure or absent exit code' };
  }
  return result;
}
export function gateSatisfied(gate: { evalRef: string; mode: 'required' | 'advisory'; requiredOutcome: 'pass' }, definition: EvalDefinition, result: EvalResult, expected: EvalContext): boolean {
  assertEval(definition); contextValid(expected);
  if (!validateResult(result)) return false;
  if (!['required', 'advisory'].includes(gate.mode) || gate.requiredOutcome !== 'pass') throw new Error('Invalid eval gate');
  if (gate.evalRef !== definition.id || result.evalRef !== definition.id || result.evalVersion !== definition.version || result.definitionSha256 !== definitionFingerprint(definition) || result.runId !== expected.runId || result.inputRef !== expected.inputRef) return false;
  const label = definition.labels.find(item => item.id === result.label);
  const pass = result.outcome === 'pass' && result.error === null && label !== undefined && result.score === label.score && label.score >= definition.passingScore && /^[a-f0-9]{64}$/.test(result.evidence.sha256) && result.evidence.bytes > 0;
  return gate.mode === 'advisory' || pass;
}
