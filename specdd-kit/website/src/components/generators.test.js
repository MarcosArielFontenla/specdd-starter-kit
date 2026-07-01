// src/components/generators.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFiles, renderMcpJson } from './generators.js';

const base = { 'README.md': 'base', 'context/keep.md': 'keep' };
const input = {
  project: { name: 'Acme', description: 'desc', problem: 'prob' },
  personas: ['Admin'], outcomes: { user: 'u', business: 'b' },
  constraints: { business: 'bc', technical: 'tc' },
  stack: { languages: ['TypeScript'], frontend: 'React', backend: 'NestJS', testing: 'Vitest', database: 'PostgreSQL', infra: 'Docker', swagger: true, a11y: true },
  principles: ['Spec first'],
  mcp: ['github', 'postgresql'],
  agent: { primary: 'GitHub Copilot', model: 'gpt-4o' },
  security: { classification: 'internal', owaspControls: ['A01'] },
  featuresSpec: '',
};

test('generateFiles keeps base and overlays dynamic files', () => {
  const out = generateFiles(base, input);
  assert.equal(out['README.md'], 'base');            // base preserved
  assert.equal(out['context/keep.md'], 'keep');
  assert.match(out['context/project.md'], /Acme/);
  assert.match(out['context/tech-stack.md'], /React/);
  assert.match(out['context/constitution.md'], /Spec first/);
  assert.match(out['.github/copilot-instructions.md'], /GitHub Copilot/);
  assert.ok('.vscode/mcp.json' in out);               // mcp selected
  assert.ok(!('specs/features-spec.md' in out));       // empty featuresSpec
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
