// scripts/prompts.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

test('every prompt has agent+description frontmatter', () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.github', 'prompts');
  const files = readdirSync(dir).filter((f) => f.endsWith('.prompt.md'));
  assert.ok(files.length >= 17);
  for (const f of files) {
    const txt = readFileSync(join(dir, f), 'utf8');
    assert.match(txt, /^---[\s\S]*?agent:\s*agent[\s\S]*?description:\s*.+[\s\S]*?---/, `${f} frontmatter`);
  }
});
