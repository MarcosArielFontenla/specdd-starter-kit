import { assertEval, classificationResult, type EvalDefinition, type EvalContext } from './index.js';
export interface WarpScorerBinding { agents: string[]; model: string; samplingRate: number }
export function compileWarpScorer(definition: EvalDefinition, binding: WarpScorerBinding) {
  assertEval(definition);
  if (binding && Object.keys(binding).some(key => !['agents', 'model', 'samplingRate'].includes(key))) throw new Error('Unknown Warp binding property');
  if (definition.method !== 'classification') throw new Error('Mechanical eval cannot be replaced by a Warp LLM scorer');
  if (!binding || !Array.isArray(binding.agents) || !binding.agents.length || binding.agents.some(agent => typeof agent !== 'string' || !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(agent)) || new Set(binding.agents).size !== binding.agents.length || typeof binding.model !== 'string' || !binding.model.trim() || !Number.isFinite(binding.samplingRate) || binding.samplingRate < 0 || binding.samplingRate > 100) throw new Error('Invalid explicit Warp binding');
  const q = JSON.stringify;
  const text = ['---', `name: ${q(definition.id)}`, `description: ${q(definition.name)}`, 'agents:', ...binding.agents.map(id => `  - ${q(id)}`), 'output: classification', 'labels:', ...definition.labels.flatMap(label => [`  - value: ${q(label.id)}`, `    description: ${q(label.description)}`, `    score: ${label.score}`]), `passingScore: ${definition.passingScore}`, `samplingRate: ${binding.samplingRate}`, `model: ${q(binding.model)}`, 'selfImprovement: false', '---', '', definition.rubric, ''].join('\n');
  return { files: { [`scorers/${definition.id}/scorer.md`]: text }, limitations: ['Configuration only; not applied or executed.', 'Referenced agents must exist in the target Factory.', 'An LLM classification is not proof of mechanical checks or runtime gate enforcement.'], externalWritesPerformed: false as const };
}
// Caller maps an observed provider label into this boundary; no undocumented API shape assumed.
export function importWarpClassification(definition: EvalDefinition, context: EvalContext, label: string, evidence: string) {
  if (definition.method !== 'classification') throw new Error('Expected classification eval');
  return classificationResult(definition, context, label, evidence, 'warp-classification-import-v1');
}
