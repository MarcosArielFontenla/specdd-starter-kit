import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYSIS_DEPTHS,
  ANALYSIS_LEVELS,
  DEFAULT_ANALYSIS_DEPTH,
  getAnalysisLevel,
} from './analysis.js';

test('analysis levels expose structural as default and semantic as an available opt-in', () => {
  assert.equal(DEFAULT_ANALYSIS_DEPTH, ANALYSIS_DEPTHS.STRUCTURAL);
  assert.deepEqual(ANALYSIS_LEVELS.map((level) => level.id), ['structural', 'semantic']);
  assert.equal(getAnalysisLevel('structural').available, true);
  assert.equal(getAnalysisLevel('semantic').available, true);
});

test('unknown analysis depth falls back to structural bootstrap', () => {
  assert.equal(getAnalysisLevel('unknown').id, ANALYSIS_DEPTHS.STRUCTURAL);
});
