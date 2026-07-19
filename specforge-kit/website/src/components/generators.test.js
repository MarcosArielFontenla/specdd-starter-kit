import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFiles, renderMcpJson, promptsFor, renderRoleSkill, renderRoleRubric, renderRoleSubagent, renderRoleWorkflow, renderRolePrompt, renderInstallTasks, renderPackReport } from './generators.js';

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

test('role skill: harness frontmatter with pointers, meta content, playbook index', () => {
  const skill = renderRoleSkill('QA', ['test-case-generation', 'qa-guardrails']);
  assert.match(skill, /name: role-qa/);
  assert.match(skill, /snapshotPath: \.agents\/cold-start\/snapshots\/role-qa\.snapshot\.md/);
  assert.match(skill, /driftPolicyPath: \.agents\/evals\/rubrics\/role-qa\.yaml/);
  assert.ok(!/driftPolicy:\n/.test(skill));
  assert.match(skill, /Quality Analyst — Role Skill/);
  assert.match(skill, /- Derive test cases from acceptance criteria/);
  assert.match(skill, /- assets\/test-case-generation\.md/);
});

test('role rubric starts at log_only with median aggregation', () => {
  const rubric = renderRoleRubric('BA');
  assert.match(rubric, /skill: role-ba/);
  assert.match(rubric, /reviewTriggerAction: log_only/);
  assert.match(rubric, /aggregation: median/);
  assert.match(rubric, /ciFailConsecutiveWindows: 2/);
});

test('role subagent carries the inactive note and skill pointer', () => {
  const sub = renderRoleSubagent('Dev');
  assert.match(sub, /name: role-dev/);
  assert.match(sub, /skill: \.agents\/skills\/role-dev\/SKILL\.md/);
  assert.match(sub, /INACTIVE/);
});

const packInput = {
  roles: ['QA', 'Dev'],
  qa: { approach: 'automated' },
  ux: { figmaEnabled: false },
  skillsByRole: { QA: ['test-case-generation'], Dev: ['story-to-code', 'code-review'] },
  tools: ['GitHub Copilot', 'Claude Code'],
  targetPaths: [],
  harness: { specdd: false, legacy: false },
};

test('role workflow is vendor-neutral and points at the role skill', () => {
  const wf = renderRoleWorkflow('QA', 'specforge-testcases');
  assert.match(wf, /\.agents\/skills\/role-qa\/SKILL\.md/);
  assert.match(wf, /never invent requirements/i);
  assert.ok(!/copilot|cursor|gemini|claude/i.test(wf), 'workflow must not name vendors');
});

test('copilot prompt is a pointer to the workflow', () => {
  const p = renderRolePrompt('Dev', 'specforge-implement');
  assert.match(p, /\.agents\/workflows\/role-dev\/specforge-implement\.md/);
  assert.match(p, /AGENTS\.md/);
});

test('install tasks: draft, one wiring set per role, C-prefixed gate ids', () => {
  const tasks = renderInstallTasks(packInput, '2026-07-19');
  assert.match(tasks, /status: draft/);
  assert.match(tasks, /Quality Analyst work \| \.agents\/skills\/role-qa\/SKILL\.md/);
  assert.match(tasks, /Developer work \| \.agents\/skills\/role-dev\/SKILL\.md/);
  assert.match(tasks, /40 lines/);
  assert.match(tasks, /C001/);
  assert.ok(!/\bV\d+(\.\d+)?\b/.test(tasks), 'no V-prefixed ids');
});

test('pack report covers roles, harness guidance and skipped list', () => {
  const withTarget = { ...packInput, targetPaths: ['src/a.js'], harness: { specdd: true, legacy: false } };
  const r1 = renderPackReport(withTarget, ['x/y.md'], '2026-07-19');
  assert.match(r1, /SpecDD Harness detected/);
  assert.match(r1, /- x\/y\.md/);
  const legacy = { ...packInput, targetPaths: ['src/a.js'], harness: { specdd: false, legacy: true } };
  assert.match(renderPackReport(legacy, [], '2026-07-19'), /Migrate it first/);
  assert.match(renderPackReport(packInput, [], '2026-07-19'), /No target project was ingested/);
  assert.match(renderPackReport(withTarget, [], '2026-07-19'), /role-pack-install\.tasks\.md/);
});
