import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScore } from '@specdd/eval-adapters';
test('fixed canonical score scale cases', () => {
  assert.equal(normalizeScore(5, 0, 10), 0.5);
  assert.equal(normalizeScore(2, 0, 10, 'lower'), 0.8);
  assert.equal(normalizeScore(10, 0, 10), 1);
  assert.equal(normalizeScore(0, 0, 10), 0);
});
