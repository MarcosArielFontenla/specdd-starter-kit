// Pure generators — the providers bundle is passed in (no import of providers.json).
import { renderTemplate } from './render-template.js';

export const KIT_VERSION = '1.0.0';

export const slugify = (s) => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function matchesWhen(when, ctx) {
  if (!when) return true;
  return when.split('&&').map((c) => c.trim()).every((cond) => {
    if (cond.startsWith('ci:')) return ctx.ci.includes(cond.slice(3));
    if (cond.startsWith('field.')) {
      const [key, expected] = cond.slice(6).split(':');
      return String(ctx[key]) === expected;
    }
    if (cond.startsWith('!')) return !ctx[cond.slice(1)];
    return !!ctx[cond];
  });
}

export function buildContext(input, provider) {
  const api = input.app.api !== 'none';
  const secretsTable = (provider.secrets || [])
    .map((s) => `| \`${s.name}\` | ${s.description} | ${s.where} |`)
    .join('\n');
  const ctx = {
    ...input.providerFields,
    app: { ...input.app },
    appSlug: slugify(input.app.name) || 'app',
    api,
    apiUnsupported: api && !provider.supportsApi,
    ci: input.ci,
    ciGithub: input.ci.includes('github-actions'),
    ciAzp: input.ci.includes('azure-pipelines'),
    envDev: input.envs === 'dev+prod',
    approvalGate: !!input.approvalGate,
    providerLabel: provider.label,
    kitVersion: KIT_VERSION,
    secretsTable,
  };
  for (const f of provider.fields || []) {
    if (f.type === 'select') {
      const v = String(input.providerFields[f.key] ?? '').replace(/[^\w]/g, '_');
      if (v) ctx[`${f.key}_${v}`] = true;
    }
  }
  return ctx;
}

export function renderEnvExample(provider) {
  const lines = [
    '# specdeploy — environment reference (no real values here, ever)',
    '# Secrets are created in your CI system and referenced by name:',
    ...(provider.secrets || []).map((s) => `# ${s.name} — ${s.where}`),
  ];
  return lines.join('\n') + '\n';
}

export function generateFiles(providersBundle, input) {
  const provider = providersBundle[input.providerId];
  if (!provider) throw new Error(`generateFiles: unknown provider: ${input.providerId}`);
  const ctx = buildContext(input, provider);
  const out = {};
  for (const artifact of provider.artifacts) {
    if (!matchesWhen(artifact.when, ctx)) continue;
    out[artifact.output] = renderTemplate(provider.templates[artifact.template], ctx);
  }
  out['specdeploy.json'] = JSON.stringify({
    kit: 'specdeploy-kit',
    version: KIT_VERSION,
    provider: input.providerId,
    app: input.app,
    fields: input.providerFields,
    ci: input.ci,
    envs: input.envs,
    approvalGate: !!input.approvalGate,
  }, null, 2);
  out['.env.example'] = renderEnvExample(provider);
  return out;
}
