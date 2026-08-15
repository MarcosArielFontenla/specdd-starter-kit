import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProject, MAX_PATHS, suggestDomains, suggestEntities, detectLegacyHarness } from './analyzer.js';

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
  assert.equal(a.analysisDepth, 'structural');
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

test('ignored dirs do not consume the path budget', async () => {
  const noise = Array.from({ length: MAX_PATHS + 100 }, (_, i) => `node_modules/pkg/f${i}.js`);
  const a = await analyzeProject({
    folderName: 'noisy',
    paths: [...noise, 'package.json', 'src/auth/login.js', 'src/auth/token.js'],
    readFile: (p) => (p === 'package.json' ? Promise.resolve('{"name":"noisy-app","dependencies":{"react":"1"}}') : Promise.reject(new Error('no'))),
  });
  assert.equal(a.projectName, 'noisy-app');       // manifest survived the noise
  assert.equal(a.stack.frontend, 'React');
  assert.deepEqual(a.domains, ['auth']);
  assert.equal(a.truncated, false);               // visible paths are far below the cap
  assert.equal(a.fileCount, 3);
});

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

test('suggestions never contain markdown-table-breaking characters', () => {
  assert.deepEqual(suggestDomains(['src/bad|name/a.js', 'src/ok/a.js', 'src/ok/b.js']), ['ok']);
  assert.deepEqual(suggestEntities(['src/x/we|rd.entity.ts', 'src/x/Good.entity.ts']), ['Good']);
});

test('detectLegacyHarness classifies mechanism vs knowledge', () => {
  const r = detectLegacyHarness([
    'AGENTS.md', 'SYSTEM_PROMPT.md', 'CLAUDE.md',
    '.github/copilot-instructions.md',
    '.agents/AGENTS.md', '.agents/scripts/validate-agent-architecture.ps1',
    '.agents/subagents/frontend-developer.agent.md',
    '.agents/skills/angular-core/SKILL.md', '.agents/skills/testing/assets/TEST-TEMPLATE.md',
    '.agents/patterns/coding.md', '.agents/adrs/001-initial.md',
    '.claude/skills/foo/SKILL.md', '.cursor/rules/core.mdc',
    'src/app/main.ts', 'README.md', 'package.json',
  ]);
  assert.equal(r.detected, true);
  assert.deepEqual(r.knowledge, [
    '.agents/adrs/001-initial.md',
    '.agents/patterns/coding.md',
    '.agents/skills/angular-core/SKILL.md',
    '.agents/skills/testing/assets/TEST-TEMPLATE.md',
    '.claude/skills/foo/SKILL.md',
  ]);
  assert.deepEqual(r.mechanism, [
    '.agents/AGENTS.md',
    '.agents/scripts/validate-agent-architecture.ps1',
    '.agents/subagents/frontend-developer.agent.md',
    '.cursor/rules/core.mdc',
    '.github/copilot-instructions.md',
    'AGENTS.md', 'CLAUDE.md', 'SYSTEM_PROMPT.md',
  ]);
});

test('no false positives on a harness-free repo', () => {
  const r = detectLegacyHarness(['src/index.js', 'README.md', '.github/workflows/ci.yml', 'docs/agents-overview.md']);
  assert.deepEqual(r, { detected: false, mechanism: [], knowledge: [] });
});

test('analyzeProject exposes legacyHarness from RAW paths (dot-folders included)', async () => {
  const a = await analyzeProject({
    folderName: 'legacy',
    paths: ['.agents/skills/old/SKILL.md', 'AGENTS.md', 'src/index.js'],
    readFile: () => Promise.reject(new Error('no')),
  });
  assert.equal(a.legacyHarness.detected, true);
  assert.deepEqual(a.legacyHarness.knowledge, ['.agents/skills/old/SKILL.md']);
  assert.deepEqual(a.legacyHarness.mechanism, ['AGENTS.md']);
});

test('unavailable semantic depth falls back to structural analysis', async () => {
  const a = await analyzeProject({
    folderName: 'future-mode',
    analysisDepth: 'semantic',
    paths: ['package.json'],
    readFile: reader({ 'package.json': '{"name":"future-mode"}' }),
  });
  assert.equal(a.analysisDepth, 'structural');
});
