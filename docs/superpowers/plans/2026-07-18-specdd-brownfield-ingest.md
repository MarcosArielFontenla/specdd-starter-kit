# SpecDD Brownfield Ingestion & Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the SpecDD wizard's Brownfield scenario: pick an existing project folder, analyze it entirely in the browser, pre-populate the wizard, and generate a harness scaffold that includes `spec-converge.md` + `context/brownfield-analysis.md` and never overwrites existing files.

**Architecture:** A new pure `analyzer.js` module detects stack (manifest files only), suggested domains (folder structure), and suggested entities (filename patterns). A new `generateScaffold` wrapper adds brownfield deltas on top of the existing `generateFiles` (which stays map-in/map-out): scenario-aware converge filtering, collision exclusion against the ingested path list, and the analysis report. The wizard gains an `Ingest & Analyze` step (via the `stepsFor(scenario)` seam) with a `webkitdirectory` folder input in a new `IngestStep.jsx` component.

**Tech Stack:** Astro 5 + React 18 islands, Node ≥20 built-in test runner (`node --test`), Playwright (`setInputFiles` directory upload), File API (`File.text()`, `webkitRelativePath`).

**Spec:** `docs/superpowers/specs/2026-07-18-specdd-brownfield-ingest-design.md`

## Global Constraints

- **Confidentiality (hard rule):** No committed file may reference the private harness source documents by filename, version label, or authorship trail. The architecture is always the **SpecDD Harness**. The existing guard test (no `\bV\d+(\.\d+)?\b` version tags in generated output) must keep passing and covers new renderers automatically.
- **Privacy:** Analysis runs 100% in the browser. Only manifest files are ever read (`File.text()`); source files contribute paths only. The Ingest UI must state this prominently.
- **Never clobber:** in brownfield, any scaffold path present in the ingested folder is excluded from the ZIP and reported. Sole exemption: `context/brownfield-analysis.md` is always emitted.
- **Greenfield zero-regression:** `generateFiles(baseFiles, input, today)` keeps its signature and map return; the existing Greenfield e2e and all existing unit tests stay green. Greenfield output must NOT contain `spec-converge.md`.
- **Caps:** suggested domains ≤ 8 (`MAX_DOMAINS`, keeps the primer ≤40-line guarantee), suggested entities ≤ 12, path list capped at 20,000 with `truncated` flag.
- Generated artifact language: English. SpecForge, SpecDeploy, `packages/ui` untouched.
- All work on `main` (repo convention), one commit per task. Never stage the unrelated working-tree deletions ("Boreal Design System/").

---

### Task 1: spec-converge.md static kit file + scenario-aware filtering

**Files:**
- Create: `specdd-kit/.agents/workflows/spec-converge.md`
- Modify: `specdd-kit/website/src/components/generators.js:75-108` (`generateFiles`)
- Test: `specdd-kit/website/src/components/generators.test.js`

**Interfaces:**
- Consumes: existing `generateFiles(baseFiles, input, today)` (map in → map out).
- Produces: base bundle gains `.agents/workflows/spec-converge.md`; `generateFiles` drops that path unless `input.scenario === 'brownfield'`. Later tasks rely on this exact path string.

- [ ] **Step 1: Write the failing tests**

Append to `specdd-kit/website/src/components/generators.test.js` (the file already defines fixtures `base`, `input`, `harnessInput`; `harnessInput.scenario` is `'greenfield'`):

```js
const baseWithConverge = { ...base, '.agents/workflows/spec-converge.md': 'converge workflow' };

test('spec-converge is filtered out of greenfield output even when bundled', () => {
  const out = generateFiles(baseWithConverge, harnessInput, '2026-07-18');
  assert.ok(!('.agents/workflows/spec-converge.md' in out));
});

test('spec-converge survives in brownfield output', () => {
  const out = generateFiles(baseWithConverge, { ...harnessInput, scenario: 'brownfield' }, '2026-07-18');
  assert.equal(out['.agents/workflows/spec-converge.md'], 'converge workflow');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: the greenfield filter test FAILS (converge currently passes through untouched); the brownfield test passes trivially.

- [ ] **Step 3: Implement the filter**

In `generators.js`, inside `generateFiles`'s base-copy loop, extend the skip conditions:

```js
  const out = {};
  for (const [path, contents] of Object.entries(baseFiles)) {
    if (!hasCopilot && path.startsWith('.github/')) continue; // Copilot projection is opt-in
    if (input.scenario !== 'brownfield' && path === '.agents/workflows/spec-converge.md') continue; // converge is brownfield-only
    out[path] = contents;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: PASS (25 tests).

- [ ] **Step 5: Create `specdd-kit/.agents/workflows/spec-converge.md`**

```markdown
# Spec Converge — align existing code to a spec (brownfield)

Use this workflow when the codebase predates its spec: migrations, legacy adoption,
resumed features, or a fresh harness dropped onto an existing project.

1. Load the spec and its `acceptanceChecks`. ABORT if the spec has no executable
   checks — there is nothing to converge toward; write real checks first (see
   `.agents/workflows/spec-first-feature.md`, stages 1–3).
2. Run `pwsh .agents/scripts/validate-spec.ps1 -Run -SpecPath [spec]`.
   Failing checks = the measurable delta between the codebase and the spec.
3. Audit the codebase against the spec's requirements for gaps no check covers yet.
   Propose new acceptanceChecks for those gaps — the human approves them; they amend
   the spec.
4. APPEND the remaining work to the feature's tasks file
   (`.agents/specs/tasks/[feature-slug].tasks.md`, create it if absent).
   Never rewrite or uncheck completed tasks — converge adds, it does not rewrite
   history.
5. The human reviews the delta before any implementation resumes.

Constraints: converge never touches `designContract.status` · never retro-approves
anything · its output is always tasks, never direct edits.

First session on a freshly scaffolded brownfield project: read
`context/brownfield-analysis.md` for what the wizard detected and which scaffold
files were skipped because they already existed.
```

- [ ] **Step 6: Rebundle and verify the file lands in the bundle**

Run: `npm run bundle-kit -w sdd-kit-wizard`
Then: `node -e "const k=require('./specdd-kit/website/src/data/kit-files.json'); if(!('.agents/workflows/spec-converge.md' in k)){console.error('MISSING');process.exit(1)}; console.log('present')"`
Expected: `present`

- [ ] **Step 7: Commit**

```bash
git add specdd-kit/.agents/workflows/spec-converge.md specdd-kit/website/src/components/generators.js specdd-kit/website/src/components/generators.test.js
git commit -m "feat(specdd-kit): brownfield-only spec-converge workflow with scenario filter"
```

---

### Task 2: Analyzer — stack detection from manifests

**Files:**
- Create: `specdd-kit/website/src/components/analyzer.js`
- Test: `specdd-kit/website/src/components/analyzer.test.js`

**Interfaces:**
- Produces (exact export):
  `analyzeProject({ folderName, paths, readFile }): Promise<{ projectName, description, stack: { languages: string[], frontend: string, backend: string, testing: string, database: string }, domains: string[], entities: string[], manifestsFound: string[], fileCount: number, truncated: boolean }>`
  - `paths` are relative paths WITHOUT the root folder prefix (the caller strips it).
  - `readFile(path) => Promise<string>`; the analyzer only calls it for manifest files and tolerates rejections (skips that manifest).
  - In this task, `domains`/`entities` are returned as `[]` (Task 3 fills them in).
- Constants exported for reuse/tests: `IGNORED_DIRS: Set<string>`, `MAX_PATHS = 20000`.

- [ ] **Step 1: Write the failing tests**

Create `specdd-kit/website/src/components/analyzer.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProject, MAX_PATHS } from './analyzer.js';

function reader(files) {
  return (p) => (p in files ? Promise.resolve(files[p]) : Promise.reject(new Error(`no ${p}`)));
}

test('node/react project: stack from package.json + tsconfig', async () => {
  const files = {
    'package.json': JSON.stringify({
      name: 'acme-shop', description: 'A sample shop',
      dependencies: { react: '^18.0.0', express: '^4.18.0', pg: '^8.0.0' },
      devDependencies: { vitest: '^1.0.0' },
    }),
  };
  const a = await analyzeProject({
    folderName: 'shop-folder',
    paths: ['package.json', 'tsconfig.json', 'src/index.ts'],
    readFile: reader(files),
  });
  assert.equal(a.projectName, 'acme-shop');
  assert.equal(a.description, 'A sample shop');
  assert.equal(a.stack.frontend, 'React');
  assert.equal(a.stack.backend, 'Express');
  assert.equal(a.stack.testing, 'Vitest');
  assert.equal(a.stack.database, 'PostgreSQL');
  assert.deepEqual(a.stack.languages, ['TypeScript']);
  assert.deepEqual(a.manifestsFound, ['package.json']);
  assert.equal(a.fileCount, 3);
  assert.equal(a.truncated, false);
});

test('python/django project', async () => {
  const files = { 'requirements.txt': 'django==5.0\npsycopg2==2.9\n' };
  const a = await analyzeProject({
    folderName: 'py-app',
    paths: ['requirements.txt', 'manage.py'],
    readFile: reader(files),
  });
  assert.equal(a.projectName, 'py-app'); // no package.json name — folder name wins
  assert.equal(a.stack.backend, 'Django');
  assert.ok(a.stack.languages.includes('Python'));
});

test('dotnet and java detection by manifest presence', async () => {
  const files = { 'pom.xml': '<project><dependencies>spring-boot</dependencies></project>' };
  const dotnet = await analyzeProject({ folderName: 'x', paths: ['App/App.csproj'], readFile: reader({}) });
  assert.ok(dotnet.stack.languages.includes('.NET'));
  const java = await analyzeProject({ folderName: 'y', paths: ['pom.xml'], readFile: reader(files) });
  assert.ok(java.stack.languages.includes('Java'));
  assert.equal(java.stack.backend, 'Spring');
});

test('unreadable manifest is skipped without crashing', async () => {
  const a = await analyzeProject({
    folderName: 'z',
    paths: ['package.json'],
    readFile: () => Promise.reject(new Error('denied')),
  });
  assert.equal(a.projectName, 'z');
  assert.deepEqual(a.manifestsFound, []);
});

test('empty folder yields empty result with folder name', async () => {
  const a = await analyzeProject({ folderName: 'empty', paths: [], readFile: reader({}) });
  assert.equal(a.projectName, 'empty');
  assert.equal(a.fileCount, 0);
  assert.equal(a.stack.frontend, '');
});

test('path list over MAX_PATHS is truncated and flagged', async () => {
  const paths = Array.from({ length: MAX_PATHS + 5 }, (_, i) => `src/f${i}.js`);
  const a = await analyzeProject({ folderName: 'big', paths, readFile: reader({}) });
  assert.equal(a.truncated, true);
  assert.equal(a.fileCount, MAX_PATHS);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: FAIL — `analyzer.js` does not exist.

- [ ] **Step 3: Create `specdd-kit/website/src/components/analyzer.js`**

```js
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

// Filled in by the structure/filename suggestion feature; kept separate so stack
// detection is testable on its own.
export function suggestDomains(paths) { return []; }
export function suggestEntities(paths) { return []; }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: PASS (all analyzer tests green; suite total 31).

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/components/analyzer.js specdd-kit/website/src/components/analyzer.test.js
git commit -m "feat(specdd-kit): in-browser analyzer with manifest-based stack detection"
```

---

### Task 3: Analyzer — domain and entity suggestions

**Files:**
- Modify: `specdd-kit/website/src/components/analyzer.js` (replace the two stub exports)
- Test: `specdd-kit/website/src/components/analyzer.test.js`

**Interfaces:**
- Consumes: `IGNORED_DIRS` and the visible-path filtering from Task 2 (suggestions receive already-filtered paths).
- Produces: `suggestDomains(paths): string[]` (≤8, ordered by contained-file count desc) and `suggestEntities(paths): string[]` (≤12, capitalized, deduplicated). Both already wired into `analyzeProject`'s return.

- [ ] **Step 1: Write the failing tests**

Append to `analyzer.test.js` (extend the import with `suggestDomains, suggestEntities`):

```js
test('domains from src/* folders, infra names excluded, ordered by file count', () => {
  const paths = [
    'src/auth/login.js', 'src/auth/logout.js', 'src/auth/token.js',
    'src/billing/invoice.js', 'src/billing/charge.js',
    'src/utils/helpers.js', 'src/tests/auth.test.js', 'src/assets/logo.svg',
    'README.md',
  ];
  const domains = suggestDomains(paths);
  assert.deepEqual(domains, ['auth', 'billing', 'utils']);
});

test('domains fall back to root-level folders when no src/apps/packages/modules', () => {
  const domains = suggestDomains(['auth/a.py', 'auth/b.py', 'catalog/c.py', 'docs/readme.md', 'setup.py']);
  assert.deepEqual(domains, ['auth', 'catalog']);
});

test('domains are capped at 8', () => {
  const paths = Array.from({ length: 12 }, (_, i) => `src/dom${String(i).padStart(2, '0')}/file.js`);
  assert.equal(suggestDomains(paths).length, 8);
});

test('entities from models/ dirs and *.entity/*.model filenames', () => {
  const entities = suggestEntities([
    'models/user.py', 'models/invoice.py', 'models/__init__.py',
    'src/catalog/product.entity.ts', 'src/orders/Order.model.ts',
    'src/auth/login.js',
  ]);
  assert.deepEqual([...entities].sort(), ['Invoice', 'Order', 'Product', 'User']);
});

test('entities are deduplicated and capped at 12', () => {
  const paths = Array.from({ length: 15 }, (_, i) => `models/entity${String(i).padStart(2, '0')}.py`);
  assert.equal(suggestEntities(paths).length, 12);
  assert.equal(suggestEntities(['models/user.py', 'src/x/User.entity.ts']).length, 1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: FAIL — stubs return `[]`.

- [ ] **Step 3: Replace the two stubs in `analyzer.js`**

```js
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
```

Delete the old two-line stub versions (including their comment).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: PASS. Note the Task 2 test `node/react project` still passes — its paths produce `domains: ['src'... ]`? No: `src/index.ts` with `hasRoot=true` and only 2 segments yields no candidate, so `domains: []`. Confirm no Task 2 test asserts domains/entities content other than implicitly.

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/components/analyzer.js specdd-kit/website/src/components/analyzer.test.js
git commit -m "feat(specdd-kit): analyzer suggests domains and entities from structure"
```

---

### Task 4: generateScaffold — collision exclusion + brownfield analysis report

**Files:**
- Modify: `specdd-kit/website/src/components/generators.js`
- Test: `specdd-kit/website/src/components/generators.test.js`

**Interfaces:**
- Consumes: `generateFiles` (Task 1 version, scenario-aware), all existing renderers.
- Produces (exact exports):
  - `renderBrownfieldAnalysis(input, skipped: string[], today: string): string`
  - `generateScaffold(baseFiles, input, today?): { files: Record<string,string>, skipped: string[] }` — the ONLY function `Wizard.jsx` will call from Task 6 on. Greenfield: `files` identical to `generateFiles` output, `skipped: []`. Brownfield: paths present in `input.existingPaths` removed from `files` and listed (sorted) in `skipped`; `context/brownfield-analysis.md` always present.
- Model contract addition (wired in Task 6): `input.analysis` (analyzer result or null), `input.existingPaths: string[]`.

- [ ] **Step 1: Write the failing tests**

Append to `generators.test.js` (extend the import with `generateScaffold, renderBrownfieldAnalysis`):

```js
const brownInput = {
  ...harnessInput,
  scenario: 'brownfield',
  existingPaths: ['README.md', 'src/auth/login.js', '.github/prompts/specdd-specify.prompt.md'],
  analysis: {
    projectName: 'acme-shop', description: 'A sample shop',
    stack: { languages: ['TypeScript'], frontend: 'React', backend: 'Express', testing: 'Vitest', database: 'PostgreSQL' },
    domains: ['auth', 'billing'], entities: ['User'],
    manifestsFound: ['package.json'], fileCount: 42, truncated: false,
  },
};

test('generateScaffold greenfield: same files as generateFiles, nothing skipped', () => {
  const { files, skipped } = generateScaffold(baseWithGithub, harnessInput, '2026-07-18');
  assert.deepEqual(files, generateFiles(baseWithGithub, harnessInput, '2026-07-18'));
  assert.deepEqual(skipped, []);
  assert.ok(!('context/brownfield-analysis.md' in files));
});

test('generateScaffold brownfield: collisions excluded and reported, analysis report always emitted', () => {
  const { files, skipped } = generateScaffold(baseWithGithub, brownInput, '2026-07-18');
  assert.ok(!('README.md' in files));                                    // collision dropped
  assert.ok(!('.github/prompts/specdd-specify.prompt.md' in files));     // collision dropped
  assert.deepEqual(skipped, ['.github/prompts/specdd-specify.prompt.md', 'README.md']);
  assert.ok('.agents/workflows/spec-converge.md' in files);              // converge ships
  const report = files['context/brownfield-analysis.md'];
  assert.match(report, /acme-shop/);
  assert.match(report, /React/);
  assert.match(report, /- auth/);
  assert.match(report, /README\.md/);                                    // skipped list in report
  assert.match(report, /spec-converge/);                                 // kickoff instruction
});

test('analysis report is exempt from collision exclusion', () => {
  const { files } = generateScaffold(baseWithGithub,
    { ...brownInput, existingPaths: ['context/brownfield-analysis.md'] }, '2026-07-18');
  assert.ok('context/brownfield-analysis.md' in files);
});

test('brownfield report notes truncation', () => {
  const { files } = generateScaffold(baseWithGithub,
    { ...brownInput, analysis: { ...brownInput.analysis, truncated: true } }, '2026-07-18');
  assert.match(files['context/brownfield-analysis.md'], /truncated/i);
});
```

Note: `baseWithGithub` already exists in this test file (defined in the greenfield-era tests); `base` includes `'README.md': 'base'`, which is what collides above.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: FAIL — `generateScaffold`/`renderBrownfieldAnalysis` not exported.

- [ ] **Step 3: Implement in `generators.js`** (append after `renderFeaturesSpec`)

```js
const ANALYSIS_REPORT_PATH = 'context/brownfield-analysis.md';

export function renderBrownfieldAnalysis(input, skipped, today) {
  const a = input.analysis || {};
  const stack = a.stack || {};
  const list = (xs) => (xs && xs.length ? xs.map((x) => `- ${x}`).join('\n') : '- (none)');
  const skippedBlock = skipped.length
    ? `${skipped.map((p) => `- ${p}`).join('\n')}\n\nThese scaffold files were NOT written because they already exist in this project.\nMerge harness-relevant content into them via the converge workflow, not by overwriting.`
    : '- (none — no scaffold file collided with an existing one)';
  return `# Brownfield Analysis — ${a.projectName || input.project?.name || 'Project'}

Generated by the SpecDD wizard on ${today}. The analysis ran entirely in the
browser; no file left the machine. Everything below is a detection-time snapshot —
the codebase is the source of truth.

## Kickoff (first agent session)
Run \`.agents/workflows/spec-converge.md\` to measure the delta between this codebase
and the specs in \`.agents/specs/\`. Treat the suggestions below as leads, not facts.

## Detected
- Files scanned: ${a.fileCount ?? 0}${a.truncated ? ' (truncated at the scan cap — deep paths were not analyzed)' : ''}
- Manifests: ${(a.manifestsFound || []).join(', ') || '(none)'}
- Languages: ${(stack.languages || []).join(', ') || '(none)'}
- Frontend: ${stack.frontend || '(none)'} · Backend: ${stack.backend || '(none)'} · Testing: ${stack.testing || '(none)'} · Database: ${stack.database || '(none)'}

## Suggested domains (from folder structure)
${list(a.domains)}

## Suggested entities (from filename patterns)
${list(a.entities)}

## Skipped scaffold files (already exist in this project)
${skippedBlock}
`;
}

export function generateScaffold(baseFiles, input, today = new Date().toISOString().slice(0, 10)) {
  const files = generateFiles(baseFiles, input, today);
  if (input.scenario !== 'brownfield') return { files, skipped: [] };

  const existing = new Set(input.existingPaths || []);
  const skipped = Object.keys(files)
    .filter((p) => existing.has(p) && p !== ANALYSIS_REPORT_PATH)
    .sort();
  for (const p of skipped) delete files[p];
  files[ANALYSIS_REPORT_PATH] = renderBrownfieldAnalysis(input, skipped, today);
  return { files, skipped };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: PASS (all, including the untouched greenfield tests and the version-tag guard, which scans `generateFiles` output only — the new report is additionally covered by the brownfield tests' content assertions).

- [ ] **Step 5: Extend the confidentiality guard to the brownfield output**

In the existing test `adapters carry zero rules and generated content carries no private version tags`, add at the end:

```js
  const brown = generateScaffold(baseWithGithub, brownInput, '2026-07-18').files;
  for (const [path, contents] of Object.entries(brown)) {
    if (path === '.github/prompts/specdd-specify.prompt.md') continue;
    assert.ok(!/\bV\d+(\.\d+)?\b/.test(contents), `version tag leaked in ${path}`);
  }
```

Note: `brownInput` is declared with `const` later in the file than this test — move the `brownInput` declaration ABOVE this test (declarations in the test file are order-sensitive at module scope).

Run: `npm run test:unit -w sdd-kit-wizard` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add specdd-kit/website/src/components/generators.js specdd-kit/website/src/components/generators.test.js
git commit -m "feat(specdd-kit): generateScaffold with collision exclusion and analysis report"
```

---

### Task 5: steps.js — Brownfield branch + Ingest validation

**Files:**
- Modify: `specdd-kit/website/src/components/steps.js`
- Test: `specdd-kit/website/src/components/steps.test.js`

**Interfaces:**
- Produces: `stepsFor('brownfield')` → 12 steps with `'Ingest & Analyze'` at index 2; `stepsFor('greenfield')` unchanged (11 steps). `errorFor('Ingest & Analyze', data)` returns an error string unless `data.analysis` is truthy.

- [ ] **Step 1: Write the failing tests**

Append to `steps.test.js`:

```js
test('brownfield step list inserts Ingest & Analyze after Scenario', () => {
  assert.deepEqual(stepsFor('brownfield'), [
    'Welcome', 'Scenario', 'Ingest & Analyze', 'Project', 'Tech Stack',
    'Domains & Entities', 'Features', 'Principles', 'MCP Tools', 'Agents & Tools',
    'Security', 'Preview / Download',
  ]);
  assert.equal(stepsFor('greenfield').length, 11); // unchanged
});

test('ingest step requires a completed analysis', () => {
  assert.match(errorFor('Ingest & Analyze', { ...valid, analysis: null }), /folder/i);
  assert.equal(errorFor('Ingest & Analyze', { ...valid, analysis: { fileCount: 3 } }), '');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: FAIL — brownfield list currently equals the greenfield list.

- [ ] **Step 3: Implement in `steps.js`**

Replace the `GREENFIELD_STEPS` block and `stepsFor` with:

```js
const GREENFIELD_STEPS = [
  'Welcome', 'Scenario', 'Project', 'Tech Stack', 'Domains & Entities', 'Features',
  'Principles', 'MCP Tools', 'Agents & Tools', 'Security', 'Preview / Download',
];

const BROWNFIELD_STEPS = [
  ...GREENFIELD_STEPS.slice(0, 2), 'Ingest & Analyze', ...GREENFIELD_STEPS.slice(2),
];

export function stepsFor(scenario) {
  return scenario === 'brownfield' ? BROWNFIELD_STEPS : GREENFIELD_STEPS;
}
```

And add to `errorFor`, before the final `return ''`:

```js
  if (stepName === 'Ingest & Analyze' && !data.analysis) {
    return 'Choose your project folder — the analysis pre-fills the next steps.';
  }
```

Also update the stale seam comment at the top of the file (line 2) to: `// stepsFor(scenario) branches the flow per scenario.`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/components/steps.js specdd-kit/website/src/components/steps.test.js
git commit -m "feat(specdd-kit): brownfield step branch with ingest validation"
```

---

### Task 6: Wizard UI — enable Brownfield, IngestStep, pre-population, skipped preview group

**Files:**
- Create: `specdd-kit/website/src/components/IngestStep.jsx`
- Modify: `specdd-kit/website/src/components/Wizard.jsx`

**Interfaces:**
- Consumes: `analyzeProject` (Task 2/3), `generateScaffold` (Task 4), `stepsFor`/`errorFor` (Task 5).
- Produces UI hooks for Task 7's e2e: `folder-input` (the webkitdirectory input), `analysis-summary` (visible after analysis), `skipped-group` (preview details for skipped collisions). Existing testids unchanged.

- [ ] **Step 1: Create `specdd-kit/website/src/components/IngestStep.jsx`**

```jsx
import { useState } from 'react';
import { analyzeProject } from './analyzer.js';

// Folder ingestion for the Brownfield scenario. All analysis happens in-browser via
// the File API; only manifest files are ever read.
export default function IngestStep({ data, skippedCount, onAnalyzed }) {
  const [busy, setBusy] = useState(false);

  async function onPick(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    try {
      const folderName = files[0].webkitRelativePath.split('/')[0];
      const prefix = folderName.length + 1;
      const byPath = new Map(files.map((f) => [f.webkitRelativePath.slice(prefix), f]));
      const analysis = await analyzeProject({
        folderName,
        paths: [...byPath.keys()],
        readFile: (p) => byPath.get(p).text(),
      });
      onAnalyzed(analysis, [...byPath.keys()]);
    } finally {
      setBusy(false);
    }
  }

  const a = data.analysis;
  return (
    <>
      <p className="b-lead">
        Pick your project folder. The analysis runs 100% in your browser — no file
        ever leaves your machine. Only manifest files (package.json and friends) are
        read; everything else contributes its path only.
      </p>
      <label>Project folder *</label>
      <input type="file" data-testid="folder-input" webkitdirectory="" directory="" multiple
        onChange={onPick} disabled={busy} />
      {busy && <p className="b-lead">Analyzing…</p>}
      {a && !busy && (
        <div className="b-cards" data-testid="analysis-summary">
          <div className="b-card">
            <strong>{a.projectName}</strong>
            <p>{a.fileCount} files scanned{a.truncated ? ' (truncated at the scan cap)' : ''} · manifests: {a.manifestsFound.join(', ') || 'none'}</p>
          </div>
          <div className="b-card">
            <strong>Stack</strong>
            <p>{[a.stack.frontend, a.stack.backend, a.stack.testing, a.stack.database].filter(Boolean).join(' · ') || 'not detected'}{a.stack.languages.length ? ` · ${a.stack.languages.join(', ')}` : ''}</p>
          </div>
          <div className="b-card">
            <strong>Suggestions</strong>
            <p>{a.domains.length} domains · {a.entities.length} entities — editable in the next steps</p>
          </div>
          <div className="b-card">
            <strong>Collisions</strong>
            <p>{skippedCount} scaffold file(s) already exist in your project and will be skipped</p>
          </div>
        </div>
      )}
      {a && !busy && <p className="b-lead">Re-pick a folder to re-run the analysis.</p>}
    </>
  );
}
```

- [ ] **Step 2: Wire the wizard — model, brownfield card, ingest render, pre-population, scaffold call**

In `Wizard.jsx`:

a) Imports — replace the `generateFiles` import and add the new component:

```jsx
import { generateScaffold } from './generators.js';
import IngestStep from './IngestStep.jsx';
```

b) Model — in `initial`, after `scenario: 'greenfield',` add:

```jsx
  analysis: null, existingPaths: [],
```

c) Enable the Brownfield card — replace the disabled button (lines 88-91) with:

```jsx
              <button type="button" data-testid="scenario-brownfield"
                className={`b-card ${data.scenario === 'brownfield' ? 'b-card--active' : ''}`}
                onClick={() => set({ scenario: 'brownfield' })}>
                <strong>Brownfield</strong>
                <p>Existing project — pick your folder and the wizard analyzes it in your browser to pre-fill the flow.</p>
              </button>
```

d) Scenario-switch safety — when the scenario changes, the step list changes length; clamp navigation state. Replace both `onClick` handlers of the scenario cards to call a shared helper defined next to `next()`:

```jsx
  function chooseScenario(scenario) {
    set({ scenario });
    setMaxVisited((m) => Math.min(m, 1)); // steps after Scenario differ per branch — revisit them
  }
```

(cards call `onClick={() => chooseScenario('greenfield')}` / `chooseScenario('brownfield')`).

e) Scaffold + skipped — replace the `files` computation (line 50-51):

```jsx
  const last = step === steps.length - 1;
  const needsScaffold = last || stepName === 'Ingest & Analyze';
  const { files, skipped } = needsScaffold ? generateScaffold(kitFiles, data) : { files: {}, skipped: [] };
```

and in `download()` replace `generateFiles(kitFiles, data)` with `generateScaffold(kitFiles, data).files`.

f) Pre-population handler — add next to `chooseScenario`:

```jsx
  function applyAnalysis(analysis, existingPaths) {
    setData((d) => ({
      ...d,
      analysis, existingPaths,
      project: {
        ...d.project,
        name: analysis.projectName || d.project.name,
        description: analysis.description || d.project.description,
      },
      stack: {
        ...d.stack,
        frontend: analysis.stack.frontend || d.stack.frontend,
        backend: analysis.stack.backend || d.stack.backend,
        testing: analysis.stack.testing || d.stack.testing,
        database: analysis.stack.database || d.stack.database,
        languages: analysis.stack.languages.length ? analysis.stack.languages : d.stack.languages,
      },
      domains: analysis.domains.length ? analysis.domains : d.domains,
      entities: analysis.entities.length ? analysis.entities : d.entities,
    }));
  }
```

g) Ingest step render — add after the `'Scenario'` block:

```jsx
          {stepName === 'Ingest & Analyze' && (
            <IngestStep data={data} skippedCount={skipped.length} onAnalyzed={applyAnalysis} />
          )}
```

h) Preview skipped group — inside the `'Preview / Download'` IIFE, after the `groups` render, add a sibling block (inside the `data-testid="preview"` div, after the `groups.map`):

```jsx
                  {skipped.length > 0 && (
                    <details data-testid="skipped-group" open>
                      <summary>Skipped — already exist in your project ({skipped.length})</summary>
                      <pre className="b-preview">{skipped.join('\n')}</pre>
                    </details>
                  )}
```

- [ ] **Step 3: Verify unit tests and build**

Run: `npm run test:unit -w sdd-kit-wizard` — Expected: PASS (no unit tests touch the UI).
Run: `npm run build -w sdd-kit-wizard` — Expected: build succeeds.

- [ ] **Step 4: Non-interactive smoke check**

Start `npm run dev -w sdd-kit-wizard` in the background, `curl -s http://localhost:4321 | grep -o 'Wizard'` to confirm the island renders, then stop the server. (Full interaction is covered by Task 7's e2e.)

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/components/Wizard.jsx specdd-kit/website/src/components/IngestStep.jsx
git commit -m "feat(specdd-kit): brownfield ingest step with in-browser analysis and skipped preview"
```

---

### Task 7: Brownfield e2e + full verification

**Files:**
- Create: `specdd-kit/website/e2e/fixtures/brownfield-sample/package.json`
- Create: `specdd-kit/website/e2e/fixtures/brownfield-sample/README.md`
- Create: `specdd-kit/website/e2e/fixtures/brownfield-sample/src/auth/login.js`
- Create: `specdd-kit/website/e2e/fixtures/brownfield-sample/src/billing/invoice.js`
- Create: `specdd-kit/website/e2e/fixtures/brownfield-sample/models/User.ts`
- Modify: `specdd-kit/website/e2e/wizard.spec.js` (ADD a test; the greenfield test stays untouched)

**Interfaces:**
- Consumes: UI hooks from Task 6 (`scenario-brownfield`, `folder-input`, `analysis-summary`, `skipped-group`) plus existing testids.

- [ ] **Step 1: Create the fixture project**

`package.json`:

```json
{
  "name": "acme-shop",
  "description": "A sample shop",
  "dependencies": { "react": "^18.0.0", "express": "^4.18.0" },
  "devDependencies": { "vitest": "^1.0.0" }
}
```

`README.md`:

```markdown
# acme-shop
Existing project readme — must survive scaffolding untouched.
```

`src/auth/login.js`: `export const login = () => 'ok';`
`src/billing/invoice.js`: `export const invoice = () => 42;`
`models/User.ts`: `export interface User { id: string }`

- [ ] **Step 2: Add the brownfield e2e test**

Append to `specdd-kit/website/e2e/wizard.spec.js`:

```js
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'brownfield-sample');

test('brownfield wizard analyzes a folder, pre-fills steps, skips collisions', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();

  await page.getByTestId('next-btn').click(); // -> Scenario
  await page.getByTestId('scenario-brownfield').click();
  await page.getByTestId('next-btn').click(); // -> Ingest & Analyze

  await page.getByTestId('next-btn').click(); // validation blocks (no folder yet)
  await expect(page.getByTestId('error')).toBeVisible();

  await page.getByTestId('folder-input').setInputFiles(fixtureDir);
  await expect(page.getByTestId('analysis-summary')).toBeVisible();
  await expect(page.getByTestId('analysis-summary')).toContainText('acme-shop');
  await page.getByTestId('next-btn').click(); // -> Project (pre-filled)

  await expect(page.getByTestId('project-name')).toHaveValue('acme-shop');
  await page.getByTestId('next-btn').click(); // -> Tech Stack (React pre-filled)
  await expect(page.locator('.b-main__body input').first()).toHaveValue('React');
  await page.getByTestId('next-btn').click(); // -> Domains & Entities (pre-suggested)
  await page.getByTestId('next-btn').click(); // -> Features
  await page.getByTestId('next-btn').click(); // -> Principles
  await page.getByTestId('next-btn').click(); // -> MCP Tools
  await page.getByTestId('next-btn').click(); // -> Agents & Tools
  await page.getByTestId('next-btn').click(); // -> Security
  await page.getByTestId('next-btn').click(); // -> Preview

  await expect(page.getByTestId('preview')).toContainText('.agents/workflows/spec-converge.md');
  await expect(page.getByTestId('preview')).toContainText('context/brownfield-analysis.md');
  await expect(page.getByTestId('preview')).toContainText('.agents/skills/auth/SKILL.md');
  await expect(page.getByTestId('skipped-group')).toContainText('README.md');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toContain('scaffold.zip');
});
```

Note: `setInputFiles(fixtureDir)` uploads a directory to a `webkitdirectory` input (supported by the installed @playwright/test ^1.42). If the installed minor rejects directory paths, update the devDependency to the latest 1.x in `specdd-kit/website/package.json` (`npm install -w sdd-kit-wizard -D @playwright/test@^1.49.0`) and note it in the report.

- [ ] **Step 3: Run the kit e2e**

Run: `npm test -w sdd-kit-wizard`
Expected: 2 passed (greenfield + brownfield). If the brownfield test fails on a selector, fix the implementation testid only if it deviates from Task 6's spec; otherwise adapt minimally and note it.

- [ ] **Step 4: Full verification**

- `npm run test:unit -w sdd-kit-wizard` — all unit tests pass
- `npm run build -w sdd-kit-wizard` — succeeds
- `npm run build -w specdd-platform` — succeeds
- `npm test -w specdd-platform` — platform e2e passes (it does not exercise the brownfield flow; investigate any failure before touching platform code)
- Confidentiality sweep: `git grep -nE '\bV[0-9]+(\.[0-9]+)?\b' -- ':!node_modules'` — no hits in files this plan touched.

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/e2e
git commit -m "test(specdd-kit): brownfield e2e with fixture project and collision assertions"
```

---

## Self-review notes

- **Spec coverage:** webkitdirectory ingestion → Tasks 6-7; manifest/structure/filename analysis with caps and truncation → Tasks 2-3; collision exclude-and-report with the analysis-report exemption → Task 4; `spec-converge.md` brownfield-only → Task 1; analysis report with kickoff instruction → Task 4; 12-step brownfield flow + ingest validation → Task 5; enabled Brownfield card, pre-population (detected non-empty values overwrite), privacy note, summary cards, re-pick, skipped preview group → Task 6; e2e with fixture → Task 7. Out-of-scope items (FSA API, content parsing, monorepo selection, merge tooling) have no tasks by design.
- **Type consistency:** `analyzeProject({folderName, paths, readFile})` (Tasks 2/3/6), `generateScaffold(...) → {files, skipped}` (Tasks 4/6), step name `'Ingest & Analyze'` (Tasks 5/6/7), testids `folder-input`/`analysis-summary`/`skipped-group` (Tasks 6/7) — all match.
- `MAX_DOMAINS` (8) and the primer ≤40-line guarantee are respected: `suggestDomains` caps at 8 before the wizard ever sees them.
