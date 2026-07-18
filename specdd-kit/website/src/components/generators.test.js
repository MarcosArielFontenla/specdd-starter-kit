// src/components/generators.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFiles, renderMcpJson, slugify, renderPrimer, renderAdapter, renderRegistry, renderRouting, renderSkillSkeleton, renderRubric, renderSpecYaml, renderBudgetManifest, renderFeaturesSpec } from './generators.js';

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
    assert.ok(!/\bV5(\.\d+)?\b/.test(contents), `version tag leaked in ${path}`);
  }
});
