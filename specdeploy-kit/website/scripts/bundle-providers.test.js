import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readProviders } from './bundle-providers.js';

function makeProvider(root, name, desc, templates = {}) {
  const dir = join(root, name);
  mkdirSync(join(dir, 'templates'), { recursive: true });
  if (desc !== null) writeFileSync(join(dir, 'provider.json'), JSON.stringify(desc));
  for (const [file, content] of Object.entries(templates)) {
    writeFileSync(join(dir, 'templates', file), content);
  }
  return dir;
}

const validDesc = {
  id: 'fake-cloud', label: 'Fake Cloud', description: 'test provider', supportsApi: false,
  ci: ['github-actions'],
  fields: [{ key: 'siteName', label: 'Site name', type: 'text', required: true }],
  secrets: [{ name: 'FAKE_TOKEN', description: 'token', where: 'CI secrets' }],
  artifacts: [
    { template: 'gha.yml', output: '.github/workflows/deploy.yml', when: 'ci:github-actions' },
    { template: 'runbook.md', output: 'docs/deploy-runbook.md' },
  ],
};
const validTemplates = { 'gha.yml': 'name: {{app.name}}\n', 'runbook.md': '# Runbook\n' };

test('bundles a valid provider with its template contents', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  makeProvider(root, 'fake-cloud', validDesc, validTemplates);
  mkdirSync(join(root, '_schema'), { recursive: true }); // must be skipped
  const bundle = readProviders(root);
  assert.deepEqual(Object.keys(bundle), ['fake-cloud']);
  assert.equal(bundle['fake-cloud'].templates['gha.yml'], 'name: {{app.name}}\n');
  assert.equal(bundle['fake-cloud'].label, 'Fake Cloud');
  rmSync(root, { recursive: true, force: true });
});

test('fails when provider.json is missing', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  makeProvider(root, 'broken', null, {});
  assert.throws(() => readProviders(root), /missing provider\.json/);
  rmSync(root, { recursive: true, force: true });
});

test('fails when an artifact references a missing template', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  makeProvider(root, 'fake-cloud', validDesc, { 'gha.yml': 'x' }); // runbook.md missing
  assert.throws(() => readProviders(root), /missing template runbook\.md/);
  rmSync(root, { recursive: true, force: true });
});

test('fails when id does not match the folder name', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  makeProvider(root, 'wrong-name', validDesc, validTemplates);
  assert.throws(() => readProviders(root), /id must equal folder name/);
  rmSync(root, { recursive: true, force: true });
});

test('fails on empty ci array', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  makeProvider(root, 'fake-cloud', { ...validDesc, ci: [] }, validTemplates);
  assert.throws(() => readProviders(root), /ci must be a non-empty array/);
  rmSync(root, { recursive: true, force: true });
});
