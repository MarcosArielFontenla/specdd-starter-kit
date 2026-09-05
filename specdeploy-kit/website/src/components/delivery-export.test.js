import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readProviders } from '../../scripts/bundle-providers.js';
import { generateFiles, generateFilesWithDelivery } from './generators.js';
import { DELIVERY_PATHS, deliveryInputError, generateDeliveryFiles } from './delivery-export.js';
import { assertDeliveryDefinition, assertDeliveryProjection } from '@specdd/delivery-model';

const providers = readProviders(fileURLToPath(new URL('../../../providers', import.meta.url)));
function inputFor(provider, ci = provider.ci[0]) {
  return { app: { name: 'Export Test', preset: 'astro', buildCommand: 'npm run build', outputDir: 'dist', api: 'none', apiDir: 'api' }, providerId: provider.id,
    providerFields: Object.fromEntries((provider.fields ?? []).map(f => [f.key, f.default ?? f.options?.[0] ?? 'sample'])), ci: [ci], envs: 'prod', approvalGate: false, ack: true,
    delivery: { enabled: true, projectId: 'example-project', repositoryRef: 'example-repo', sourceRevision: 'a'.repeat(40), stagingDestinationRef: 'stage-site', productionDestinationRef: 'prod-site' } };
}
for (const provider of Object.values(providers)) for (const ci of provider.ci) {
  test(`delivery export ${provider.id}/${ci}: disabled bytes unchanged, opt-in adds exact valid drafts`, async () => {
    const input = inputFor(provider, ci), baseline = generateFiles(providers, input);
    const disabled = { ...input, delivery: { enabled: false } };
    assert.deepEqual(await generateFilesWithDelivery(providers, disabled), baseline);
    const { delivery, ...legacy } = input; assert.deepEqual(await generateFilesWithDelivery(providers, legacy), baseline);
    const out = await generateFilesWithDelivery(providers, input);
    for (const [path, value] of Object.entries(baseline)) assert.equal(out[path], value, path);
    assert.deepEqual(Object.keys(out).filter(p => !(p in baseline)).sort(), [...DELIVERY_PATHS].sort());
    const definition = JSON.parse(out['delivery/definition.json']); assertDeliveryDefinition(definition);
    const projection = JSON.parse(out['delivery/projection.json']); assertDeliveryProjection(projection, definition);
    assert.deepEqual(JSON.parse(out['delivery/control-plane.json']), projection.definition);
    assert.equal(definition.provider.sha256, createHash('sha256').update(out['delivery/provider.json']).digest('hex'));
    assert.equal(definition.provider.id, provider.id); assert.equal(projection.executable, false);
    assert.equal(definition.release.artifactSha256, null); assert.equal(definition.release.sourceGate, 'merged-source');
    assert.deepEqual(definition.environments.map(e => e.destinationRef), ['stage-site', 'prod-site']);
    assert.match(out['delivery/README.md'], /SPECDEPLOY_PROVIDER_RUNTIME_UNSUPPORTED/);
  });
}
test('legacy flags neither replace explicit delivery inputs nor grant approval', async () => {
  const p = providers.vercel, input = inputFor(p); input.envs = 'dev+prod'; input.approvalGate = true;
  const out = await generateFilesWithDelivery(providers, input);
  const graph = JSON.parse(out['delivery/control-plane.json']); assert.equal(graph.approvals[0].required, true);
  assert.equal('approved' in graph.approvals[0], false);
  input.delivery.productionDestinationRef = ''; assert.notEqual(deliveryInputError(input), '');
  await assert.rejects(generateFilesWithDelivery(providers, input));
});
test('invalid source refs, unsafe IDs and shared destinations fail before export', async () => {
  for (const patch of [{ sourceRevision: 'main' }, { projectId: '../project' }, { repositoryRef: 'https://example.com' }, { productionDestinationRef: 'stage-site' }]) {
    const input = inputFor(providers.vercel); Object.assign(input.delivery, patch);
    await assert.rejects(generateFilesWithDelivery(providers, input));
  }
});
test('export collisions cannot overwrite legacy artifacts', async () => {
  const p = structuredClone(providers.vercel); p.artifacts.push({ template: 'collision.txt', output: 'delivery/definition.json' }); p.templates['collision.txt'] = 'owned';
  await assert.rejects(generateFilesWithDelivery({ vercel: p }, inputFor(p)), /collision/);
});
test('API unsupported warning remains explicit in delivery runbook', async () => {
  const input = inputFor(providers.vercel); input.app.api = 'node';
  assert.match((await generateFilesWithDelivery(providers, input))['delivery/README.md'], /does not support the requested API/);
});
test('async generation snapshots inputs and provider bytes, remains deterministic', async () => {
  const p = structuredClone(providers.vercel), input = inputFor(p), before = structuredClone(input);
  const pending = generateFilesWithDelivery({ vercel: p }, input);
  input.delivery.sourceRevision = 'b'.repeat(40); p.label = 'changed';
  const out = await pending;
  assert.deepEqual(out, await generateFilesWithDelivery(providers, before));
  assert.equal(JSON.parse(out['delivery/definition.json']).release.sourceRevision, before.delivery.sourceRevision);
  assert.ok(!out['delivery/provider.json'].includes('changed'));
});
test('disabling delivery ignores stale invalid fields and returns no extra exports', async () => {
  const input = inputFor(providers.vercel); input.delivery = { enabled: false, sourceRevision: 'invalid' };
  assert.equal(deliveryInputError(input), ''); assert.deepEqual(await generateDeliveryFiles(providers.vercel, input), {});
});
