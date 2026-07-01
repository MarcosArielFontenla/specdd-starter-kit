// scripts/bundle-kit.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bundleKit } from './bundle-kit.js';

test('bundleKit snapshots allowed files and skips excluded ones', () => {
  const root = mkdtempSync(join(tmpdir(), 'kit-'));
  mkdirSync(join(root, '.github'), { recursive: true });
  mkdirSync(join(root, 'context'), { recursive: true });
  mkdirSync(join(root, 'node_modules'), { recursive: true });
  writeFileSync(join(root, 'README.md'), '# hi');
  writeFileSync(join(root, '.github', 'copilot-instructions.md'), 'overlaid'); // excluded default
  writeFileSync(join(root, 'context', 'project.md'), 'overlaid');              // excluded default
  writeFileSync(join(root, 'context', 'keep.md'), 'keep me');
  writeFileSync(join(root, 'node_modules', 'x.md'), 'nope');                   // excluded dir
  writeFileSync(join(root, 'image.png'), 'binary');                            // excluded ext

  const out = join(root, 'out.json');
  const result = bundleKit(root, out);

  assert.equal(result['README.md'], '# hi');
  assert.equal(result['context/keep.md'], 'keep me');
  assert.ok(!('.github/copilot-instructions.md' in result));
  assert.ok(!('context/project.md' in result));
  assert.ok(!('node_modules/x.md' in result));
  assert.ok(!('image.png' in result));

  const written = JSON.parse(readFileSync(out, 'utf8'));
  assert.deepEqual(written, result);
  rmSync(root, { recursive: true, force: true });
});
