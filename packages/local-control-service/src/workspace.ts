import { lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, parse, relative, resolve, sep } from 'node:path';
import type { FileFingerprint, WorkspaceDiff } from './types.js';
import { canonicalJson, safeId, sha256 } from './validation.js';

const excludedDirectories = new Set(['.git', '.specdd-control', 'node_modules', 'bin', 'dist', 'build', 'coverage']);
const excludedFiles = /^(?:\.env(?:\..+)?|.*\.(?:pem|pfx|p12|key))$/i;

export class IsolatedWorkspace {
  readonly root: string;
  readonly maxFiles: number;
  readonly maxBytes: number;
  constructor(root: string, limits: { maxSourceFiles: number; maxSourceBytes: number }) {
    const absolute = resolve(root);
    if (absolute === parse(absolute).root) throw new Error('DEDICATED_WORKSPACE_ROOT_REQUIRED');
    mkdirSync(absolute, { recursive: true });
    this.root = realpathSync(absolute); this.maxFiles = limits.maxSourceFiles; this.maxBytes = limits.maxSourceBytes;
  }
  prepare(runIdValue: string, sourceRootValue: string): { executionRoot: string; worktreeRoot: string; baselineSha256: string } {
    const runId = safeId(runIdValue, 'run'), sourceRoot = realpathSync(sourceRootValue);
    const executionRoot = resolve(this.root, runId), baselineRoot = resolve(executionRoot, 'baseline'), worktreeRoot = resolve(executionRoot, 'worktree');
    if (exists(executionRoot)) throw new Error('WORKSPACE_ALREADY_EXISTS');
    mkdirSync(baselineRoot, { recursive: true }); mkdirSync(worktreeRoot, { recursive: true });
    try {
      const source = snapshot(sourceRoot, this.maxFiles, this.maxBytes, true);
      for (const file of source.files) {
        const bytes = readFileSync(resolve(sourceRoot, native(file.path)));
        if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) throw new Error('WORKSPACE_SOURCE_CHANGED');
        for (const targetRoot of [baselineRoot, worktreeRoot]) {
          const target = resolve(targetRoot, native(file.path));
          mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, bytes, { flag: 'wx' });
        }
      }
      return { executionRoot, worktreeRoot, baselineSha256: source.sha256 };
    } catch (error) {
      rmSync(executionRoot, { recursive: true, force: true }); throw error;
    }
  }
  diff(executionRootValue: string): WorkspaceDiff {
    const executionRoot = inside(this.root, realpathSync(executionRootValue));
    const before = snapshot(resolve(executionRoot, 'baseline'), this.maxFiles, this.maxBytes, false);
    const after = snapshot(resolve(executionRoot, 'worktree'), this.maxFiles, this.maxBytes, false);
    const old = new Map(before.files.map(file => [file.path, file])), current = new Map(after.files.map(file => [file.path, file]));
    const added: FileFingerprint[] = [], modified: Array<FileFingerprint & { beforeSha256: string }> = [], deleted: Array<{ path: string; beforeSha256: string }> = [];
    for (const [path, file] of current) { const prior = old.get(path); if (!prior) added.push(file); else if (prior.sha256 !== file.sha256) modified.push({ ...file, beforeSha256: prior.sha256 }); }
    for (const [path, file] of old) if (!current.has(path)) deleted.push({ path, beforeSha256: file.sha256 });
    return { added, modified, deleted };
  }
}

function snapshot(rootValue: string, maxFiles: number, maxBytes: number, filterSecrets: boolean): { files: FileFingerprint[]; sha256: string } {
  const root = realpathSync(rootValue), files: FileFingerprint[] = []; let total = 0;
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) throw new Error('WORKSPACE_LINK_NOT_ALLOWED');
      const absolute = resolve(directory, entry.name), relativePath = relative(root, absolute).split(sep).join('/');
      if (entry.isDirectory()) {
        if (excludedDirectories.has(entry.name)) {
          if (!filterSecrets && readdirSync(absolute).length > 0) throw new Error('WORKSPACE_EXCLUDED_PATH_CREATED');
        }
        else visit(absolute);
        continue;
      }
      if (!entry.isFile()) throw new Error('WORKSPACE_SPECIAL_FILE_NOT_ALLOWED');
      if (excludedFiles.test(basename(entry.name))) { if (!filterSecrets) throw new Error('WORKSPACE_EXCLUDED_PATH_CREATED'); continue; }
      const stat = lstatSync(absolute); total += stat.size;
      if (++files.length > maxFiles || total > maxBytes) throw new Error('WORKSPACE_SOURCE_LIMIT');
      files[files.length - 1] = { path: relativePath, bytes: stat.size, sha256: sha256(readFileSync(absolute)) };
    }
  };
  visit(root);
  return { files, sha256: sha256(canonicalJson(files)) };
}
function native(path: string): string { return path.split('/').join(sep); }
function inside(root: string, candidate: string): string {
  const prefix = root.endsWith(sep) ? root : root + sep;
  if (!candidate.startsWith(prefix)) throw new Error('WORKSPACE_OUTSIDE_ROOT'); return candidate;
}
function exists(path: string): boolean { try { lstatSync(path); return true; } catch { return false; } }
