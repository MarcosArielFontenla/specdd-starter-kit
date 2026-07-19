import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectTargetHarness } from './target.js';

test('specdd harness detected via REGISTRY or primer+routing', () => {
  assert.deepEqual(detectTargetHarness(['.agents/REGISTRY.md', 'src/a.js']), { specdd: true, legacy: false });
  assert.deepEqual(detectTargetHarness(['AGENTS.md', '.agents/orchestration/ROUTING.md']), { specdd: true, legacy: false });
});

test('legacy harness (non-specdd) flagged', () => {
  assert.deepEqual(detectTargetHarness(['SYSTEM_PROMPT.md', '.agents/AGENTS.md', 'src/a.js']), { specdd: false, legacy: true });
  assert.deepEqual(detectTargetHarness(['.cursor/rules/core.mdc']), { specdd: false, legacy: true });
});

test('no harness at all', () => {
  assert.deepEqual(detectTargetHarness(['src/a.js', 'README.md', '.github/workflows/ci.yml']), { specdd: false, legacy: false });
});
