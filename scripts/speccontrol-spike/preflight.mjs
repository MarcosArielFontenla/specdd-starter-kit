import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// O1 transport probe only. Never starts threads, turns, commands, MCP or login.
// Account responses remain in memory; stdout contains only the auth mode.
export function probe({ executable, cwd, env = process.env, timeoutMs = 15000, maxBytes = 262144 }) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ['app-server', '--stdio'], {
      cwd, env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    });
    let buffer = '', bytes = 0, phase = 'initialize', result, failure;
    let closed = false;
    const stop = (error) => {
      failure ??= error;
      child.stdin.end();
      child.kill(); // Only this owned, no-turn app-server process; not a process-tree sandbox.
    };
    const timer = setTimeout(() => stop(new Error('PROBE_TIMEOUT')), timeoutMs);
    const send = (message) => child.stdin.write(JSON.stringify(message) + '\n');
    child.stdin.on('error', () => stop(new Error('PROBE_STDIN_ERROR')));
    child.once('error', () => { clearTimeout(timer); reject(new Error('PROBE_SPAWN_ERROR')); });
    child.stderr.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) stop(new Error('PROBE_OUTPUT_LIMIT'));
    });
    child.stdout.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) return stop(new Error('PROBE_OUTPUT_LIMIT'));
      buffer += chunk.toString('utf8');
      for (let end; (end = buffer.indexOf('\n')) >= 0;) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        let message;
        try { message = JSON.parse(line); } catch { stop(new Error('PROBE_INVALID_JSON')); return; }
        if (message.method && message.id !== undefined) {
          // Do not grant any server-initiated action during discovery.
          send({ id: message.id, error: { code: -32601, message: 'Unsupported by read-only probe' } });
          continue;
        }
        if (message.id === 1 && phase === 'initialize') {
          if (message.error || !message.result) return stop(new Error('PROBE_INITIALIZE_FAILED'));
          phase = 'account';
          send({ method: 'initialized', params: {} });
          send({ id: 2, method: 'account/read', params: { refreshToken: false } });
        } else if (message.id === 2 && phase === 'account') {
          if (message.error || !message.result) return stop(new Error('PROBE_ACCOUNT_FAILED'));
          const type = message.result.account?.type ?? null;
          const known = ['chatgpt', 'apiKey', 'apikey', 'amazonBedrock'];
          result = { initialized: true, authMode: known.includes(type) ? type : null,
            inferenceStarted: false, sandboxVerified: false };
          phase = 'done';
          clearTimeout(timer);
          child.stdin.end();
          shutdownTimer = setTimeout(() => stop(new Error('PROBE_SHUTDOWN_TIMEOUT')), 3000);
        }
      }
    });
    let shutdownTimer;
    child.once('close', (code) => {
      closed = true;
      clearTimeout(timer); clearTimeout(shutdownTimer);
      if (failure) reject(failure);
      else if (!result || code !== 0) reject(new Error('PROBE_INCOMPLETE'));
      else resolve({ ...result, processExitConfirmed: closed });
    });
    child.once('spawn', () => send({ id: 1, method: 'initialize', params: {
      clientInfo: { name: 'speccontrol_o1_probe', version: '0.1.0' },
    } }));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const executable = process.argv[2];
  if (!executable) throw new Error('Pass the explicitly resolved Codex executable path');
  // Keep host auth discovery available but do not forward arbitrary credential env vars.
  const keys = ['SystemRoot', 'WINDIR', 'PATH', 'PATHEXT', 'USERPROFILE', 'APPDATA',
    'LOCALAPPDATA', 'TEMP', 'TMP', 'HOME'];
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    keys.some((allowed) => allowed.toLowerCase() === key.toLowerCase())));
  try { console.log(JSON.stringify(await probe({ executable, cwd: process.cwd(), env }), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
