# SpecForge Role Packs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild SpecForge as a Role Pack generator: multi-role (BA/QA/Dev/UX) `.agents/` extensions that plug into a SpecDD-Harness project, with optional target-folder ingestion, skip-and-report collisions, a pre-generated install tasks file, and a Copilot projection only when selected.

**Architecture:** A new pure `roles.js` module owns the role model (roles, per-role skills map, per-role meta, commands, steps, validation). A tiny `target.js` detects the target's harness from raw paths. `generators.js` is rewritten around `generatePack(baseSkills, input, today) → { files, skipped }` with one renderer per pack artifact. `Wizard.jsx` is rewritten to the 7-step flow with a new `TargetStep.jsx`. The bundler (`bundle-skills.js`) is untouched — only output paths of the bundled skills change.

**Tech Stack:** Astro 5 + React 18 islands, JSZip, Node ≥20 test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-07-19-specforge-role-packs-design.md`

## Global Constraints

- **Confidentiality (hard rule):** no committed content references private harness source documents by filename or version label; the architecture is the **SpecDD Harness**. A generated-content guard test (regex `\bV\d+(\.\d+)?\b` over all pack output) is added to this kit — note: task ids in generated tasks files use `R`/`C` prefixes, never `V`.
- **Never clobber:** with an ingested target, any pack path present in `targetPaths` is dropped and reported (`skipped[]`). Sole exemption: `context/role-pack-report.md` is always emitted. No override/replace mode exists in SpecForge.
- **The pack never modifies existing harness files** — ROUTING/REGISTRY/budget wiring ships as `.agents/specs/tasks/role-pack-install.tasks.md` (`status: draft`, human gate).
- **No rules-rich vendor files:** the old `copilot-instructions.md` generator is deleted, not ported. `.github/prompts/*` are emitted ONLY when `'GitHub Copilot' ∈ tools` and only as pointers to the pack's workflows.
- Subagent files state explicitly that the Multi-Agent system stays inactive.
- Feature-scoped fields (featureTitle/slug/context text) and the governance step are removed.
- SpecDD, SpecDeploy, platform code and `packages/ui` untouched (platform e2e may need a minimal selector update if it walks SpecForge steps; root README gets one row edit).
- All work on `main`, one commit per task; never stage the unrelated "Boreal Design System/" working-tree deletions.

---

### Task 1: roles.js — role model, steps, validation

**Files:**
- Create: `specforge-kit/website/src/components/roles.js`
- Test: `specforge-kit/website/src/components/roles.test.js`

**Interfaces:**
- Produces (exact exports):
  - `ROLES = ['BA', 'QA', 'Dev', 'UX']`
  - `TOOLS = ['GitHub Copilot', 'Claude Code', 'Cursor', 'Codex', 'Gemini']`
  - `ROLE_SKILLS: Record<role, string[]>` — every bundled kit skill appears in exactly one role.
  - `ROLE_META: Record<role, { title, scope, must: string[], never: string[], verification }>`
  - `roleSlug(role): string` — `'BA' → 'role-ba'`
  - `commandsFor(role, input): string[]` — persona commands + QA playwright conditional (`input.qa.approach !== 'manual'`) + UX figma conditional (`input.ux.figmaEnabled`)
  - `stepsFor(data): string[]` — `['Welcome','Target Project','Roles', …('Role Options' only when QA or UX selected)…, 'Skills','Tools','Preview / Download']`
  - `errorFor(stepName, data): string` — `'Roles'`: ≥1 role; `'Tools'`: ≥1 tool; else `''`.

- [ ] **Step 1: Write the failing tests**

Create `specforge-kit/website/src/components/roles.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROLES, TOOLS, ROLE_SKILLS, ROLE_META, roleSlug, commandsFor, stepsFor, errorFor } from './roles.js';

test('every kit skill belongs to exactly one role', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const skillsDir = join(here, '..', '..', '..', 'skills');
  const onDisk = readdirSync(skillsDir).filter((f) => extname(f) === '.md').map((f) => basename(f, '.md')).sort();
  const mapped = ROLES.flatMap((r) => ROLE_SKILLS[r]);
  assert.equal(new Set(mapped).size, mapped.length, 'no skill appears twice');
  assert.deepEqual([...mapped].sort(), onDisk);
});

test('role meta is complete', () => {
  for (const r of ROLES) {
    assert.ok(ROLE_META[r].title && ROLE_META[r].scope && ROLE_META[r].verification);
    assert.ok(ROLE_META[r].must.length >= 3 && ROLE_META[r].never.length >= 2);
  }
  assert.equal(roleSlug('BA'), 'role-ba');
  assert.equal(TOOLS.length, 5);
});

test('commandsFor applies QA/UX conditionals', () => {
  assert.ok(!commandsFor('QA', { qa: { approach: 'manual' } }).includes('specforge-playwright'));
  assert.ok(commandsFor('QA', { qa: { approach: 'automated' } }).includes('specforge-playwright'));
  assert.ok(!commandsFor('UX', { ux: { figmaEnabled: false } }).includes('specforge-setupfigmamcp'));
  assert.ok(commandsFor('UX', { ux: { figmaEnabled: true } }).includes('specforge-setupfigmamcp'));
  assert.ok(commandsFor('Dev', {}).includes('specforge-implement'));
});

test('steps include Role Options only when QA or UX selected', () => {
  assert.deepEqual(stepsFor({ roles: ['Dev'] }), ['Welcome', 'Target Project', 'Roles', 'Skills', 'Tools', 'Preview / Download']);
  assert.deepEqual(stepsFor({ roles: ['Dev', 'QA'] }), ['Welcome', 'Target Project', 'Roles', 'Role Options', 'Skills', 'Tools', 'Preview / Download']);
});

test('validation: at least one role and one tool', () => {
  assert.match(errorFor('Roles', { roles: [] }), /at least one role/i);
  assert.equal(errorFor('Roles', { roles: ['BA'] }), '');
  assert.match(errorFor('Tools', { tools: [] }), /at least one tool/i);
  assert.equal(errorFor('Tools', { tools: ['GitHub Copilot'] }), '');
  assert.equal(errorFor('Welcome', {}), '');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w specforge-wizard`
Expected: FAIL — `roles.js` does not exist. (Current suite is 7 passing; those stay.)

- [ ] **Step 3: Create `specforge-kit/website/src/components/roles.js`**

```js
// Role model for SpecForge Role Packs. Pure — no React imports.

export const ROLES = ['BA', 'QA', 'Dev', 'UX'];

export const TOOLS = ['GitHub Copilot', 'Claude Code', 'Cursor', 'Codex', 'Gemini'];

// Every kit skill belongs to exactly one role (enforced by test against skills/).
export const ROLE_SKILLS = {
  BA: ['specforge-ba', 'story-writing', 'acceptance-criteria', 'story-splitting',
    'requirements-traceability', 'context-analysis', 'miro-collaboration', 'documentation'],
  QA: ['specforge-qa', 'test-case-generation', 'ac-validation', 'gherkin-automation',
    'playwright-testing', 'regression-testing', 'bug-reporting', 'qa-evals',
    'qa-guardrails', 'testing'],
  Dev: ['specforge-dev', 'story-to-code', 'component-creation', 'api-endpoint',
    'state-management', 'error-handling', 'refactoring', 'performance-optimization',
    'code-review', 'pr-creation', 'accessibility'],
  UX: ['specforge-ux', 'ux-flow-designer', 'ux-copywriter', 'ux-design-system-enforcer',
    'ux-prototype', 'ux-stage-generator', 'figma-design-context'],
};

export const ROLE_META = {
  BA: {
    title: 'Business Analyst',
    scope: 'Requirements discovery, user stories, acceptance criteria and traceability for this project.',
    must: [
      'Write stories with testable acceptance criteria',
      'Keep every requirement traceable to a spec in .agents/specs/',
      'Ask the human when intent is ambiguous — never assume',
    ],
    never: [
      'Invent requirements or scope not confirmed by the human',
      'Produce implementation code or visual designs',
    ],
    verification: 'Stories reviewed through the spec-first pipeline (specify -> clarify) before implementation starts.',
  },
  QA: {
    title: 'Quality Analyst',
    scope: 'Test design, validation, defect reporting and regression coverage.',
    must: [
      'Derive test cases from acceptance criteria, not from the implementation',
      'Report defects with reproduction steps and expected vs actual behavior',
      'Keep executable checks aligned with each spec acceptance check',
    ],
    never: [
      'Mark work done without running its acceptance checks',
      'Fabricate test results or coverage claims',
    ],
    verification: 'Test suites pass and map one-to-one to spec acceptance checks.',
  },
  Dev: {
    title: 'Developer',
    scope: 'Implementation of specified features, code review and pull requests.',
    must: [
      'Implement only what an approved spec or tasks file covers',
      'Write tests before or alongside the code they verify',
      'Keep every change traceable to its tasks file',
    ],
    never: [
      'Start a spec-first feature without a human-approved tasks file',
      'Commit secrets or credentials',
    ],
    verification: 'Done-gate: the entity spec validator passes for every touched entity.',
  },
  UX: {
    title: 'UX Designer',
    scope: 'User flows, screen specifications, product copy and design-system adherence.',
    must: [
      'Follow the project design system tokens and components',
      'Specify flows and screens traceably to their stories',
      'Check accessibility basics on every screen spec',
    ],
    never: [
      'Introduce off-system styles or components',
      'Finalize copy that contradicts an approved spec',
    ],
    verification: 'Screen specs reviewed against the design system and the feature spec.',
  },
};

const ROLE_COMMANDS = {
  BA: ['specforge-requirements', 'specforge-stories', 'specforge-new-feature', 'specforge-reset-feature'],
  QA: ['specforge-testcases', 'specforge-validate'],
  Dev: ['specforge-implement', 'specforge-review', 'specforge-createpr'],
  UX: ['specforge-uxflow', 'specforge-screenspec', 'specforge-copy'],
};

export const roleSlug = (role) => `role-${role.toLowerCase()}`;

export function commandsFor(role, input) {
  const base = [...(ROLE_COMMANDS[role] || [])];
  if (role === 'QA' && input?.qa?.approach && input.qa.approach !== 'manual') base.push('specforge-playwright');
  if (role === 'UX' && input?.ux?.figmaEnabled) base.push('specforge-setupfigmamcp');
  return base;
}

export function stepsFor(data) {
  const steps = ['Welcome', 'Target Project', 'Roles'];
  if ((data.roles || []).some((r) => r === 'QA' || r === 'UX')) steps.push('Role Options');
  steps.push('Skills', 'Tools', 'Preview / Download');
  return steps;
}

export function errorFor(stepName, data) {
  if (stepName === 'Roles' && (data.roles || []).length === 0) {
    return 'Select at least one role — the pack is built from them.';
  }
  if (stepName === 'Tools' && (data.tools || []).length === 0) {
    return 'Select at least one tool your team uses.';
  }
  return '';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w specforge-wizard`
Expected: PASS (12: 7 pre-existing + 5 new). If the skills-coverage test fails, fix the `ROLE_SKILLS` lists to match `specforge-kit/skills/` exactly — the disk is the truth.

- [ ] **Step 5: Commit**

```bash
git add specforge-kit/website/src/components/roles.js specforge-kit/website/src/components/roles.test.js
git commit -m "feat(specforge-kit): role model with per-role skills, meta, commands and steps"
```

---

### Task 2: target.js — harness detection for the target project

**Files:**
- Create: `specforge-kit/website/src/components/target.js`
- Test: `specforge-kit/website/src/components/target.test.js`

**Interfaces:**
- Produces: `detectTargetHarness(paths: string[]): { specdd: boolean, legacy: boolean }` — `specdd` when `.agents/REGISTRY.md` exists OR both root `AGENTS.md` and `.agents/orchestration/ROUTING.md` exist; `legacy` when other harness signals exist and `specdd` is false.

- [ ] **Step 1: Write the failing tests**

Create `specforge-kit/website/src/components/target.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectTargetHarness } from './target.js';

test('specdd harness detected via REGISTRY or primer+routing', () => {
  assert.deepEqual(detectTargetHarness(['.agents/REGISTRY.md', 'src/a.js']), { specdd: true, legacy: false });
  assert.deepEqual(detectTargetHarness(['AGENTS.md', '.agents/orchestration/ROUTING.md']), { specdd: true, legacy: false });
});

test('legacy harness (non-specdd) flagged', () => {
  assert.deepEqual(detectTargetHarness(['SYSTEM_PROMPT.md', '.agents/AGENTS.md', 'src/a.js']), { specdd: false, legacy: true });
  assert.deepEqual(detectTargetHarness(['.cursor/rules/core.mdc']), { specdd: false, legacy: true });
});

test('no harness at all', () => {
  assert.deepEqual(detectTargetHarness(['src/a.js', 'README.md', '.github/workflows/ci.yml']), { specdd: false, legacy: false });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w specforge-wizard`
Expected: FAIL — `target.js` does not exist.

- [ ] **Step 3: Create `specforge-kit/website/src/components/target.js`**

```js
// Target-project harness detection for Role Packs. Pure — runs on the RAW ingested
// path list (root prefix already stripped by the caller).

const HARNESS_ROOT_FILES = new Set([
  'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'SYSTEM_PROMPT.md',
  '.github/copilot-instructions.md',
]);
const HARNESS_DIR_PREFIXES = ['.agents/', '.claude/', '.cursor/rules/'];

export function detectTargetHarness(paths) {
  const set = new Set(paths);
  const specdd = set.has('.agents/REGISTRY.md')
    || (set.has('AGENTS.md') && set.has('.agents/orchestration/ROUTING.md'));
  const anySignal = paths.some(
    (p) => HARNESS_ROOT_FILES.has(p) || HARNESS_DIR_PREFIXES.some((d) => p.startsWith(d)),
  );
  return { specdd, legacy: anySignal && !specdd };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w specforge-wizard` — Expected: PASS (15).

- [ ] **Step 5: Commit**

```bash
git add specforge-kit/website/src/components/target.js specforge-kit/website/src/components/target.test.js
git commit -m "feat(specforge-kit): target harness detection for role packs"
```

---

### Task 3: Renderers — role skill, rubric, subagent

**Files:**
- Modify: `specforge-kit/website/src/components/generators.js` (append; delete nothing yet)
- Test: `specforge-kit/website/src/components/generators.test.js` (append)

**Interfaces:**
- Consumes: `ROLE_META`, `roleSlug` from `./roles.js` (add the import at the top of `generators.js`).
- Produces: `renderRoleSkill(role, selectedSkills: string[]): string`, `renderRoleRubric(role): string`, `renderRoleSubagent(role): string`.

- [ ] **Step 1: Write the failing tests**

Append to `specforge-kit/website/src/components/generators.test.js` (extend its import from `./generators.js` with the three new names):

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w specforge-wizard`
Expected: FAIL — new renderers not exported. (The 7 legacy generator tests keep passing.)

- [ ] **Step 3: Implement** (append to `generators.js`; add `import { ROLE_META, roleSlug, commandsFor } from './roles.js';` at the top)

```js
export function renderRoleSkill(role, selectedSkills) {
  const meta = ROLE_META[role];
  const slug = roleSlug(role);
  return `---
name: ${slug}
version: 0.1.0
snapshotPath: .agents/cold-start/snapshots/${slug}.snapshot.md
snapshotVersion: 0.1.0
driftPolicyPath: .agents/evals/rubrics/${slug}.yaml
---

# ${meta.title} — Role Skill

## Scope
${meta.scope}

## Must rules
${meta.must.map((m) => `- ${m}`).join('\n')}

## Never do
${meta.never.map((n) => `- ${n}`).join('\n')}

## Verification
${meta.verification}

## Playbooks
${(selectedSkills || []).map((s) => `- assets/${s}.md`).join('\n') || '- (none selected)'}
`;
}

export function renderRoleRubric(role) {
  const slug = roleSlug(role);
  return `skill: ${slug}
criteria:
  - id: rule-adherence
    description: "Output follows the role skill's Must rules and violates no Never rules"
    weight: 1.0
driftPolicy:
  windowDays: 7
  minRunsForTrend: 5
  criterionDriftThreshold: 0.15
  skillDriftThreshold: 0.10
  baselineStrategy: first_N_runs
  baselineRuns: 10
  aggregation: median
  ciFailConsecutiveWindows: 2
  reviewTriggerAction: log_only
  reviewWorkflow: skill-review
`;
}

export function renderRoleSubagent(role) {
  const meta = ROLE_META[role];
  const slug = roleSlug(role);
  return `---
name: ${slug}
domain: ${slug}
skill: .agents/skills/${slug}/SKILL.md
---

# ${meta.title} — Subagent (canonical definition)

> Seed for the harness Multi-Agent system, which is INACTIVE until this project has a
> real multi-agent workflow. Do not project this file to any vendor format until that
> system activates (see the systems status in .agents/REGISTRY.md).

Load \`.agents/skills/${slug}/SKILL.md\` before any ${meta.title} work. Stay within the
role's scope; escalate cross-role decisions to the orchestrating session. Follow the
role workflows in \`.agents/workflows/${slug}/\`.
`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w specforge-wizard` — Expected: PASS (18).

- [ ] **Step 5: Commit**

```bash
git add specforge-kit/website/src/components/generators.js specforge-kit/website/src/components/generators.test.js
git commit -m "feat(specforge-kit): role skill, rubric and subagent renderers"
```

---

### Task 4: Renderers — workflows, Copilot projection, install tasks, pack report

**Files:**
- Modify: `specforge-kit/website/src/components/generators.js` (append)
- Test: `specforge-kit/website/src/components/generators.test.js` (append)

**Interfaces:**
- Consumes: `ROLE_META`, `roleSlug`, `commandsFor` (Task 1); `renderRoleSkill` family (Task 3).
- Produces: `renderRoleWorkflow(role, cmd): string`, `renderRolePrompt(role, cmd): string`, `renderInstallTasks(input, today): string`, `renderPackReport(input, skipped: string[], today): string`.

- [ ] **Step 1: Write the failing tests**

Append to `generators.test.js` (extend the import):

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w specforge-wizard` — Expected: FAIL (missing exports).

- [ ] **Step 3: Implement** (append to `generators.js`)

```js
export function renderRoleWorkflow(role, cmd) {
  const meta = ROLE_META[role];
  const slug = roleSlug(role);
  const action = cmd.replace('specforge-', '');
  return `# ${cmd} — ${meta.title} workflow

Run the **${action}** step for the ${meta.title} role.

## Steps
1. Load \`.agents/skills/${slug}/SKILL.md\` (via ROUTING) and the relevant playbooks
   from its \`assets/\`.
2. If the task touches a primary entity, load its spec from \`.agents/specs/\`.
3. Produce the ${action} output, traceable to the spec or story it serves.
4. Record follow-up work as tasks through the spec-first pipeline — never as silent
   notes.

## Guardrails
- Specifications are the source of truth; never invent requirements — ask.
- Stay within the ${meta.title} role's scope (see the skill's Never do rules).
- No secrets in any output.
`;
}

export function renderRolePrompt(role, cmd) {
  const slug = roleSlug(role);
  return `---
agent: agent
description: ${ROLE_META[role].title} command ${cmd} (SpecDD Harness role pack)
---

# /${cmd}

Follow the workflow at \`.agents/workflows/${slug}/${cmd}.md\`.
Read the root \`AGENTS.md\` primer first if you have not already this session.
`;
}

export function renderInstallTasks(input, today) {
  const pad3 = (n) => String(n).padStart(3, '0');
  let i = 0;
  const rows = (input.roles || []).flatMap((role) => {
    const slug = roleSlug(role);
    const meta = ROLE_META[role];
    return [
      `- [ ] R${pad3(++i)} Add ROUTING row: \`| ${meta.title} work | .agents/skills/${slug}/SKILL.md | role workflows in .agents/workflows/${slug}/ |\``,
      `- [ ] R${pad3(++i)} Add REGISTRY entries for the ${slug} skill, rubric, workflows and subagent (Multi-Agent system stays inactive)`,
      `- [ ] R${pad3(++i)} Add budget-manifest class '${meta.title} work' with artifacts [.agents/orchestration/ROUTING.md, .agents/skills/${slug}/SKILL.md]`,
    ];
  });
  return `---
feature: role-pack-install
status: draft
createdAt: ${today}
---

# Tasks — Role Pack Install

Pre-generated by the SpecForge wizard. A human must approve this file BEFORE the
agent wires anything. The pack never modifies existing harness files by itself.

## Phase 1 — Wire the roles
${rows.join('\n')}
- [ ] R${pad3(++i)} If any addition would push the root AGENTS.md primer past 40 lines, decompose the classification table instead of exceeding the limit

## Phase 2 — Verify (done gate)
- [ ] C001 \`pwsh .agents/scripts/validate-spec.ps1\` exits 0
- [ ] C002 \`pwsh .agents/scripts/validate-budget.ps1\` exits 0
`;
}

export function renderPackReport(input, skipped, today) {
  const h = input.harness || {};
  const targetLine = (input.targetPaths || []).length
    ? (h.specdd
      ? 'SpecDD Harness detected in the target project — this pack extends it.'
      : h.legacy
        ? 'A legacy (non-SpecDD) harness was detected in the target. Migrate it first with the SpecDD wizard (Brownfield scenario) — this pack assumes the SpecDD Harness layout.'
        : 'No harness detected in the target project. Generate one first with the SpecDD wizard; this pack plugs into it.')
    : 'No target project was ingested — standard pack with canonical paths.';
  const rolesBlock = (input.roles || [])
    .map((r) => `- ${ROLE_META[r].title}: role skill + ${(input.skillsByRole?.[r] || []).length} playbook(s) · workflows: ${commandsFor(r, input).join(', ')}`)
    .join('\n');
  const skippedBlock = skipped.length
    ? `${skipped.map((p) => `- ${p}`).join('\n')}\n\nThese pack files were NOT written because they already exist in the target project.`
    : '- (none)';
  return `# Role Pack Report

Generated by the SpecForge wizard on ${today}. Everything ran in the browser; no
file left the machine.

## Target
${targetLine}

## Roles in this pack
${rolesBlock}

## Kickoff (first agent session)
Get the human's approval on \`.agents/specs/tasks/role-pack-install.tasks.md\`, then
execute it to wire ROUTING/REGISTRY/budget. The Multi-Agent system stays inactive.

## Skipped pack files (already exist in the target)
${skippedBlock}
`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w specforge-wizard` — Expected: PASS (22).

- [ ] **Step 5: Commit**

```bash
git add specforge-kit/website/src/components/generators.js specforge-kit/website/src/components/generators.test.js
git commit -m "feat(specforge-kit): workflow, projection, install-tasks and report renderers"
```

---

### Task 5: generatePack — assembly, collisions, MCP, legacy generator removal

**Files:**
- Modify: `specforge-kit/website/src/components/generators.js` (add `generatePack`; DELETE `renderReadme`, `renderCopilotInstructions`, `renderPersonaInstructions`, `renderPrompt`, `promptsFor`, `PERSONA_PROMPTS`, and the old `generateFiles`)
- Test: `specforge-kit/website/src/components/generators.test.js` (delete the legacy tests that exercised removed functions; add pack tests)

**Interfaces:**
- Produces: `generatePack(baseSkills: Record<string,string>, input, today?): { files: Record<string,string>, skipped: string[] }` — the ONLY function `Wizard.jsx` calls from Task 6 on.
- MCP derivation moves inside: figma when `'UX' ∈ roles && ux.figmaEnabled`; playwright when `'QA' ∈ roles && qa.approach !== 'manual'`. `renderMcpJson` and `MCP_SERVERS` stay unchanged.

- [ ] **Step 1: Rewrite the test file's legacy sections + add pack tests**

In `generators.test.js`: delete every test that references `renderReadme`, `renderCopilotInstructions`, `renderPersonaInstructions`, `renderPrompt(`, `promptsFor` or the old `generateFiles` (keep the `renderMcpJson` secret-placeholder test, rewiring its import). Then append:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w specforge-wizard` — Expected: FAIL — `generatePack` missing (legacy tests removed, so no failures from deleted functions).

- [ ] **Step 3: Implement `generatePack` and delete the legacy generators**

In `generators.js`, delete `PERSONA_PROMPTS`, `promptsFor`, `renderReadme`, `renderCopilotInstructions`, `renderPersonaInstructions`, `renderPrompt`, and `generateFiles`. Keep `MCP_SERVERS`/`renderMcpJson`. Add:

```js
const REPORT_PATH = 'context/role-pack-report.md';

export function generatePack(baseSkills, input, today = new Date().toISOString().slice(0, 10)) {
  const files = {};
  const roles = input.roles || [];
  const hasCopilot = (input.tools || []).includes('GitHub Copilot');

  for (const role of roles) {
    const slug = roleSlug(role);
    const selected = input.skillsByRole?.[role] || [];
    files[`.agents/skills/${slug}/SKILL.md`] = renderRoleSkill(role, selected);
    for (const s of selected) {
      if (baseSkills[s]) files[`.agents/skills/${slug}/assets/${s}.md`] = baseSkills[s];
    }
    files[`.agents/evals/rubrics/${slug}.yaml`] = renderRoleRubric(role);
    for (const cmd of commandsFor(role, input)) {
      files[`.agents/workflows/${slug}/${cmd}.md`] = renderRoleWorkflow(role, cmd);
      if (hasCopilot) files[`.github/prompts/${cmd}.prompt.md`] = renderRolePrompt(role, cmd);
    }
    files[`.agents/subagents/${slug}.agent.md`] = renderRoleSubagent(role);
  }

  files['.agents/specs/tasks/role-pack-install.tasks.md'] = renderInstallTasks(input, today);

  const mcp = {
    figma: roles.includes('UX') && !!input.ux?.figmaEnabled,
    playwright: roles.includes('QA') && input.qa?.approach && input.qa.approach !== 'manual',
  };
  if (mcp.figma || mcp.playwright) files['.vscode/mcp.json'] = renderMcpJson(mcp);

  const existing = new Set(input.targetPaths || []);
  const skipped = Object.keys(files).filter((p) => existing.has(p) && p !== REPORT_PATH).sort();
  for (const p of skipped) delete files[p];
  files[REPORT_PATH] = renderPackReport(input, skipped, today);
  return { files, skipped };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w specforge-wizard`
Expected: PASS. Expected total ≈ 21 (5 roles + 3 target + 3 Task-3 + 4 Task-4 + 4 pack + mcp-placeholder + 2 bundle-skills — report the exact count).

- [ ] **Step 5: Commit**

```bash
git add specforge-kit/website/src/components/generators.js specforge-kit/website/src/components/generators.test.js
git commit -m "feat(specforge-kit): generatePack with collisions, MCP derivation; legacy generators removed"
```

---

### Task 6: Wizard rewrite + TargetStep

**Files:**
- Create: `specforge-kit/website/src/components/TargetStep.jsx`
- Rewrite: `specforge-kit/website/src/components/Wizard.jsx`

**Interfaces:**
- Consumes: `stepsFor`, `errorFor`, `ROLES`, `ROLE_SKILLS`, `TOOLS` (Task 1), `detectTargetHarness` (Task 2), `generatePack` (Task 5).
- Produces UI hooks for Task 7's e2e: `folder-input` (Target step), `target-status` (detection card), `role-<slug>` toggles (e.g. `role-qa`), `tool-<slug>` checkboxes, `skipped-group`, plus retained `step-title`, `next-btn`, `download-btn`, `error`, `preview`.

- [ ] **Step 1: Create `specforge-kit/website/src/components/TargetStep.jsx`**

```jsx
import { useState } from 'react';
import { detectTargetHarness } from './target.js';

// Optional target-project ingestion. Only the path LIST is used — no file content
// is ever read. Everything stays in the browser.
export default function TargetStep({ data, onTarget }) {
  const [busy, setBusy] = useState(false);

  function onPick(e) {
    const inputEl = e.target;
    const files = Array.from(inputEl.files || []);
    if (!files.length) return;
    setBusy(true);
    try {
      const folderName = files[0].webkitRelativePath.split('/')[0];
      const prefix = folderName.length + 1;
      const paths = files.map((f) => f.webkitRelativePath.slice(prefix));
      onTarget(paths, detectTargetHarness(paths), folderName);
    } finally {
      setBusy(false);
      inputEl.value = '';
    }
  }

  const picked = (data.targetPaths || []).length > 0;
  return (
    <>
      <p className="b-lead">
        Optional: pick the target project folder so the pack can detect its SpecDD
        Harness and avoid overwriting existing files. Only the file LIST is read —
        no content ever leaves your machine. Skip to get a standard pack.
      </p>
      <label>Target project folder (optional)</label>
      <input type="file" data-testid="folder-input" webkitdirectory="" directory="" multiple
        onChange={onPick} disabled={busy} />
      {picked && (
        <div className="b-card" data-testid="target-status">
          <strong>{data.targetName}</strong>
          <p>
            {data.harness.specdd
              ? 'SpecDD Harness detected — the pack will extend it and skip colliding files.'
              : data.harness.legacy
                ? 'A previous (non-SpecDD) harness was detected. Recommended: migrate it first with the SpecDD wizard (Brownfield scenario).'
                : 'No harness detected. Recommended: generate one first with the SpecDD wizard — the pack plugs into it.'}
          </p>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Rewrite `specforge-kit/website/src/components/Wizard.jsx`**

Full replacement:

```jsx
import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import skills from '../data/skills.json';
import { generatePack } from './generators.js';
import { stepsFor, errorFor as stepError, ROLES, ROLE_SKILLS, TOOLS } from './roles.js';
import TargetStep from './TargetStep.jsx';
import Stepper from '@specdd/ui/stepper';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

const initial = {
  targetPaths: [], harness: { specdd: false, legacy: false }, targetName: '',
  roles: [], qa: { approach: 'manual' }, ux: { figmaEnabled: false },
  skillsByRole: {},
  tools: ['GitHub Copilot'],
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const pad2 = (n) => String(n).padStart(2, '0');

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [data, setData] = useState(initial);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  const steps = stepsFor(data);
  const stepName = steps[step];
  const isStepValid = (i) => stepError(steps[i], data) === '';

  function next() {
    const e = stepError(stepName, data);
    if (e) { setError(e); return; }
    setError('');
    const target = Math.min(step + 1, steps.length - 1);
    setStep(target);
    setMaxVisited((m) => Math.max(m, target));
  }
  function back() { setError(''); setStep((s) => Math.max(s - 1, 0)); }
  function jump(i) { if (i <= maxVisited) { setError(''); setStep(i); } }

  function toggleRole(role) {
    setData((d) => {
      const on = d.roles.includes(role);
      const roles = on ? d.roles.filter((r) => r !== role) : [...d.roles, role];
      const skillsByRole = { ...d.skillsByRole };
      if (on) delete skillsByRole[role];
      else skillsByRole[role] = [...ROLE_SKILLS[role]];
      return { ...d, roles, skillsByRole };
    });
    // Step list length can change (Role Options) — keep navigation on solid ground.
    setMaxVisited((m) => Math.min(m, 2));
  }

  function onTarget(targetPaths, harness, targetName) {
    set({ targetPaths, harness, targetName });
  }

  const last = step === steps.length - 1;
  const { files, skipped } = last ? generatePack(skills, data) : { files: {}, skipped: [] };

  async function download() {
    const zip = new JSZip();
    for (const [path, contents] of Object.entries(generatePack(skills, data).files)) zip.file(path, contents);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.targetName || 'specforge'}-role-pack.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="b-shell" data-ready={ready ? 'true' : 'false'}>
      <aside className="b-sidebar">
        <div className="b-brand">SpecForge Wizard</div>
        <div className="b-sidebar__eyebrow">STEP {pad2(step + 1)} / {pad2(steps.length)}</div>
        <Stepper steps={steps} current={step} isValid={isStepValid} maxVisited={maxVisited} onJump={jump} />
      </aside>

      <main className="b-main">
        <div className="b-main__eyebrow">STEP {pad2(step + 1)} · {stepName.toUpperCase()}</div>
        <h2 className="b-main__title" data-testid="step-title">{stepName}</h2>

        <div className="b-main__body">
          {stepName === 'Welcome' && (
            <p className="b-lead">
              Build a Role Pack for your SpecDD Harness project: per-role skills,
              playbooks, workflows and subagent seeds for BA, QA, Dev and UX. Click
              Next to start.
            </p>
          )}

          {stepName === 'Target Project' && <TargetStep data={data} onTarget={onTarget} />}

          {stepName === 'Roles' && (
            <div className="b-personas">
              {ROLES.map((r) => (
                <button key={r} data-testid={`role-${slug(r)}`}
                  className={`b-persona${data.roles.includes(r) ? ' b-persona--active' : ''}`}
                  onClick={() => toggleRole(r)}>{r}</button>
              ))}
            </div>
          )}

          {stepName === 'Role Options' && (
            <>
              {data.roles.includes('QA') && (
                <>
                  <label>QA test approach</label>
                  <select value={data.qa.approach}
                    onChange={(e) => set({ qa: { ...data.qa, approach: e.target.value } })}>
                    {['manual', 'automated', 'manual + automated'].map((a) => <option key={a}>{a}</option>)}
                  </select>
                </>
              )}
              {data.roles.includes('UX') && (
                <label className="b-check">
                  <input type="checkbox" checked={data.ux.figmaEnabled}
                    onChange={(e) => set({ ux: { ...data.ux, figmaEnabled: e.target.checked } })} /> Figma enabled
                </label>
              )}
            </>
          )}

          {stepName === 'Skills' && data.roles.map((role) => (
            <div key={role}>
              <label>{role} playbooks</label>
              {ROLE_SKILLS[role].map((s) => (
                <label className="b-check" key={s}>
                  <input type="checkbox"
                    checked={(data.skillsByRole[role] || []).includes(s)}
                    onChange={(e) => {
                      const cur = data.skillsByRole[role] || [];
                      set({ skillsByRole: { ...data.skillsByRole, [role]: e.target.checked ? [...cur, s] : cur.filter((x) => x !== s) } });
                    }} />
                  {s}
                </label>
              ))}
            </div>
          ))}

          {stepName === 'Tools' && (
            <>
              <label>Team tools * (drives the Copilot projection)</label>
              {TOOLS.map((t) => (
                <label className="b-check" key={t}>
                  <input type="checkbox" data-testid={`tool-${slug(t)}`}
                    checked={data.tools.includes(t)}
                    onChange={(e) => set({ tools: e.target.checked ? [...data.tools, t] : data.tools.filter((x) => x !== t) })} />
                  {t}
                </label>
              ))}
            </>
          )}

          {stepName === 'Preview / Download' && (() => {
            const paths = Object.keys(files).sort();
            const isProjection = (p) => p.startsWith('.github/');
            const groups = [
              ['Role pack', paths.filter((p) => !isProjection(p))],
              ['Copilot projection', paths.filter(isProjection)],
            ].filter(([, items]) => items.length > 0);
            return (
              <>
                <p className="b-lead">{paths.length} files ready for roles: {data.roles.join(', ')}.</p>
                <div data-testid="preview">
                  {groups.map(([title, items]) => (
                    <details key={title} open>
                      <summary>{title} ({items.length})</summary>
                      <pre className="b-preview">{items.join('\n')}</pre>
                    </details>
                  ))}
                  {skipped.length > 0 && (
                    <details data-testid="skipped-group" open>
                      <summary>Skipped — already exist in the target ({skipped.length})</summary>
                      <pre className="b-preview">{skipped.join('\n')}</pre>
                    </details>
                  )}
                </div>
              </>
            );
          })()}
        </div>

        {error && <p className="b-error" data-testid="error">{error}</p>}

        <div className="b-nav">
          <button className="b-btn b-btn--ghost" onClick={back} disabled={step === 0}><ChevronLeft size={16} />Back</button>
          {last
            ? <button className="b-btn b-btn--primary" data-testid="download-btn" onClick={download}><Download size={16} />Download ZIP</button>
            : <button className="b-btn b-btn--primary" data-testid="next-btn" onClick={next}>Next<ChevronRight size={16} /></button>}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify unit tests and build**

Run: `npm run test:unit -w specforge-wizard` — Expected: PASS (unchanged count).
Run: `npm run build -w specforge-wizard` — Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add specforge-kit/website/src/components/Wizard.jsx specforge-kit/website/src/components/TargetStep.jsx
git commit -m "feat(specforge-kit): role-pack wizard with optional target ingestion"
```

---

### Task 7: E2E rewrite + fixture + docs + full verification

**Files:**
- Create: `specforge-kit/website/e2e/fixtures/harness-target/.agents/REGISTRY.md`
- Create: `specforge-kit/website/e2e/fixtures/harness-target/.agents/orchestration/ROUTING.md`
- Create: `specforge-kit/website/e2e/fixtures/harness-target/.agents/evals/rubrics/role-qa.yaml`
- Create: `specforge-kit/website/e2e/fixtures/harness-target/AGENTS.md`
- Create: `specforge-kit/website/e2e/fixtures/harness-target/src/app.js`
- Rewrite: `specforge-kit/website/e2e/wizard.spec.js`
- Modify: `specforge-kit/README.md`, `specforge-kit/SETUP.md`, `specforge-kit/docs/Agentify_Wizard_Structural_Spec.md` (superseded banner), root `README.md` (one row)
- Verify (edit only if broken): `platform/e2e/`

**Interfaces:**
- Consumes: UI hooks from Task 6.

- [ ] **Step 1: Create the fixture** (a minimal SpecDD-harness project; the pre-existing `role-qa.yaml` exercises collision skipping)

`.agents/REGISTRY.md`: `# Target — Harness Registry` — `.agents/orchestration/ROUTING.md`: `# ROUTING — Task Classification` — `AGENTS.md`: `# Target — Agent Session Primer` — `src/app.js`: `export const ok = true;` — `.agents/evals/rubrics/role-qa.yaml`:

```yaml
skill: role-qa
note: pre-existing rubric — the pack must skip its own copy
```

- [ ] **Step 2: Rewrite `specforge-kit/website/e2e/wizard.spec.js`**

```js
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const targetDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'harness-target');

test('standalone multi-role pack: roles gate, conditional options, ZIP download', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();
  await expect(page.getByTestId('step-title')).toHaveText('Welcome');

  await page.getByTestId('next-btn').click(); // -> Target Project (optional, skipped)
  await page.getByTestId('next-btn').click(); // -> Roles

  await page.getByTestId('next-btn').click(); // validation blocks (no roles)
  await expect(page.getByTestId('error')).toBeVisible();

  await page.getByTestId('role-qa').click();
  await page.getByTestId('role-dev').click();
  await page.getByTestId('next-btn').click(); // -> Role Options (QA selected)
  await page.locator('select').selectOption('automated');
  await page.getByTestId('next-btn').click(); // -> Skills (preselected)
  await page.getByTestId('next-btn').click(); // -> Tools (Copilot preselected)
  await page.getByTestId('next-btn').click(); // -> Preview

  await expect(page.getByTestId('preview')).toContainText('.agents/skills/role-qa/SKILL.md');
  await expect(page.getByTestId('preview')).toContainText('.agents/workflows/role-qa/specforge-playwright.md');
  await expect(page.getByTestId('preview')).toContainText('.agents/specs/tasks/role-pack-install.tasks.md');
  await expect(page.getByTestId('preview')).toContainText('.github/prompts/specforge-implement.prompt.md');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toContain('role-pack.zip');
});

test('target ingestion: harness detected, colliding rubric skipped', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();

  await page.getByTestId('next-btn').click(); // -> Target Project
  await page.getByTestId('folder-input').setInputFiles(targetDir);
  await expect(page.getByTestId('target-status')).toContainText('SpecDD Harness detected');
  await page.getByTestId('next-btn').click(); // -> Roles

  await page.getByTestId('role-qa').click();
  await page.getByTestId('next-btn').click(); // -> Role Options
  await page.getByTestId('next-btn').click(); // -> Skills
  await page.getByTestId('next-btn').click(); // -> Tools
  await page.getByTestId('next-btn').click(); // -> Preview

  await expect(page.getByTestId('skipped-group')).toContainText('.agents/evals/rubrics/role-qa.yaml');
  await expect(page.getByTestId('preview')).toContainText('context/role-pack-report.md');
});
```

- [ ] **Step 3: Run the kit e2e**

Run: `npm test -w specforge-wizard`
Expected: 2 passed. If the directory upload drops the dot-folder `.agents/**` files, the second test's detection assertion fails — report it, do not silently work around.

- [ ] **Step 4: Docs**

- `specforge-kit/README.md` and `SETUP.md`: read each first; replace the persona-scaffold description with the Role Pack model (multi-role packs extending a SpecDD-Harness project; optional target ingestion; install tasks executed by the agent with human approval; Copilot projection optional). Keep each file's structure and tone; rewrite only the sections that describe the old flow/output.
- `specforge-kit/docs/Agentify_Wizard_Structural_Spec.md`: prepend one line under the title: `> Superseded (2026-07-19) by the Role Packs design — see docs/superpowers/specs/2026-07-19-specforge-role-packs-design.md at the repo root. Kept as history.`
- Root `README.md` Workspaces table, `specforge-kit` row — replace the description cell with: `Role Pack wizard (BA/QA/Dev/UX): generates per-role .agents/ extensions (skills + playbooks, workflows, rubrics, subagent seeds) that plug into a SpecDD-Harness project, with optional target-folder ingestion and agent-executed install tasks.`

- [ ] **Step 5: Full verification**

- `npm run test:unit -w specforge-wizard` — PASS
- `npm run build -w specforge-wizard` — succeeds
- `npm run build -w specdd-platform` — succeeds
- `npm test -w specdd-platform` — platform e2e; if a platform test walks the old SpecForge steps by name/index, update it minimally to the new flow and note it.
- Confidentiality sweep: `git grep -nE '\bV[0-9]+(\.[0-9]+)?\b' -- ':!node_modules' ':!awesome-copilot-main'` — no hits in files this plan touched.

- [ ] **Step 6: Commit**

```bash
git add specforge-kit/website/e2e specforge-kit/README.md specforge-kit/SETUP.md specforge-kit/docs/Agentify_Wizard_Structural_Spec.md README.md
git commit -m "test(specforge-kit): role-pack e2e with harness-target fixture; docs to Role Pack model"
```

---

## Self-review notes

- **Spec coverage:** 7-step wizard → Tasks 1/6; optional ingestion + detection card + notices → Tasks 2/6; role pack structure (skill+assets/rubric/workflows/subagent) → Tasks 3/4/5; install tasks with human gate + primer-limit note → Task 4; pack report with kickoff + skipped → Task 4/5; collisions skip-and-report with report exemption → Task 5; Copilot projection conditional → Tasks 4/5; feature fields & governance & rules-rich copilot-instructions removed → Tasks 5/6; MCP conditional preserved → Task 5; e2e both modes + fixture with collision → Task 7; docs + superseded banner + root README row → Task 7; confidentiality guard → Task 5.
- **Type consistency:** `generatePack(baseSkills, input, today) → {files, skipped}` (Tasks 5/6); `commandsFor(role, input)` (Tasks 1/4/5); `roleSlug` (Tasks 1/3/4/5); `stepsFor(data)`/`errorFor(stepName, data)` (Tasks 1/6); testids `role-qa`/`folder-input`/`target-status`/`skipped-group` (Tasks 6/7); fixture rubric path matches the generated `role-qa.yaml` path (Tasks 5/7).
- **Known risks surfaced:** dot-folder directory upload (Task 7 checkpoint); platform e2e may reference the old SpecForge flow (explicit check in Task 7 Step 5); the maxVisited clamp on role toggle (Task 6) prevents jumping into a stale step list when Role Options appears/disappears.
