// B2 continuation of a pinned B1 pause. Trusted local operator records, not an identity service.
import { createHash } from 'node:crypto';
import { lstat, mkdir, open } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectRehearsal, smokeFile } from './rehearsal.mjs';
import { assertReceiptForDelivery, deliveryFingerprint } from '../dist/node.js';
import { captureEvidence, definitionFingerprint, validateResult, gateSatisfied } from '@specdd/eval-adapters';
import { readRun, writeRun } from '@specdd/run-history/store';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const json = value => JSON.stringify(value, null, 2) + '\n';
const hash = value => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
const implementation = ['packages/delivery-model/scripts/promotion.mjs', 'packages/delivery-model/scripts/promote.mjs'];
const decisionKeys = ['kind', 'schemaVersion', 'runId', 'decision', 'subjectSha256', 'artifactSha256', 'destinationRef', 'environmentClass', 'actorRef', 'recordedAt', 'origin', 'message'];

async function noLinks(path) {
  let cursor = resolve(path);
  for (;;) {
    if ((await lstat(cursor)).isSymbolicLink()) throw new Error('Linked path refused');
    const parent = dirname(cursor); if (parent === cursor) return; cursor = parent;
  }
}
async function read(path) {
  await noLinks(path);
  const handle = await open(path, 'r');
  try {
    const stat = await handle.stat(); const limit = 8 * 1024 * 1024;
    if (!stat.isFile() || stat.size > limit) throw new Error('Not a bounded regular file');
    const buffer = Buffer.alloc(limit + 1); let bytes = 0;
    while (bytes < buffer.length) {
      const chunk = await handle.read(buffer, bytes, buffer.length - bytes, null);
      if (!chunk.bytesRead) break; bytes += chunk.bytesRead;
    }
    if (bytes > limit) throw new Error('File size limit');
    return new TextDecoder('utf8', { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, bytes));
  } finally { await handle.close(); }
}
const readJSON = async path => JSON.parse(await read(path));
async function put(path, text) {
  await noLinks(dirname(path));
  const handle = await open(path, 'wx', 0o600);
  try { await handle.writeFile(text); await handle.sync(); } finally { await handle.close(); }
}
async function directory(path) { await noLinks(dirname(path)); await mkdir(path); await noLinks(path); }

function assertDecision(decision, pause, createdAt) {
  if (!decision || typeof decision !== 'object' || Array.isArray(decision) ||
      JSON.stringify(Object.keys(decision).sort()) !== JSON.stringify([...decisionKeys].sort()) ||
      decision.kind !== 'SpecDDLocalPromotionDecision' || decision.schemaVersion !== '1.0.0' || decision.decision !== 'approved' ||
      decision.runId !== pause.runId || decision.subjectSha256 !== pause.subjectSha256 || decision.artifactSha256 !== pause.artifactSha256 ||
      decision.destinationRef !== 'slot-b' || decision.environmentClass !== 'local-rehearsal' ||
      typeof decision.actorRef !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(decision.actorRef) || decision.actorRef.length > 80 ||
      decision.origin !== 'operator-recorded-human-decision' || typeof decision.message !== 'string' || !decision.message.trim() || decision.message.length > 2000 ||
      typeof decision.recordedAt !== 'string' || !Number.isFinite(Date.parse(decision.recordedAt)) || new Date(decision.recordedAt).toISOString() !== decision.recordedAt ||
      decision.recordedAt < createdAt || decision.recordedAt > now()) throw new Error('Missing, rejected, stale or malformed exact local approval');
}

async function context(parent, runId) {
  const pause = await inspectRehearsal(parent, runId); // validates ID, all B1 pins, actual build/staging bytes and canonical history
  const dir = pause.directory;
  const definition = await readJSON(join(dir, 'delivery/definition.json'));
  const projection = await readJSON(join(dir, 'delivery/projection.json'));
  if (definition.release.sourceGate !== 'fixture-source' || definition.buildAdapterRef !== 'local-fixture' || definition.evalMaxAttempts !== 1 ||
      definition.environments.length !== 2 || definition.environments.some((e, i) => e.class !== 'local-rehearsal' || e.adapterRef !== 'local-fixture' || e.destinationRef !== ['slot-a', 'slot-b'][i])) throw new Error('Unsupported promotion adapter/destination');
  const paused = await readJSON(join(dir, 'paused.json'));
  return { pause, dir, definition, projection, paused };
}

function postResult(evalDefinition, runId, artifactSha256, observation) {
  const error = typeof observation.error === 'string' ? observation.error : null;
  const result = { kind: 'SpecDDEvalResult', schemaVersion: '1.0.0', runId, inputRef: artifactSha256, observedAt: observation.endedAt,
    evalRef: evalDefinition.id, evalVersion: evalDefinition.version, definitionSha256: definitionFingerprint(evalDefinition), adapter: 'local-fixture-observation-v1',
    outcome: error ? 'error' : observation.passed ? 'pass' : 'fail', score: error ? null : observation.passed ? 1 : 0,
    label: error ? null : observation.passed ? 'pass' : 'fail', evidence: captureEvidence(json(observation)), error };
  if (!validateResult(result)) throw new Error('Invalid post-deploy result');
  return result;
}

/** Explicit host dispatch only. Never called by imported telemetry or generated graphs. */
export async function promoteRehearsal(parent, runId, decision) {
  decision = structuredClone(decision);
  const ctx = await context(parent, runId);
  const { pause, dir, definition, projection, paused } = ctx;
  assertDecision(decision, pause, paused.createdAt);
  const pins = [];
  for (const path of implementation) pins.push({ path, ...captureEvidence(await read(join(root, path))) });
  const request = await readJSON(join(dir, 'delivery/approval-request.json'));
  const events = await readRun(join(dir, 'history'), runId, projection.definition);
  if (json(events.at(-1).data) !== json({ requestId: request.requestId, approvalRef: request.approvalRef, evidence: request.evidence })) throw new Error('Conflicting approval request');
  const continuation = join(dir, 'promotion');
  await directory(continuation); // exclusive claim: concurrent, repeated and partial attempts all fail closed
  const files = []; let materializationStarted = false; let materialized = false; let historyWritten = false;
  const save = async (path, value) => { const text = typeof value === 'string' ? value : json(value); await put(join(dir, path), text); files.push({ path, ...captureEvidence(text) }); };
  function emit(event, nodeRef, data, timestamp = now()) {
    const id = `promotion-event-${events.length + 1}`;
    events.push({ ...events[0], id, timestamp, source: { adapter: 'local-fixture-promotion-v1', eventId: id }, event, nodeRef, data });
  }
  async function receipt(stage, observation) {
    const binding = projection.bindings.find(b => b.nodeRef === stage);
    const r = { kind: 'SpecDDDeliveryReceipt', schemaVersion: '1.0.0', id: `${runId}-${stage}`, runId, deliveryRef: definition.id,
      deliverySha256: deliveryFingerprint(definition), stage, attempt: 1, adapterRef: binding.adapterRef, environmentRef: binding.environmentRef,
      sourceRevision: definition.release.sourceRevision, artifactSha256: pause.artifactSha256, origin: 'local-observation',
      startedAt: observation.startedAt, endedAt: observation.endedAt, outcome: observation.passed ? 'success' : 'failed', evidence: captureEvidence(json(observation)) };
    assertReceiptForDelivery(r, definition);
    await save(`delivery/evidence/${stage}-observation.json`, observation);
    await save(`delivery/evidence/${stage}.json`, r);
    return r;
  }
  try {
    await directory(join(continuation, 'history'));
    await save('promotion/execution.json', { kind: 'LocalPromotionExecution', schemaVersion: '1.0.0', runId, pins,
      pauseSha256: hash(await read(join(dir, 'paused.json'))), subjectSha256: pause.subjectSha256, decisionSha256: hash(json(decision)),
      physicalDestination: 'promotion/slot-b/index.html', environmentClass: 'local-rehearsal', createdAt: now() });
    await save('promotion/decision.json', decision);
    // Revalidate the old pins/subject immediately before accepting the decision and dispatching.
    await context(parent, runId);
    assertDecision(decision, pause, paused.createdAt);
    const acceptedAt = now();
    await receipt('approve-promotion', { decisionSha256: hash(json(decision)), subjectSha256: pause.subjectSha256,
      authentication: 'operator-record-not-authenticated', passed: true, startedAt: acceptedAt, endedAt: acceptedAt });
    emit('approval.granted', 'approve-promotion', { requestId: request.requestId, approvalRef: request.approvalRef, actorRef: decision.actorRef, evidence: request.evidence });
    const content = await read(join(dir, 'build/index.html'));
    if (hash(content) !== pause.artifactSha256) throw new Error('Artifact changed before promotion');
    const startedAt = now();
    await directory(join(continuation, 'slot-b'));
    materializationStarted = true;
    await save('promotion/slot-b/index.html', content); // same bytes, never rebuild or follow a caller destination
    const observedSha256 = hash(await read(join(continuation, 'slot-b/index.html')));
    materialized = observedSha256 === pause.artifactSha256;
    const deployed = await receipt('deploy-production', { destinationRef: 'slot-b', physicalDestination: 'promotion/slot-b/index.html',
      environmentClass: 'local-rehearsal', observedSha256, passed: materialized, startedAt, endedAt: now() });
    emit('artifact.created', 'deploy-production', { artifactRef: 'deploy-production-receipt', path: 'delivery/evidence/deploy-production.json', evidence: captureEvidence(json(deployed)) });
    if (!materialized) throw new Error('Promotion materialization digest mismatch');
    const evalDefinition = (await readJSON(join(dir, 'delivery/evals.json'))).postDeploy;
    const observation = await smokeFile(join(continuation, 'slot-b/index.html'), pause.artifactSha256);
    const result = postResult(evalDefinition, runId, pause.artifactSha256, observation);
    emit('eval.started', 'post-deploy', { attempt: 1, evalRef: evalDefinition.id }, observation.startedAt);
    await save('delivery/evidence/post-deploy-eval.json', result);
    await receipt('post-deploy', observation);
    emit('eval.completed', 'post-deploy', { attempt: 1, result }, result.observedAt);
    const passed = gateSatisfied({ evalRef: evalDefinition.id, mode: 'required', requiredOutcome: 'pass' }, evalDefinition, result, result);
    emit('workflow.completed', null, { status: passed ? 'success' : 'failed' });
    await writeRun(join(continuation, 'history'), events, projection.definition); historyWritten = true;
    const historyPath = `promotion/history/run-${runId}.jsonl`;
    files.push({ path: historyPath, ...captureEvidence(await read(join(dir, historyPath))) });
    await save('promotion/completed.json', { kind: 'LocalPromotionCompletion', schemaVersion: '1.0.0', runId,
      status: passed ? 'success' : 'deployed-unhealthy', artifactSha256: pause.artifactSha256, subjectSha256: pause.subjectSha256,
      materialized: true, serverRunning: false, files: [...files], endedAt: now() });
    return await inspectPromotion(parent, runId);
  } catch (error) {
    if (!historyWritten) {
      if (events.at(-1).event !== 'workflow.completed') emit('workflow.completed', null, { status: 'failed' });
      await writeRun(join(continuation, 'history'), events, projection.definition).catch(() => {});
    }
    await put(join(continuation, 'failure.json'), json({ runId, status: materialized ? 'deployed-verification-incomplete' : materializationStarted ? 'materialization-incomplete-or-unverified' : 'failed-before-materialization',
      reason: error.message, materialized, materializationStarted, endedAt: now() })).catch(() => {});
    throw error; // preserve all output; no implicit rollback or retry
  }
}

/** Read-only verification of the continuation; B1's status remains a historical pause view. */
export async function inspectPromotion(parent, runId) {
  const { pause, dir, definition, projection, paused } = await context(parent, runId);
  const continuation = join(dir, 'promotion');
  await noLinks(continuation);
  try { await lstat(join(continuation, 'failure.json')); throw new Error('Failed/incomplete promotion; manual review required, no replay'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const summary = await readJSON(join(continuation, 'completed.json'));
  if (summary.kind !== 'LocalPromotionCompletion' || summary.runId !== runId || !['success', 'deployed-unhealthy'].includes(summary.status) ||
      summary.artifactSha256 !== pause.artifactSha256 || summary.subjectSha256 !== pause.subjectSha256 || summary.materialized !== true || summary.serverRunning !== false || !Array.isArray(summary.files) || summary.files.length !== 11) throw new Error('Invalid completion manifest');
  const required = ['promotion/execution.json', 'promotion/decision.json', 'promotion/slot-b/index.html',
    ...['approve-promotion', 'deploy-production', 'post-deploy'].flatMap(s => [`delivery/evidence/${s}-observation.json`, `delivery/evidence/${s}.json`]),
    'delivery/evidence/post-deploy-eval.json', `promotion/history/run-${runId}.jsonl`].sort();
  if (json(summary.files.map(f => f.path).sort()) !== json(required)) throw new Error('Missing/duplicate completion evidence');
  for (const file of summary.files) {
    const content = await read(join(dir, file.path));
    if (hash(content) !== file.sha256 || Buffer.byteLength(content) !== file.bytes) throw new Error('Stale promotion evidence: ' + file.path);
  }
  const execution = await readJSON(join(continuation, 'execution.json'));
  if (execution.runId !== runId || execution.subjectSha256 !== pause.subjectSha256 || execution.pauseSha256 !== hash(await read(join(dir, 'paused.json'))) ||
      json(execution.pins.map(p => p.path)) !== json(implementation) || execution.physicalDestination !== 'promotion/slot-b/index.html') throw new Error('Changed execution binding');
  for (const pin of execution.pins) if (json(captureEvidence(await read(join(root, pin.path)))) !== json({ sha256: pin.sha256, bytes: pin.bytes })) throw new Error('Changed promotion implementation');
  const decision = await readJSON(join(continuation, 'decision.json'));
  assertDecision(decision, pause, paused.createdAt);
  if (hash(json(decision)) !== execution.decisionSha256) throw new Error('Changed decision');
  let previous = (await readJSON(join(dir, 'delivery/evidence/smoke.json'))).endedAt;
  for (const stage of ['approve-promotion', 'deploy-production', 'post-deploy']) {
    const r = await readJSON(join(dir, `delivery/evidence/${stage}.json`));
    const observation = await read(join(dir, `delivery/evidence/${stage}-observation.json`));
    assertReceiptForDelivery(r, definition);
    if (r.runId !== runId || r.stage !== stage || r.startedAt < previous || json(r.evidence) !== json(captureEvidence(observation)) || (stage !== 'post-deploy' && r.outcome !== 'success')) throw new Error('Conflicting continuation receipt');
    const observed = JSON.parse(observation);
    if (stage === 'approve-promotion' && (observed.decisionSha256 !== execution.decisionSha256 || observed.subjectSha256 !== pause.subjectSha256 || r.startedAt < decision.recordedAt)) throw new Error('Conflicting approval receipt');
    if (stage === 'deploy-production' && (observed.environmentClass !== 'local-rehearsal' || observed.destinationRef !== 'slot-b' || observed.physicalDestination !== execution.physicalDestination || observed.observedSha256 !== pause.artifactSha256)) throw new Error('Conflicting materialization receipt');
    previous = r.endedAt;
  }
  if (hash(await read(join(continuation, 'slot-b/index.html'))) !== pause.artifactSha256) throw new Error('Changed promoted artifact');
  const evalDefinition = (await readJSON(join(dir, 'delivery/evals.json'))).postDeploy;
  const observed = await readJSON(join(dir, 'delivery/evidence/post-deploy-observation.json'));
  const result = await readJSON(join(dir, 'delivery/evidence/post-deploy-eval.json'));
  if (json(result) !== json(postResult(evalDefinition, runId, pause.artifactSha256, observed))) throw new Error('Conflicting post-deploy eval');
  const passed = observed.error === null && observed.status === 200 && observed.responseSha256 === pause.artifactSha256 && observed.serverClosed === true &&
    gateSatisfied({ evalRef: evalDefinition.id, mode: 'required', requiredOutcome: 'pass' }, evalDefinition, result, result);
  const postReceipt = await readJSON(join(dir, 'delivery/evidence/post-deploy.json'));
  if ((summary.status === 'success') !== passed || observed.passed !== passed || postReceipt.outcome !== (passed ? 'success' : 'failed')) throw new Error('False completion status');
  const events = await readRun(join(continuation, 'history'), runId, projection.definition);
  const old = await readRun(join(dir, 'history'), runId, projection.definition);
  if (json(events.slice(0, old.length)) !== json(old) || events.length !== old.length + 5 || events[old.length].event !== 'approval.granted' ||
      events[old.length].data.actorRef !== decision.actorRef || events.at(-1).event !== 'workflow.completed' || events.at(-1).data.status !== (passed ? 'success' : 'failed') ||
      json(events.at(-2).data.result) !== json(result)) throw new Error('Conflicting full history');
  return { runId, status: summary.status, artifactSha256: pause.artifactSha256, subjectSha256: pause.subjectSha256,
    destination: 'slot-b', physicalDestination: join(continuation, 'slot-b/index.html'), environmentClass: 'local-rehearsal',
    materialized: true, postDeploy: result.outcome, serverRunning: false, historyValidated: true, trust: 'operator-record-not-authenticated' };
}
