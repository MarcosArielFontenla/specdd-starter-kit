// Pure in-browser project analyzer for the Brownfield scenario. No React, no DOM.
// Structural mode reads manifests only; semantic mode reads a bounded safe text allowlist.
import { ANALYSIS_DEPTHS, DEFAULT_ANALYSIS_DEPTH, getAnalysisLevel } from './analysis.js';

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

// Level 2 is still intentionally bounded: semantic mode reads only small text
// files that are useful for context and skips secrets, binaries and generated output.
export const SEMANTIC_MAX_FILES = 96;
export const SEMANTIC_MAX_CHARS_PER_FILE = 120000;
export const SEMANTIC_MAX_TOTAL_CHARS = 500000;

const SEMANTIC_DOC_NAMES = new Set([
  'readme.md', 'business_rules.md', 'modular_monolith_template.md',
  'feature_based_react_ssr_template.md', 'architecture.md', 'workflow.md',
]);
const SEMANTIC_TEXT_EXTENSIONS = new Set(['.cs', '.csproj', '.json', '.md', '.ts', '.tsx', '.js', '.jsx', '.yaml', '.yml', '.toml', '.xml']);
const SENSITIVE_PATH_PATTERN = /(^|\/)(\.env(?:\.|$)|appsettings(?:\.|$)|secrets?(?:\.|\/|$)|credentials?(?:\.|\/|$)|certs?(?:\.|\/|$)|keys?(?:\.|\/|$))/i;
const SENSITIVE_EXTENSION_PATTERN = /\.(pem|p12|pfx|key|crt|cer|der)$/i;

const semanticPathPriority = (path) => {
  const lower = path.toLowerCase();
  const base = lower.split('/').pop() || '';
  if (SEMANTIC_DOC_NAMES.has(base) || lower.includes('/docs/')) return 0;
  if (base === 'package.json' || lower.endsWith('.csproj') || base === 'tsconfig.json') return 1;
  if (/(^|\/)(entities|models|domain|controllers|routes|features)(\/|$)/i.test(path)) return 2;
  if (/(^|\/)(test|tests|__tests__|e2e)(\/|$)/i.test(path) || /\.test\.[^.]+$/i.test(path)) return 3;
  return 4;
};

export function isSemanticSafePath(path) {
  const normalized = path.replaceAll('\\', '/');
  const lower = normalized.toLowerCase();
  const extension = lower.includes('.') ? `.${lower.split('.').pop()}` : '';
  return !SENSITIVE_PATH_PATTERN.test(normalized)
    && !SENSITIVE_EXTENSION_PATTERN.test(normalized)
    && SEMANTIC_TEXT_EXTENSIONS.has(extension);
}

export function selectSemanticPaths(paths) {
  return paths
    .map(normalizePath)
    .filter((path) => !isIgnored(path) && isSemanticSafePath(path))
    .sort((a, b) => semanticPathPriority(a) - semanticPathPriority(b) || a.localeCompare(b))
    .slice(0, SEMANTIC_MAX_FILES);
}

const isIgnored = (path) =>
  path.split('/').some((seg) => IGNORED_DIRS.has(seg) || (seg.startsWith('.') && seg !== '.github'));

// The manifest closest to the root wins (fewest path segments).
function shallowest(paths, name) {
  const hits = paths.filter((p) => p === name || p.endsWith(`/${name}`));
  return hits.sort((a, b) => a.split('/').length - b.split('/').length)[0] || null;
}

const setIf = (stack, field, value) => { if (!stack[field]) stack[field] = value; };

const normalizePath = (path) => path.replaceAll('\\', '/').replace(/^\.\//, '');

function countSegmentsAfter(paths, marker) {
  const counts = new Map();
  for (const path of paths) {
    const segments = path.split('/');
    const index = segments.findIndex((segment) => segment.toLowerCase() === marker);
    const candidate = index >= 0 ? segments[index + 1] : null;
    if (!candidate || candidate.startsWith('.') || NON_DOMAIN_NAMES.has(candidate.toLowerCase()) || /[|`]/.test(candidate)) continue;
    counts.set(candidate, (counts.get(candidate) || 0) + 1);
  }
  return counts;
}

function topCandidates(counts, limit) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name]) => name);
}

async function readSemanticSnapshot(paths, readSafe) {
  const selected = selectSemanticPaths(paths);
  const files = new Map();
  const skipped = [];
  let totalChars = 0;
  for (const path of selected) {
    const text = await readSafe(path);
    if (text === null) {
      skipped.push({ path, reason: 'unreadable' });
      continue;
    }
    if (text.length > SEMANTIC_MAX_CHARS_PER_FILE) {
      skipped.push({ path, reason: 'file-size-cap' });
      continue;
    }
    if (totalChars + text.length > SEMANTIC_MAX_TOTAL_CHARS) {
      skipped.push({ path, reason: 'total-size-cap' });
      continue;
    }
    files.set(path, text);
    totalChars += text.length;
  }
  return {
    files,
    filesRead: [...files.keys()],
    filesSkipped: skipped,
    totalChars,
  };
}

function firstSource(files, pattern) {
  return [...files.entries()].find(([, text]) => pattern.test(text.toLowerCase()))?.[0] || null;
}

function addEvidence(evidence, category, value, source, confidence, detail) {
  if (!source || evidence.some((item) => item.category === category && item.value === value)) return;
  evidence.push({ category, value, source, confidence, detail });
}

function extractFirstProjectParagraph(files) {
  const preferred = [...files.entries()].sort((a, b) => {
    const aRoot = a[0].toLowerCase() === 'readme.md' ? 0 : 1;
    const bRoot = b[0].toLowerCase() === 'readme.md' ? 0 : 1;
    return aRoot - bRoot;
  });
  for (const [path, text] of preferred) {
    if (!path.toLowerCase().endsWith('.md')) continue;
    const lines = text.split(/\r?\n/);
    let headingSeen = false;
    let paragraph = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^#\s+/.test(trimmed)) {
        headingSeen = true;
        continue;
      }
      if (!headingSeen || trimmed.startsWith('#') || trimmed.startsWith('>')) continue;
      if (!trimmed) {
        if (paragraph.length) break;
        continue;
      }
      paragraph.push(trimmed);
    }
    if (paragraph.length) return { description: paragraph.join(' '), source: path };
  }
  return null;
}

function analyzeSemanticSnapshot(snapshot, baseStack, baseDescription) {
  const { files } = snapshot;
  const corpus = [...files.values()].join('\n').toLowerCase();
  const evidence = [];
  const stack = { ...baseStack, languages: [...baseStack.languages] };
  const architecture = [];

  const stackSignals = [
    { pattern: /asp\.net core|aspnetcore|microsoft\.net\.sdk\.web/, field: 'backend', value: 'ASP.NET Core', detail: 'ASP.NET Core references or project configuration were found.' },
    { pattern: /\.net\s*10|net10\.0|targetframework/, field: 'languages', value: '.NET', detail: '.NET target framework information was found.' },
    { pattern: /react router|react\b/, field: 'frontend', value: 'React', detail: 'React frontend references were found.' },
    { pattern: /typescript|tsconfig\.json/, field: 'languages', value: 'TypeScript', detail: 'TypeScript references or configuration were found.' },
    { pattern: /xunit/, field: 'testing', value: 'xUnit', detail: 'xUnit test references were found.' },
    { pattern: /npgsql\.entityframeworkcore\.postgresql|postgres(?:ql)?\b/, field: 'database', value: 'PostgreSQL', detail: 'PostgreSQL/Npgsql references were found.' },
    { pattern: /neon\s+postgres|neon serverless/, field: 'database', value: 'PostgreSQL (Neon)', detail: 'Neon PostgreSQL is described in project context.' },
  ];
  for (const signal of stackSignals) {
    const source = firstSource(files, signal.pattern);
    if (!source) continue;
    if (signal.field === 'languages') {
      if (!stack.languages.includes(signal.value)) stack.languages.push(signal.value);
    } else {
      stack[signal.field] = signal.value;
    }
    addEvidence(evidence, 'stack', signal.value, source, 'high', signal.detail);
  }

  const architectureSignals = [
    { pattern: /modular monolith/, value: 'Modular monolith', detail: 'The project documents a modular monolith architecture.' },
    { pattern: /server-side rendering|\bssr\b|react router framework mode/, value: 'Server-side rendered frontend', detail: 'The frontend documentation describes SSR or framework mode.' },
    { pattern: /entity framework core|ef core/, value: 'Entity Framework Core', detail: 'Entity Framework Core is referenced in project documentation or manifests.' },
  ];
  for (const signal of architectureSignals) {
    const source = firstSource(files, signal.pattern);
    if (!source || architecture.some((item) => item.value === signal.value)) continue;
    architecture.push({ value: signal.value, source, confidence: 'high', detail: signal.detail });
    addEvidence(evidence, 'architecture', signal.value, source, 'high', signal.detail);
  }

  const paragraph = extractFirstProjectParagraph(files);
  const description = paragraph?.description && paragraph.description.length > (baseDescription || '').length
    ? paragraph.description
    : baseDescription;
  if (paragraph && description !== baseDescription) {
    addEvidence(evidence, 'project', 'description', paragraph.source, 'high', 'Project description extracted from documentation.');
  }

  const confidence = evidence.length >= 7 ? 'high' : evidence.length >= 3 ? 'medium' : evidence.length ? 'low' : 'unknown';
  return {
    filesRead: snapshot.filesRead,
    filesSkipped: snapshot.filesSkipped,
    totalChars: snapshot.totalChars,
    confidence,
    evidence,
    architecture,
    stack,
    description,
  };
}

export async function analyzeProject({ folderName, paths, readFile, analysisDepth = DEFAULT_ANALYSIS_DEPTH }) {
  const level = getAnalysisLevel(analysisDepth);
  const effectiveDepth = level.available ? level.id : DEFAULT_ANALYSIS_DEPTH;
  const normalizedPaths = (paths || []).map(normalizePath);
  const visibleAll = normalizedPaths.filter((p) => !isIgnored(p));
  const truncated = visibleAll.length > MAX_PATHS;
  const visible = truncated ? visibleAll.slice(0, MAX_PATHS) : visibleAll;

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

  const csprojPaths = visible.filter((p) => p.toLowerCase().endsWith('.csproj')).sort();
  if (csprojPaths.length && !stack.languages.includes('.NET')) stack.languages.push('.NET');
  for (const csprojPath of csprojPaths) {
    const text = await readSafe(csprojPath);
    if (text === null) continue;
    manifestsFound.push(csprojPath);
    const lower = text.toLowerCase();
    if (lower.includes('microsoft.aspnetcore') || lower.includes('microsoft.net.sdk.web') || /\/api\/[^/]+\.csproj$/i.test(csprojPath)) {
      setIf(stack, 'backend', 'ASP.NET Core');
    } else if (csprojPath.toLowerCase().includes('/backend/')) {
      setIf(stack, 'backend', '.NET');
    }
    if (lower.includes('npgsql.entityframeworkcore.postgresql')) setIf(stack, 'database', 'PostgreSQL');
    if (lower.includes('xunit')) setIf(stack, 'testing', 'xUnit');
    else if (lower.includes('nunit')) setIf(stack, 'testing', 'NUnit');
    else if (lower.includes('mstest')) setIf(stack, 'testing', 'MSTest');
    else if (lower.includes('microsoft.net.test.sdk')) setIf(stack, 'testing', '.NET Test SDK');
  }
  manifestsFound.sort();
  if (shallowest(visible, 'go.mod') && !stack.languages.includes('Go')) stack.languages.push('Go');

  let semantic = null;
  if (effectiveDepth === ANALYSIS_DEPTHS.SEMANTIC) {
    const snapshot = await readSemanticSnapshot(visible, readSafe);
    semantic = analyzeSemanticSnapshot(snapshot, stack, description);
    if (semantic.description) description = semantic.description;
    Object.assign(stack, semantic.stack || {});
  }

  return {
    analysisDepth: effectiveDepth,
    projectName,
    description,
    stack,
    domains: suggestDomains(visible),
    entities: suggestEntities(visible),
    features: suggestFeatures(visible),
    manifestsFound,
    fileCount: visible.length,
    truncated,
    legacyHarness: detectLegacyHarness(normalizedPaths),
    semantic,
  };
}

// Technical-layer and infrastructure folder names that are not business domains.
const NON_DOMAIN_NAMES = new Set([
  ...IGNORED_DIRS,
  'test', 'tests', '__tests__', 'e2e', 'docs', 'doc', 'assets', 'public', 'static',
  'config', 'scripts', 'styles', 'backend', 'frontend', 'shared', 'app', 'features', 'modules',
]);

const CODE_ROOTS = ['src', 'apps', 'packages', 'modules'];

export function suggestDomains(paths) {
  const normalizedPaths = paths.map(normalizePath);
  const moduleCounts = countSegmentsAfter(normalizedPaths, 'modules');
  if (moduleCounts.size) return topCandidates(moduleCounts, 8);

  const hasRoot = normalizedPaths.some((p) => CODE_ROOTS.includes(p.split('/')[0]) && p.includes('/'));
  const counts = new Map();
  for (const p of normalizedPaths) {
    const segs = p.split('/');
    let candidate = null;
    if (hasRoot) {
      if (CODE_ROOTS.includes(segs[0]) && segs.length > 2) candidate = segs[1];
    } else if (segs.length > 1) {
      candidate = segs[0];
    }
    if (!candidate || candidate.startsWith('.') || NON_DOMAIN_NAMES.has(candidate.toLowerCase()) || /[|`]/.test(candidate)) continue;
    counts.set(candidate, (counts.get(candidate) || 0) + 1);
  }
  return topCandidates(counts, 8);
}

export function suggestFeatures(paths) {
  return topCandidates(countSegmentsAfter(paths.map(normalizePath), 'features'), 16);
}

const ENTITY_DIRS = new Set(['models', 'entities', 'domain']);
const NON_ENTITY_BASENAMES = new Set(['index', '__init__', 'base', 'types']);
const NON_ENTITY_SUFFIXES = /(status|domain|exception|settings|options|configuration|context|transitions?)$/i;

export function suggestEntities(paths) {
  const found = new Set();
  const add = (name) => found.add(name.charAt(0).toUpperCase() + name.slice(1));
  for (const p of paths.map(normalizePath)) {
    const segs = p.split('/');
    const base = segs[segs.length - 1].replace(/\.[^.]+$/, '');
    const parent = (segs[segs.length - 2] || '').toLowerCase();
    const suffixed = base.match(/^(.+)\.(entity|model)$/i);
    const candidate = suffixed ? suffixed[1] : base;
    const entityParent = ENTITY_DIRS.has(parent) || parent.endsWith('.domain') || parent.endsWith('-domain');
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(candidate) || NON_ENTITY_BASENAMES.has(candidate.toLowerCase()) || NON_ENTITY_SUFFIXES.test(candidate)) continue;
    if (suffixed || entityParent) add(candidate);
  }
  return [...found].slice(0, 12);
}

// ---- Legacy harness detection (Brownfield deprecation flow) ----
// Runs on the RAW ingested path list: the ignore filter above drops dot-folders,
// so detection must never reuse the filtered list.

const HARNESS_ROOT_FILES = new Set([
  'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'SYSTEM_PROMPT.md',
  '.github/copilot-instructions.md',
]);
const HARNESS_DIR_PREFIXES = ['.agents/', '.claude/', '.cursor/rules/'];
// Files that carry project rules worth rescuing (triaged by the agent);
// everything else harness-related is mechanism (deprecated directly).
const KNOWLEDGE_SEGMENTS = new Set(['skills', 'patterns', 'adrs']);

export function detectLegacyHarness(paths) {
  const mechanism = [];
  const knowledge = [];
  for (const p of paths) {
    const inHarnessDir = HARNESS_DIR_PREFIXES.some((d) => p.startsWith(d));
    if (!inHarnessDir && !HARNESS_ROOT_FILES.has(p)) continue;
    const isKnowledge = inHarnessDir && p.split('/').some((seg) => KNOWLEDGE_SEGMENTS.has(seg));
    (isKnowledge ? knowledge : mechanism).push(p);
  }
  mechanism.sort();
  knowledge.sort();
  return { detected: mechanism.length + knowledge.length > 0, mechanism, knowledge };
}
