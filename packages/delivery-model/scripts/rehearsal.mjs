// B1: fixed local fixture through the approval pause. No generic graph dispatch or promotion.
import { createHash } from 'node:crypto';
import { lstat, mkdir, open, readdir } from 'node:fs/promises';
import { createServer, get } from 'node:http';
import { dirname, join, resolve, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileDelivery, assertDeliveryProjection } from '../dist/index.js';
import { deliveryFingerprint, assertReceiptForDelivery, promotionSubject } from '../dist/node.js';
import { captureEvidence, definitionFingerprint, validateResult, gateSatisfied } from '@specdd/eval-adapters';
import { controlPlaneFingerprint } from '@specdd/run-history';
import { writeRun, readRun } from '@specdd/run-history/store';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const fixture = 'packages/delivery-model/fixtures/static/index.html';
const now = () => new Date().toISOString();
const json = value => JSON.stringify(value, null, 2) + '\n';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const evidence = bytes => ({ sha256: hash(bytes), bytes: Buffer.byteLength(bytes) });
const MAX = 64 * 1024;
const stages = ['source-gate', 'build', 'deploy-staging', 'smoke'];
const pinnedPaths = [fixture, 'package-lock.json',
  'packages/delivery-model/scripts/rehearsal.mjs', 'packages/delivery-model/scripts/rehearse.mjs',
  'packages/delivery-model/examples/local.delivery.json',
  ...['delivery-model', 'control-plane-model', 'project-model', 'eval-adapters', 'run-history'].flatMap(p => [`packages/${p}/dist/index.js`]),
  ...['types', 'factory', 'validate'].map(p => `packages/control-plane-model/dist/${p}.js`),
  ...['types', 'ids', 'validate', 'factory', 'migrate', 'structural'].map(p => `packages/project-model/dist/${p}.js`),
  'packages/delivery-model/dist/node.js', 'packages/delivery-model/dist/types.js',
  'packages/run-history/dist/store.js',
  'packages/delivery-model/schema/definition.schema.json', 'packages/delivery-model/schema/receipt.schema.json',
  'packages/eval-adapters/schema/eval.schema.json', 'packages/eval-adapters/schema/result.schema.json',
  'packages/run-history/schema/event.schema.json',
  ...['control-plane', 'graph', 'policy'].map(p => `packages/control-plane-model/schema/${p}.schema.json`),
  'packages/project-model/schema/project-definition.schema.json'];

function safeId(id) {
  if (typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 60 || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(id)) throw new Error('Unsafe run ID');
  return id;
}
async function noLinks(path) {
  const absolute = resolve(path);
  let cursor = parse(absolute).root;
  for (const part of absolute.slice(cursor.length).split(/[\\/]/).filter(Boolean)) {
    cursor = join(cursor, part);
    const info = await lstat(cursor);
    if (info.isSymbolicLink()) throw new Error('Symlink/junction refused');
  }
}
async function createDirectory(path) {
  await noLinks(dirname(path));
  await mkdir(path); // deliberately nonrecursive/exclusive; existing run is never resumed
  await noLinks(path);
}
async function put(path, bytes) {
  await noLinks(dirname(path));
  const handle = await open(path, 'wx', 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
}
async function read(path) {
  await noLinks(path);
  const handle = await open(path, 'r');
  try {
    const stat = await handle.stat();
    const limit = 8 * 1024 * 1024;
    if (!stat.isFile() || stat.size > limit) throw new Error('Not a bounded regular file');
    const bytes = Buffer.alloc(limit + 1);
    let count = 0;
    while (count < bytes.length) {
      const result = await handle.read(bytes, count, bytes.length - count, null);
      if (!result.bytesRead) break;
      count += result.bytesRead;
    }
    if (count > limit) throw new Error('File size limit');
    // Preserve a BOM: fingerprints must represent exact bytes, not normalized text.
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes.subarray(0, count));
  } finally { await handle.close(); }
}
async function readJSON(path) { return JSON.parse(await read(path)); }

/** Serves only one bounded regular file on an ephemeral IPv4 loopback port.
 * A single real HTTP GET is checked without redirects, proxies or caller URLs.
 */
export async function smokeFile(path, expectedHash) {
  if (!/^[a-f0-9]{64}$/.test(expectedHash)) throw new Error('Invalid expected digest');
  const content = Buffer.from(await read(path));
  if (!content.length || content.length > MAX) throw new Error('Fixture size limit');
  const startedAt = now();
  const server = createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/') { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': content.length });
    response.end(content);
  });
  server.requestTimeout = 2000;
  server.headersTimeout = 2000;
  let observation;
  try {
    await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
    const { port } = server.address();
    observation = await new Promise(resolveObservation => {
      let done = false;
      const finish = result => { if (!done) { done = true; clearTimeout(deadline); resolveObservation(result); } };
      const request = get({ hostname: '127.0.0.1', port, path: '/', agent: false }, response => {
        const chunks = []; let bytes = 0;
        response.on('data', chunk => {
          bytes += chunk.length;
          if (bytes > MAX) request.destroy(new Error('Response size limit')); else chunks.push(chunk);
        });
        response.on('error', error => finish({ error: error.message }));
        response.on('end', () => finish({ host: '127.0.0.1', port, status: response.statusCode,
          responseSha256: hash(Buffer.concat(chunks)), responseBytes: bytes, error: null }));
      });
      const deadline = setTimeout(() => request.destroy(new Error('Smoke deadline exceeded')), 3000);
      request.on('error', error => finish({ error: error.message }));
    });
  } catch (error) { observation = { error: error.message }; }
  finally {
    server.closeAllConnections();
    if (server.listening) await new Promise((accept, reject) => server.close(error => error ? reject(error) : accept()));
  }
  return { ...observation, expectedSha256: expectedHash, startedAt, endedAt: now(), serverClosed: !server.listening,
    passed: observation.error === null && observation.status === 200 && observation.responseSha256 === expectedHash };
}

function evalDefinition(id) {
  return { kind: 'SpecDDEval', schemaVersion: '1.0.0', id, version: '1.0.0', name: id, method: 'mechanical',
    rubric: 'Fixed local source digest equality, or actual HTTP 200 and exact artifact SHA-256 equality. Errors never pass.',
    labels: [{ id: 'pass', description: 'All required observations matched', score: 1 }, { id: 'fail', description: 'A required observation failed', score: 0 }], passingScore: 1 };
}
function evaluate(definition, runId, inputRef, observation) {
  const error = typeof observation.error === 'string' ? observation.error : null;
  const result = { kind: 'SpecDDEvalResult', schemaVersion: '1.0.0', runId, inputRef, observedAt: observation.endedAt,
    evalRef: definition.id, evalVersion: definition.version, definitionSha256: definitionFingerprint(definition),
    adapter: 'local-fixture-observation-v1', outcome: error ? 'error' : observation.passed ? 'pass' : 'fail',
    score: error ? null : observation.passed ? 1 : 0, label: error ? null : observation.passed ? 'pass' : 'fail', evidence: captureEvidence(json(observation)), error };
  if (!validateResult(result)) throw new Error('Invalid local eval result');
  return result;
}

export async function startRehearsal(parent, runId) {
  safeId(runId);
  // Pin every supplied input and the local implementation before the first operation.
  const pins = [];
  for (const path of pinnedPaths) { const bytes = await read(join(repo, path)); pins.push({ path, ...evidence(bytes) }); }
  const bytes = await read(join(repo, fixture));
  if (!Buffer.byteLength(bytes) || Buffer.byteLength(bytes) > MAX) throw new Error('Fixture size limit');
  const artifactSha256 = hash(bytes);
  if (pins[0].sha256 !== artifactSha256) throw new Error('Fixture changed while pinning');
  const d = await readJSON(join(repo, 'packages/delivery-model/examples/local.delivery.json'));
  const provider = { kind: 'LocalFixtureAdapter', version: '1.0.0', fixture, pins, network: 'ephemeral-ipv4-loopback-only', promotionEnabled: false };
  d.id = 'local-delivery-pilot'; d.provider.sha256 = hash(json(provider));
  d.release.sourceRevision = artifactSha256; d.release.artifactSha256 = artifactSha256;
  d.evalMaxAttempts = 1; // bounded fail-stop; no automatic replay/retry
  d.rollbackInstructions = 'Stop and retain evidence. No rollback or deletion is implemented.';
  // The checked-in template is not a dispatch input. Fail closed if its local subset changes.
  if (d.release.sourceGate !== 'fixture-source' || d.buildAdapterRef !== 'local-fixture' ||
      d.environments.some((e, i) => e.class !== 'local-rehearsal' || e.adapterRef !== 'local-fixture' || e.destinationRef !== ['slot-a', 'slot-b'][i]) ||
      d.artifactRoot !== 'delivery/evidence') throw new Error('Unsupported local subset');
  const projection = compileDelivery(d);
  const evals = Object.fromEntries(Object.entries(d.checks).map(([key, id]) => [key, evalDefinition(id)]));
  await noLinks(dirname(resolve(parent)));
  try { await mkdir(parent); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  await noLinks(parent);
  const dir = join(parent, runId);
  await createDirectory(dir);
  const files = [];
  let recordFailure;
  const save = async (path, data) => { const content = typeof data === 'string' ? data : json(data); await put(join(dir, path), content); files.push({ path, ...evidence(content) }); };
  try {
    for (const path of ['delivery', 'delivery/evidence', 'build', 'slot-a', 'history']) await createDirectory(join(dir, path));
    await save('delivery/provider.json', provider);
    await save('delivery/definition.json', d);
    await save('delivery/projection.json', projection);
    await save('delivery/evals.json', evals);
    const events = [];
    const binding = { runId, workflowRef: 'controlled-delivery', graphRef: d.graphRef, controlPlaneSha256: controlPlaneFingerprint(projection.definition),
      inputRef: artifactSha256, agentRef: null, capabilityRefs: [], runtime: null, model: null, harnessRef: null };
    function emit(event, nodeRef, data, timestamp = now()) {
      const id = `event-${events.length + 1}`;
      events.push({ ...binding, schemaVersion: '1.0.0', kind: 'SpecDDRunEvent', id, timestamp, source: { adapter: 'local-fixture-v1', eventId: id }, nodeRef, event, data });
    }
    emit('workflow.started', null, {});
    recordFailure = async () => {
      emit('workflow.completed', null, { status: 'failed' });
      await writeRun(join(dir, 'history'), events, projection.definition);
    };
    const receipts = {};
    async function receipt(stage, startedAt, observation) {
      const b = projection.bindings.find(b => b.nodeRef === stage);
      const r = { kind: 'SpecDDDeliveryReceipt', schemaVersion: '1.0.0', id: `${runId}-${stage}`, runId, deliveryRef: d.id,
        deliverySha256: deliveryFingerprint(d), stage, attempt: 1, adapterRef: b.adapterRef, environmentRef: b.environmentRef,
        sourceRevision: d.release.sourceRevision, artifactSha256, origin: 'local-observation', startedAt, endedAt: observation.endedAt,
        outcome: observation.passed ? 'success' : 'failed', evidence: captureEvidence(json(observation)) };
      assertReceiptForDelivery(r, d);
      await save(`delivery/evidence/${stage}-observation.json`, observation);
      await save(`delivery/evidence/${stage}.json`, r);
      receipts[stage] = r;
      return r;
    }
    async function evalStage(stage, definition, observation) {
      emit('eval.started', stage, { attempt: 1, evalRef: definition.id }, observation.startedAt);
      const result = evaluate(definition, runId, artifactSha256, observation);
      await save(`delivery/evidence/${stage}-eval.json`, result);
      emit('eval.completed', stage, { attempt: 1, result }, result.observedAt);
      await receipt(stage, observation.startedAt, observation);
      if (!gateSatisfied({ evalRef: definition.id, mode: 'required', requiredOutcome: 'pass' }, definition, result, result)) throw new Error(`Failed ${stage}; dependent stages stopped`);
    }
    const startedAt = now();
    const source = { mode: 'fixture-source', mergedSourceVerified: false, fixture, sha256: hash(await read(join(repo, fixture))), startedAt, endedAt: now() };
    source.passed = source.sha256 === artifactSha256;
    await save('delivery/evidence/release-source.json', source);
    await evalStage('source-gate', evals.source, source);
    for (const [stage, destination] of [['build', 'build/index.html'], ['deploy-staging', 'slot-a/index.html']]) {
      const startedAt = now();
      const content = stage === 'build' ? bytes : await read(join(dir, 'build/index.html'));
      if (hash(content) !== artifactSha256) throw new Error('Changed artifact before materialization');
      await save(destination, content);
      const observedSha256 = hash(await read(join(dir, destination)));
      const r = await receipt(stage, startedAt, { destination, environmentClass: 'local-rehearsal', observedSha256, passed: observedSha256 === artifactSha256, endedAt: now() });
      emit('artifact.created', stage, { artifactRef: `${stage}-receipt`, path: `delivery/evidence/${stage}.json`, evidence: captureEvidence(json(r)) });
      if (r.outcome !== 'success') throw new Error('Materialization digest mismatch');
    }
    await evalStage('smoke', evals.smoke, await smokeFile(join(dir, 'slot-a/index.html'), artifactSha256));
    const subject = promotionSubject(d, receipts.build, receipts.smoke);
    await save('delivery/evidence/promotion-subject.json', subject);
    const request = { requestId: `${runId}-promotion`, approvalRef: 'promotion-approval', evidence: captureEvidence(json(subject)) };
    await save('delivery/approval-request.json', { ...request, subject, status: 'awaiting-human-approval', promotionEnabled: false });
    emit('approval.requested', 'approve-promotion', request);
    await writeRun(join(dir, 'history'), events, projection.definition);
    recordFailure = undefined;
    const historyPath = `history/run-${runId}.jsonl`;
    files.push({ path: historyPath, ...evidence(await read(join(dir, historyPath))) });
    await save('paused.json', { kind: 'LocalDeliveryPause', version: '1.0.0', runId, status: 'awaiting-human-approval', artifactSha256,
      subjectSha256: hash(json(subject)), files: [...files], pins, createdAt: now(), trust: 'local-observation-not-authenticated', promotionEnabled: false });
    return await inspectRehearsal(parent, runId);
  } catch (error) {
    // Preserve partial materialization; never invent a successful terminal workflow or reuse it.
    await recordFailure?.().catch(() => {});
    await put(join(dir, 'failure.json'), json({ runId, status: 'failed-or-incomplete', at: now(), reason: error.message, promotionEnabled: false })).catch(() => {});
    throw error;
  }
}

export async function inspectRehearsal(parent, runId) {
  safeId(runId);
  const dir = join(parent, runId);
  await noLinks(dir);
  if ((await readdir(dir)).includes('failure.json') || (await readdir(dir)).includes('slot-b')) throw new Error('Failed/conflicting run; no resume or promotion');
  const pause = await readJSON(join(dir, 'paused.json'));
  if (pause.runId !== runId || pause.status !== 'awaiting-human-approval' || pause.promotionEnabled !== false) throw new Error('Invalid pause');
  for (const item of [...pause.files, ...pause.pins]) {
    if (typeof item.path !== 'string' || item.path.includes('\\') || item.path.includes(':') || item.path.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('Unsafe manifest path');
  }
  if (JSON.stringify(pause.pins.map(p => p.path)) !== JSON.stringify(pinnedPaths)) throw new Error('Changed implementation pin set');
  for (const [base, items] of [[dir, pause.files], [repo, pause.pins]]) {
    for (const item of items) {
      const content = await read(join(base, item.path));
      if (hash(content) !== item.sha256 || Buffer.byteLength(content) !== item.bytes) throw new Error('Stale evidence or implementation: ' + item.path);
    }
  }
  const d = await readJSON(join(dir, 'delivery/definition.json'));
  const projection = await readJSON(join(dir, 'delivery/projection.json'));
  assertDeliveryProjection(projection, d);
  const receipts = {};
  const evals = await readJSON(join(dir, 'delivery/evals.json'));
  let previous = '';
  for (const stage of stages) {
    const r = await readJSON(join(dir, `delivery/evidence/${stage}.json`));
    assertReceiptForDelivery(r, d);
    const observation = await read(join(dir, `delivery/evidence/${stage}-observation.json`));
    if (r.runId !== runId || r.stage !== stage || r.outcome !== 'success' || r.startedAt < previous || r.evidence.sha256 !== hash(observation)) throw new Error('Conflicting stage receipts');
    previous = r.endedAt; receipts[stage] = r;
    if (stage === 'source-gate' || stage === 'smoke') {
      const definition = evals[stage === 'smoke' ? 'smoke' : 'source'];
      const observed = JSON.parse(observation);
      const actualPass = stage === 'smoke'
        ? observed.status === 200 && observed.error === null && observed.responseSha256 === d.release.artifactSha256 && observed.serverClosed === true
        : observed.mode === 'fixture-source' && observed.mergedSourceVerified === false && observed.sha256 === d.release.sourceRevision;
      const result = await readJSON(join(dir, `delivery/evidence/${stage}-eval.json`));
      if (!actualPass || json(result) !== json(evaluate(definition, runId, d.release.artifactSha256, observed)) ||
          !gateSatisfied({ evalRef: definition.id, mode: 'required', requiredOutcome: 'pass' }, definition, result, result)) throw new Error('Failed or conflicting eval');
    }
  }
  const subject = promotionSubject(d, receipts.build, receipts.smoke);
  if (hash(json(subject)) !== pause.subjectSha256 || hash(await read(join(dir, 'delivery/evidence/promotion-subject.json'))) !== pause.subjectSha256) throw new Error('Stale promotion subject');
  for (const path of ['build/index.html', 'slot-a/index.html']) if (hash(await read(join(dir, path))) !== subject.artifactSha256) throw new Error('Changed artifact');
  const history = await readRun(join(dir, 'history'), runId, projection.definition);
  const requested = history.at(-1);
  if (requested.event !== 'approval.requested' || requested.data.evidence.sha256 !== pause.subjectSha256 || history.some(e => e.event === 'approval.granted' || e.event === 'workflow.completed')) throw new Error('Conflicting approval history');
  return { runId, directory: resolve(dir), status: 'awaiting-human-approval', artifactSha256: subject.artifactSha256,
    subjectSha256: pause.subjectSha256, destination: 'slot-b', environmentClass: 'local-rehearsal',
    promotionEnabled: false, serverRunning: false, historyValidated: Boolean(history), trust: 'local-observation-not-authenticated' };
}
