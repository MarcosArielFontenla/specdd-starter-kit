import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RESERVED_FIELD_KEYS = ['app', 'appSlug', 'api', 'apiUnsupported', 'ci', 'ciGithub', 'ciAzp', 'envDev', 'approvalGate', 'providerLabel', 'kitVersion', 'secretsTable'];

export function validateDescriptor(folderName, desc) {
  const fail = (msg) => { throw new Error(`bundle-providers: ${folderName}: ${msg}`); };
  if (!desc.id || desc.id !== folderName) fail(`id must equal folder name ("${folderName}")`);
  if (desc.id && !/^[a-z0-9-]+$/.test(desc.id)) fail('id must match ^[a-z0-9-]+$');
  if (!desc.label) fail('label is required');
  if (!desc.description) fail('description is required');
  if (typeof desc.supportsApi !== 'boolean') fail('supportsApi must be boolean');
  if (!Array.isArray(desc.ci) || desc.ci.length === 0) fail('ci must be a non-empty array');
  for (const c of desc.ci || []) {
    if (c !== 'github-actions' && c !== 'azure-pipelines') fail('ci entries must be github-actions or azure-pipelines');
  }
  if (!Array.isArray(desc.artifacts) || desc.artifacts.length === 0) fail('artifacts must be a non-empty array');
  for (const f of desc.fields || []) {
    if (!f.key || !f.label || !f.type) fail('every field needs key, label and type');
    if (f.key && !/^[a-zA-Z]\w*$/.test(f.key)) fail(`field key "${f.key}" must match ^[a-zA-Z]\\w*$`);
    if (RESERVED_FIELD_KEYS.includes(f.key)) fail(`field key ${f.key} is reserved (would shadow template context)`);
    if (!(f.type === 'text' || f.type === 'select')) fail(`field ${f.key} type must be text or select`);
    if (f.type === 'select' && (!Array.isArray(f.options) || f.options.length === 0)) fail(`select field ${f.key} needs options`);
  }
  for (const s of desc.secrets || []) {
    if (!s.name || !s.description || !s.where) fail('every secret needs name, description and where');
    if (s.name && !/^[A-Z][A-Z0-9_]*$/.test(s.name)) fail(`secret name "${s.name}" must match ^[A-Z][A-Z0-9_]*$`);
  }
  for (const a of desc.artifacts) {
    if (!a.template || !a.output) fail('every artifact needs template and output');
  }
}

export function readProviders(providersDir) {
  const bundle = {};
  for (const name of readdirSync(providersDir)) {
    if (name.startsWith('_')) continue;
    const dir = join(providersDir, name);
    if (!statSync(dir).isDirectory()) continue;
    const descPath = join(dir, 'provider.json');
    if (!existsSync(descPath)) throw new Error(`bundle-providers: ${name} is missing provider.json`);
    let desc;
    try {
      desc = JSON.parse(readFileSync(descPath, 'utf8'));
    } catch (err) {
      throw new Error(`bundle-providers: ${name}/provider.json is not valid JSON (${err.message})`);
    }
    validateDescriptor(name, desc);
    const templates = {};
    for (const artifact of desc.artifacts) {
      const tplPath = join(dir, 'templates', artifact.template);
      if (!existsSync(tplPath)) throw new Error(`bundle-providers: ${name} references missing template ${artifact.template}`);
      templates[artifact.template] = readFileSync(tplPath, 'utf8');
    }
    bundle[desc.id] = { ...desc, templates };
  }
  return bundle;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const here = dirname(fileURLToPath(import.meta.url));       // .../website/scripts
  const providersDir = join(here, '..', '..', 'providers');   // .../specdeploy-kit/providers
  const outPath = join(here, '..', 'src', 'data', 'providers.json');
  const bundle = readProviders(providersDir);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(bundle, null, 2));
  console.log(`bundle-providers: wrote ${Object.keys(bundle).length} providers to ${outPath}`);
}
