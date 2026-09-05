import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateControlPlaneDefinition } from '@specdd/control-plane-model';
import { STAGES, validateDeliveryDefinition, assertDeliveryDefinition, compileDelivery, assertDeliveryProjection, validateDeliveryReceipt } from '../dist/index.js';
import { deliveryFingerprint, assertReceiptForDelivery, promotionSubject } from '../dist/node.js';
const example = JSON.parse(readFileSync(new URL('../examples/local.delivery.json', import.meta.url)));
const fixture = () => structuredClone(example);
const bad = (edit, code) => { const d = fixture(); edit(d); const result = validateDeliveryDefinition(d); assert.equal(result.valid, false); if (code) assert.ok(result.diagnostics.some(d => d.code === code), JSON.stringify(result)); assert.throws(() => compileDelivery(d)); };
function receipt(d, stage = 'build') {
  const binding = compileDelivery(d).bindings.find(b => b.nodeRef === stage);
  return { kind: 'SpecDDDeliveryReceipt', schemaVersion: '1.0.0', id: stage + '-observation', runId: 'synthetic-run', deliveryRef: d.id, deliverySha256: deliveryFingerprint(d), stage, attempt: 1, adapterRef: binding.adapterRef, environmentRef: binding.environmentRef, sourceRevision: d.release.sourceRevision, artifactSha256: 'c'.repeat(64), origin: 'imported-attestation', startedAt: '2026-09-05T10:00:00.000Z', endedAt: '2026-09-05T10:00:01.000Z', outcome: 'success', evidence: { sha256: 'd'.repeat(64), bytes: 10 } };
}
const smoke = d => ({ ...receipt(d, 'smoke'), startedAt: '2026-09-05T10:00:02.000Z', endedAt: '2026-09-05T10:00:03.000Z' });
test('local contract compiles to valid canonical draft with fixed seven-stage flow', () => {
  const d = fixture(), p = compileDelivery(d);
  assert.equal(validateDeliveryDefinition(d).valid, true); assert.equal(validateControlPlaneDefinition(p.definition).valid, true);
  assert.deepEqual(p.definition.graphs[0].nodes.map(n => n.id), STAGES);
  assert.equal(p.definition.lifecycle, 'draft'); assert.equal(p.executable, false);
  assert.equal(p.definition.graphs[0].nodes.some(n => n.kind === 'agent'), false);
  assert.ok(p.diagnostics.some(d => d.code === 'DELIVERY_EXECUTION_UNAVAILABLE'));
});
test('generated projection matches retained portable example', () => {
  const expected = JSON.parse(readFileSync(new URL('../examples/local.projection.json', import.meta.url)));
  assert.deepEqual(compileDelivery(example), expected);
});
test('all approval and evaluation gates are required; failure always stops', () => {
  const p = compileDelivery(example).definition;
  assert.ok(p.approvals.every(a => a.required && a.mode === 'human'));
  assert.ok(p.evalGates.every(e => e.mode === 'required'));
  assert.ok(p.graphs[0].nodes.every(n => n.failureRouteRef === 'stop-delivery'));
  assert.equal(p.graphs[0].edges.find(e => e.from === 'approve-promotion').on, 'approved');
  assert.equal(p.graphs[0].edges.find(e => e.from === 'smoke').on, 'pass');
  assert.ok(p.graphs[0].nodes.filter(n => n.kind === 'artifact').every(n => !n.retryRef));
});
test('compilation is deterministic, immutable and contains no commands or executed receipts', () => {
  const d = fixture(), before = structuredClone(d), p = compileDelivery(d);
  assert.deepEqual(p, compileDelivery(d)); p.definition.project.id = 'changed'; p.bindings[0].adapterRef = 'changed';
  assert.deepEqual(d, before); assert.equal(compileDelivery(d).definition.project.id, d.project.id);
  assert.equal('receipts' in p, false); assert.equal(JSON.stringify(p).includes('workflow_dispatch'), false);
});
test('unknown nested fields, legacy approval booleans and active lifecycle fail closed', () => {
  bad(d => d.approvalGate = true); bad(d => d.release.merged = true); bad(d => d.adapters[0].command = 'deploy'); bad(d => d.lifecycle = 'active');
});
test('empty, cyclic and oversized non-JSON definitions fail predictably', () => {
  assert.equal(validateDeliveryDefinition(null).valid, false);
  const d = fixture(); d.self = d; assert.equal(validateDeliveryDefinition(d).valid, false);
  bad(d => d.rollbackInstructions = 'x'.repeat(1024 * 1024), 'DELIVERY_SIZE');
});
test('malformed IDs, versions and hashes fail schema validation', () => { bad(d => d.graphRef = '../graph'); bad(d => d.provider.version = 'latest'); bad(d => d.provider.sha256 = 'unknown'); bad(d => d.release.sourceRevision = 'main'); });
test('portable paths reject traversal, drive roots, aliases and hidden git targets', () => {
  for (const path of ['../x', '/x', 'C:/x', 'a\\b', 'a//b', 'nul.txt', '.git/config', 'a./b']) bad(d => d.artifactRoot = path, 'DELIVERY_PATH');
  bad(d => d.project.source = '../definition.json', 'DELIVERY_PATH');
});
test('duplicate or unknown adapters cannot compile', () => { bad(d => d.adapters.push(d.adapters[0]), 'DELIVERY_DUPLICATE'); bad(d => d.buildAdapterRef = 'absent', 'DELIVERY_ADAPTER_REF'); bad(d => d.environments[1].adapterRef = 'absent', 'DELIVERY_ADAPTER_REF'); });
test('unsupported declared operations report stable diagnostic instead of ready graph', () => { bad(d => d.adapters[0].operations = ['build'], 'DELIVERY_UNSUPPORTED_OPERATION'); });
test('staging and promotion require distinct IDs and destinations', () => { bad(d => d.environments[1].id = d.environments[0].id, 'DELIVERY_DESTINATION'); bad(d => d.environments[1].destinationRef = d.environments[0].destinationRef, 'DELIVERY_DESTINATION'); });
test('fixture source never enters production or mixed rehearsal environments', () => {
  bad(d => { d.environments[0].class = 'staging'; d.environments[1].class = 'production'; }, 'DELIVERY_SOURCE_GATE');
  bad(d => d.environments[1].class = 'production', 'DELIVERY_ENVIRONMENT');
});
test('merged-source cloud plan is representable but explicitly not executable', () => {
  const d = fixture(); d.release.sourceGate = 'merged-source'; d.environments[0].class = 'staging'; d.environments[1].class = 'production';
  assertDeliveryDefinition(d); assert.equal(compileDelivery(d).executable, false);
});
test('checks have distinct identities and finite retry bounds', () => { bad(d => d.checks.smoke = d.checks.source, 'DELIVERY_EVAL'); bad(d => d.evalMaxAttempts = 0); bad(d => d.evalMaxAttempts = 4); });
test('custom stage lists cannot omit smoke or insert cycles', () => { bad(d => d.stages = ['build', 'deploy-production']); });
test('projection binding validation rejects gate bypass, cycles and stale definitions', () => {
  const p = compileDelivery(example); assertDeliveryProjection(p, example);
  p.definition.graphs[0].edges.find(e => e.from === 'smoke').to = 'deploy-production'; assert.throws(() => assertDeliveryProjection(p, example), /changed/);
  const q = compileDelivery(example); q.bindings[2].environmentRef = 'promotion-slot'; assert.throws(() => assertDeliveryProjection(q, example));
  const d = fixture(); d.release.sourceRevision = 'f'.repeat(40); assert.throws(() => assertDeliveryProjection(compileDelivery(example), d));
});
test('receipts bind delivery fingerprint, release, adapter and destination', () => {
  const d = fixture(), r = receipt(d); assert.equal(validateDeliveryReceipt(r).valid, true); assertReceiptForDelivery(r, d);
  for (const key of ['deliveryRef', 'deliverySha256', 'sourceRevision', 'adapterRef', 'environmentRef']) assert.throws(() => assertReceiptForDelivery({ ...r, [key]: 'wrong' }, d));
});
test('receipt dates reject impossible calendars, reverse time and unbounded retries', () => {
  const d = fixture(), r = receipt(d);
  assert.equal(validateDeliveryReceipt({ ...r, startedAt: '2026-02-30T10:00:00.000Z' }).valid, false);
  assert.equal(validateDeliveryReceipt({ ...r, endedAt: '2026-09-04T10:00:00.000Z' }).valid, false);
  assert.throws(() => assertReceiptForDelivery({ ...r, attempt: 2 }, d));
  assert.throws(() => assertReceiptForDelivery({ ...smoke(d), attempt: 3 }, d));
});
test('unknown receipts cannot claim completion; completed receipts need evidence', () => {
  const r = receipt(fixture()); assert.equal(validateDeliveryReceipt({ ...r, outcome: 'unknown' }).valid, false);
  assert.equal(validateDeliveryReceipt({ ...r, outcome: 'unknown', endedAt: null, evidence: null }).valid, true);
  assert.equal(validateDeliveryReceipt({ ...r, evidence: null }).valid, false);
  assert.equal(validateDeliveryReceipt({ ...r, artifactSha256: null }).valid, false);
});
test('pinned build hash cannot change in receipt', () => { const d = fixture(); d.release.artifactSha256 = 'a'.repeat(64); assert.throws(() => assertReceiptForDelivery(receipt(d), d), /artifact/); });
test('subject binds exact artifact, environment, delivery and eval receipt without approving', () => {
  const d = fixture(), b = receipt(d), s = smoke(d), subject = promotionSubject(d, b, s);
  assert.equal(subject.approvalGranted, false); assert.equal(subject.originVerification, 'not-authenticated');
  assert.equal(subject.destinationRef, d.environments[1].destinationRef);
  assert.notEqual(promotionSubject(d, b, { ...s, evidence: { ...s.evidence, bytes: 11 } }).smokeReceiptSha256, subject.smokeReceiptSha256);
  d.environments[1].destinationRef = 'other-slot'; assert.throws(() => promotionSubject(d, b, s), /binding/);
});
test('failed smoke, changed artifact, wrong stages, time or mixed runs reject subject', () => {
  const d = fixture(), b = receipt(d), s = smoke(d);
  for (const patch of [{ outcome: 'failed' }, { artifactSha256: 'e'.repeat(64) }, { runId: 'other-run' }, { startedAt: b.startedAt }]) assert.throws(() => promotionSubject(d, b, { ...s, ...patch }));
  assert.throws(() => promotionSubject(d, s, b));
});
test('fingerprints ignore property order, but retain release intent changes', () => {
  const d = fixture(); assert.equal(deliveryFingerprint(d), deliveryFingerprint(Object.fromEntries(Object.entries(d).reverse())));
  d.rollbackInstructions += ' stop'; assert.notEqual(deliveryFingerprint(d), deliveryFingerprint(example));
});
test('receipt unknown fields cannot masquerade as approval or runtime verification', () => {
  const r = receipt(fixture()); assert.equal(validateDeliveryReceipt({ ...r, approved: true }).valid, false);
  assert.equal(validateDeliveryReceipt({ ...r, evidence: { ...r.evidence, authenticated: true } }).valid, false);
});
