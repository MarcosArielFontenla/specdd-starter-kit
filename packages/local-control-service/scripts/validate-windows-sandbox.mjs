import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const [executable, allowedRootValue, deniedRootValue, mode] = process.argv.slice(2);
if (!executable || !allowedRootValue || !deniedRootValue || !['elevated', 'unelevated'].includes(mode))
  throw new Error('Usage: validate-windows-sandbox.mjs CODEX ALLOWED_ROOT DENIED_ROOT elevated|unelevated');
const allowedRoot = resolve(allowedRootValue), deniedRoot = resolve(deniedRootValue);
const allowedTarget = resolve(allowedRoot, 'allowed.txt'), deniedTarget = resolve(deniedRoot, 'denied.txt');
if (allowedRoot === deniedRoot || allowedTarget === deniedTarget) throw new Error('DISTINCT_VALIDATION_ROOTS_REQUIRED');

const child = spawn(executable, ['app-server', '--stdio', '-c', 'mcp_servers={}', '-c', 'analytics.enabled=false',
  '-c', `windows.sandbox="${mode}"`],
  { cwd: allowedRoot, env: process.env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
let buffer = '', nextId = 1;
const pending = new Map();
child.stdout.on('data', chunk => {
  buffer += chunk.toString('utf8');
  for (let end; (end = buffer.indexOf('\n')) >= 0;) {
    const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
    const message = JSON.parse(line);
    if (message.id !== undefined && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  }
});
function request(method, params) {
  const id = nextId++; child.stdin.write(JSON.stringify({ id, method, params }) + '\n');
  return new Promise(resolveRequest => pending.set(id, resolveRequest));
}
const writeCommand = target => [process.execPath, '-e', "require('node:fs').writeFileSync(process.argv[1], 'sandbox-probe')", target];
try {
  const initialized = await request('initialize', { clientInfo: { name: 'speccontrol_sandbox_validation', title: 'SpecControl Sandbox Validation', version: '0.3.0' }, capabilities: { experimentalApi: true } });
  if (initialized.error) throw new Error(initialized.error.message);
  child.stdin.write(JSON.stringify({ method: 'initialized', params: {} }) + '\n');
  const sandboxPolicy = { type: 'workspaceWrite', networkAccess: false };
  const allowed = await request('command/exec', { command: writeCommand(allowedTarget), cwd: allowedRoot, sandboxPolicy, timeoutMs: 10000 });
  const denied = await request('command/exec', { command: writeCommand(deniedTarget), cwd: allowedRoot, sandboxPolicy, timeoutMs: 10000 });
  const result = { allowedCreated: existsSync(allowedTarget), deniedCreated: existsSync(deniedTarget),
    allowedExitCode: allowed.result?.exitCode ?? null, deniedExitCode: denied.result?.exitCode ?? null,
    allowedError: allowed.error?.message ?? null, deniedError: denied.error?.message ?? null };
  console.log(JSON.stringify(result));
  if (!result.allowedCreated || result.deniedCreated) process.exitCode = 1;
} finally {
  child.stdin.end(); child.kill();
}
