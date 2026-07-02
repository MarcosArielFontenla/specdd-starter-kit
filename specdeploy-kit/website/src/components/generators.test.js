import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFiles, buildContext, matchesWhen, slugify, KIT_VERSION } from './generators.js';

const fixture = {
  'fake-cloud': {
    id: 'fake-cloud', label: 'Fake Cloud', description: 'test', supportsApi: false,
    ci: ['github-actions', 'azure-pipelines'],
    fields: [
      { key: 'siteName', label: 'Site name', type: 'text', required: true },
      { key: 'server', label: 'Server', type: 'select', options: ['nginx', 'iis'], default: 'nginx' },
    ],
    secrets: [{ name: 'FAKE_TOKEN', description: 'deploy token', where: 'CI secrets' }],
    artifacts: [
      { template: 'gha.yml', output: '.github/workflows/deploy.yml', when: 'ci:github-actions' },
      { template: 'azp.yml', output: 'azure-pipelines.yml', when: 'ci:azure-pipelines' },
      { template: 'nginx.conf', output: 'deploy/nginx.conf', when: 'field.server:nginx' },
      { template: 'api-note.md', output: 'docs/api-note.md', when: 'api' },
      { template: 'runbook.md', output: 'docs/deploy-runbook.md' },
    ],
    templates: {
      'gha.yml': 'name: Deploy {{app.name}} to {{siteName}}\n',
      'azp.yml': 'trigger: [main]\n# site {{siteName}}\n',
      'nginx.conf': 'server {}\n',
      'api-note.md': 'api dir: {{app.apiDir}}\n',
      'runbook.md': '# Runbook {{providerLabel}} v{{kitVersion}}\n\n{{secretsTable}}\n',
    },
  },
};

const baseInput = {
  app: { name: 'Demo Site', preset: 'astro', buildCommand: 'npm run build', outputDir: 'dist', api: 'none', apiDir: 'api' },
  providerId: 'fake-cloud',
  providerFields: { siteName: 'demo', server: 'nginx' },
  ci: ['github-actions'],
  envs: 'prod',
  approvalGate: false,
  ack: true,
};

test('slugify kebab-cases names', () => {
  assert.equal(slugify('Demo Site 2!'), 'demo-site-2');
});

test('matchesWhen handles ci, api, negation, field equality and &&', () => {
  const ctx = { ci: ['github-actions'], api: false, server: 'nginx' };
  assert.ok(matchesWhen('ci:github-actions', ctx));
  assert.ok(!matchesWhen('ci:azure-pipelines', ctx));
  assert.ok(!matchesWhen('api', ctx));
  assert.ok(matchesWhen('!api', ctx));
  assert.ok(matchesWhen('field.server:nginx', ctx));
  assert.ok(!matchesWhen('field.server:iis', ctx));
  assert.ok(matchesWhen('ci:github-actions && !api', ctx));
  assert.ok(matchesWhen(undefined, ctx));
});

test('buildContext derives flags, secretsTable and select-value flags', () => {
  const ctx = buildContext({ ...baseInput, ci: ['github-actions', 'azure-pipelines'], envs: 'dev+prod', approvalGate: true, app: { ...baseInput.app, api: 'node' } }, fixture['fake-cloud']);
  assert.equal(ctx.siteName, 'demo');
  assert.equal(ctx.appSlug, 'demo-site');
  assert.equal(ctx.api, true);
  assert.equal(ctx.apiUnsupported, true); // fake-cloud has supportsApi: false
  assert.equal(ctx.ciGithub, true);
  assert.equal(ctx.ciAzp, true);
  assert.equal(ctx.envDev, true);
  assert.equal(ctx.approvalGate, true);
  assert.equal(ctx.server_nginx, true);
  assert.match(ctx.secretsTable, /`FAKE_TOKEN`/);
});

test('generateFiles filters artifacts by ci and api, always adds manifest and env example', () => {
  const out = generateFiles(fixture, baseInput);
  assert.ok('.github/workflows/deploy.yml' in out);
  assert.ok(!('azure-pipelines.yml' in out));        // ci not selected
  assert.ok(!('docs/api-note.md' in out));           // api none
  assert.ok('deploy/nginx.conf' in out);             // field.server:nginx
  assert.ok('docs/deploy-runbook.md' in out);
  assert.match(out['.github/workflows/deploy.yml'], /Deploy Demo Site to demo/);
  const manifest = JSON.parse(out['specdeploy.json']);
  assert.equal(manifest.kit, 'specdeploy-kit');
  assert.equal(manifest.version, KIT_VERSION);
  assert.equal(manifest.provider, 'fake-cloud');
  assert.match(out['.env.example'], /FAKE_TOKEN/);
  assert.match(out['.env.example'], /no real values/i);
});

test('generateFiles includes api artifact when api is enabled, and both pipelines when both ci selected', () => {
  const out = generateFiles(fixture, { ...baseInput, ci: ['github-actions', 'azure-pipelines'], app: { ...baseInput.app, api: 'node' } });
  assert.ok('docs/api-note.md' in out);
  assert.ok('azure-pipelines.yml' in out);
});

test('generateFiles throws on unknown provider', () => {
  assert.throws(() => generateFiles(fixture, { ...baseInput, providerId: 'nope' }), /unknown provider/);
});
