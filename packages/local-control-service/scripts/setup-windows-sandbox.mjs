import { spawn } from 'node:child_process';

const executable = process.argv[2];
const mode = process.argv[3];
if (!executable || !['elevated', 'unelevated'].includes(mode))
  throw new Error('Usage: node setup-windows-sandbox.mjs ABSOLUTE_CODEX_PATH elevated|unelevated');

const child = spawn(executable, ['app-server', '--stdio', '-c', 'mcp_servers={}', '-c', 'analytics.enabled=false',
  '-c', `windows.sandbox="${mode}"`],
  { env: process.env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
let buffer = '', stderr = '', nextId = 1, finished = false;
const pending = new Map();
const completion = new Promise((resolve, reject) => {
  child.stdout.on('data', chunk => {
    buffer += chunk.toString('utf8');
    for (let end; (end = buffer.indexOf('\n')) >= 0;) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
      let message;
      try { message = JSON.parse(line); } catch { reject(new Error('APP_SERVER_PROTOCOL_JSON')); continue; }
      if (message.id !== undefined && pending.has(message.id)) {
        pending.get(message.id)(message); pending.delete(message.id);
      }
      if (message.method === 'windowsSandbox/setupCompleted') resolve(message.params);
    }
  });
});
child.stderr.on('data', chunk => { if (stderr.length < 65536) stderr += chunk.toString('utf8'); });
child.once('error', () => { if (!finished) process.exitCode = 1; });

function request(method, params) {
  const id = nextId++; child.stdin.write(JSON.stringify({ id, method, params }) + '\n');
  return new Promise(resolve => pending.set(id, resolve));
}

let timeoutId;
const timeout = new Promise((_, reject) => { timeoutId = setTimeout(() => reject(new Error('WINDOWS_SANDBOX_SETUP_TIMEOUT')), 180000); });
try {
  const initialized = await request('initialize', { clientInfo: { name: 'speccontrol_sandbox_setup', title: 'SpecControl Sandbox Setup', version: '0.3.0' }, capabilities: { experimentalApi: true } });
  if (initialized.error) throw new Error(`INITIALIZE_FAILED: ${initialized.error.message}`);
  child.stdin.write(JSON.stringify({ method: 'initialized', params: {} }) + '\n');
  const started = await request('windowsSandbox/setupStart', { mode });
  if (started.error) throw new Error(`SETUP_START_FAILED: ${started.error.message}`);
  console.log(JSON.stringify({ event: 'setup-started', mode, result: started.result }));
  const result = await Promise.race([completion, timeout]);
  console.log(JSON.stringify({ event: 'setup-completed', ...result }));
  if (!result?.success) process.exitCode = 1;
} catch (error) {
  process.exitCode = 1;
  console.error(JSON.stringify({ event: 'setup-failed', message: error.message, stderr: stderr.slice(-4096) }));
} finally {
  finished = true; clearTimeout(timeoutId); child.stdin.end(); child.kill();
}
