import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScore } from '@specdd/eval-adapters';
test('fixed invalid scale cases reject rather than clamp', () => {
  for (const args of [[11, 0, 10], [-1, 0, 10], [0, 0, 0], [NaN, 0, 10], [Infinity, 0, 10]]) {
    assert.throws(() => normalizeScore(...args));
  }
});
