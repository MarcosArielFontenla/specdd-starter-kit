import { closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, parse, resolve } from 'node:path';
import { ControlStore, CodexDeveloper, CodexReadOnlyPlanner, CodexReviewer, O3ExecutionCoordinator,
  GitPublicationInspector, LocalGitPublisher, O4PublicationCoordinator, createLocalServer, executionBinding, pathsOverlap,
  projectRoot, publicationBinding, safeId, BoundedGitHubCliTransport, GitHubBranchPreparer, GitHubCliGateway,
  GitHubDraftPublisher, GitHubGitPusher } from '../dist/index.js';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  if (!process.argv[i]?.startsWith('--') || process.argv[i + 1] === undefined) usage();
  args.set(process.argv[i], process.argv[i + 1]);
}
const projectId = safeId(required('--project-id'), 'project');
const root = projectRoot(required('--project-root'));
const stateDir = resolve(required('--state-dir'));
if (stateDir === parse(stateDir).root || pathsOverlap(stateDir, root)) throw new Error('NON_OVERLAPPING_STATE_DIRECTORY_REQUIRED');
const executable = resolve(required('--codex'));
if (!lstatSync(executable).isFile()) throw new Error('CODEX_EXECUTABLE_NOT_FILE');
const port = args.has('--port') ? Number(args.get('--port')) : 4310;
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('INVALID_PORT');
mkdirSync(stateDir, { recursive: true });
const windowsSandboxMode = args.get('--windows-sandbox');
if (windowsSandboxMode && !['elevated', 'unelevated'].includes(windowsSandboxMode)) throw new Error('INVALID_WINDOWS_SANDBOX_MODE');
if (process.platform === 'win32' && args.has('--execution-binding') && !windowsSandboxMode) throw new Error('WINDOWS_SANDBOX_MODE_REQUIRED_FOR_O3');
if (args.has('--publication-binding') !== args.has('--git')) throw new Error('PUBLICATION_BINDING_AND_GIT_REQUIRED_TOGETHER');
if (args.has('--publication-binding') && !args.has('--execution-binding')) throw new Error('O4_REQUIRES_O3_EXECUTION_BINDING');
if (args.has('--local-publication-root') && !args.has('--publication-binding')) throw new Error('LOCAL_PUBLISHER_REQUIRES_PUBLICATION_BINDING');
if (args.has('--github-cli') !== args.has('--github-publication-root')) throw new Error('GITHUB_CLI_AND_PUBLICATION_ROOT_REQUIRED_TOGETHER');
if (args.has('--github-cli') && !args.has('--publication-binding')) throw new Error('GITHUB_PUBLISHER_REQUIRES_PUBLICATION_BINDING');
if (args.has('--github-cli') && args.has('--local-publication-root')) throw new Error('ONLY_ONE_PUBLICATION_PROVIDER_ALLOWED');

const lockPath = resolve(stateDir, 'service.lock');
const lockId = randomUUID();
let fd;
try { fd = openSync(lockPath, 'wx', 0o600); }
catch (error) {
  if (error.code !== 'EEXIST') throw error;
  throw new Error('STATE_LOCK_EXISTS; inspect the recorded PID and recover explicitly after proving no service is active');
}
try { writeFileSync(fd, JSON.stringify({ schemaVersion: 1, lockId, pid: process.pid, executable: basename(process.execPath) }) + '\n'); }
catch (error) { closeSync(fd); try { unlinkSync(lockPath); } catch {} throw error; }
closeSync(fd);

let store, service, execution, publication, publisherKind = 'disabled', interrupted = 0, interruptedExecutions = 0, interruptedPublications = 0;
let closing = false;
async function close() {
  if (closing) return; closing = true;
  try { if (service) await service.close(); } finally {
    if (store) store.close();
    if (existsSync(lockPath)) {
      const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
      if (lock.lockId !== lockId || lock.pid !== process.pid) throw new Error('STATE_LOCK_OWNERSHIP_CHANGED');
      unlinkSync(lockPath);
    }
  }
}
process.once('SIGINT', () => void close().then(() => process.exit(0)));
process.once('SIGTERM', () => void close().then(() => process.exit(0)));
try {
  store = new ControlStore(resolve(stateDir, 'state.sqlite'));
  interrupted = store.reconcileInterruptedPlanning();
  interruptedExecutions = store.reconcileInterruptedExecutions();
  interruptedPublications = store.reconcileInterruptedPublications();
  store.registerProject(projectId, root);
  const planner = new CodexReadOnlyPlanner({ executable, ...(windowsSandboxMode ? { windowsSandboxMode } : {}) });
  if (args.has('--execution-binding')) {
    const bindingPath = realpathFile(required('--execution-binding'));
    const raw = JSON.parse(readFileSync(bindingPath, 'utf8'));
    if (Array.isArray(raw.checks)) raw.checks = raw.checks.map(check => ({ ...check,
      executable: check.executable === '$NODE' ? process.execPath : check.executable }));
    const binding = executionBinding(raw);
    execution = new O3ExecutionCoordinator({ store, binding,
      developer: new CodexDeveloper(executable, binding, windowsSandboxMode), reviewer: new CodexReviewer(executable, binding, windowsSandboxMode) });
  }
  if (args.has('--publication-binding')) {
    const raw = JSON.parse(readFileSync(realpathFile(required('--publication-binding')), 'utf8'));
    const binding = publicationBinding(raw), gitExecutable = realpathFile(required('--git'));
    let publisher;
    if (args.has('--local-publication-root')) {
      if (binding.provider !== 'local-git') throw new Error('LOCAL_PUBLISHER_REQUIRES_LOCAL_GIT_BINDING');
      publisher = new LocalGitPublisher({ executable: gitExecutable, root: resolve(required('--local-publication-root')) });
      publisherKind = 'local-git';
    }
    if (args.has('--github-cli')) {
      if (binding.provider !== 'github') throw new Error('GITHUB_PUBLISHER_REQUIRES_GITHUB_BINDING');
      const ghExecutable = realpathFile(required('--github-cli'));
      const pusher = new GitHubGitPusher({ executable: gitExecutable });
      const branches = new GitHubBranchPreparer({ executable: gitExecutable, root: resolve(required('--github-publication-root')), pusher });
      publisher = new GitHubDraftPublisher({ gateway: new GitHubCliGateway(new BoundedGitHubCliTransport({ executable: ghExecutable })), branches });
      publisherKind = 'github';
    }
    publication = new O4PublicationCoordinator({ store, binding, inspector: new GitPublicationInspector(gitExecutable), ...(publisher ? { publisher } : {}) });
  }
  service = createLocalServer({ store, planner, projectId, port, ...(execution ? { execution } : {}), ...(publication ? { publication } : {}) });
  const address = await service.listen();
  console.log(`SpecControl local: ${address.bootstrapUrl}`);
  console.log(`Registered project: ${projectId}; O3: ${execution ? 'enabled' : 'disabled'}; O4-A: ${publication ? 'enabled' : 'disabled'}; O4 publisher: ${publisherKind}; interrupted planning reconciled: ${interrupted}; interrupted executions reconciled: ${interruptedExecutions}; interrupted publications reconciled: ${interruptedPublications}`);
} catch (error) { await close(); throw error; }

function required(name) { const value = args.get(name); if (!value) usage(); return value; }
function realpathFile(value) { const path = resolve(value); if (!lstatSync(path).isFile()) throw new Error('EXPECTED_FILE'); return path; }
function usage() { throw new Error('Usage: --project-id ID --project-root PATH --state-dir NON_OVERLAPPING_PATH --codex ABSOLUTE_PATH [--execution-binding PATH] [--windows-sandbox elevated|unelevated] [--publication-binding PATH --git ABSOLUTE_PATH [--local-publication-root PATH | --github-cli ABSOLUTE_PATH --github-publication-root PATH]] [--port PORT]'); }
