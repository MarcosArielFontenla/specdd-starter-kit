import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFiles, renderMcpJson, promptsFor } from './generators.js';

const baseSkills = { 'story-writing': '# story-writing body', 'code-review': '# code-review body' };
const baBase = {
  persona: 'BA',
  agent: { primary: 'GitHub Copilot', model: 'gpt-4o' },
  project: { name: 'Acme', featureTitle: 'Login', featureSlug: 'login' },
  context: { text: 'some context' },
  security: { classification: 'internal', regulatory: 'none' },
  ba: { strategy: '555', storyHierarchy: 'Epic→Feature→Story', sizing: 'Fibonacci', style: 'Gherkin' },
  skills: ['story-writing'],
  mcp: { figma: false, playwright: false },
};

test('BA persona generates its prompts, instructions, context and selected skills', () => {
  const out = generateFiles(baseSkills, baBase);
  assert.match(out['README.md'], /Acme/);
  assert.ok(out['.github/copilot-instructions.md'].includes('GitHub Copilot'));
  assert.ok('.github/instructions/specforge-ba.instructions.md' in out);
  assert.ok('.github/prompts/specforge-requirements.prompt.md' in out);
  assert.ok('.github/prompts/specforge-stories.prompt.md' in out);
  assert.ok('context/login.md' in out);
  assert.equal(out['skills/story-writing.md'], '# story-writing body');
  assert.ok(!('skills/code-review.md' in out)); // not selected
  assert.ok(!('.vscode/mcp.json' in out));       // no mcp
});

test('QA automated adds playwright prompt + playwright mcp; manual does not', () => {
  const qaAuto = { ...baBase, persona: 'QA', ba: undefined, qa: { approach: 'automated' }, mcp: { figma: false, playwright: true } };
  const outA = generateFiles(baseSkills, qaAuto);
  assert.ok('.github/prompts/specforge-playwright.prompt.md' in outA);
  assert.ok('.vscode/mcp.json' in outA);
  assert.ok(JSON.parse(outA['.vscode/mcp.json']).servers.playwright);

  const qaManual = { ...qaAuto, qa: { approach: 'manual' }, mcp: { figma: false, playwright: false } };
  const outM = generateFiles(baseSkills, qaManual);
  assert.ok(!('.github/prompts/specforge-playwright.prompt.md' in outM));
  assert.ok(!('.vscode/mcp.json' in outM));
});

test('UX with figma adds setupfigmamcp prompt + figma mcp placeholders', () => {
  const ux = { ...baBase, persona: 'UX', ba: undefined, ux: { designSystem: 'Motif', figmaEnabled: true, figmaUrl: 'https://figma.com/x' }, mcp: { figma: true, playwright: false } };
  const out = generateFiles(baseSkills, ux);
  assert.ok('.github/prompts/specforge-setupfigmamcp.prompt.md' in out);
  const mcp = JSON.parse(out['.vscode/mcp.json']);
  assert.ok(mcp.servers.figma);
  assert.match(JSON.stringify(mcp), /\$\{input:/);
});

test('no ADO commands or servers are ever generated', () => {
  for (const persona of ['BA', 'QA', 'Dev', 'UX']) {
    const cmds = promptsFor({ ...baBase, persona, ba:{}, qa:{approach:'automated'}, dev:{}, ux:{figmaEnabled:true} });
    assert.ok(!cmds.some((c) => /ado|publishspecs/i.test(c)), `${persona} must not include ADO commands`);
  }
  const json = renderMcpJson({ figma: true, playwright: true });
  assert.ok(!/azure|ado|devops/i.test(json));
});
