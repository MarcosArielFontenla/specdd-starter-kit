import { lstat, mkdir, open, link, unlink, readdir } from 'node:fs/promises';
import { resolve, dirname, parse, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { assertGraphBinding, summarizeRun, MAX_RUN_BYTES, MAX_EVENTS } from './index.js';
import type { RunEvent } from './types.js';
import type { ControlPlaneDefinition } from '@specdd/control-plane-model';

function runName(runId: string): string {
  if (typeof runId !== 'string' || runId.length > 128 || !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(runId)) throw new Error('Unsafe run ID');
  return 'run-' + runId + '.jsonl';
}
// Reject links in every existing ancestor. This is not a hostile multi-user sandbox.
async function noLinks(path: string): Promise<void> {
  let current = resolve(path);
  while (true) {
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error('Symbolic links are not allowed'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}
async function directory(root: string, create = false): Promise<string> {
  const path = resolve(root);
  if (path === parse(path).root) throw new Error('A dedicated run directory is required');
  await noLinks(path);
  if (create) await mkdir(path, { recursive: true });
  if (!(await lstat(path)).isDirectory()) throw new Error('Expected run directory');
  return path;
}
export function encodeRun(events: RunEvent[]): string {
  summarizeRun(events);
  const text = events.map(e => JSON.stringify(e)).join('\n') + '\n';
  if (Buffer.byteLength(text) > MAX_RUN_BYTES) throw new Error('Run size limit');
  return text;
}
export function parseRun(text: string): RunEvent[] {
  if (typeof text !== 'string' || Buffer.byteLength(text) > MAX_RUN_BYTES || !text.endsWith('\n')) throw new Error('Invalid or truncated JSONL export');
  const lines = text.slice(0, -1).split('\n');
  if (lines.length > MAX_EVENTS || lines.some(line => !line.trim())) throw new Error('Invalid JSONL event count/blank line');
  const events: unknown = lines.map(line => JSON.parse(line));
  summarizeRun(events);
  return events as RunEvent[];
}
export async function readBoundedFile(path: string): Promise<string> {
  await noLinks(path);
  const file = await open(path, 'r');
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > MAX_RUN_BYTES) throw new Error('Not a bounded regular file');
    const buffer = Buffer.alloc(MAX_RUN_BYTES + 1);
    let count = 0;
    while (count < buffer.length) {
      const { bytesRead } = await file.read(buffer, count, buffer.length - count, null);
      if (!bytesRead) break;
      count += bytesRead;
    }
    if (count > MAX_RUN_BYTES) throw new Error('Run size limit');
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, count));
  } finally { await file.close(); }
}
/** Publish a reviewed export once; atomic link never replaces an existing target. */
export async function writeRun(root: string, events: RunEvent[], definition: ControlPlaneDefinition): Promise<string> {
  assertGraphBinding(events, definition);
  const text = encodeRun(events);
  const name = runName(events[0]!.runId);
  const path = await directory(root, true);
  const target = join(path, name);
  const temporary = join(path, '.' + name + '.' + randomUUID() + '.tmp');
  const file = await open(temporary, 'wx', 0o600);
  try {
    try { await file.writeFile(text, 'utf8'); await file.sync(); }
    finally { await file.close(); }
    await link(temporary, target);
  } finally { await unlink(temporary); }
  return target;
}
export async function readRun(root: string, runId: string, definition?: ControlPlaneDefinition): Promise<RunEvent[]> {
  const name = runName(runId);
  const path = await directory(root);
  const events = parseRun(await readBoundedFile(join(path, name)));
  if (events[0]!.runId !== runId) throw new Error('Filename/run identity mismatch');
  if (definition) assertGraphBinding(events, definition);
  return events;
}
export async function listRuns(root: string): Promise<ReturnType<typeof summarizeRun>[]> {
  const path = await directory(root);
  const files = await readdir(path, { withFileTypes: true });
  if (files.length > MAX_EVENTS) throw new Error('History directory entry limit');
  const result: ReturnType<typeof summarizeRun>[] = [];
  let totalBytes = 0;
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!file.name.startsWith('run-') || !file.name.endsWith('.jsonl')) continue;
    if (!file.isFile() || file.isSymbolicLink()) throw new Error('Invalid history entry');
    const events = await readRun(path, file.name.slice(4, -6));
    totalBytes += Buffer.byteLength(encodeRun(events));
    if (totalBytes > 4 * MAX_RUN_BYTES) throw new Error('History listing byte limit; inspect individual runs');
    result.push(summarizeRun(events));
  }
  return result;
}
