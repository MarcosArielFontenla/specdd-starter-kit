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
  try {
    makeProvider(root, 'fake-cloud', validDesc, validTemplates);
    mkdirSync(join(root, '_schema'), { recursive: true }); // must be skipped
    const bundle = readProviders(root);
    assert.deepEqual(Object.keys(bundle), ['fake-cloud']);
    assert.equal(bundle['fake-cloud'].templates['gha.yml'], 'name: {{app.name}}\n');
    assert.equal(bundle['fake-cloud'].label, 'Fake Cloud');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails when provider.json is missing', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  try {
    makeProvider(root, 'broken', null, {});
    assert.throws(() => readProviders(root), /missing provider\.json/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails when provider.json is not valid JSON', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  try {
    const dir = join(root, 'broken');
    mkdirSync(join(dir, 'templates'), { recursive: true });
    writeFileSync(join(dir, 'provider.json'), '{ not json');
    assert.throws(() => readProviders(root), /not valid JSON/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails when an artifact references a missing template', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  try {
    makeProvider(root, 'fake-cloud', validDesc, { 'gha.yml': 'x' }); // runbook.md missing
    assert.throws(() => readProviders(root), /missing template runbook\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails when id does not match the folder name', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  try {
    makeProvider(root, 'wrong-name', validDesc, validTemplates);
    assert.throws(() => readProviders(root), /id must equal folder name/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails on empty ci array', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  try {
    makeProvider(root, 'fake-cloud', { ...validDesc, ci: [] }, validTemplates);
    assert.throws(() => readProviders(root), /ci must be a non-empty array/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails when ci contains an unsupported entry', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  try {
    makeProvider(root, 'fake-cloud', { ...validDesc, ci: ['circleci'] }, validTemplates);
    assert.throws(() => readProviders(root), /github-actions or azure-pipelines/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails when a field key is reserved', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  try {
    makeProvider(root, 'fake-cloud', { ...validDesc, fields: [{ key: 'api', label: 'API', type: 'text' }] }, validTemplates);
    assert.throws(() => readProviders(root), /reserved/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails when a field type is not text or select', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  try {
    makeProvider(root, 'fake-cloud', { ...validDesc, fields: [{ key: 'mode', label: 'Mode', type: 'date' }] }, validTemplates);
    assert.throws(() => readProviders(root), /type must be text or select/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
