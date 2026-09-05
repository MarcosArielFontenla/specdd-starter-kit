import { createHash } from 'node:crypto';
import { assertDeliveryDefinition, compileDelivery, validateDeliveryReceipt } from './index.js';
import type { DeliveryReceipt } from './types.js';

const stable = (v: unknown): unknown => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, item]) => [k, stable(item)])) : v;
export function deliveryFingerprint(value: unknown): string {
  assertDeliveryDefinition(value);
  return digest(value);
}
function digest(value: unknown): string { return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }

/** Binding validation is not authentication, eval execution or a delivery state machine. */
export function assertReceiptForDelivery(value: unknown, definition: unknown): asserts value is DeliveryReceipt {
  assertDeliveryDefinition(definition);
  const result = validateDeliveryReceipt(value);
  if (!result.valid) throw new Error('Invalid receipt: ' + JSON.stringify(result.diagnostics));
  const r = value as DeliveryReceipt;
  const binding = compileDelivery(definition).bindings.find(b => b.nodeRef === r.stage)!;
  if (r.deliveryRef !== definition.id || r.deliverySha256 !== deliveryFingerprint(definition) || r.sourceRevision !== definition.release.sourceRevision || r.adapterRef !== binding.adapterRef || r.environmentRef !== binding.environmentRef) throw new Error('Receipt delivery/release/adapter/environment binding mismatch');
  const maxAttempts = ['source-gate', 'smoke', 'post-deploy'].includes(r.stage) ? definition.evalMaxAttempts : 1;
  if (r.attempt > maxAttempts) throw new Error('Receipt exceeds stage retry bound');
  if (definition.release.artifactSha256 !== null && r.artifactSha256 !== null && r.artifactSha256 !== definition.release.artifactSha256) throw new Error('Receipt artifact differs from pinned release');
}

/** Exact approval subject material only; never creates or grants approval. */
export function promotionSubject(definition: unknown, build: unknown, smoke: unknown) {
  assertDeliveryDefinition(definition); assertReceiptForDelivery(build, definition); assertReceiptForDelivery(smoke, definition);
  if (build.stage !== 'build' || smoke.stage !== 'smoke' || build.outcome !== 'success' || smoke.outcome !== 'success' || !build.artifactSha256 || build.artifactSha256 !== smoke.artifactSha256 || build.runId !== smoke.runId || build.endedAt! > smoke.startedAt) throw new Error('Promotion subject requires successful ordered build/smoke observations of the same run and artifact');
  return { kind: 'SpecDDPromotionSubject' as const, schemaVersion: '1.0.0' as const,
    deliveryRef: definition.id, deliverySha256: deliveryFingerprint(definition), graphSha256: digest(compileDelivery(definition).definition),
    sourceRevision: definition.release.sourceRevision, artifactSha256: build.artifactSha256,
    environmentRef: definition.environments[1]!.id, destinationRef: definition.environments[1]!.destinationRef,
    runId: build.runId, buildReceiptSha256: digest(build), smokeReceiptSha256: digest(smoke),
    approvalGranted: false as const, originVerification: 'not-authenticated' as const };
}
