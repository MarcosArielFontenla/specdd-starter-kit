import { assertDeliveryDefinition, compileDelivery } from '@specdd/delivery-model';

export const DELIVERY_PATHS = ['delivery/provider.json', 'delivery/definition.json', 'delivery/control-plane.json', 'delivery/projection.json', 'delivery/README.md'];
const id = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
export function deliveryInputError(input) {
  if (!input.delivery?.enabled) return '';
  for (const key of ['projectId', 'repositoryRef', 'stagingDestinationRef', 'productionDestinationRef']) {
    const value = input.delivery[key];
    if (typeof value !== 'string' || value.length > 80 || !id.test(value)) return `${key}: use a lower-case ID (letters, digits, dots, hyphens or underscores), up to 80 characters.`;
  }
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(input.delivery.sourceRevision ?? '')) return 'sourceRevision: enter the full 40- or 64-character lower-case commit hash; a branch name is not a pinned revision.';
  if (input.delivery.stagingDestinationRef === input.delivery.productionDestinationRef) return 'Staging and production destination IDs must be different.';
  return '';
}

/** Web Crypto hashes the exact exported snapshot bytes; no remote requests. */
export async function generateDeliveryFiles(provider, input) {
  if (!input.delivery?.enabled) return {};
  provider = structuredClone(provider);
  input = structuredClone(input);
  const error = deliveryInputError(input);
  if (error) throw new Error(error);
  const options = structuredClone(input.delivery);
  // Provider descriptors have no upstream version field. Version this exported
  // snapshot contract instead of fabricating an upstream provider version.
  const snapshot = JSON.stringify({ kind: 'SpecDDProviderSnapshot', schemaVersion: '1.0.0', provider: structuredClone(provider) }, null, 2) + '\n';
  const hash = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(snapshot));
  const sha256 = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  const adapterRef = 'provider-delivery-adapter';
  const definition = {
    kind: 'SpecDDDeliveryDefinition', schemaVersion: '1.0.0', lifecycle: 'draft',
    id: 'specdeploy-delivery', name: 'SpecDeploy controlled delivery draft', version: '1.0.0',
    project: { id: options.projectId, source: 'context/project-definition.json', version: '1.0.0' },
    harness: { id: 'project-harness', source: '.agents/REGISTRY.md', version: '1.0.0' },
    provider: { id: provider.id, source: 'delivery/provider.json', version: '1.0.0', sha256 },
    release: { repositoryRef: options.repositoryRef, sourceRevision: options.sourceRevision, artifactSha256: null, sourceGate: 'merged-source' },
    graphRef: 'controlled-delivery-graph', artifactRoot: 'delivery/evidence', buildAdapterRef: adapterRef,
    adapters: [{ id: adapterRef, version: '1.0.0', operations: ['verify-source', 'build', 'deploy', 'verify'] }],
    environments: [
      { id: 'staging', class: 'staging', adapterRef, destinationRef: options.stagingDestinationRef },
      { id: 'production', class: 'production', adapterRef, destinationRef: options.productionDestinationRef }],
    checks: { source: 'merged-source-check', smoke: 'staging-smoke-check', postDeploy: 'production-health-check' },
    evalMaxAttempts: 1,
    rollbackInstructions: 'Stop on failed verification. Review the provider runbook and explicitly authorize a rollback to the prior verified artifact. This draft executes no rollback.'
  };
  assertDeliveryDefinition(definition);
  // Keep the canonical projection exact; provider-specific warnings are surfaced
  // in the runbook/UI, not injected into the compiler's deterministic output.
  const canonical = compileDelivery(definition);
  const apiWarning = input.app.api !== 'none' && !provider.supportsApi ? '\nThe selected provider does not support the requested API deployment.\n' : '';
  const readme = `# SpecDeploy delivery draft\n\nNOT EXECUTABLE. No deployment or approval has occurred.\n\nProvider: ${provider.id}. SPECDEPLOY_PROVIDER_RUNTIME_UNSUPPORTED: no controlled-delivery adapter is implemented for this provider. Declared operations are requirements, not runtime support.\n${apiWarning}\nThe existing pipelines/IaC are legacy templates, NOT implementations of this graph. Copying or enabling those pipelines can trigger their own external actions; this export does not add runtime protections to them.\n\nStaging and production destination IDs were explicitly supplied and are logical references, not created environments. Legacy envs, approvalGate and security acknowledgement are not promotion approval. The full source hash is user-supplied; merged-source is a required future check, not proof of merge. Artifact hash stays null until a real build.\n\nBefore execution, provide and validate context/project-definition.json, .agents/REGISTRY.md, the referenced eval definitions, actual source/merge evidence and an authorized adapter. None of those are created or authenticated here. Never insert credential values into these documents.\n\nprovider.json is a versioned snapshot of bundled provider data/templates; definition.provider.sha256 hashes its exact UTF-8 bytes. The version identifies the snapshot contract, not an upstream provider release. Application/provider selections remain in specdeploy.json and are not executed.\n\nVerify staging, obtain fresh human approval of the exact source/artifact/destination/eval evidence, then promote the same artifact. Smoke tests, post-deploy verification and rollback require later implementation and separate authority. Warp is not required.\n`;
  return { 'delivery/provider.json': snapshot, 'delivery/definition.json': JSON.stringify(definition, null, 2), 'delivery/control-plane.json': JSON.stringify(canonical.definition, null, 2), 'delivery/projection.json': JSON.stringify(canonical, null, 2), 'delivery/README.md': readme };
}
