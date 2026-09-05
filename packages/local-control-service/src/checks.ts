import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import type { CheckDefinition, CheckResult } from './types.js';
import { sha256 } from './validation.js';

export class StructuredCheckRunner {
  constructor(readonly definitions: CheckDefinition[]) {}
  async run(workspaceRoot: string, signal?: AbortSignal): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    for (const definition of this.definitions) {
      if (signal?.aborted) throw new Error('CHECKS_ABORTED');
      const result = await runCheck(definition, workspaceRoot, signal); results.push(result);
      if (result.status !== 'passed') break;
    }
    return results;
  }
}

async function runCheck(definition: CheckDefinition, cwd: string, signal?: AbortSignal): Promise<CheckResult> {
  const started = performance.now(); let bytes = 0, output = Buffer.alloc(0), timedOut = false, exceeded = false;
  const profileLocations = process.platform === 'win32'
    ? ['USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA']
    : ['HOME'];
  const allowed = ['SystemRoot', 'WINDIR', 'ComSpec', 'PATH', 'PATHEXT', 'TEMP', 'TMP', ...profileLocations];
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.some(x => x.toLowerCase() === key.toLowerCase())));
  try {
    const child = spawn(definition.executable, definition.args, { cwd, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const collect = (chunk: Buffer) => { bytes += chunk.length; if (bytes <= 1024 * 1024) output = Buffer.concat([output, chunk]); else { exceeded = true; child.kill(); } };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    const abort = () => child.kill(); signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, definition.timeoutMs);
    const outcome = await new Promise<{ code: number | null; error: boolean }>(resolve => {
      child.once('error', () => resolve({ code: null, error: true })); child.once('close', code => resolve({ code, error: false }));
    });
    clearTimeout(timer); signal?.removeEventListener('abort', abort);
    const status: CheckResult['status'] = outcome.error ? 'launch-failed' : timedOut ? 'timed-out' : outcome.code === 0 && !exceeded ? 'passed' : 'failed';
    return { id: definition.id, status, exitCode: outcome.code, durationMs: Math.round(performance.now() - started),
      outputSha256: sha256(output), outputBytes: bytes };
  } catch {
    return { id: definition.id, status: 'launch-failed', exitCode: null, durationMs: Math.round(performance.now() - started),
      outputSha256: sha256(output), outputBytes: bytes };
  }
}
