// src/components/generators.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFiles, generateScaffold, SCAFFOLD_MANIFEST_PATH, renderMcpJson, slugify, renderPrimer, renderAdapter, renderRegistry, renderRouting, renderSkillSkeleton, renderRubric, renderSpecYaml, renderBudgetManifest, renderFeaturesSpec, renderBrownfieldAnalysis, renderMigrationTasks } from './generators.js';

const base = { 'README.md': 'base', 'context/keep.md': 'keep' };
const input = {
  project: { name: 'Acme', description: 'desc', problem: 'prob' },
  personas: ['Admin'], outcomes: { user: 'u', business: 'b' },
  constraints: { business: 'bc', technical: 'tc' },
  stack: { languages: ['TypeScript'], frontend: 'React', backend: 'NestJS', testing: 'Vitest', database: 'PostgreSQL', infra: 'Docker', swagger: true, a11y: true },
  principles: ['Spec first'],
  mcp: ['github', 'postgresql'],
  tools: ['GitHub Copilot'],
  model: 'gpt-4o',
  security: { classification: 'internal', owaspControls: ['A01'] },
  features: [],
};

const harnessInput = {
  ...input,
  scenario: 'greenfield',
  domains: ['Auth', 'Billing & Invoicing'],
  entities: ['User', 'Invoice'],
  features: ['User can sign up', 'Monthly invoice generation'],
  tools: ['GitHub Copilot', 'Claude Code'],
  model: 'default',
};

test('generateFiles keeps base and overlays dynamic files', () => {
  const out = generateFiles(base, input);
  assert.equal(out['README.md'], 'base');            // base preserved
  assert.equal(out['context/keep.md'], 'keep');
  assert.match(out['context/project.md'], /Acme/);
  assert.match(out['context/tech-stack.md'], /React/);
  assert.match(out['context/constitution.md'], /Spec first/);
  assert.match(out['.github/copilot-instructions.md'], /AGENTS\.md/);
  assert.ok('.vscode/mcp.json' in out);               // mcp selected
  assert.ok(!('specs/features-spec.md' in out));       // empty features
});

test('no mcp.json when no MCP tools selected', () => {
  const out = generateFiles(base, { ...input, mcp: [] });
  assert.ok(!('.vscode/mcp.json' in out));
});

test('mcp.json contains only placeholders, no secrets', () => {
  const json = JSON.parse(renderMcpJson(['github']));
  const serialized = JSON.stringify(json);
  assert.match(serialized, /\$\{input:/);              // uses placeholders
  assert.ok(!/gh[pousr]_[A-Za-z0-9]/.test(serialized)); // no token-looking values
});

test('slugify normalizes domain names', () => {
  assert.equal(slugify('Billing & Invoicing'), 'billing-invoicing');
  assert.equal(slugify('  Auth  '), 'auth');
});

test('primer is <=40 lines, has frontmatter, one row per domain', () => {
  const primer = renderPrimer({ ...harnessInput, domains: ['a','b','c','d','e','f','g','h'] }, '2026-07-18');
  assert.ok(primer.split('\n').length <= 40, `primer has ${primer.split('\n').length} lines`);
  assert.match(primer, /^---\n/);
  assert.match(primer, /registry: \.agents\/REGISTRY\.md/);
  const short = renderPrimer(harnessInput, '2026-07-18');
  assert.match(short, /\.agents\/skills\/auth\/SKILL\.md/);
  assert.match(short, /\.agents\/skills\/billing-invoicing\/SKILL\.md/);
  assert.match(short, /session_summary/);
});

test('adapters: <=5 lines, zero rules, correct paths', () => {
  const claude = renderAdapter('Claude Code');
  assert.equal(claude.path, 'CLAUDE.md');
  assert.ok(claude.content.split('\n').filter(Boolean).length <= 5);
  assert.match(claude.content, /AGENTS\.md/);
  assert.equal(renderAdapter('GitHub Copilot').path, '.github/copilot-instructions.md');
  assert.equal(renderAdapter('Gemini').path, 'GEMINI.md');
  assert.equal(renderAdapter('Cursor'), null);
  assert.equal(renderAdapter('Codex'), null);
});

test('registry lists per-domain and per-entity artifacts + systems status', () => {
  const reg = renderRegistry(harnessInput, '2026-07-18');
  assert.match(reg, /role: registry/);
  assert.match(reg, /\.agents\/skills\/auth\/SKILL\.md/);
  assert.match(reg, /\.agents\/specs\/user\.spec\.yaml/);
  assert.match(reg, /\.agents\/evals\/rubrics\/billing-invoicing\.yaml/);
  assert.match(reg, /Multi-Agent \| inactive/);
  assert.match(reg, /Evals Loop \| log_only/);
});

test('routing has one row per domain and a fallback rule', () => {
  const routing = renderRouting(harnessInput);
  assert.match(routing, /\| Auth work \| \.agents\/skills\/auth\/SKILL\.md \|/);
  assert.match(routing, /\| Billing & Invoicing work \| \.agents\/skills\/billing-invoicing\/SKILL\.md \|/);
  assert.match(routing, /No match\?/);
});

test('skill skeleton has harness frontmatter with pointer-only drift policy', () => {
  const skill = renderSkillSkeleton('Billing & Invoicing');
  assert.match(skill, /name: billing-invoicing/);
  assert.match(skill, /snapshotPath: \.agents\/cold-start\/snapshots\/billing-invoicing\.snapshot\.md/);
  assert.match(skill, /driftPolicyPath: \.agents\/evals\/rubrics\/billing-invoicing\.yaml/);
  assert.ok(!/driftPolicy:\n/.test(skill)); // pointer only — never inline
});

test('rubric starts at log_only with median aggregation', () => {
  const rubric = renderRubric('Auth');
  assert.match(rubric, /skill: auth/);
  assert.match(rubric, /reviewTriggerAction: log_only/);
  assert.match(rubric, /aggregation: median/);
  assert.match(rubric, /ciFailConsecutiveWindows: 2/);
});

test('spec yaml is placeholder-status with placeholder checks and empty clarifications', () => {
  const spec = renderSpecYaml('Invoice');
  assert.match(spec, /entity: Invoice/);
  assert.match(spec, /status: placeholder/);
  assert.match(spec, /command: placeholder/);
  assert.match(spec, /clarifications: \[\]/);
  assert.match(spec, /reviewedBy: null/);
});

test('budget manifest has one task class per domain referencing real artifacts', () => {
  const manifest = renderBudgetManifest(harnessInput);
  assert.match(manifest, /budgetLines: 500/);
  assert.match(manifest, /- name: Auth work/);
  assert.match(manifest, /\.agents\/skills\/billing-invoicing\/SKILL\.md/);
});

test('features spec lists captured features as unchecked items', () => {
  const spec = renderFeaturesSpec(harnessInput);
  assert.match(spec, /- \[ \] User can sign up/);
  assert.match(spec, /- \[ \] Monthly invoice generation/);
});

test('constitution includes selected OWASP controls', () => {
  const out = generateFiles(base, { ...input, security: { classification: 'internal', owaspControls: ['A01 Broken Access Control', 'A03 Injection'] } });
  assert.match(out['context/constitution.md'], /A01 Broken Access Control/);
  assert.match(out['context/constitution.md'], /A03 Injection/);
  const none = generateFiles(base, { ...input, security: { classification: 'internal', owaspControls: [] } });
  assert.match(none['context/constitution.md'], /OWASP focus: baseline/);
});

const baseWithGithub = { ...base, '.github/prompts/specdd-specify.prompt.md': 'copilot prompt' };

const brownInput = {
  ...harnessInput,
  scenario: 'brownfield',
  existingPaths: ['README.md', 'src/auth/login.js', '.github/prompts/specdd-specify.prompt.md'],
  analysis: {
    projectName: 'acme-shop', description: 'A sample shop',
    stack: { languages: ['TypeScript'], frontend: 'React', backend: 'Express', testing: 'Vitest', database: 'PostgreSQL' },
    domains: ['auth', 'billing'], entities: ['User'], features: ['catalog'],
    manifestsFound: ['package.json'], fileCount: 42, truncated: false,
    semantic: {
      filesRead: ['README.md'], totalChars: 120, confidence: 'high',
      architecture: [{ value: 'Modular monolith', source: 'README.md', confidence: 'high' }],
      evidence: [{ category: 'stack', value: 'xUnit', source: 'README.md', confidence: 'high', detail: 'test evidence' }],
      filesSkipped: [],
    },
  },
  contextReview: {
    approved: true,
    stack: [{ field: 'frontend', label: 'Frontend', value: 'React', selected: true, status: 'architectural', source: 'README.md', confidence: 'high' }],
    domains: [
      { value: 'auth', selected: true, status: 'implemented', source: 'folder structure', confidence: 'high' },
      { value: 'billing', selected: false, status: 'planned', source: 'folder structure', confidence: 'medium' },
    ],
    entities: [{ value: 'User', selected: true, status: 'implemented', source: 'filename pattern', confidence: 'high' }],
    features: [{ value: 'catalog', selected: true, status: 'planned', source: 'folder structure', confidence: 'medium' }],
    architecture: [{ value: 'Modular monolith', selected: true, status: 'architectural', source: 'README.md', confidence: 'high' }],
  },
};

const legacyInput = {
  ...brownInput,
  legacyAck: true,
  analysis: {
    ...brownInput.analysis,
    legacyHarness: {
      detected: true,
      mechanism: ['.agents/AGENTS.md', 'AGENTS.md', 'SYSTEM_PROMPT.md'],
      knowledge: ['.agents/patterns/coding.md', '.agents/skills/angular-core/SKILL.md'],
    },
  },
};

test('greenfield output contains the harness core', () => {
  const out = generateFiles(baseWithGithub, harnessInput, '2026-07-18');
  assert.ok('AGENTS.md' in out);
  assert.ok('.agents/REGISTRY.md' in out);
  assert.ok('.agents/orchestration/ROUTING.md' in out);
  assert.ok('.agents/cold-start/budget-manifest.yaml' in out);
  assert.ok('.agents/skills/auth/SKILL.md' in out);
  assert.ok('.agents/evals/rubrics/auth.yaml' in out);
  assert.ok('.agents/specs/user.spec.yaml' in out);
  assert.ok('CLAUDE.md' in out);                                  // Claude Code adapter
  assert.ok('specs/features-spec.md' in out);
  assert.ok(!Object.keys(out).some((p) => p.includes('spec-converge'))); // greenfield: no converge
});

test('.github content ships only when Copilot is selected', () => {
  const withCopilot = generateFiles(baseWithGithub, harnessInput, '2026-07-18');
  assert.ok('.github/prompts/specdd-specify.prompt.md' in withCopilot);
  assert.match(withCopilot['.github/copilot-instructions.md'], /AGENTS\.md/); // pointer adapter

  const noCopilot = generateFiles(baseWithGithub, { ...harnessInput, tools: ['Claude Code'] }, '2026-07-18');
  assert.ok(!Object.keys(noCopilot).some((p) => p.startsWith('.github/')));
});

test('adapters carry zero rules and generated content carries no private version tags', () => {
  const out = generateFiles(baseWithGithub, harnessInput, '2026-07-18');
  for (const adapterPath of ['CLAUDE.md', '.github/copilot-instructions.md']) {
    assert.ok(out[adapterPath].split('\n').filter(Boolean).length <= 5, `${adapterPath} too long`);
  }
  for (const [path, contents] of Object.entries(out)) {
    if (path === '.github/prompts/specdd-specify.prompt.md') continue; // base fixture, not generated
    assert.ok(!/\bV\d+(\.\d+)?\b/.test(contents), `version tag leaked in ${path}`);
  }
  const brown = generateScaffold(baseWithGithub, brownInput, '2026-07-18').files;
  for (const [path, contents] of Object.entries(brown)) {
    if (path === '.github/prompts/specdd-specify.prompt.md') continue;
    assert.ok(!/\bV\d+(\.\d+)?\b/.test(contents), `version tag leaked in ${path}`);
  }
  const legacy = generateScaffold(baseWithHarnessCollisions, legacyInput, '2026-07-18').files;
  for (const [path, contents] of Object.entries(legacy)) {
    if (path === '.github/prompts/specdd-specify.prompt.md' || path === '.agents/workflows/spec-converge.md') continue;
    assert.ok(!/\bV\d+(\.\d+)?\b/.test(contents), `version tag leaked in ${path}`);
  }
});

test('generateScaffold greenfield: same files as generateFiles, nothing skipped', () => {
  const { files, skipped } = generateScaffold(baseWithGithub, harnessInput, '2026-07-18');
  assert.deepEqual(files, generateFiles(baseWithGithub, harnessInput, '2026-07-18'));
  assert.deepEqual(skipped, []);
  assert.ok(!('context/brownfield-analysis.md' in files));
});

test('scaffold manifest lists generated files and selected context', () => {
  const out = generateFiles(baseWithGithub, harnessInput, '2026-07-18');
  const manifest = JSON.parse(out[SCAFFOLD_MANIFEST_PATH]);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.scenario, 'greenfield');
  assert.ok(manifest.generatedFiles.includes(SCAFFOLD_MANIFEST_PATH));
  assert.deepEqual(manifest.selected.domains, harnessInput.domains);
  assert.ok(manifest.generatedFiles.includes('.agents/skills/auth/SKILL.md'));
});

test('generateScaffold brownfield: collisions excluded and reported, analysis report always emitted', () => {
  const baseWithBoth = { ...base, '.github/prompts/specdd-specify.prompt.md': 'copilot prompt', '.agents/workflows/spec-converge.md': 'converge workflow' };
  const { files, skipped } = generateScaffold(baseWithBoth, brownInput, '2026-07-18');
  assert.ok(!('README.md' in files));                                    // collision dropped
  assert.ok(!('.github/prompts/specdd-specify.prompt.md' in files));     // collision dropped
  assert.deepEqual(skipped, ['.github/prompts/specdd-specify.prompt.md', 'README.md']);
  assert.ok('.agents/workflows/spec-converge.md' in files);              // converge ships
  const report = files['context/brownfield-analysis.md'];
  assert.match(report, /acme-shop/);
  assert.match(report, /Analysis level: Level 1 — Structural bootstrap/);
  assert.match(report, /React/);
  assert.match(report, /- auth/);
  assert.match(report, /Suggested features/);
  assert.match(report, /- catalog/);
  assert.match(report, /Semantic context \(Level 2\)/);
  assert.match(report, /Modular monolith/);
  assert.match(report, /xUnit.*README\.md/);
  assert.match(report, /Human context review/);
  assert.match(report, /Approval: approved/);
  assert.match(report, /Frontend: React.*architectural/);
  assert.match(report, /billing — excluded.*planned/);
  assert.match(report, /Architecture signal classifications/);
  assert.match(report, /Modular monolith.*architectural/);
  assert.match(report, /README\.md/);                                    // skipped list in report
  assert.match(report, /spec-converge/);                                 // kickoff instruction
  const manifest = JSON.parse(files[SCAFFOLD_MANIFEST_PATH]);
  assert.equal(manifest.contextReview.approved, true);
  assert.deepEqual(manifest.skippedPaths, skipped);
  assert.ok(manifest.generatedFiles.includes('context/brownfield-analysis.md'));
});

test('approved Brownfield context is the only source for generated project artifacts', () => {
  const approved = {
    ...brownInput,
    domains: ['auth', 'billing'],
    entities: ['User', 'Invoice'],
    features: ['catalog', 'legacy checkout'],
    contextReview: {
      ...brownInput.contextReview,
      approved: true,
      stack: [
        { field: 'frontend', label: 'Frontend', value: 'React', selected: false, status: 'unknown', source: 'README.md', confidence: 'medium' },
        { field: 'backend', label: 'Backend', value: 'Express', selected: true, status: 'implemented', source: 'package.json', confidence: 'high' },
      ],
      domains: [{ value: 'auth', selected: true, status: 'implemented', source: 'src/auth', confidence: 'high' }],
      entities: [{ value: 'User', selected: true, status: 'implemented', source: 'models/User.ts', confidence: 'high' }],
      features: [{ value: 'catalog', selected: true, status: 'planned', source: 'src/features/catalog', confidence: 'medium' }],
      architecture: [],
    },
  };
  const out = generateFiles(baseWithGithub, approved, '2026-07-18');
  assert.ok('.agents/skills/auth/SKILL.md' in out);
  assert.ok(!('.agents/skills/billing/SKILL.md' in out));
  assert.ok('.agents/specs/user.spec.yaml' in out);
  assert.ok(!('.agents/specs/invoice.spec.yaml' in out));
  assert.match(out['context/tech-stack.md'], /\*\*Frontend:\*\*\s*$/m);
  assert.match(out['context/tech-stack.md'], /\*\*Backend:\*\* Express/);
  assert.match(out['.agents/skills/auth/SKILL.md'], /Review status: implemented/);
  assert.match(out['.agents/specs/user.spec.yaml'], /reviewStatus: "implemented"/);
  assert.match(out['specs/features-spec.md'], /\| catalog \| planned \|/);
  assert.ok(!out['specs/features-spec.md'].includes('legacy checkout'));
});

test('analysis report is exempt from collision exclusion', () => {
  const baseWithBoth = { ...base, '.github/prompts/specdd-specify.prompt.md': 'copilot prompt', '.agents/workflows/spec-converge.md': 'converge workflow' };
  const { files } = generateScaffold(baseWithBoth,
    { ...brownInput, existingPaths: ['context/brownfield-analysis.md'] }, '2026-07-18');
  assert.ok('context/brownfield-analysis.md' in files);
});

test('brownfield report notes truncation', () => {
  const baseWithBoth = { ...base, '.github/prompts/specdd-specify.prompt.md': 'copilot prompt', '.agents/workflows/spec-converge.md': 'converge workflow' };
  const { files } = generateScaffold(baseWithBoth,
    { ...brownInput, analysis: { ...brownInput.analysis, truncated: true } }, '2026-07-18');
  assert.match(files['context/brownfield-analysis.md'], /truncated/i);
});

test('brownfield registry lists the converge workflow', () => {
  assert.match(renderRegistry({ ...harnessInput, scenario: 'brownfield' }, '2026-07-18'), /spec-converge\.md/);
  assert.ok(!/spec-converge/.test(renderRegistry(harnessInput, '2026-07-18')));
});

const baseWithConverge = { ...base, '.agents/workflows/spec-converge.md': 'converge workflow' };

test('spec-converge is filtered out of greenfield output even when bundled', () => {
  const out = generateFiles(baseWithConverge, harnessInput, '2026-07-18');
  assert.ok(!('.agents/workflows/spec-converge.md' in out));
});

test('spec-converge survives in brownfield output', () => {
  const out = generateFiles(baseWithConverge, { ...harnessInput, scenario: 'brownfield' }, '2026-07-18');
  assert.equal(out['.agents/workflows/spec-converge.md'], 'converge workflow');
});

test('migration tasks file: draft status, real paths, phases, defaults, questions', () => {
  const tasks = renderMigrationTasks(legacyInput, '2026-07-18');
  assert.match(tasks, /status: draft/);
  assert.match(tasks, /M001.*`\.agents\/AGENTS\.md`/);
  assert.match(tasks, /M003.*`SYSTEM_PROMPT\.md`/);
  assert.match(tasks, /K002.*`\.agents\/skills\/angular-core\/SKILL\.md`/);
  assert.match(tasks, /\.agents\/_archive\//);
  assert.match(tasks, /driftPolicyPath/);
  assert.match(tasks, /Phase 3 — Rewire/);
  assert.match(tasks, /validate-spec\.ps1/);
  assert.match(tasks, /Snapshots: deferred/);
  assert.match(tasks, /## Questions for the human/);
  assert.match(tasks, /C001/);
  assert.ok(!/\bV\d+(\.\d+)?\b/.test(tasks), 'migration tasks must not contain V-prefixed ids');
});

const baseWithHarnessCollisions = {
  ...baseWithGithub,
  '.agents/workflows/spec-converge.md': 'converge workflow',
};

test('acknowledged legacy harness: harness collisions replaced, others skipped', () => {
  const input2 = { ...legacyInput, existingPaths: ['AGENTS.md', 'CLAUDE.md', '.agents/REGISTRY.md', 'README.md'] };
  const { files, skipped, replaced } = generateScaffold(baseWithHarnessCollisions, input2, '2026-07-18');
  assert.deepEqual(replaced, ['.agents/REGISTRY.md', 'AGENTS.md', 'CLAUDE.md']);
  assert.ok('AGENTS.md' in files);                       // replaced → still shipped
  assert.ok('.agents/REGISTRY.md' in files);
  assert.deepEqual(skipped, ['README.md']);              // non-harness keeps never-clobber
  assert.ok(!('README.md' in files));
  assert.ok('.agents/specs/tasks/harness-migration.tasks.md' in files);
  const report = files['context/brownfield-analysis.md'];
  assert.match(report, /## Legacy harness detected/);
  assert.match(report, /SYSTEM_PROMPT\.md/);             // inventory listed
  assert.match(report, /harness-migration\.tasks\.md/);  // kickoff points to migration first
});

test('clean brownfield (no legacy) unchanged: no migration tasks, replaced empty', () => {
  const { files, skipped, replaced } = generateScaffold(baseWithGithub, brownInput, '2026-07-18');
  assert.deepEqual(replaced, []);
  assert.ok(!('.agents/specs/tasks/harness-migration.tasks.md' in files));
  assert.ok(!/Legacy harness detected/.test(files['context/brownfield-analysis.md']));
  assert.deepEqual(skipped, ['.github/prompts/specdd-specify.prompt.md', 'README.md']);
});

test('greenfield returns empty replaced and no migration artifacts', () => {
  const { files, skipped, replaced } = generateScaffold(baseWithGithub, harnessInput, '2026-07-18');
  assert.deepEqual(skipped, []);
  assert.deepEqual(replaced, []);
  assert.ok(!Object.keys(files).some((p) => p.includes('harness-migration')));
});
