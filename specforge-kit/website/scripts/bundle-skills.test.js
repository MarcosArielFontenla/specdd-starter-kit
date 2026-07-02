import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bundleSkills } from './bundle-skills.js';

function tmpSkills() {
  const root = mkdtempSync(join(tmpdir(), 'skills-'));
  mkdirSync(join(root, 'skills'), { recursive: true });
  writeFileSync(join(root, 'skills', 'story-writing.md'), '# story-writing');
  writeFileSync(join(root, 'skills', 'code-review.md'), '# code-review');
  writeFileSync(join(root, 'skills', 'notes.txt'), 'ignore me');
  return root;
}

test('local source bundles only .md files by slug', async () => {
  const root = tmpSkills();
  const out = join(root, 'skills.json');
  const result = await bundleSkills(join(root, 'skills'), out, { source: 'local' });
  assert.equal(result['story-writing'], '# story-writing');
  assert.equal(result['code-review'], '# code-review');
  assert.ok(!('notes' in result));
  assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), result);
  rmSync(root, { recursive: true, force: true });
});

test('remote source falls back to local when fetch fails', async () => {
  const root = tmpSkills();
  const out = join(root, 'skills.json');
  const failingFetch = async () => { throw new Error('network down'); };
  const result = await bundleSkills(
    join(root, 'skills'),
    out,
    { source: 'remote', remote: { baseUrl: 'https://x.invalid', manifest: 'manifest.json' } },
    failingFetch,
  );
  assert.equal(result['story-writing'], '# story-writing'); // came from local fallback
  rmSync(root, { recursive: true, force: true });
});

test('remote source uses manifest + fetched files when fetch works', async () => {
  const root = tmpSkills();
  const out = join(root, 'skills.json');
  const okFetch = async (url) => {
    if (url.endsWith('manifest.json')) return { ok: true, json: async () => ['remote-skill.md'] };
    if (url.endsWith('remote-skill.md')) return { ok: true, text: async () => '# remote-skill' };
    return { ok: false, status: 404 };
  };
  const result = await bundleSkills(
    join(root, 'skills'),
    out,
    { source: 'remote', remote: { baseUrl: 'https://x.test', manifest: 'manifest.json' } },
    okFetch,
  );
  assert.equal(result['remote-skill'], '# remote-skill');
  rmSync(root, { recursive: true, force: true });
});
