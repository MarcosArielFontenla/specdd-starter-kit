import { spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const executable = process.argv[2];
if (!executable) throw new Error('Pass the resolved Codex executable path');
const cwd = realpathSync(fileURLToPath(new URL('./fixtures/runtime', import.meta.url)));
const child = spawn(executable, ['app-server', '--stdio', '-c', 'mcp_servers={}',
  '-c', 'analytics.enabled=false'], { cwd, shell: false, windowsHide: true,
  stdio: ['pipe', 'pipe', 'ignore'] });
let buffer = '', nextId = 1;
const pending = new Map();
const timer = setTimeout(() => { child.stdin.end(); child.kill(); }, 15000);
const send = (value) => child.stdin.write(JSON.stringify(value) + '\n');
const request = (method, params) => new Promise((resolve, reject) => {
  const id = nextId++; pending.set(id, { resolve, reject }); send({ id, method, params });
});
child.stdout.on('data', (chunk) => {
  buffer += chunk;
  for (let end; (end = buffer.indexOf('\n')) >= 0;) {
    const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
    let message;
    try { message = JSON.parse(line); } catch { continue; }
    if (message.method && message.id !== undefined) {
      send({ id: message.id, error: { code: -32601, message: 'Denied by O1 probe' } }); continue;
    }
    const waiter = pending.get(message.id);
    if (!waiter) continue;
    pending.delete(message.id);
    message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result);
  }
});
child.once('spawn', async () => {
  try {
    await request('initialize', { clientInfo: { name: 'speccontrol_o1_probe', version: '0.1.0' },
      capabilities: { experimentalApi: true } });
    send({ method: 'initialized', params: {} });
    const [profileResult, modelResult] = await Promise.all([
      request('permissionProfile/list', { cwd, limit: 100 }),
      request('model/list', { limit: 100 }),
    ]);
    const rows = profileResult.data ?? profileResult.profiles ?? [];
    const models = modelResult.data ?? modelResult.models ?? [];
    console.log(JSON.stringify({ profiles: rows.map((row) => ({ id: row.id, name: row.name ?? null,
      allowed: row.allowed ?? row.isAllowed ?? null, sandbox: row.sandbox ?? row.sandboxMode ?? null })),
      models: models.filter((row) => !row.hidden).map((row) => row.id) }, null, 2));
  } catch (error) { console.error(String(error.message).slice(0, 240)); process.exitCode = 1; }
  finally { clearTimeout(timer); child.stdin.end(); }
});
