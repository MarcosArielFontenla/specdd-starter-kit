# specforge-kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `specforge-kit` — an Astro+React wizard that collects role-specific (BA/QA/Dev/UX) inputs and downloads a Copilot-ready scaffold ZIP (instructions, prompts, skills, context, MCP config).

**Architecture:** Same proven pattern as `specdd-kit`: a build-time `bundle-skills.js` snapshots `skills/*.md` into `skills.json` (local by default, remote-with-local-fallback opt-in); a persona-dynamic React `Wizard.jsx` collects inputs; `generators.js` produces the scaffold files; JSZip packages the download.

**Tech Stack:** Astro 5, React 18, JSZip, Playwright (e2e), Node `node:test` (unit), GitHub Actions (CI), Node 20+ (dev machine runs Node 22).

## Global Constraints

- No secrets/PATs/tokens/real Azure values. Generated `.vscode/mcp.json` uses only `${input:...}` placeholders.
- No Azure DevOps: do NOT create `/specforge-publishspecs`, `/specforge-setupadomcp`, `tools/ado_publishing_config.md`, or any ADO/PAT config.
- MCP limited to Figma (UX) and Playwright (QA), both opt-in.
- No governance L1–L4, no deploy, no Motif.
- Commands named `specforge-*`. Prompt frontmatter: `agent: agent` + `description: <short>`.
- Do not version `node_modules/`, `.astro/`, `dist/`, or `specforge-kit/website/src/data/skills.json` (generated).
- Node engine floor `>=20.0.0` in `package.json`; CI uses Node 20. Windows-friendly.
- Content (skills/prompts/instructions) must be real and usable — no TBD/TODO placeholder-only files.

---

## File Structure

```
specforge-kit/
├── SETUP.md
├── docs/Agentify_Wizard_Structural_Spec.md
├── skills.config.json
├── skills/                                  # ~36 skill .md files (Tasks 8-11)
├── website/
│   ├── package.json
│   ├── astro.config.mjs
│   ├── playwright.config.js
│   ├── scripts/bundle-skills.js             # Task 3
│   ├── scripts/bundle-skills.test.js        # Task 3
│   ├── scripts/prompts.test.js              # Task 6 (frontmatter guard for generated prompts source, if any)
│   ├── src/data/.gitkeep
│   ├── src/components/generators.js         # Task 4
│   ├── src/components/generators.test.js    # Task 4
│   ├── src/components/Wizard.jsx            # Task 5
│   ├── src/pages/index.astro
│   ├── src/layouts/Layout.astro
│   └── src/styles/wizard.css
│   └── e2e/wizard.spec.js                    # Task 7
└── .github/
    ├── copilot-instructions.md              # Task 12
    └── prompts/specforge-launch.prompt.md   # (root launcher created in Task 1)
.github/prompts/specforge-launch.prompt.md   # repo-root launcher (Task 1)
.github/workflows/ci.yml                      # modified in Task 2 (add specforge job)
```

**Note on content tasks (8–12):** skills, per-persona prompt/instruction templates, and docs follow one strict template each. Those tasks give the exact template, one fully-worked example, and the complete file list. The template IS the code for those files.

---

## Task 1: Root launcher + kit skeleton files

**Files:**
- Create: `.github/prompts/specforge-launch.prompt.md`, `specforge-kit/SETUP.md`, `specforge-kit/skills.config.json`, `specforge-kit/docs/Agentify_Wizard_Structural_Spec.md`

**Interfaces:**
- Produces: repo-root launcher prompt; `skills.config.json` consumed by `bundle-skills.js` (Task 3) with shape `{ "source": "local" | "remote", "remote": { "baseUrl": string, "manifest": string } }`.

- [ ] **Step 1: Create `.github/prompts/specforge-launch.prompt.md`**

```markdown
---
agent: agent
description: Launch the specforge-kit wizard (install deps, bundle skills, dev server, open browser)
---

# /specforge-launch

Launch the **specforge-kit** wizard locally.

1. Verify Node.js 20+ is installed (`node --version`).
2. Change to `specforge-kit/website`.
3. Install dependencies: `npm install`.
4. Bundle the skills: `npm run bundle-skills`.
5. Start the dev server: `npm run dev`.
6. Open the printed Astro URL (default `http://localhost:4322`) in Microsoft Edge.
7. Report the final URL, or surface any errors verbatim (do not hide failures).
```

- [ ] **Step 2: Create `specforge-kit/skills.config.json`** (local by default; remote documented, no real URL)

```json
{
  "source": "local",
  "remote": {
    "baseUrl": "https://example.invalid/specforge-skills",
    "manifest": "manifest.json"
  }
}
```

- [ ] **Step 3: Create `specforge-kit/SETUP.md`**

```markdown
# specforge-kit — Setup

Generate a role-specific (BA/QA/Dev/UX) Copilot scaffold in minutes.

## Prerequisites
- Node.js 20+
- VS Code with GitHub Copilot (or Claude/Cursor/Gemini)

## Run the wizard
```powershell
cd specforge-kit\website
npm install
npm run dev
```
Open the Astro URL, pick a persona, fill the role inputs, and download the scaffold ZIP.

## Extract
Unzip at the root of your project so Copilot auto-loads `.github/copilot-instructions.md`,
`.github/instructions/*` and `.github/prompts/specforge-*`.

## Skills source
`skills.config.json` controls where skills come from:
- `"source": "local"` (default) — bundles `specforge-kit/skills/*.md`.
- `"source": "remote"` — downloads from `remote.baseUrl`/`remote.manifest`, falling back to local on failure.

## MCP (optional)
- **Figma** (UX) and **Playwright** (QA) MCP config is generated into `.vscode/mcp.json` only when
  you enable them in the wizard. Values are `${input:...}` placeholders — never commit real keys.
```

- [ ] **Step 4: Create `specforge-kit/docs/Agentify_Wizard_Structural_Spec.md`**

```markdown
# Agentify Wizard — Structural Spec

specforge-kit collects role-specific inputs and generates a Copilot-ready scaffold.

## Personas
- **BA** — requirements, stories, acceptance criteria, traceability.
- **QA** — test cases, AC validation, Playwright, Gherkin.
- **Dev** — implementation, code review, PR creation.
- **UX** — flows, screen specs, copy, Figma context.

## Flow
Welcome → Persona → (role step) → Context → Governance-lite → Review → Download.

## Outputs
`README.md`, `.github/copilot-instructions.md`, `.github/instructions/*`, `.github/prompts/specforge-*`,
`context/<feature-slug>.md`, `templates/` (QA/Dev/UX), and `.vscode/mcp.json` (Figma/Playwright only).

## Out of scope
Azure DevOps publishing, PAT flows, deployment, governance tiers.
```

- [ ] **Step 5: Commit**

```bash
git add .github/prompts/specforge-launch.prompt.md specforge-kit/SETUP.md specforge-kit/skills.config.json specforge-kit/docs/Agentify_Wizard_Structural_Spec.md
git commit -m "feat(specforge-kit): root launcher, SETUP, skills.config, structural spec"
```

---

## Task 2: CI job for specforge-kit

**Files:**
- Modify: `.github/workflows/ci.yml` (add a second job + path trigger)

**Interfaces:**
- Consumes: `specforge-kit/website` npm scripts (`bundle-skills`, `test:unit`, `build`) from later tasks.

- [ ] **Step 1: Read the current `.github/workflows/ci.yml`** to see the existing `specdd-kit-build` job and `paths` filters.

- [ ] **Step 2: Add `specforge-kit/**` to both `paths` filters** (push and pull_request), so the file's triggers become:

```yaml
    paths: ['specdd-kit/**', 'specforge-kit/**', '.github/workflows/ci.yml']
```
(apply to both the `push` and `pull_request` blocks).

- [ ] **Step 3: Add a second job** after the existing `specdd-kit-build` job (same indentation level, under `jobs:`):

```yaml
  specforge-kit-build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: specforge-kit/website
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run bundle-skills
      - run: npm run test:unit
      - run: npm run build
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: build and unit-test specforge-kit on changes"
```

Note: the referenced npm scripts land in Tasks 3–6; CI only runs on push/PR, so this is fine.

---

## Task 3: `bundle-skills.js` (snapshot skills, local + remote fallback)

**Files:**
- Create: `specforge-kit/website/package.json`, `astro.config.mjs`, `src/data/.gitkeep`, `scripts/bundle-skills.js`
- Test: `specforge-kit/website/scripts/bundle-skills.test.js`

**Interfaces:**
- Produces:
  - `package.json` name `specforge-wizard`, `"type":"module"`, `engines.node ">=20.0.0"`, scripts: `bundle-skills`, `predev`, `prebuild`, `dev`, `build`, `preview`, `test:unit` (`node --test`), `test`/`test:ui`/`test:headed` (playwright). Deps: `@astrojs/react ^4`, `astro ^5.3`, `iconoir-react ^7`, `jszip ^3.10.1`, `react ^18.3`, `react-dom ^18.3`. devDeps: `@playwright/test ^1.42`.
  - `bundleSkills(skillsDir, outPath, config, fetchImpl)` → async; returns `{ "<slug>": "<contents>" }` and writes pretty JSON to `outPath`. `config.source==="local"` reads `<skillsDir>/*.md`; `"remote"` fetches `remote.baseUrl/remote.manifest` (a JSON array of filenames) then each file, and on ANY failure falls back to local (logs `bundle-skills: remote failed, falling back to local`). `fetchImpl` defaults to global `fetch` (injectable for tests). Slugs are filenames without `.md`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "specforge-wizard",
  "version": "1.0.0",
  "description": "SpecForge Wizard - collect role-specific inputs and generate a Copilot-ready spec scaffold",
  "type": "module",
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "bundle-skills": "node scripts/bundle-skills.js",
    "predev": "node scripts/bundle-skills.js",
    "prebuild": "node scripts/bundle-skills.js",
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test:unit": "node --test",
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:headed": "playwright test --headed"
  },
  "dependencies": {
    "@astrojs/react": "^4.0.0",
    "astro": "^5.3.0",
    "iconoir-react": "^7.0.0",
    "jszip": "^3.10.1",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.42.0"
  }
}
```

- [ ] **Step 2: Create `astro.config.mjs`** (port 4322 to avoid clashing with specdd-kit's 4321)

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  server: { port: 4322 },
});
```

- [ ] **Step 3: Create `src/data/.gitkeep`** (empty file)

- [ ] **Step 4: Write the failing test** `scripts/bundle-skills.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bundleSkills } from './bundle-skills.js';

function tmpSkills() {
  const root = mkdtempSync(join(tmpdir(), 'skills-'));
  mkdirSync(join(root, 'skills'), { recursive: true });
  writeFileSync(join(root, 'skills', 'story-writing.md'), '# story-writing');
  writeFileSync(join(root, 'skills', 'code-review.md'), '# code-review');
  writeFileSync(join(root, 'skills', 'notes.txt'), 'ignore me');
  return root;
}

test('local source bundles only .md files by slug', async () => {
  const root = tmpSkills();
  const out = join(root, 'skills.json');
  const result = await bundleSkills(join(root, 'skills'), out, { source: 'local' });
  assert.equal(result['story-writing'], '# story-writing');
  assert.equal(result['code-review'], '# code-review');
  assert.ok(!('notes' in result));
  assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), result);
  rmSync(root, { recursive: true, force: true });
});

test('remote source falls back to local when fetch fails', async () => {
  const root = tmpSkills();
  const out = join(root, 'skills.json');
  const failingFetch = async () => { throw new Error('network down'); };
  const result = await bundleSkills(
    join(root, 'skills'),
    out,
    { source: 'remote', remote: { baseUrl: 'https://x.invalid', manifest: 'manifest.json' } },
    failingFetch,
  );
  assert.equal(result['story-writing'], '# story-writing'); // came from local fallback
  rmSync(root, { recursive: true, force: true });
});

test('remote source uses manifest + fetched files when fetch works', async () => {
  const root = tmpSkills();
  const out = join(root, 'skills.json');
  const okFetch = async (url) => {
    if (url.endsWith('manifest.json')) return { ok: true, json: async () => ['remote-skill.md'] };
    if (url.endsWith('remote-skill.md')) return { ok: true, text: async () => '# remote-skill' };
    return { ok: false, status: 404 };
  };
  const result = await bundleSkills(
    join(root, 'skills'),
    out,
    { source: 'remote', remote: { baseUrl: 'https://x.test', manifest: 'manifest.json' } },
    okFetch,
  );
  assert.equal(result['remote-skill'], '# remote-skill');
  rmSync(root, { recursive: true, force: true });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `cd specforge-kit/website && node --test scripts/bundle-skills.test.js`
Expected: FAIL — `Cannot find module './bundle-skills.js'`.

- [ ] **Step 6: Write `scripts/bundle-skills.js`**

```js
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

function readLocal(skillsDir) {
  const out = {};
  for (const name of readdirSync(skillsDir)) {
    if (extname(name) !== '.md') continue;
    out[basename(name, '.md')] = readFileSync(join(skillsDir, name), 'utf8');
  }
  return out;
}

async function readRemote(remote, fetchImpl) {
  const manifestUrl = `${remote.baseUrl}/${remote.manifest}`;
  const mres = await fetchImpl(manifestUrl);
  if (!mres.ok) throw new Error(`manifest ${mres.status}`);
  const files = await mres.json();
  const out = {};
  for (const file of files) {
    const fres = await fetchImpl(`${remote.baseUrl}/${file}`);
    if (!fres.ok) throw new Error(`file ${file} ${fres.status}`);
    out[basename(file, '.md')] = await fres.text();
  }
  return out;
}

export async function bundleSkills(skillsDir, outPath, config, fetchImpl = fetch) {
  let skills;
  if (config?.source === 'remote' && config.remote) {
    try {
      skills = await readRemote(config.remote, fetchImpl);
    } catch (err) {
      console.log(`bundle-skills: remote failed (${err.message}), falling back to local`);
      skills = readLocal(skillsDir);
    }
  } else {
    skills = readLocal(skillsDir);
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(skills, null, 2));
  return skills;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const here = dirname(fileURLToPath(import.meta.url));           // .../website/scripts
  const kitRoot = join(here, '..', '..');                          // .../specforge-kit
  const skillsDir = join(kitRoot, 'skills');
  const outPath = join(here, '..', 'src', 'data', 'skills.json');
  let config = { source: 'local' };
  try { config = JSON.parse(readFileSync(join(kitRoot, 'skills.config.json'), 'utf8')); } catch {}
  const skills = await bundleSkills(skillsDir, outPath, config);
  console.log(`bundle-skills: wrote ${Object.keys(skills).length} skills to ${outPath}`);
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node --test scripts/bundle-skills.test.js`
Expected: PASS (3 tests).

- [ ] **Step 8: Install and run the CLI**

Run: `npm install && npm run bundle-skills`
Expected: `npm install` succeeds; bundle prints `bundle-skills: wrote N skills ...` (N may be 0 until Tasks 8–11 add skills). No error. (`.gitignore` at repo root must ignore `specforge-kit/website/src/data/skills.json` — see Task 3 Step 9.)

- [ ] **Step 9: Add the skills.json ignore to the repo-root `.gitignore`**

Add this line under the "generated wizard bundles" section of the root `.gitignore` (next to the existing `specdd-kit/...kit-files.json` line):
```
specforge-kit/website/src/data/skills.json
```

- [ ] **Step 10: Commit**

```bash
git add specforge-kit/website/package.json specforge-kit/website/astro.config.mjs specforge-kit/website/src/data/.gitkeep specforge-kit/website/scripts/bundle-skills.js specforge-kit/website/scripts/bundle-skills.test.js .gitignore
git commit -m "feat(specforge-kit): bundle-skills (local + remote fallback) + tests"
```

---

## Task 4: `generators.js` (persona-driven overlay)

**Files:**
- Create: `specforge-kit/website/src/components/generators.js`
- Test: `specforge-kit/website/src/components/generators.test.js`

**Interfaces:**
- Consumes: `baseSkills` object (from skills.json) passed as an argument — do NOT import skills.json inside.
- Produces:
  - `generateFiles(baseSkills, input)` → `{ path: contents }`.
  - Input shape: `{ persona: 'BA'|'QA'|'Dev'|'UX', agent:{primary,model}, project:{name,featureTitle,featureSlug}, context:{text}, security:{classification,regulatory}, ba:{...}, qa:{...}, dev:{...}, ux:{ designSystem, figmaEnabled, figmaUrl }, skills:[slug], mcp:{ figma:boolean, playwright:boolean } }`.
  - Always writes: `README.md`, `.github/copilot-instructions.md`, `context/<featureSlug>.md`, plus one `.github/instructions/specforge-<persona>.instructions.md` and one `.github/prompts/*.prompt.md` per persona command.
  - Persona → prompt commands (exported `PERSONA_PROMPTS`):
    - BA: `specforge-requirements`, `specforge-stories`, `specforge-new-feature`, `specforge-reset-feature`
    - QA: `specforge-testcases`, `specforge-validate`, plus `specforge-playwright` when `input.qa.approach !== 'manual'`
    - Dev: `specforge-implement`, `specforge-review`, `specforge-createpr`
    - UX: `specforge-uxflow`, `specforge-screenspec`, `specforge-copy`, plus `specforge-setupfigmamcp` when `input.ux.figmaEnabled`
  - Selected skills: for each slug in `input.skills` present in `baseSkills`, writes `skills/<slug>.md` with the skill body.
  - `.vscode/mcp.json` ONLY when `input.mcp.figma` or `input.mcp.playwright` is true; contains only the enabled servers with `${input:...}` placeholders. NEVER an ADO server.
  - Exported helpers: `renderReadme(input)`, `renderCopilotInstructions(input)`, `renderPersonaInstructions(input)`, `renderPrompt(cmd, input)`, `renderMcpJson(mcp)`, `promptsFor(input)`.

- [ ] **Step 1: Write the failing test** `src/components/generators.test.js`

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/components/generators.test.js`
Expected: FAIL — `Cannot find module './generators.js'`.

- [ ] **Step 3: Write `src/components/generators.js`**

```js
// Pure generators — baseSkills passed in (no import of skills.json).

const MCP_SERVERS = {
  figma: { command: 'npx', args: ['-y', 'figma-developer-mcp', '--stdio'], env: { FIGMA_API_KEY: '${input:figma_key}' } },
  playwright: { command: 'npx', args: ['-y', '@playwright/mcp'] },
};

export function renderMcpJson(mcp) {
  const servers = {};
  if (mcp?.figma) servers.figma = MCP_SERVERS.figma;
  if (mcp?.playwright) servers.playwright = MCP_SERVERS.playwright;
  return JSON.stringify({ servers }, null, 2);
}

export const PERSONA_PROMPTS = {
  BA: ['specforge-requirements', 'specforge-stories', 'specforge-new-feature', 'specforge-reset-feature'],
  QA: ['specforge-testcases', 'specforge-validate'],
  Dev: ['specforge-implement', 'specforge-review', 'specforge-createpr'],
  UX: ['specforge-uxflow', 'specforge-screenspec', 'specforge-copy'],
};

export function promptsFor(input) {
  const base = [...(PERSONA_PROMPTS[input.persona] || [])];
  if (input.persona === 'QA' && input.qa?.approach && input.qa.approach !== 'manual') base.push('specforge-playwright');
  if (input.persona === 'UX' && input.ux?.figmaEnabled) base.push('specforge-setupfigmamcp');
  return base;
}

export function renderReadme(input) {
  return `# ${input.project?.name || 'Scaffold'} — specforge (${input.persona})

Feature: **${input.project?.featureTitle || ''}**

Generated by specforge-kit for the **${input.persona}** persona.
Primary agent: ${input.agent?.primary || 'GitHub Copilot'}.

Run the persona commands from Copilot Chat: ${promptsFor(input).map((c) => `\`/${c}\``).join(', ')}.
`;
}

export function renderCopilotInstructions(input) {
  return `# Copilot Instructions — ${input.project?.name || 'Scaffold'} (${input.persona})

Primary agent: **${input.agent?.primary || 'GitHub Copilot'}** (model: ${input.agent?.model || 'default'}).
Persona: **${input.persona}**. Data classification: ${input.security?.classification || 'internal'}.

Read \`context/\` and \`.github/instructions/\` before acting. Never commit secrets.
`;
}

export function renderPersonaInstructions(input) {
  return `---
applyTo: "all"
description: specforge ${input.persona} persona guardrails
---

# specforge ${input.persona} Instructions

## Role
Act as a ${input.persona} following the specforge flow for feature "${input.project?.featureTitle || ''}".

## Guidelines
- Use the selected skills in \`skills/\` as playbooks.
- Keep outputs traceable to the feature context in \`context/\`.
- Never invent requirements; ask for clarification.

## Anti-patterns
- Producing work outside the ${input.persona} role.
- Committing secrets or real credentials.
`;
}

export function renderPrompt(cmd, input) {
  return `---
agent: agent
description: specforge ${input.persona} command ${cmd}
---

# /${cmd}

Run the ${cmd.replace('specforge-', '')} step for the **${input.persona}** persona on feature
"${input.project?.featureTitle || ''}".

## Steps
1. Read \`context/${input.project?.featureSlug || 'feature'}.md\` and \`.github/instructions/specforge-${input.persona.toLowerCase()}.instructions.md\`.
2. Apply the relevant skill(s) from \`skills/\`.
3. Write the output to the appropriate location (stories/, tests/, src/, or docs/).

## Guardrails
- Specifications and context are the source of truth.
- No secrets in output.
`;
}

export function generateFiles(baseSkills, input) {
  const out = {};
  out['README.md'] = renderReadme(input);
  out['.github/copilot-instructions.md'] = renderCopilotInstructions(input);
  out[`.github/instructions/specforge-${input.persona.toLowerCase()}.instructions.md`] = renderPersonaInstructions(input);
  for (const cmd of promptsFor(input)) {
    out[`.github/prompts/${cmd}.prompt.md`] = renderPrompt(cmd, input);
  }
  const slug = input.project?.featureSlug || 'feature';
  out[`context/${slug}.md`] = `# Context: ${input.project?.featureTitle || slug}\n\n${input.context?.text || ''}\n`;
  for (const s of input.skills || []) {
    if (baseSkills[s]) out[`skills/${s}.md`] = baseSkills[s];
  }
  if (input.mcp?.figma || input.mcp?.playwright) {
    out['.vscode/mcp.json'] = renderMcpJson(input.mcp);
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/components/generators.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add specforge-kit/website/src/components/generators.js specforge-kit/website/src/components/generators.test.js
git commit -m "feat(specforge-kit): persona-driven file generators (no ADO, Figma/Playwright mcp)"
```

---

## Task 5: Wizard UI (persona-dynamic + ZIP download)

**Files:**
- Create: `specforge-kit/website/src/layouts/Layout.astro`, `src/styles/wizard.css`, `src/components/Wizard.jsx`, `src/pages/index.astro`

**Interfaces:**
- Consumes: `generateFiles` from `./generators.js`; `../data/skills.json`; `jszip`.
- Produces: persona-dynamic wizard. Steps: Welcome → Persona → (role step) → Context → Governance-lite → Review/Download. `data-testid` hooks (used by Task 7): `step-title`, `persona-BA`, `persona-QA`, `persona-Dev`, `persona-UX`, `next-btn`, `download-btn`, `preview`, `error`. Root `<main class="wizard" data-ready>` with hydration signal.

- [ ] **Step 1: Create `src/layouts/Layout.astro`**

```astro
---
const { title = 'SpecForge Wizard' } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>
```

- [ ] **Step 2: Create `src/styles/wizard.css`**

```css
:root { --bg: #0f172a; --panel: #1e293b; --accent: #a78bfa; --text: #e2e8f0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); }
.wizard { max-width: 860px; margin: 2rem auto; padding: 1.5rem; background: var(--panel); border-radius: 12px; }
.wizard h1 { margin-top: 0; }
.wizard .steps { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1rem; font-size: .8rem; }
.wizard .steps .active { color: var(--accent); font-weight: 700; }
.wizard label { display: block; margin: .75rem 0 .25rem; font-weight: 600; }
.wizard input, .wizard textarea, .wizard select { width: 100%; padding: .5rem; border-radius: 6px; border: 1px solid #334155; background: #0b1220; color: var(--text); }
.wizard .personas { display: flex; gap: .5rem; flex-wrap: wrap; }
.wizard .personas button { flex: 1; }
.wizard .nav { display: flex; justify-content: space-between; margin-top: 1.5rem; }
.wizard button { padding: .6rem 1.2rem; border: 0; border-radius: 6px; background: var(--accent); color: #1e1b4b; font-weight: 700; cursor: pointer; }
.wizard button:disabled { opacity: .5; cursor: not-allowed; }
.wizard .preview { max-height: 320px; overflow: auto; background: #0b1220; padding: 1rem; border-radius: 6px; font-size: .8rem; }
.wizard .error { color: #f87171; font-size: .8rem; }
```

- [ ] **Step 3: Create `src/components/Wizard.jsx`**

```jsx
import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import skills from '../data/skills.json';
import { generateFiles } from './generators.js';

const STEPS = ['Welcome', 'Persona', 'Role', 'Context', 'Governance', 'Review'];
const PERSONAS = ['BA', 'QA', 'Dev', 'UX'];
const AGENTS = ['GitHub Copilot', 'Claude', 'Cursor', 'Gemini'];

const initial = {
  persona: '',
  agent: { primary: 'GitHub Copilot', model: '' },
  project: { name: '', featureTitle: '', featureSlug: '' },
  context: { text: '' },
  security: { classification: 'internal', regulatory: 'none' },
  ba: { strategy: '555', storyHierarchy: 'Epic→Feature→Story', sizing: 'Fibonacci', style: 'Gherkin' },
  qa: { approach: 'manual', appBaseUrl: '' },
  dev: { architecture: 'component-based', framework: '', commentLevel: 'normal' },
  ux: { designSystem: '', figmaEnabled: false, figmaUrl: '' },
  skills: [],
  mcp: { figma: false, playwright: false },
};

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initial);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  function validate() {
    if (step === 1 && !data.persona) return 'Pick a persona.';
    if (step === 2 && !data.project.featureTitle.trim()) return 'Feature title is required.';
    return '';
  }
  function next() {
    const e = validate();
    if (e) { setError(e); return; }
    setError('');
    // derive mcp + slug as we pass the role step
    if (step === 2) {
      const slug = slugify(data.project.featureTitle) || 'feature';
      const mcp = { figma: data.persona === 'UX' && data.ux.figmaEnabled, playwright: data.persona === 'QA' && data.qa.approach !== 'manual' };
      setData((d) => ({ ...d, project: { ...d.project, featureSlug: slug }, mcp }));
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() { setError(''); setStep((s) => Math.max(s - 1, 0)); }

  const files = step === STEPS.length - 1 ? generateFiles(skills, data) : {};

  async function download() {
    const zip = new JSZip();
    for (const [path, contents] of Object.entries(generateFiles(skills, data))) zip.file(path, contents);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.project.name || 'specforge'}-${data.persona || 'scaffold'}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const skillSlugs = Object.keys(skills);

  return (
    <main className="wizard" data-ready={ready ? 'true' : 'false'}>
      <h1>SpecForge Wizard</h1>
      <div className="steps">
        {STEPS.map((s, i) => <span key={s} className={i === step ? 'active' : ''}>{i + 1}. {s}</span>)}
      </div>
      <h2 data-testid="step-title">{STEPS[step]}</h2>

      {step === 0 && <p>Generate a role-specific Copilot scaffold. Click Next to start.</p>}

      {step === 1 && (
        <div className="personas">
          {PERSONAS.map((p) => (
            <button key={p} data-testid={`persona-${p}`} style={{ outline: data.persona === p ? '2px solid #fff' : 'none' }}
              onClick={() => set({ persona: p })}>{p}</button>
          ))}
        </div>
      )}

      {step === 2 && (
        <>
          <label>Project name</label>
          <input value={data.project.name} onChange={(e) => set({ project: { ...data.project, name: e.target.value } })} />
          <label>Feature title *</label>
          <input data-testid="feature-title" value={data.project.featureTitle}
            onChange={(e) => set({ project: { ...data.project, featureTitle: e.target.value } })} />
          {data.persona === 'QA' && (
            <>
              <label>Test approach</label>
              <select value={data.qa.approach} onChange={(e) => set({ qa: { ...data.qa, approach: e.target.value } })}>
                {['manual', 'automated', 'manual + automated'].map((a) => <option key={a}>{a}</option>)}
              </select>
            </>
          )}
          {data.persona === 'UX' && (
            <label style={{ fontWeight: 400 }}>
              <input type="checkbox" style={{ width: 'auto', marginRight: '.5rem' }} checked={data.ux.figmaEnabled}
                onChange={(e) => set({ ux: { ...data.ux, figmaEnabled: e.target.checked } })} /> Figma enabled
            </label>
          )}
        </>
      )}

      {step === 3 && (
        <>
          <label>Context (paste any relevant notes)</label>
          <textarea value={data.context.text} onChange={(e) => set({ context: { text: e.target.value } })} />
          <label>Skills to include</label>
          {skillSlugs.map((s) => (
            <label key={s} style={{ fontWeight: 400 }}>
              <input type="checkbox" style={{ width: 'auto', marginRight: '.5rem' }} checked={data.skills.includes(s)}
                onChange={(e) => set({ skills: e.target.checked ? [...data.skills, s] : data.skills.filter((x) => x !== s) })} />
              {s}
            </label>
          ))}
        </>
      )}

      {step === 4 && (
        <>
          <label>Data classification</label>
          <select value={data.security.classification} onChange={(e) => set({ security: { ...data.security, classification: e.target.value } })}>
            {['public', 'internal', 'confidential', 'restricted'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </>
      )}

      {step === 5 && (
        <>
          <p>{Object.keys(files).length} files ready for persona {data.persona}.</p>
          <pre className="preview" data-testid="preview">{Object.keys(files).sort().join('\n')}</pre>
          <button data-testid="download-btn" onClick={download}>Download ZIP</button>
        </>
      )}

      {error && <p className="error" data-testid="error">{error}</p>}

      <div className="nav">
        <button onClick={back} disabled={step === 0}>Back</button>
        {step < STEPS.length - 1 && <button data-testid="next-btn" onClick={next}>Next</button>}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Create `src/pages/index.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';
import Wizard from '../components/Wizard.jsx';
import '../styles/wizard.css';
---
<Layout title="SpecForge Wizard">
  <Wizard client:load />
</Layout>
```

- [ ] **Step 5: Verify build**

Run: `cd specforge-kit/website && npm run build`
Expected: `prebuild` runs bundle-skills, then astro build prints `Complete!`.

- [ ] **Step 6: Commit**

```bash
git add specforge-kit/website/src/layouts specforge-kit/website/src/styles specforge-kit/website/src/components/Wizard.jsx specforge-kit/website/src/pages/index.astro
git commit -m "feat(specforge-kit): persona-dynamic wizard with ZIP download"
```

---

## Task 6: e2e wizard test

**Files:**
- Create: `specforge-kit/website/playwright.config.js`, `e2e/wizard.spec.js`

**Interfaces:**
- Consumes: dev server (port 4322) + `data-testid` hooks from Task 5.

- [ ] **Step 1: Create `playwright.config.js`**

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4322',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4322' },
});
```

- [ ] **Step 2: Create `e2e/wizard.spec.js`**

```js
import { test, expect } from '@playwright/test';

test('BA persona walkthrough downloads a scaffold ZIP', async ({ page }) => {
  await page.goto('/');
  await page.locator('main.wizard[data-ready="true"]').waitFor();
  await expect(page.getByTestId('step-title')).toHaveText('Welcome');

  await page.getByTestId('next-btn').click();           // -> Persona
  await page.getByTestId('next-btn').click();            // blocked (no persona)
  await expect(page.getByTestId('error')).toBeVisible();
  await page.getByTestId('persona-BA').click();
  await page.getByTestId('next-btn').click();            // -> Role
  await page.getByTestId('feature-title').fill('Login');
  await page.getByTestId('next-btn').click();            // -> Context
  await page.getByTestId('next-btn').click();            // -> Governance
  await page.getByTestId('next-btn').click();            // -> Review

  await expect(page.getByTestId('preview')).toContainText('context/login.md');
  await expect(page.getByTestId('preview')).toContainText('specforge-requirements.prompt.md');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toContain('BA.zip');
});
```

- [ ] **Step 3: Install browser and run**

Run: `npx playwright install chromium && npm test`
Expected: 1 passed. If browsers unavailable, report `npx playwright install` and the error verbatim — do not hide it.

- [ ] **Step 4: Commit**

```bash
git add specforge-kit/website/playwright.config.js specforge-kit/website/e2e/wizard.spec.js
git commit -m "test(specforge-kit): e2e BA persona walkthrough + ZIP download"
```

---

## Task 7: BA skills

**Files:**
- Create in `specforge-kit/skills/`: `specforge-ba.md`, `story-writing.md`, `acceptance-criteria.md`, `story-splitting.md`, `requirements-traceability.md`, `context-analysis.md`, `miro-collaboration.md`

**Interfaces:**
- Produces: BA skill files snapshotted by `bundle-skills.js`.

**Template — every skill file:**

```markdown
---
name: <slug>
description: <one-line what this skill does>
persona: BA | QA | Dev | UX
---

# <Skill Title>

## Purpose
<what this skill produces or checks>

## When to use
<trigger>

## How
1. <step>
2. <step>

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
```

**Fully-worked example — `story-writing.md`:**

```markdown
---
name: story-writing
description: Write clear, testable user stories from a feature brief
persona: BA
---

# Story Writing

## Purpose
Turn a feature brief into user stories in the form "As a <role>, I want <goal>, so that <value>."

## When to use
After a feature and its actors are defined, before acceptance criteria.

## How
1. Read the feature context and the actors list.
2. Draft one story per discrete user goal; keep each independently valuable (INVEST).
3. Link each story back to the feature and note open questions.

## Guardrails
- Specifications/context are the source of truth.
- Never output secrets.
```

**The remaining BA files** (apply the template; `specforge-ba.md` is the umbrella describing the BA role and pointing to the other BA skills):
- `specforge-ba.md` (umbrella): BA persona role, when to use each BA skill, the specforge BA flow.
- `acceptance-criteria.md`: write Given/When/Then acceptance criteria per story.
- `story-splitting.md`: split large stories along workflow/data/interface boundaries.
- `requirements-traceability.md`: maintain a traceability matrix story↔AC↔test.
- `context-analysis.md`: extract actors, scope, constraints from raw feature notes.
- `miro-collaboration.md`: structure a Miro board for story mapping (describe; no credentials).

- [ ] **Step 1:** Create all 7 BA skill files using the template + per-file content.

- [ ] **Step 2: Re-bundle and verify**

Run: `cd specforge-kit/website && npm run bundle-skills`
Expected: `skills.json` includes `story-writing` and `specforge-ba`; count reflects the new files.

- [ ] **Step 3: Commit**

```bash
git add specforge-kit/skills/specforge-ba.md specforge-kit/skills/story-writing.md specforge-kit/skills/acceptance-criteria.md specforge-kit/skills/story-splitting.md specforge-kit/skills/requirements-traceability.md specforge-kit/skills/context-analysis.md specforge-kit/skills/miro-collaboration.md
git commit -m "feat(specforge-kit): BA skills"
```

---

## Task 8: QA skills

**Files:**
- Create in `specforge-kit/skills/`: `specforge-qa.md`, `test-case-generation.md`, `ac-validation.md`, `regression-testing.md`, `bug-reporting.md`, `playwright-testing.md`, `gherkin-automation.md`, `qa-evals.md`, `qa-guardrails.md`

**Interfaces:**
- Produces: QA skill files. Same template as Task 7 (`persona: QA`).

**Per-file content (apply the Task 7 skill template):**
- `specforge-qa.md` (umbrella): QA role, the specforge QA flow, when to use each QA skill.
- `test-case-generation.md`: derive test cases from acceptance criteria (≥1 per AC).
- `ac-validation.md`: check that each AC is testable and unambiguous.
- `regression-testing.md`: select a regression suite by risk/impact.
- `bug-reporting.md`: write a reproducible bug report (steps, expected, actual, evidence).
- `playwright-testing.md`: author Playwright tests against the app base URL.
- `gherkin-automation.md`: turn Gherkin scenarios into automated steps.
- `qa-evals.md`: define eval criteria for AI-assisted QA output.
- `qa-guardrails.md`: quality gates and evidence requirements before sign-off.

- [ ] **Step 1:** Create all 9 QA skill files using the template.

- [ ] **Step 2: Re-bundle and verify**

Run: `cd specforge-kit/website && npm run bundle-skills`
Expected: `skills.json` includes `test-case-generation` and `specforge-qa`.

- [ ] **Step 3: Commit**

```bash
git add specforge-kit/skills/specforge-qa.md specforge-kit/skills/test-case-generation.md specforge-kit/skills/ac-validation.md specforge-kit/skills/regression-testing.md specforge-kit/skills/bug-reporting.md specforge-kit/skills/playwright-testing.md specforge-kit/skills/gherkin-automation.md specforge-kit/skills/qa-evals.md specforge-kit/skills/qa-guardrails.md
git commit -m "feat(specforge-kit): QA skills"
```

---

## Task 9: Dev skills

**Files:**
- Create in `specforge-kit/skills/`: `specforge-dev.md`, `code-review.md`, `component-creation.md`, `testing.md`, `refactoring.md`, `documentation.md`, `api-endpoint.md`, `state-management.md`, `error-handling.md`, `performance-optimization.md`, `accessibility.md`, `story-to-code.md`, `pr-creation.md`

**Interfaces:**
- Produces: Dev skill files. Same template as Task 7 (`persona: Dev`).

**Per-file content (apply the Task 7 skill template):**
- `specforge-dev.md` (umbrella): Dev role, specforge Dev flow, when to use each Dev skill.
- `code-review.md`: review a diff for correctness, security, readability.
- `component-creation.md`: scaffold a UI/service component with tests.
- `testing.md`: write unit/integration tests (TDD where possible).
- `refactoring.md`: refactor safely with tests green.
- `documentation.md`: document modules/APIs concisely.
- `api-endpoint.md`: implement a REST endpoint with validation + errors.
- `state-management.md`: choose/apply a state pattern.
- `error-handling.md`: consistent error handling and logging (no secrets).
- `performance-optimization.md`: profile and optimize hot paths.
- `accessibility.md`: meet WCAG basics in components.
- `story-to-code.md`: turn a user story + AC into an implementation plan and code.
- `pr-creation.md`: open a PR with a clear description linked to the story.

- [ ] **Step 1:** Create all 13 Dev skill files using the template.

- [ ] **Step 2: Re-bundle and verify**

Run: `cd specforge-kit/website && npm run bundle-skills`
Expected: `skills.json` includes `story-to-code` and `specforge-dev`.

- [ ] **Step 3: Commit**

```bash
git add specforge-kit/skills/specforge-dev.md specforge-kit/skills/code-review.md specforge-kit/skills/component-creation.md specforge-kit/skills/testing.md specforge-kit/skills/refactoring.md specforge-kit/skills/documentation.md specforge-kit/skills/api-endpoint.md specforge-kit/skills/state-management.md specforge-kit/skills/error-handling.md specforge-kit/skills/performance-optimization.md specforge-kit/skills/accessibility.md specforge-kit/skills/story-to-code.md specforge-kit/skills/pr-creation.md
git commit -m "feat(specforge-kit): Dev skills"
```

---

## Task 10: UX skills + copilot-instructions

**Files:**
- Create in `specforge-kit/skills/`: `specforge-ux.md`, `ux-flow-designer.md`, `ux-stage-generator.md`, `ux-copywriter.md`, `ux-design-system-enforcer.md`, `ux-prototype.md`, `figma-design-context.md`
- Create: `specforge-kit/.github/copilot-instructions.md`

**Interfaces:**
- Produces: UX skill files (same template, `persona: UX`) + the kit's default copilot-instructions.

**Per-file content (apply the Task 7 skill template):**
- `specforge-ux.md` (umbrella): UX role, specforge UX flow, when to use each UX skill.
- `ux-flow-designer.md`: design a user flow from goals to screens.
- `ux-stage-generator.md`: break a flow into stages/screens with intents.
- `ux-copywriter.md`: write UI copy (labels, empty states, errors).
- `ux-design-system-enforcer.md`: keep designs consistent with a named design system.
- `ux-prototype.md`: describe a clickable prototype spec.
- `figma-design-context.md`: extract design context from a Figma file URL (via MCP; placeholders only).

**`specforge-kit/.github/copilot-instructions.md`:** default guardrails noting the wizard overlays a project-/persona-specific version; SDD-adjacent framing; multi-agent; no secrets; NO Azure DevOps / governance tiers.

- [ ] **Step 1:** Create the 7 UX skill files + `copilot-instructions.md`.

- [ ] **Step 2: Re-bundle and verify**

Run: `cd specforge-kit/website && npm run bundle-skills`
Expected: `skills.json` includes `ux-flow-designer` and all 4 umbrella skills; total ~35 skills.

- [ ] **Step 3: Commit**

```bash
git add specforge-kit/skills/specforge-ux.md specforge-kit/skills/ux-flow-designer.md specforge-kit/skills/ux-stage-generator.md specforge-kit/skills/ux-copywriter.md specforge-kit/skills/ux-design-system-enforcer.md specforge-kit/skills/ux-prototype.md specforge-kit/skills/figma-design-context.md specforge-kit/.github/copilot-instructions.md
git commit -m "feat(specforge-kit): UX skills + kit copilot-instructions"
```

---

## Task 11: README + full validation

**Files:**
- Create: `specforge-kit/README.md`
- Verification only for the rest.

**Interfaces:**
- Produces: kit README; final green validation.

- [ ] **Step 1: Create `specforge-kit/README.md`**

```markdown
# specforge-kit

Role-based (BA/QA/Dev/UX) agentic scaffold generator. Pick a persona, answer a few role-specific
questions, and download a Copilot-ready scaffold: instructions, prompts, skills, context, and
optional MCP config (Figma for UX, Playwright for QA).

## Run
```powershell
cd specforge-kit\website
npm install
npm run dev
```
Open the Astro URL, choose a persona, and download the scaffold ZIP. Extract it at your project root.

## What you get
- `.github/copilot-instructions.md`, `.github/instructions/specforge-<persona>.instructions.md`
- `.github/prompts/specforge-*.prompt.md` for your persona
- `context/<feature>.md`, selected `skills/*.md`
- `.vscode/mcp.json` (only if you enable Figma/Playwright — placeholders only)

## Skills source
`skills.config.json` selects local (default) or remote-with-local-fallback. See `SETUP.md`.

## Not included
Azure DevOps publishing, deployment, governance tiers — see `specdd-kit` for the SDD methodology kit.
```

- [ ] **Step 2: Full clean validation**

Run (PowerShell):
```powershell
cd specforge-kit\website
npm install
npm run bundle-skills
npm run test:unit
npm run build
```
Expected: bundle prints ~35 skills; unit tests pass (bundle-skills 3 + generators 4 = 7); build `Complete!`.

- [ ] **Step 3: e2e**

Run: `npx playwright install chromium; npm test`
Expected: 1 passed. If browsers unavailable, report `npx playwright install` and the error verbatim.

- [ ] **Step 4: Secret scan (must find nothing real)**

Run: `git grep -nE "gh[pousr]_[A-Za-z0-9]{20,}|FIGMA_API_KEY[[:space:]]*=[[:space:]]*[A-Za-z0-9]|-----BEGIN" -- specforge-kit`
Expected: no matches (placeholders like `${input:figma_key}` won't match).

- [ ] **Step 5: Commit**

```bash
git add specforge-kit/README.md
git commit -m "docs(specforge-kit): README + iteration 2 validation"
```

---

## Self-Review

**Spec coverage:**
- Root launcher + SETUP + skills.config + structural spec → Task 1. ✅
- CI job for specforge-kit → Task 2. ✅
- bundle-skills (local + remote fallback) + tests → Task 3. ✅
- Persona-driven generators (prompts per persona, no ADO, Figma/Playwright mcp, selected skills) → Task 4. ✅
- Persona-dynamic wizard + ZIP + hydration signal → Task 5. ✅
- e2e (BA walkthrough) → Task 6. ✅
- ~36 skills (BA/QA/Dev/UX) → Tasks 7–10. ✅
- Kit copilot-instructions → Task 10. ✅
- README + validation + secret scan → Task 11. ✅
- No ADO / no governance L1–L4 / placeholders-only mcp → enforced in Global Constraints + Task 4 tests. ✅

**Placeholder scan:** Content tasks (7–10) use a strict template + one worked example + per-file content specs — executable for template-driven files. JS/config tasks contain complete code.

**Type consistency:** `bundleSkills(skillsDir, outPath, config, fetchImpl)`, `generateFiles(baseSkills, input)`, `renderMcpJson(mcp)`, `promptsFor(input)`, `PERSONA_PROMPTS`, and the `input` shape are used identically across Tasks 3–6. `data-testid` hooks defined in Task 5 (`step-title`, `persona-BA`, `feature-title`, `next-btn`, `download-btn`, `preview`, `error`) match those asserted in Task 6. The Wizard derives `mcp`/`featureSlug` on leaving the Role step so the Review step and generators see them. ✅
```