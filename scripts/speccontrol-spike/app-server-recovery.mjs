import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const executable = process.argv[2];
if (!executable) throw new Error('Pass the resolved Codex executable path');
const cwd = realpathSync(fileURLToPath(new URL('./fixtures/runtime', import.meta.url)));
const input = readFileSync(new URL('./fixtures/runtime/input.txt', import.meta.url));
const tempRoot = realpathSync(tmpdir());
const stateDir = mkdtempSync(join(tempRoot, 'speccontrol-o1-recovery-'));
const dbPath = join(stateDir, 'state.sqlite');
const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
  CREATE TABLE operation(id TEXT PRIMARY KEY, state TEXT NOT NULL, thread_id TEXT, turn_id TEXT) STRICT;`);
const operationId = randomUUID();
db.prepare('INSERT INTO operation VALUES (?, ?, NULL, NULL)').run(operationId, 'prepared');

const allowedEnv = ['SystemRoot', 'WINDIR', 'PATH', 'PATHEXT', 'USERPROFILE', 'APPDATA',
  'LOCALAPPDATA', 'TEMP', 'TMP', 'HOME'];
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  allowedEnv.some((allowed) => allowed.toLowerCase() === key.toLowerCase())));

function openServer() {
  const child = spawn(executable, ['app-server', '--stdio', '-c', 'mcp_servers={}',
    '-c', 'analytics.enabled=false'], { cwd, env, shell: false, windowsHide: true,
    stdio: ['pipe', 'pipe', 'ignore'] });
  let buffer = '', nextId = 1, bytes = 0;
  const pending = new Map(), waiting = new Map();
  const send = (message) => child.stdin.write(JSON.stringify(message) + '\n');
  const request = (method, params) => new Promise((resolve, reject) => {
    const id = nextId++; pending.set(id, { resolve, reject, method }); send({ id, method, params });
  });
  const waitFor = (method) => new Promise((resolve) => waiting.set(method, resolve));
  child.stdout.on('data', (chunk) => {
    bytes += chunk.length;
    if (bytes > 1024 * 1024) { child.kill(); return; }
    buffer += chunk.toString('utf8');
    for (let end; (end = buffer.indexOf('\n')) >= 0;) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
      let message;
      try { message = JSON.parse(line); } catch { child.kill(); continue; }
      if (message.method && message.id !== undefined) {
        send({ id: message.id, error: { code: -32601, message: 'Denied by O1 recovery probe' } }); continue;
      }
      const pendingRequest = pending.get(message.id);
      if (pendingRequest) {
        pending.delete(message.id);
        message.error ? pendingRequest.reject(new Error(`${pendingRequest.method}_FAILED`))
          : pendingRequest.resolve(message.result);
      } else if (message.method && waiting.has(message.method)) {
        const resolve = waiting.get(message.method); waiting.delete(message.method); resolve(message.params);
      }
    }
  });
  const spawned = new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
  const closed = new Promise((resolve) => child.once('close', resolve));
  return { child, request, waitFor, spawned, closed, send };
}

async function initialize(server) {
  await server.spawned;
  await server.request('initialize', { clientInfo: { name: 'speccontrol_o1_probe', version: '0.1.0' },
    capabilities: { experimentalApi: true } });
  server.send({ method: 'initialized', params: {} });
}

let first, second, threadId, turnId;
try {
  first = openServer(); await initialize(first);
  const thread = await first.request('thread/start', { cwd, model: 'gpt-5.6-luna',
    approvalPolicy: 'never', permissions: ':read-only', serviceName: 'speccontrol_o1_probe' });
  threadId = thread.thread.id;
  db.exec('BEGIN IMMEDIATE');
  db.prepare("UPDATE operation SET state='dispatch-intent', thread_id=? WHERE id=? AND state='prepared'")
    .run(threadId, operationId);
  db.exec('COMMIT');
  const startedNotification = first.waitFor('turn/started');
  const started = await first.request('turn/start', { threadId, cwd, approvalPolicy: 'never',
    input: [{ type: 'text', text: 'Read input.txt and slowly analyze its characters. Do not use tools, run commands, access network, or modify files. Return only JSON with key canary.' }],
    summary: 'concise', outputSchema: { type: 'object', properties: { canary: { type: 'string' } }, required: ['canary'], additionalProperties: false } });
  turnId = started.turn.id;
  db.prepare("UPDATE operation SET state='remote-accepted', turn_id=? WHERE id=? AND state='dispatch-intent'")
    .run(turnId, operationId);
  const active = await startedNotification;
  assert.equal(active.turn.id, turnId);
  first.child.kill();
  await first.closed;
  assert.equal(db.prepare('SELECT state FROM operation WHERE id=?').get(operationId).state, 'remote-accepted');

  second = openServer(); await initialize(second);
  await second.request('thread/resume', { threadId, model: 'gpt-5.6-luna', permissions: ':read-only' });
  let observedStatus = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const read = await second.request('thread/read', { threadId, includeTurns: true });
    const observed = read.thread.turns?.find((turn) => turn.id === turnId);
    observedStatus = observed?.status ?? null;
    if (observedStatus && !['inProgress', 'in_progress'].includes(observedStatus)) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  // A crash after remote acceptance cannot be retried merely because the client died.
  db.prepare("UPDATE operation SET state='needs-attention' WHERE id=? AND state='remote-accepted'")
    .run(operationId);
  await second.request('thread/archive', { threadId });
  second.child.stdin.end(); await second.closed;
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  console.log(JSON.stringify({ persistedBeforeCrash: true, adapterProcessInterrupted: true,
    threadRefSha256: hash(threadId), turnRefSha256: hash(turnId), resumed: true,
    observedTurnStatus: observedStatus, recoveryDecision: db.prepare('SELECT state FROM operation WHERE id=?').get(operationId).state,
    automaticRetry: false, inputUnchanged: readFileSync(new URL('./fixtures/runtime/input.txt', import.meta.url)).equals(input) }, null, 2));
  assert.ok(observedStatus);
  assert.equal(readFileSync(new URL('./fixtures/runtime/input.txt', import.meta.url)).equals(input), true);
} finally {
  if (first && first.child.exitCode === null) first.child.kill();
  if (second && second.child.exitCode === null) second.child.kill();
  db.close();
  const resolved = realpathSync(stateDir);
  assert.equal(dirname(resolved), tempRoot);
  rmSync(resolved, { recursive: true });
  console.log('cleanup: validated temporary recovery database removed');
}
