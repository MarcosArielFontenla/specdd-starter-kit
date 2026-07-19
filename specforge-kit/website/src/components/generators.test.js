import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePack, renderMcpJson, renderRoleSkill, renderRoleRubric, renderRoleSubagent, renderRoleWorkflow, renderRolePrompt, renderInstallTasks, renderPackReport } from './generators.js';

test('renderMcpJson embeds the figma key as an input placeholder, never ADO/Azure servers', () => {
  const json = renderMcpJson({ figma: true, playwright: true });
  assert.match(json, /\$\{input:figma_key\}/);
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
  assert.match(tasks, /generate-snapshots\.ps1 -Scaffold/);
  assert.match(tasks, /C003/);
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
  const collided = { ...packInput, targetPaths: ['.agents/specs/tasks/role-pack-install.tasks.md'], harness: { specdd: true, legacy: false } };
  assert.match(renderPackReport(collided, ['.agents/specs/tasks/role-pack-install.tasks.md'], '2026-07-19'), /did not overwrite/);
});

const baseSkills = { 'test-case-generation': 'tc playbook', 'story-to-code': 's2c', 'code-review': 'cr' };

test('generatePack assembles per-role artifacts and cross-cutting files', () => {
  const { files, skipped } = generatePack(baseSkills, packInput, '2026-07-19');
  assert.deepEqual(skipped, []);
  assert.ok('.agents/skills/role-qa/SKILL.md' in files);
  assert.equal(files['.agents/skills/role-qa/assets/test-case-generation.md'], 'tc playbook');
  assert.ok('.agents/skills/role-dev/assets/code-review.md' in files);
  assert.ok('.agents/evals/rubrics/role-qa.yaml' in files);
  assert.ok('.agents/workflows/role-qa/specforge-testcases.md' in files);
  assert.ok('.agents/workflows/role-qa/specforge-playwright.md' in files);   // approach=automated
  assert.ok('.agents/subagents/role-dev.agent.md' in files);
  assert.ok('.agents/specs/tasks/role-pack-install.tasks.md' in files);
  assert.ok('context/role-pack-report.md' in files);
  assert.ok('.vscode/mcp.json' in files);                                     // QA automated -> playwright
  assert.ok(!Object.keys(files).some((p) => p.includes('role-ba')), 'unselected roles absent');
});

test('copilot projection only when Copilot selected', () => {
  const withCopilot = generatePack(baseSkills, packInput, '2026-07-19').files;
  assert.ok('.github/prompts/specforge-testcases.prompt.md' in withCopilot);
  const without = generatePack(baseSkills, { ...packInput, tools: ['Claude Code'] }, '2026-07-19').files;
  assert.ok(!Object.keys(without).some((p) => p.startsWith('.github/')));
});

test('collisions with the target are skipped and reported; report is exempt', () => {
  const input2 = {
    ...packInput,
    targetPaths: ['.agents/evals/rubrics/role-qa.yaml', 'context/role-pack-report.md', 'src/a.js'],
    harness: { specdd: true, legacy: false },
  };
  const { files, skipped } = generatePack(baseSkills, input2, '2026-07-19');
  assert.deepEqual(skipped, ['.agents/evals/rubrics/role-qa.yaml']);
  assert.ok(!('.agents/evals/rubrics/role-qa.yaml' in files));
  assert.ok('context/role-pack-report.md' in files);                          // exemption
  assert.match(files['context/role-pack-report.md'], /role-qa\.yaml/);        // reported
});

test('generated pack carries no private version tags', () => {
  const { files } = generatePack(baseSkills, packInput, '2026-07-19');
  for (const [path, contents] of Object.entries(files)) {
    assert.ok(!/\bV\d+(\.\d+)?\b/.test(contents), `version tag leaked in ${path}`);
  }
});
