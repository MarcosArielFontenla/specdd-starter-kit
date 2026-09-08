import { createHash } from 'node:crypto';
import { isAbsolute, resolve, parse } from 'node:path';

// BA-only policy. No legacy sandbox/access fields and no global config writes.
export interface TextIsolation { mcpServerIds: string[]; pluginIds: string[] }
export interface TextPolicy { id: string; cwd: string; profile: Record<string, unknown>; isolation: TextIsolation }
export interface PolicyClient { request(method: string, params: unknown): Promise<unknown> }
const fail = (): never => { throw new Error('TEXT_ONLY_PERMISSIONS_UNVERIFIED'); };
const object = (v: unknown): Record<string, any> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : fail();
function canonical(v: any): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v !== null && typeof v === 'object') return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}
export function textIsolation(value: unknown): TextIsolation {
  const input = object(value);
  if (Object.keys(input).sort().join(',') !== 'mcpServerIds,pluginIds') fail();
  const ids = (value: unknown): string[] => {
    if (!Array.isArray(value) || value.length > 128 || value.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9_@-]{1,160}$/.test(id)) || new Set(value).size !== value.length) fail();
    return [...value as string[]].sort();
  };
  return {mcpServerIds: ids(input.mcpServerIds), pluginIds: ids(input.pluginIds)};
}
export function textPolicy(cwd: string, inventory: unknown = {mcpServerIds:[],pluginIds:[]}): TextPolicy {
  if (!isAbsolute(cwd) || resolve(cwd) !== cwd || parse(cwd).root === cwd) fail();
  const id = `specforge-ba-${createHash('sha256').update(cwd).digest('hex').slice(0,24)}`;
  return { id, cwd, isolation: textIsolation(inventory), profile: { filesystem: { ':root': 'deny', ':minimal': 'read', [cwd]: 'read' }, network: { enabled: false } } };
}
export function textPolicyArgs(policy: TextPolicy): string[] {
  // JSON string escaping is compatible with TOML basic quoted keys/values.
  const value = `{filesystem={":root"="deny",":minimal"="read",${JSON.stringify(policy.cwd)}="read"},network={enabled=false}}`;
  const args = ['-c', `permissions.${policy.id}=${value}`, '-c', `default_permissions=${JSON.stringify(policy.id)}`, '-c', 'notify=[]'];
  for (const [table, ids] of [['mcp_servers', policy.isolation.mcpServerIds], ['plugins', policy.isolation.pluginIds]] as const)
    // CLI dotted-path parsing is not TOML quoted-key parsing. Dots/quotes in IDs
    // are rejected above rather than targeting another entry or inventing one.
    for (const id of ids) args.push('-c', `${table}.${id}.enabled=false`);
  return args;
}
export function assertTextConfig(value: unknown, policy: TextPolicy): void {
  const config = object(object(value).config);
  // App Server serializes absent typed options as null. Only observed optional
  // fields are normalized; unknown fields and any non-null values still fail.
  const profile = structuredClone(object(object(config.permissions)[policy.id]));
  const omitNull = (target: Record<string, any>, keys: string[]) => {
    for (const key of keys) if (target[key] === null) delete target[key];
  };
  omitNull(profile, ['description','extends','workspace_roots']);
  omitNull(object(profile.filesystem), ['glob_scan_max_depth']);
  omitNull(object(profile.network), ['proxy_url','enable_socks5','socks_url','enable_socks5_udp','allow_upstream_proxy',
    'dangerously_allow_non_loopback_proxy','dangerously_allow_all_unix_sockets','mode','domains','unix_sockets','allow_local_binding','mitm']);
  if (config.default_permissions !== policy.id ||
      canonical(profile) !== canonical(policy.profile)) fail();
  const features = object(config.features);
  for (const key of ['shell_tool','unified_exec','apps','multi_agent','browser_use','browser_use_external','js_repl','skill_mcp_dependency_install','hooks'])
    if (features[key] !== false) fail();
  if (config.web_search !== 'disabled' || config.project_doc_max_bytes !== 0) fail();
  for (const [table, ids] of [['mcp_servers', policy.isolation.mcpServerIds], ['plugins', policy.isolation.pluginIds]] as const) {
    const entries = object(config[table] ?? {});
    if (canonical(Object.keys(entries).sort()) !== canonical(ids) || Object.values(entries).some(entry => object(entry).enabled !== false)) fail();
  }
  // These checks do not attest external hook files or OS enforcement. The real
  // host preflight must still validate those before enabling a BA runtime.
  for (const key of ['hooks']) {
    if (config[key] != null && Object.keys(object(config[key])).length) fail();
  }
  if (config.notify != null && (!Array.isArray(config.notify) || config.notify.length)) fail();
}
export async function preflightTextPolicy(client: PolicyClient, policy: TextPolicy): Promise<void> {
  assertTextConfig(await client.request('config/read', { cwd: policy.cwd, includeLayers: false }), policy);
  const listing = object(await client.request('permissionProfile/list', { cwd: policy.cwd }));
  // A truncated/ambiguous list is not proof that this exact profile is allowed.
  if (!Array.isArray(listing.data) || listing.nextCursor != null) fail();
  const matches = (listing.data as unknown[]).map(object).filter(p => p.id === policy.id);
  if (matches.length !== 1 || matches[0]!.allowed !== true) fail();
}
export function assertTextThread(value: unknown, policy: TextPolicy, model: string): void {
  const started = object(value), active = object(started.activePermissionProfile), sandbox = object(started.sandbox);
  if (active.id !== policy.id || active.extends != null || started.approvalPolicy !== 'never' ||
      started.model !== model || started.cwd !== policy.cwd || sandbox.type !== 'readOnly' ||
      sandbox.networkAccess !== false || canonical(started.runtimeWorkspaceRoots) !== canonical([policy.cwd]) ||
      typeof object(started.thread).id !== 'string' || !started.thread.id) fail();
}

export async function startTextThread(client: PolicyClient, policy: TextPolicy, model: string, serviceName: string): Promise<{thread: {id: string}}> {
  try {
  await preflightTextPolicy(client, policy);
  const started = await client.request('thread/start', { cwd: policy.cwd, model,
    approvalPolicy: 'never', permissions: policy.id, serviceName });
  assertTextThread(started, policy, model);
  // Check again after thread creation; never send a business prompt on drift.
  await preflightTextPolicy(client, policy);
  return started as {thread: {id: string}};
  } catch { return fail(); }
}
export function textTurnParameters(policy: TextPolicy, threadId: string, prompt: string, outputSchema: unknown) {
  // Selection already checked on this same session. Do not mix with sandboxPolicy.
  return { threadId, cwd: policy.cwd, permissions: policy.id, approvalPolicy: 'never',
    input: [{type:'text',text:prompt}], summary:'concise', outputSchema };
}
