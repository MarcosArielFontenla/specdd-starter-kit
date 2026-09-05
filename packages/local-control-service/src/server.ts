import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { ControlStore } from './store.js';
import type { Planner } from './types.js';
import type { O3ExecutionCoordinator } from './execution.js';
import type { O4PublicationCoordinator } from './publication.js';
import { css, js } from './ui-assets.js';

export interface LocalServerOptions { store: ControlStore; planner: Planner; projectId: string; execution?: O3ExecutionCoordinator; publication?: O4PublicationCoordinator; host?: string; port?: number }
export function createLocalServer(options: LocalServerOptions) {
  const host = options.host ?? '127.0.0.1';
  if (host !== '127.0.0.1') throw new Error('LOOPBACK_IPV4_REQUIRED');
  const session = randomBytes(32).toString('hex'), csrf = randomBytes(32).toString('hex');
  let bootstrapAvailable = true, origin = '';
  const controllers = new Map<string, AbortController>();
  const planning = new Set<Promise<unknown>>();
  const server = createServer(async (req, res) => {
    secure(res);
    const expectedHost = origin.slice('http://'.length);
    if (req.headers.host !== expectedHost) return response(res, 421, { error: 'INVALID_HOST' });
    const url = new URL(req.url ?? '/', origin);
    if (req.method === 'GET' && url.pathname === '/session') {
      const supplied = url.searchParams.get('token') ?? '';
      if (!bootstrapAvailable || !equal(supplied, session)) return response(res, 401, { error: 'INVALID_SESSION_BOOTSTRAP' });
      bootstrapAvailable = false;
      res.statusCode = 303;
      res.setHeader('Set-Cookie', `speccontrol_session=${session}; HttpOnly; SameSite=Strict; Path=/`);
      res.setHeader('Location', '/speccontrol'); res.end(); return;
    }
    if (!authenticated(req, session)) return response(res, 401, { error: 'UNAUTHORIZED' });
    if (req.method === 'GET' && url.pathname === '/ui.css') { res.statusCode=200; res.setHeader('Content-Type','text/css; charset=utf-8'); res.end(css); return; }
    if (req.method === 'GET' && url.pathname === '/ui.js') { res.statusCode=200; res.setHeader('Content-Type','text/javascript; charset=utf-8'); res.end(js); return; }
    if (req.method === 'GET' && url.pathname === '/speccontrol') return html(res, page(options.projectId, csrf, Boolean(options.publication),
      Boolean(options.publication?.canPublish), Boolean(options.publication?.canReconcile)));
    if (req.method === 'GET' && url.pathname === '/api/runs') return response(res, 200,
      { runs: options.store.runs(options.projectId).map(run => ({ ...run, execution: options.store.execution(run.id), previousAttempts: options.store.executionAttempts(run.id), publication: options.store.publication(run.id) })) });
    const match = /^\/api\/runs\/([a-z0-9._-]+)$/.exec(url.pathname);
    if (req.method === 'GET' && match) {
      const run = options.store.run(match[1]!); return run ? response(res, 200, { run: { ...run, execution: options.store.execution(run.id), previousAttempts: options.store.executionAttempts(run.id), publication: options.store.publication(run.id) } }) : response(res, 404, { error: 'RUN_NOT_FOUND' });
    }
    if (req.method !== 'POST') return response(res, 404, { error: 'NOT_FOUND' });
    if (req.headers.origin !== origin || req.headers['x-speccontrol-csrf'] !== csrf) return response(res, 403, { error: 'CSRF_REJECTED' });
    let body: any;
    try { body = await jsonBody(req); } catch (error) { return response(res, 400, { error: (error as Error).message }); }
    try {
      if (url.pathname === '/api/runs') {
        const run = options.store.createRun(options.projectId, body, `run-${randomUUID().toLowerCase()}`);
        const controller = new AbortController(); controllers.set(run.id, controller);
        const work = options.planner.plan({ projectRoot: options.store.project(options.projectId)!.root, task: run.task, signal: controller.signal })
          .then(result => options.store.completePlanning(run.id, result.artifact, result.receipt))
          .catch(error => { try { options.store.planningFailed(run.id, plannerErrorCode(error)); } catch {} })
          .finally(() => { controllers.delete(run.id); planning.delete(work); });
        planning.add(work);
        return response(res, 202, { run });
      }
      const cancel = /^\/api\/runs\/([a-z0-9._-]+)\/cancel$/.exec(url.pathname);
      if (cancel) {
        const controller = controllers.get(cancel[1]!);
        if (!controller) throw new Error('RUN_NOT_CANCELLABLE');
        controller.abort();
        return response(res, 200, { run: options.store.planningFailed(cancel[1]!, 'OPERATOR_CANCELLED') });
      }
      const approve = /^\/api\/runs\/([a-z0-9._-]+)\/approve$/.exec(url.pathname);
      if (approve) return response(res, 200, { run: options.store.approve(approve[1]!, body.artifactSha256) });
      const reject = /^\/api\/runs\/([a-z0-9._-]+)\/reject$/.exec(url.pathname);
      if (reject) return response(res, 200, { run: options.store.reject(reject[1]!) });
      const execute = /^\/api\/runs\/([a-z0-9._-]+)\/execute$/.exec(url.pathname);
      if (execute) {
        if (!options.execution) throw new Error('O3_EXECUTION_NOT_CONFIGURED');
        return response(res, 202, { execution: options.execution.start(execute[1]!) });
      }
      const cancelExecution = /^\/api\/runs\/([a-z0-9._-]+)\/cancel-execution$/.exec(url.pathname);
      if (cancelExecution) {
        if (!options.execution) throw new Error('O3_EXECUTION_NOT_CONFIGURED');
        options.execution.cancel(cancelExecution[1]!);
        return response(res, 200, { execution: options.store.execution(cancelExecution[1]!) });
      }
      const retryExecution = /^\/api\/runs\/([a-z0-9._-]+)\/retry-execution$/.exec(url.pathname);
      if (retryExecution) {
        if (!options.execution) throw new Error('O3_EXECUTION_NOT_CONFIGURED');
        return response(res, 202, { execution: options.execution.retry(retryExecution[1]!) });
      }
      const preparePublication = /^\/api\/runs\/([a-z0-9._-]+)\/prepare-publication$/.exec(url.pathname);
      if (preparePublication) {
        if (!options.publication) throw new Error('O4_PUBLICATION_NOT_CONFIGURED');
        return response(res, 201, { publication: await options.publication.prepare(preparePublication[1]!) });
      }
      const approvePublication = /^\/api\/runs\/([a-z0-9._-]+)\/approve-publication$/.exec(url.pathname);
      if (approvePublication) {
        if (!options.publication) throw new Error('O4_PUBLICATION_NOT_CONFIGURED');
        return response(res, 200, { publication: await options.publication.approve(approvePublication[1]!, body.subjectSha256) });
      }
      const rejectPublication = /^\/api\/runs\/([a-z0-9._-]+)\/reject-publication$/.exec(url.pathname);
      if (rejectPublication) {
        if (!options.publication) throw new Error('O4_PUBLICATION_NOT_CONFIGURED');
        return response(res, 200, { publication: options.publication.reject(rejectPublication[1]!) });
      }
      const publish = /^\/api\/runs\/([a-z0-9._-]+)\/publish$/.exec(url.pathname);
      if (publish && options.publication?.canPublish) {
        return response(res, 202, { publication: await options.publication.publish(publish[1]!) });
      }
      const reconcilePublication = /^\/api\/runs\/([a-z0-9._-]+)\/reconcile-publication$/.exec(url.pathname);
      if (reconcilePublication && options.publication?.canReconcile) {
        return response(res, 200, { publication: await options.publication.reconcile(reconcilePublication[1]!) });
      }
      return response(res, 404, { error: 'NOT_FOUND' });
    } catch (error) { return response(res, 409, { error: (error as Error).message }); }
  });
  return {
    async listen() {
      await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(options.port ?? 0, host, resolve); });
      const address = server.address() as AddressInfo; origin = `http://${host}:${address.port}`;
      return { origin, bootstrapUrl: `${origin}/session?token=${session}` };
    },
    async close() {
      for (const controller of controllers.values()) controller.abort();
      await Promise.allSettled(planning);
      if (options.execution) await options.execution.close();
      if (options.publication) await options.publication.close();
      const closed = new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      server.closeAllConnections();
      await closed;
    },
  };
}

function plannerErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/^PLANNER_[A-Z0-9_]+$/.test(message)) return message;
  if (error instanceof SyntaxError) return 'PLANNER_ARTIFACT_JSON_INVALID';
  if (message.startsWith('INVALID_PLAN_')) return 'PLANNER_ARTIFACT_SCHEMA_INVALID';
  if (message.endsWith('_FAILED')) return 'PLANNER_PROTOCOL_REQUEST_FAILED';
  return 'PLANNER_FAILED';
}

function equal(a: string, b: string): boolean {
  const aa = Buffer.from(a), bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb);
}
function authenticated(req: IncomingMessage, token: string): boolean {
  return (req.headers.cookie ?? '').split(';').map(x => x.trim()).includes(`speccontrol_session=${token}`);
}
function secure(res: ServerResponse): void {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
}
function response(res: ServerResponse, status: number, value: unknown): void {
  res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value));
}
function html(res: ServerResponse, value: string): void {
  res.statusCode = 200; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(value);
}
async function jsonBody(req: IncomingMessage): Promise<unknown> {
  if (!(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) throw new Error('JSON_REQUIRED');
  let size = 0, text = '';
  for await (const chunk of req) { size += chunk.length; if (size > 65536) throw new Error('BODY_TOO_LARGE'); text += chunk.toString('utf8'); }
  try { return JSON.parse(text); } catch { throw new Error('INVALID_JSON'); }
}
function page(projectId: string, csrf: string, publicationEnabled: boolean, publishingEnabled = false, reconciliationEnabled = false): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>SpecControl Local</title><link rel="stylesheet" href="/ui.css"></head>
<body><main data-project-id="${projectId}" data-csrf="${csrf}" data-publication-enabled="${publicationEnabled}" data-publishing-enabled="${publishingEnabled}" data-reconciliation-enabled="${reconciliationEnabled}"><p class="eyebrow">SPEC DD · LOCAL CONTROL PLANE</p><h1>SpecControl</h1><p>Proyecto registrado: <code id="project"></code></p>
<section><h2>Nueva tarea</h2><label>Título<input id="title" maxlength="160"></label><label>Descripción<textarea id="description" maxlength="4000"></textarea></label><button id="start">Preparar spec y plan</button><p id="notice" role="status"></p></section>
<section><h2>Ejecuciones</h2><div id="runs"></div></section></main><script src="/ui.js"></script></body></html>`;
}
