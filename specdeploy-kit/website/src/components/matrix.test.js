// Renders EVERY provider × each supported CI × api on/off. This test discovers
// providers from disk, so new providers are covered automatically.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { readProviders } from '../../scripts/bundle-providers.js';
import { generateFiles } from './generators.js';

const providersDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'providers');
const providers = readProviders(providersDir);

const SECRET_PATTERNS = /(ghp_[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|xox[bp]-|-----BEGIN [A-Z ]*PRIVATE KEY)/;

function sampleFields(provider) {
  const fields = {};
  for (const f of provider.fields || []) {
    fields[f.key] = f.default ?? (f.type === 'select' ? f.options[0] : 'sample-1');
  }
  return fields;
}

test('at least one provider exists', () => {
  assert.ok(Object.keys(providers).length >= 1);
});

for (const [id, provider] of Object.entries(providers)) {
  for (const ci of provider.ci) {
    for (const api of [false, true]) {
      test(`matrix: ${id} × ${ci} × api=${api}`, () => {
        const input = {
          app: { name: 'Matrix App', preset: 'astro', buildCommand: 'npm run build', outputDir: 'dist', api: api ? 'node' : 'none', apiDir: 'api' },
          providerId: id,
          providerFields: sampleFields(provider),
          ci: [ci],
          envs: 'dev+prod',
          approvalGate: true,
          ack: true,
        };
        const out = generateFiles(providers, input);
        for (const [path, content] of Object.entries(out)) {
          const withoutGha = content.replace(/\$\{\{[^}]*\}\}/g, '');
          assert.ok(!withoutGha.includes('{{'), `${id}:${path} has an unresolved placeholder`);
          assert.ok(!SECRET_PATTERNS.test(content), `${id}:${path} contains a secret-looking value`);
          if (path.endsWith('.yml') || path.endsWith('.yaml')) parseYaml(content);
          if (path.endsWith('.json')) JSON.parse(content);
        }
        assert.ok(out['docs/deploy-runbook.md'], `${id}: runbook missing`);
        assert.ok(out['specdeploy.json'], `${id}: manifest missing`);
        assert.ok(out['.env.example'], `${id}: env example missing`);
        const pipeline = ci === 'github-actions' ? '.github/workflows/deploy.yml' : 'azure-pipelines.yml';
        assert.ok(pipeline in out, `${id}: expected ${pipeline} for ci=${ci}`);
      });
    }
  }
}
