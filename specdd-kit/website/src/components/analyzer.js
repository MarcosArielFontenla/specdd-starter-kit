// Pure in-browser project analyzer for the Brownfield scenario. No React, no DOM.
// Reads CONTENT only from manifest files; every other file contributes its path only.

export const MAX_PATHS = 20000;

export const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage', 'vendor',
  'venv', '.venv', '__pycache__', 'bin', 'obj', 'target',
]);

// Declarative dependency → stack rules for package.json. First match per field wins,
// so more specific frameworks (Next.js) come before the libraries they wrap (React).
const PACKAGE_RULES = [
  { dep: 'next', field: 'frontend', value: 'Next.js' },
  { dep: 'astro', field: 'frontend', value: 'Astro' },
  { dep: '@angular/core', field: 'frontend', value: 'Angular' },
  { dep: 'vue', field: 'frontend', value: 'Vue' },
  { dep: 'react', field: 'frontend', value: 'React' },
  { dep: '@nestjs/core', field: 'backend', value: 'NestJS' },
  { dep: 'express', field: 'backend', value: 'Express' },
  { dep: 'fastify', field: 'backend', value: 'Fastify' },
  { dep: '@playwright/test', field: 'testing', value: 'Playwright' },
  { dep: 'vitest', field: 'testing', value: 'Vitest' },
  { dep: 'jest', field: 'testing', value: 'Jest' },
  { dep: 'prisma', field: 'database', value: 'Prisma' },
  { dep: 'pg', field: 'database', value: 'PostgreSQL' },
  { dep: 'mysql2', field: 'database', value: 'MySQL' },
  { dep: 'mongoose', field: 'database', value: 'MongoDB' },
];

// Substring → stack rules for text manifests (requirements.txt, pyproject.toml,
// pom.xml, build.gradle, Gemfile, composer.json).
const TEXT_RULES = [
  { needle: 'django', field: 'backend', value: 'Django' },
  { needle: 'fastapi', field: 'backend', value: 'FastAPI' },
  { needle: 'flask', field: 'backend', value: 'Flask' },
  { needle: 'spring', field: 'backend', value: 'Spring' },
  { needle: 'rails', field: 'backend', value: 'Ruby on Rails' },
  { needle: 'laravel', field: 'backend', value: 'Laravel' },
];

const isIgnored = (path) =>
  path.split('/').some((seg) => IGNORED_DIRS.has(seg) || (seg.startsWith('.') && seg !== '.github'));

// The manifest closest to the root wins (fewest path segments).
function shallowest(paths, name) {
  const hits = paths.filter((p) => p === name || p.endsWith(`/${name}`));
  return hits.sort((a, b) => a.split('/').length - b.split('/').length)[0] || null;
}

const setIf = (stack, field, value) => { if (!stack[field]) stack[field] = value; };

export async function analyzeProject({ folderName, paths, readFile }) {
  const truncated = paths.length > MAX_PATHS;
  const capped = truncated ? paths.slice(0, MAX_PATHS) : paths;
  const visible = capped.filter((p) => !isIgnored(p));

  const stack = { languages: [], frontend: '', backend: '', testing: '', database: '' };
  const manifestsFound = [];
  let projectName = folderName || 'project';
  let description = '';

  const readSafe = async (p) => { try { return await readFile(p); } catch { return null; } };

  const pkgPath = shallowest(visible, 'package.json');
  if (pkgPath) {
    const text = await readSafe(pkgPath);
    if (text !== null) {
      manifestsFound.push(pkgPath);
      try {
        const pkg = JSON.parse(text);
        if (pkg.name) projectName = pkg.name;
        if (pkg.description) description = pkg.description;
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        for (const rule of PACKAGE_RULES) if (deps[rule.dep]) setIf(stack, rule.field, rule.value);
        stack.languages.push(shallowest(visible, 'tsconfig.json') ? 'TypeScript' : 'JavaScript');
      } catch { /* malformed package.json — path still counts as a manifest */ }
    }
  }

  const textManifests = [
    { name: 'requirements.txt', language: 'Python' },
    { name: 'pyproject.toml', language: 'Python' },
    { name: 'pom.xml', language: 'Java' },
    { name: 'build.gradle', language: 'Java' },
    { name: 'Gemfile', language: 'Ruby' },
    { name: 'composer.json', language: 'PHP' },
  ];
  for (const m of textManifests) {
    const p = shallowest(visible, m.name);
    if (!p) continue;
    const text = await readSafe(p);
    if (text === null) continue;
    manifestsFound.push(p);
    if (!stack.languages.includes(m.language)) stack.languages.push(m.language);
    const lower = text.toLowerCase();
    for (const rule of TEXT_RULES) if (lower.includes(rule.needle)) setIf(stack, rule.field, rule.value);
  }
  if (visible.some((p) => p.endsWith('.csproj')) && !stack.languages.includes('.NET')) stack.languages.push('.NET');
  if (shallowest(visible, 'go.mod') && !stack.languages.includes('Go')) stack.languages.push('Go');

  return {
    projectName,
    description,
    stack,
    domains: suggestDomains(visible),
    entities: suggestEntities(visible),
    manifestsFound,
    fileCount: capped.length,
    truncated,
  };
}

// Technical-layer and infrastructure folder names that are not business domains.
const NON_DOMAIN_NAMES = new Set([
  ...IGNORED_DIRS,
  'test', 'tests', '__tests__', 'e2e', 'docs', 'doc', 'assets', 'public', 'static',
  'config', 'scripts', 'styles',
]);

const CODE_ROOTS = ['src', 'apps', 'packages', 'modules'];

export function suggestDomains(paths) {
  const hasRoot = paths.some((p) => CODE_ROOTS.includes(p.split('/')[0]) && p.includes('/'));
  const counts = new Map();
  for (const p of paths) {
    const segs = p.split('/');
    let candidate = null;
    if (hasRoot) {
      if (CODE_ROOTS.includes(segs[0]) && segs.length > 2) candidate = segs[1];
    } else if (segs.length > 1) {
      candidate = segs[0];
    }
    if (!candidate || candidate.startsWith('.') || NON_DOMAIN_NAMES.has(candidate.toLowerCase())) continue;
    counts.set(candidate, (counts.get(candidate) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([name]) => name);
}

const ENTITY_DIRS = new Set(['models', 'entities', 'domain']);
const NON_ENTITY_BASENAMES = new Set(['index', '__init__', 'base', 'types']);

export function suggestEntities(paths) {
  const found = new Set();
  const add = (name) => found.add(name.charAt(0).toUpperCase() + name.slice(1));
  for (const p of paths) {
    const segs = p.split('/');
    const base = segs[segs.length - 1].replace(/\.[^.]+$/, '');
    const parent = (segs[segs.length - 2] || '').toLowerCase();
    const suffixed = base.match(/^(.+)\.(entity|model)$/i);
    if (suffixed) add(suffixed[1]);
    else if (ENTITY_DIRS.has(parent) && /^[A-Za-z][A-Za-z0-9_-]*$/.test(base) && !NON_ENTITY_BASENAMES.has(base.toLowerCase())) add(base);
  }
  return [...found].slice(0, 12);
}
