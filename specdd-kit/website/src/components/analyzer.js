// Pure in-browser project analyzer for the Brownfield scenario. No React, no DOM.
// Structural mode reads manifests only; semantic mode reads a bounded safe text allowlist.
import { ANALYSIS_DEPTHS, DEFAULT_ANALYSIS_DEPTH, getAnalysisLevel } from './analysis.js';
import { FIDELITY_IGNORED_DIRS, fingerprintText } from './fingerprints.js';

export const MAX_PATHS = 20000;

export const IGNORED_DIRS = FIDELITY_IGNORED_DIRS;

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
export const SEMANTIC_MAX_FILES = 256;
export const SEMANTIC_MAX_CHARS_PER_FILE = 120000;
export const SEMANTIC_MAX_TOTAL_CHARS = 2000000;
export const MAX_ENTITY_SUGGESTIONS = 64;
export const MAX_FEATURE_SUGGESTIONS = 32;

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

export const isIgnored = (path) =>
  path.split('/').some((seg) => IGNORED_DIRS.has(seg.toLowerCase()) || (seg.startsWith('.') && seg.toLowerCase() !== '.github'));

// The manifest closest to the root wins (fewest path segments).
function shallowest(paths, name) {
  const hits = paths.filter((p) => p === name || p.endsWith(`/${name}`));
  return hits.sort((a, b) => a.split('/').length - b.split('/').length)[0] || null;
}

const setIf = (stack, field, value) => { if (!stack[field]) stack[field] = value; };
const addStackValue = (stack, field, value) => {
  const values = String(stack[field] || '').split(' / ').filter(Boolean);
  if (!values.includes(value)) values.push(value);
  stack[field] = values.join(' / ');
};

const normalizePath = (path) => path.replaceAll('\\', '/').replace(/^\.\//, '');
const isCommandSafePath = (path) => /^[A-Za-z0-9._/-]+$/.test(path);

function npmBuildCheck(packagePath, scripts = {}) {
  if (!scripts.build) return null;
  const directory = packagePath.includes('/') ? packagePath.slice(0, packagePath.lastIndexOf('/')) : '';
  if (directory && !isCommandSafePath(directory)) return null;
  return {
    id: directory ? `${directory.replaceAll('/', '-')}-build` : 'npm-build',
    label: directory ? `Build ${directory}` : 'Build Node project',
    command: directory ? `npm run build --prefix ${directory}` : 'npm run build',
    source: packagePath,
  };
}

function npmTestCheck(packagePath, scripts = {}) {
  const testScript = String(scripts.test || '');
  if (!/(?:vitest|jest|playwright\s+test|node\s+--test|--watch(?:=|\s+)false)/i.test(testScript)) return null;
  const directory = packagePath.includes('/') ? packagePath.slice(0, packagePath.lastIndexOf('/')) : '';
  if (directory && !isCommandSafePath(directory)) return null;
  return {
    id: directory ? `${directory.replaceAll('/', '-')}-test` : 'npm-test',
    label: directory ? `Test ${directory}` : 'Test Node project',
    command: directory ? `npm test --prefix ${directory}` : 'npm test',
    source: packagePath,
  };
}

function dotnetTestCheck(paths) {
  const solution = paths
    .filter((path) => /\.(sln|slnx)$/i.test(path) && isCommandSafePath(path))
    .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))[0];
  return solution ? {
    id: 'dotnet-test',
    label: 'Test .NET solution',
    command: `dotnet test ${solution} --configuration Release`,
    source: solution,
  } : null;
}

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

function countFeatures(paths) {
  const counts = new Map();
  const add = (candidate) => {
    const normalized = candidate?.trim().toLowerCase();
    if (!normalized || normalized.startsWith('.') || FEATURE_EXCLUDED_NAMES.has(normalized) || /[|`]/.test(normalized)) return;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  };
  for (const path of paths) {
    const segments = path.split('/');
    if (segments.slice(0, -1).some((segment) => segment.toLowerCase() === 'notifications')) add('notifications');
    for (let index = 0; index < segments.length - 2; index += 1) {
      const segment = segments[index].toLowerCase();
      if (segment === 'features' || segment.endsWith('.application') || segment.endsWith('-application')) {
        add(segments[index + 1]);
      }
    }
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
  const candidates = paths
    .map(normalizePath)
    .filter((path) => !isIgnored(path) && isSemanticSafePath(path))
    .sort((a, b) => semanticPathPriority(a) - semanticPathPriority(b) || a.localeCompare(b));
  const selected = candidates.slice(0, SEMANTIC_MAX_FILES);
  const files = new Map();
  const skipped = candidates.slice(SEMANTIC_MAX_FILES)
    .map((path) => ({ path, reason: 'file-count-cap' }));
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
    fileFingerprints: Object.fromEntries([...files.entries()]
      .map(([path, text]) => [path, fingerprintText(text)])),
    filesSkipped: skipped,
    totalChars,
  };
}

function inferSemanticEntities(files) {
  const entities = new Set();
  for (const text of files.values()) {
    for (const match of text.matchAll(/\bDbSet\s*<\s*([A-Za-z][A-Za-z0-9_]*)\s*>/g)) entities.add(match[1]);
  }
  return [...entities].sort((a, b) => a.localeCompare(b));
}

const kebabCase = (value) => value
  .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
  .replace(/[^A-Za-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .toLowerCase();

function inferSemanticFeatures(files) {
  const features = new Set();
  for (const [path, text] of files) {
    if (!/\.cs$/i.test(path) || !/(?:[.-]application\/|[.-]api\/endpoints\/)/i.test(path)) continue;
    for (const match of text.matchAll(/\bclass\s+([A-Z][A-Za-z0-9]*?)(?:Service|Query|Endpoints)\b/g)) {
      const businessName = match[1].replace(/^Admin(?=[A-Z])/, '');
      const feature = kebabCase(businessName);
      if (feature && !FEATURE_EXCLUDED_NAMES.has(feature)) features.add(feature);
    }
  }
  return [...features].sort((a, b) => a.localeCompare(b));
}

function inferStructuralArchitecture(paths) {
  const layers = new Set();
  for (const path of paths) {
    for (const segment of path.split('/')) {
      const match = segment.match(/(?:^|[.-])(domain|application|infrastructure|api)$/i);
      if (match) layers.add(match[1].toLowerCase());
    }
  }
  return ['domain', 'application', 'infrastructure', 'api'].every((layer) => layers.has(layer))
    ? { value: 'Layered architecture', source: 'Project folder structure', confidence: 'high', detail: 'Domain, Application, Infrastructure and API layers were detected.' }
    : null;
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
  const infrastructure = [
    { pattern: /dockerfile|docker\s+compose/, value: 'Docker' },
    { pattern: /railway\.toml|\brailway\b/, value: 'Railway' },
    { pattern: /kubernetes|\bk8s\b/, value: 'Kubernetes' },
  ].filter((signal) => firstSource(files, signal.pattern));
  if (infrastructure.length) {
    stack.infra = infrastructure.map((item) => item.value).join(' / ');
    addEvidence(evidence, 'stack', stack.infra, firstSource(files, infrastructure[0].pattern), 'high', 'Infrastructure tooling was found in project files or documentation.');
  }
  stack.swagger = Boolean(firstSource(files, /swagger|openapi/));

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
    fileFingerprints: snapshot.fileFingerprints,
    filesSkipped: snapshot.filesSkipped,
    totalChars: snapshot.totalChars,
    confidence,
    evidence,
    architecture,
    entities: inferSemanticEntities(files),
    features: inferSemanticFeatures(files),
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

  const stack = { languages: [], frontend: '', backend: '', testing: '', database: '', infra: '', swagger: false, a11y: false };
  const manifestsFound = [];
  const manifestFingerprints = {};
  const projectChecks = [];
  let projectName = folderName || 'project';
  let description = '';

  const readSafe = async (p) => { try { return await readFile(p); } catch { return null; } };

  const packagePaths = visible
    .filter((path) => path === 'package.json' || path.endsWith('/package.json'))
    .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
  for (const pkgPath of packagePaths) {
    const text = await readSafe(pkgPath);
    if (text !== null) {
      manifestsFound.push(pkgPath);
      manifestFingerprints[pkgPath] = fingerprintText(text);
      try {
        const pkg = JSON.parse(text);
        if (pkgPath === packagePaths[0] && pkg.name) projectName = pkg.name;
        if (pkgPath === packagePaths[0] && pkg.description) description = pkg.description;
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        for (const rule of PACKAGE_RULES) if (deps[rule.dep]) addStackValue(stack, rule.field, rule.value);
        const buildCheck = npmBuildCheck(pkgPath, pkg.scripts || {});
        if (buildCheck) projectChecks.push(buildCheck);
        const testCheck = npmTestCheck(pkgPath, pkg.scripts || {});
        if (testCheck) projectChecks.push(testCheck);
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
    manifestFingerprints[p] = fingerprintText(text);
    if (!stack.languages.includes(m.language)) stack.languages.push(m.language);
    const lower = text.toLowerCase();
    for (const rule of TEXT_RULES) if (lower.includes(rule.needle)) setIf(stack, rule.field, rule.value);
    if (m.name === 'pom.xml' && isCommandSafePath(p)) {
      projectChecks.push({ id: 'maven-test', label: 'Test Maven project', command: `mvn -f ${p} test`, source: p });
    }
    if ((m.name === 'requirements.txt' || m.name === 'pyproject.toml') && !p.includes('/') && lower.includes('pytest')) {
      projectChecks.push({ id: 'python-test', label: 'Test Python project', command: 'python -m pytest', source: p });
    }
  }

  const csprojPaths = visible.filter((p) => p.toLowerCase().endsWith('.csproj')).sort();
  if (csprojPaths.length && !stack.languages.includes('.NET')) stack.languages.push('.NET');
  for (const csprojPath of csprojPaths) {
    const text = await readSafe(csprojPath);
    if (text === null) continue;
    manifestsFound.push(csprojPath);
    manifestFingerprints[csprojPath] = fingerprintText(text);
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
  const goMod = shallowest(visible, 'go.mod');
  if (goMod && !stack.languages.includes('Go')) stack.languages.push('Go');
  if (goMod === 'go.mod') projectChecks.push({ id: 'go-test', label: 'Test Go module', command: 'go test ./...', source: goMod });
  const cargoManifest = shallowest(visible, 'Cargo.toml');
  if (cargoManifest && !stack.languages.includes('Rust')) stack.languages.push('Rust');
  if (cargoManifest === 'Cargo.toml') projectChecks.push({ id: 'cargo-test', label: 'Test Rust crate', command: 'cargo test', source: cargoManifest });
  const gradleWrapper = visible.find((path) => path === 'gradlew.bat') || visible.find((path) => path === 'gradlew');
  if (gradleWrapper) projectChecks.push({ id: 'gradle-test', label: 'Test Gradle project', command: `./${gradleWrapper} test`, source: gradleWrapper });
  const dotnetCheck = dotnetTestCheck(visible);
  if (dotnetCheck) projectChecks.push(dotnetCheck);

  let semantic = null;
  if (effectiveDepth === ANALYSIS_DEPTHS.SEMANTIC) {
    const snapshot = await readSemanticSnapshot(visible, readSafe);
    semantic = analyzeSemanticSnapshot(snapshot, stack, description);
    const structuralArchitecture = inferStructuralArchitecture(visible);
    if (structuralArchitecture && !semantic.architecture.some((item) => item.value === structuralArchitecture.value)) {
      semantic.architecture.push(structuralArchitecture);
      semantic.evidence.push({ category: 'architecture', ...structuralArchitecture });
    }
    if (semantic.description) description = semantic.description;
    Object.assign(stack, semantic.stack || {});
  }

  const pathEntities = collectEntitySuggestions(visible);
  const entityCandidates = semantic?.entities?.length ? semantic.entities : pathEntities;
  const featureCandidates = [...new Set([...collectFeatureSuggestions(visible), ...(semantic?.features || [])])];
  const uniqueProjectChecks = projectChecks.filter((check, index, checks) => (
    checks.findIndex((candidate) => candidate.id === check.id) === index
  ));

  return {
    analysisDepth: effectiveDepth,
    projectName,
    description,
    stack,
    domains: suggestDomains(visible),
    entities: entityCandidates.slice(0, MAX_ENTITY_SUGGESTIONS),
    features: featureCandidates.slice(0, MAX_FEATURE_SUGGESTIONS),
    suggestionLimits: {
      entities: { detected: entityCandidates.length, returned: Math.min(entityCandidates.length, MAX_ENTITY_SUGGESTIONS), truncated: entityCandidates.length > MAX_ENTITY_SUGGESTIONS },
      features: { detected: featureCandidates.length, returned: Math.min(featureCandidates.length, MAX_FEATURE_SUGGESTIONS), truncated: featureCandidates.length > MAX_FEATURE_SUGGESTIONS },
    },
    manifestsFound,
    manifestFingerprints,
    fileCount: visible.length,
    truncated,
    legacyHarness: detectLegacyHarness(normalizedPaths),
    semantic,
    projectChecks: uniqueProjectChecks,
  };
}

// Technical-layer and infrastructure folder names that are not business domains.
const NON_DOMAIN_NAMES = new Set([
  ...IGNORED_DIRS,
  'test', 'tests', '__tests__', 'e2e', 'docs', 'doc', 'assets', 'public', 'static',
  'config', 'scripts', 'styles', 'backend', 'frontend', 'shared', 'app', 'features', 'modules',
  'api', 'application', 'infrastructure', 'persistence', 'contracts', 'components', 'controllers', 'services',
]);

const CODE_ROOTS = ['src', 'apps', 'packages', 'modules'];
const FEATURE_EXCLUDED_NAMES = new Set([
  'abstractions', 'common', 'components', 'config', 'contracts', 'dtos', 'infrastructure',
  'models', 'services', 'shared', 'utils',
]);
const TECHNICAL_PROJECT_SUFFIXES = new Set([
  'api', 'application', 'infrastructure', 'persistence', 'contracts', 'tests', 'test', 'web',
]);

function normalizeDomainCandidate(candidate) {
  const domainProject = candidate.match(/^(.+?)[.-]domain$/i);
  if (domainProject) return domainProject[1];
  const suffix = candidate.split(/[.-]/).at(-1)?.toLowerCase();
  return TECHNICAL_PROJECT_SUFFIXES.has(suffix) ? null : candidate;
}

export function suggestDomains(paths) {
  const normalizedPaths = paths.map(normalizePath);
  const moduleCounts = countSegmentsAfter(normalizedPaths, 'modules');
  if (moduleCounts.size) return topCandidates(moduleCounts, 8);

  // Brownfield repositories commonly nest code roots (for example
  // backend/src/Bloom.Domain), so search every segment instead of requiring src
  // to be the first one. Technical sibling projects must not become domains.
  const hasRoot = normalizedPaths.some((p) => {
    const segs = p.split('/');
    const index = segs.findIndex((segment) => CODE_ROOTS.includes(segment.toLowerCase()));
    return index >= 0 && segs.length > index + 2;
  });
  const counts = new Map();
  for (const p of normalizedPaths) {
    const segs = p.split('/');
    let candidate = null;
    if (hasRoot) {
      const index = segs.findIndex((segment) => CODE_ROOTS.includes(segment.toLowerCase()));
      if (index >= 0 && segs.length > index + 2) candidate = segs[index + 1];
    } else if (segs.length > 1) {
      candidate = segs[0];
    }
    candidate = candidate ? normalizeDomainCandidate(candidate) : null;
    if (!candidate || candidate.startsWith('.') || NON_DOMAIN_NAMES.has(candidate.toLowerCase()) || /[|`]/.test(candidate)) continue;
    counts.set(candidate, (counts.get(candidate) || 0) + 1);
  }
  return topCandidates(counts, 8);
}

function collectFeatureSuggestions(paths) {
  return topCandidates(countFeatures(paths.map(normalizePath)), Number.MAX_SAFE_INTEGER);
}

export function suggestFeatures(paths) {
  return collectFeatureSuggestions(paths).slice(0, MAX_FEATURE_SUGGESTIONS);
}

const ENTITY_DIRS = new Set(['models', 'entities', 'domain']);
const NON_ENTITY_BASENAMES = new Set(['index', '__init__', 'base', 'types']);
const NON_ENTITY_SUFFIXES = /(status|domain|exception|settings|options|configuration|context|transitions?)$/i;

function collectEntitySuggestions(paths) {
  const found = new Map();
  const add = (name, priority) => {
    const normalized = name.charAt(0).toUpperCase() + name.slice(1);
    const current = found.get(normalized);
    if (current === undefined || priority < current) found.set(normalized, priority);
  };
  for (const p of paths.map(normalizePath)) {
    const segs = p.split('/');
    const base = segs[segs.length - 1].replace(/\.[^.]+$/, '');
    const parent = (segs[segs.length - 2] || '').toLowerCase();
    const suffixed = base.match(/^(.+)\.(entity|model)$/i);
    const candidate = suffixed ? suffixed[1] : base;
    const entityParent = ENTITY_DIRS.has(parent) || parent.endsWith('.domain') || parent.endsWith('-domain');
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(candidate) || NON_ENTITY_BASENAMES.has(candidate.toLowerCase()) || NON_ENTITY_SUFFIXES.test(candidate)) continue;
    if (suffixed || entityParent) {
      const priority = ENTITY_DIRS.has(parent) ? 0 : suffixed ? 1 : 2;
      add(candidate, priority);
    }
  }
  return [...found.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);
}

export function suggestEntities(paths) {
  return collectEntitySuggestions(paths).slice(0, MAX_ENTITY_SUGGESTIONS);
}

// ---- Legacy harness detection (Brownfield deprecation flow) ----
// Runs on the RAW ingested path list: the ignore filter above drops dot-folders,
// so detection must never reuse the filtered list.

const HARNESS_ROOT_FILES = new Set([
  'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'SYSTEM_PROMPT.md',
  '.github/copilot-instructions.md',
]);
const HARNESS_DIR_PREFIXES = ['.agents/', '.claude/', '.cursor/rules/'];
const LOCAL_ONLY_HARNESS_PATHS = new Set(['.claude/settings.local.json']);
// Files that carry project rules worth rescuing (triaged by the agent);
// everything else harness-related is mechanism (deprecated directly).
const KNOWLEDGE_SEGMENTS = new Set(['skills', 'patterns', 'adrs']);

export function detectLegacyHarness(paths) {
  const mechanism = [];
  const knowledge = [];
  for (const p of paths) {
    if (LOCAL_ONLY_HARNESS_PATHS.has(p.toLowerCase())) continue;
    const inHarnessDir = HARNESS_DIR_PREFIXES.some((d) => p.startsWith(d));
    if (!inHarnessDir && !HARNESS_ROOT_FILES.has(p)) continue;
    const isKnowledge = inHarnessDir && p.split('/').some((seg) => KNOWLEDGE_SEGMENTS.has(seg));
    (isKnowledge ? knowledge : mechanism).push(p);
  }
  mechanism.sort();
  knowledge.sort();
  return { detected: mechanism.length + knowledge.length > 0, mechanism, knowledge };
}
