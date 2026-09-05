import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const executable = process.argv[2];
const mode = process.argv[3] ?? 'complete';
const model = 'gpt-5.6-luna'; // Fixed low-cost O1 canary, never a canonical SpecControl field.
if (!executable) throw new Error('Pass the explicitly resolved Codex executable path');
if (!['complete', 'interrupt'].includes(mode)) throw new Error('Mode must be complete or interrupt');

const cwd = realpathSync(fileURLToPath(new URL('./fixtures/runtime', import.meta.url)));
const inputBefore = readFileSync(new URL('./fixtures/runtime/input.txt', import.meta.url));
const inputSha256 = createHash('sha256').update(inputBefore).digest('hex');
const allowedEnv = ['SystemRoot', 'WINDIR', 'PATH', 'PATHEXT', 'USERPROFILE', 'APPDATA',
  'LOCALAPPDATA', 'TEMP', 'TMP', 'HOME'];
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  allowedEnv.some((allowed) => allowed.toLowerCase() === key.toLowerCase())));

const child = spawn(executable, ['app-server', '--stdio', '-c', 'mcp_servers={}',
  '-c', 'analytics.enabled=false'], { cwd, env, shell: false, windowsHide: true,
  stdio: ['pipe', 'pipe', 'pipe'] });

let buffer = '', bytes = 0, nextId = 1, threadId, turnId, result;
const pending = new Map();
const notifications = new Set();
const itemTypes = new Set();
const protocolIssues = [];
let agentText = '';
const MAX_BYTES = 1024 * 1024;
const MAX_MS = 60000;
let interruptSent = false;

function send(message) { child.stdin.write(JSON.stringify(message) + '\n'); }
function request(method, params) {
  const id = nextId++;
  send({ id, method, params });
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject, method }));
}
function stop(error) {
  if (!result) result = { error: error.message };
  child.stdin.end();
  child.kill();
}
const timeout = setTimeout(() => stop(new Error('TURN_TIMEOUT')), MAX_MS);

child.stderr.on('data', (chunk) => {
  bytes += chunk.length;
  if (bytes > MAX_BYTES) stop(new Error('TURN_OUTPUT_LIMIT'));
});
child.stdout.on('data', (chunk) => {
  bytes += chunk.length;
  if (bytes > MAX_BYTES) return stop(new Error('TURN_OUTPUT_LIMIT'));
  buffer += chunk.toString('utf8');
  for (let end; (end = buffer.indexOf('\n')) >= 0;) {
    const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
    let message;
    try { message = JSON.parse(line); } catch { stop(new Error('TURN_INVALID_JSON')); return; }
    if (message.method && message.id !== undefined) {
      // No approvals, elicitation, dynamic tools or server-initiated actions in O1.
      send({ id: message.id, error: { code: -32601, message: 'Denied by O1 probe' } });
      continue;
    }
    if (message.id !== undefined && pending.has(message.id)) {
      const entry = pending.get(message.id); pending.delete(message.id);
      if (message.error) {
        const protocolCode = Number.isInteger(message.error.code) ? message.error.code : 'unknown';
        const protocolMessage = typeof message.error.message === 'string'
          ? message.error.message.replace(/[\r\n\t]+/g, ' ').slice(0, 240)
          : 'unknown';
        entry.reject(new Error(`${entry.method}_FAILED code=${protocolCode} message=${protocolMessage}`));
      }
      else entry.resolve(message.result);
      continue;
    }
    if (!message.method) continue;
    notifications.add(message.method);
    if (message.method === 'item/agentMessage/delta' && typeof message.params?.delta === 'string') {
      agentText += message.params.delta;
      if (Buffer.byteLength(agentText) > 16384) return stop(new Error('TURN_AGENT_OUTPUT_LIMIT'));
    }
    if (message.method === 'error' || message.method === 'warning') {
      const candidate = message.params?.error?.message ?? message.params?.message ?? message.params?.error ?? 'unspecified';
      protocolIssues.push({ method: message.method, message: String(candidate).replace(/[\r\n\t]+/g, ' ').slice(0, 240) });
    }
    const item = message.params?.item;
    if (item?.type) itemTypes.add(item.type);
    if (mode === 'interrupt' && message.method === 'turn/started' && !interruptSent) {
      const activeTurnId = message.params?.turn?.id;
      if (activeTurnId) {
        turnId = activeTurnId;
        interruptSent = true;
        request('turn/interrupt', { threadId, turnId }).catch(stop);
      }
    }
    if (message.method === 'turn/completed' && message.params?.turn?.id === turnId) {
      const status = message.params.turn.status;
      const finalError = message.params.turn.error?.message ?? message.params.turn.error ?? null;
      let outputValid = null;
      if (status === 'completed') {
        try { outputValid = JSON.parse(agentText).canary.trim() === inputBefore.toString('utf8').trim(); }
        catch { outputValid = false; }
      }
      result = { initialized: true, model, threadId, turnId, turnStatus: status,
        interruptRequested: interruptSent, inferenceStarted: true,
        inputSha256, inputUnchanged: readFileSync(new URL('./fixtures/runtime/input.txt', import.meta.url)).equals(inputBefore),
        notificationMethods: [...notifications].sort(), itemTypes: [...itemTypes].sort(),
        outputValid, agentOutputBytes: Buffer.byteLength(agentText),
        agentOutputSha256: createHash('sha256').update(agentText).digest('hex'),
        agentOutputDiagnostic: outputValid === true ? null : agentText.replace(/[\r\n\t]+/g, ' ').slice(0, 160),
        turnError: finalError === null ? null : String(finalError).replace(/[\r\n\t]+/g, ' ').slice(0, 240),
        protocolIssues };
      clearTimeout(timeout);
      request('thread/archive', { threadId }).catch(() => {}).finally(() => child.stdin.end());
    }
  }
});
child.once('error', () => stop(new Error('TURN_SPAWN_ERROR')));
child.once('spawn', async () => {
  try {
    await request('initialize', { clientInfo: { name: 'speccontrol_o1_probe', title: 'SpecControl O1 Probe', version: '0.1.0' },
      capabilities: { experimentalApi: true } });
    send({ method: 'initialized', params: {} });
    const started = await request('thread/start', { cwd, model, approvalPolicy: 'never', permissions: ':read-only',
      serviceName: 'speccontrol_o1_probe' });
    threadId = started.thread.id;
    const prompt = mode === 'complete'
      ? 'Read input.txt using only a read-only local filesystem tool or read-only local command. Do not access the network, modify files, or perform other actions. Return only JSON with key canary and the exact file content as its value.'
      : 'Carefully analyze input.txt and wait while reasoning about each character. Do not run commands, call tools, access the network, or modify files. Return JSON only when done.';
    const turn = await request('turn/start', { threadId, input: [{ type: 'text', text: prompt }], cwd,
      approvalPolicy: 'never', summary: 'concise',
      outputSchema: { type: 'object', properties: { canary: { type: 'string' } },
        required: ['canary'], additionalProperties: false } });
    turnId = turn.turn.id;
  } catch (error) { stop(error); }
});
child.once('close', (code) => {
  clearTimeout(timeout);
  if (!result) result = { error: 'TURN_INCOMPLETE', processExitCode: code };
  else result.processExitCode = code;
  console.log(JSON.stringify(result, null, 2));
  if (result.error || !result.inputUnchanged || result.processExitCode !== 0 ||
      (mode === 'complete' && (result.turnStatus !== 'completed' || result.outputValid !== true)) ||
      (mode === 'interrupt' && result.turnStatus !== 'interrupted')) process.exitCode = 1;
});
