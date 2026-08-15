# SPECDDSTARTERKIT — Base + specdd-kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the repository base plus a working `specdd-kit` Astro+React wizard that generates and downloads a Spec-Driven Development (SDD) scaffold ZIP.

**Architecture:** A build-time script (`bundle-kit.js`) snapshots the static kit files into `kit-files.json`. An 8-step React wizard collects inputs; `generators.js` overlays dynamic files on top of the snapshot; JSZip packages the result for download. The kit content (prompts, instructions, agents, templates, docs) is plain markdown consumed by GitHub Copilot / other agents.

**Tech Stack:** Astro 5, React 18, JSZip, Playwright (e2e), Node's built-in `node:test` (unit), GitHub Actions (CI), Node 20+ (dev machine runs Node 22).

## Global Constraints

- No secrets, PATs, tokens, client secrets, or real Azure values anywhere in source, examples, or logs. Use placeholders (`${input:...}`) in generated `mcp.json`.
- Do not version `node_modules/`, `.astro/`, `dist/`, logs, `.env*`, or generated bundles (`kit-files.json`).
- `.vscode/settings.json` must be generic — no personal paths or auto-approved commands.
- Windows-friendly paths and commands; repo is developed on Windows 11.
- Slash commands are named `specdd-*` (never `speckit.*`).
- Prompt frontmatter must be Copilot-Chat compatible: `agent: agent` + `description: <short>`.
- No governance levels L1–L4, no Azure DevOps, no Azure deployment, no Motif in this iteration.
- Node engine floor: `>=20.0.0` in `package.json`; CI uses Node 20.

---

## File Structure

```
SPECDDSTARTERKIT/
├── .github/prompts/specdd-launch.prompt.md
├── .github/workflows/ci.yml
├── .vscode/settings.json
├── .gitignore
├── README.md
└── specdd-kit/
    ├── README.md
    ├── SETUP.md
    ├── website/
    │   ├── package.json
    │   ├── astro.config.mjs
    │   ├── playwright.config.js
    │   ├── scripts/bundle-kit.js
    │   ├── scripts/bundle-kit.test.js
    │   ├── src/data/.gitkeep
    │   ├── src/components/Wizard.jsx
    │   ├── src/components/generators.js
    │   ├── src/components/generators.test.js
    │   ├── src/components/steps/*.jsx
    │   ├── src/pages/index.astro
    │   ├── src/layouts/Layout.astro
    │   └── src/styles/wizard.css
    ├── e2e/wizard.spec.js
    ├── .github/{copilot-instructions.md,prompts/,instructions/,agents/,hooks/}
    ├── context/{project.md,tech-stack.md,constitution.md}
    ├── governance/constitution.md
    ├── specs/_template/*
    ├── templates/*
    ├── docs/*
    └── examples/.gitkeep
```

**Note on markdown-heavy tasks (9–12):** prompts, instructions, agents, and templates all follow one strict template each. Those tasks give the exact template, one fully-worked example, and the complete filename list. Producing the remaining files means applying the template — the template *is* the code.

---

## Task 1: Repository base files

**Files:**
- Create: `.gitignore`, `README.md`, `.vscode/settings.json`, `.github/prompts/specdd-launch.prompt.md`

**Interfaces:**
- Produces: repo root scaffolding; `.gitignore` ignores `specdd-kit/website/src/data/kit-files.json`.

- [ ] **Step 1: Initialize git**

Run: `git init && git branch -M main`
Expected: `Initialized empty Git repository`

- [ ] **Step 2: Create `.gitignore`**

```gitignore
node_modules/
dist/
.astro/

# generated wizard bundles
specdd-kit/website/src/data/kit-files.json

.env
.env.*
!.env.example

.DS_Store
Thumbs.db
desktop.ini

.idea/
*.suo
*.user
*.swp
*.swo

*.log
npm-debug.log*

*.tmp
*.orig
```

- [ ] **Step 3: Create `README.md`**

```markdown
# SPECDDSTARTERKIT

Enterprise starter kit for **Spec-Driven Development (SDD)**, inspired by
[`github/spec-kit`](https://github.com/github/spec-kit) and adapted with visual
wizards and GitHub Copilot prompts/instructions.

> Specifications are the source of truth. Code is the output.

## Kits

| Kit | Purpose | Status |
|-----|---------|--------|
| [`specdd-kit`](specdd-kit/) | SDD starter-kit wizard: generates a Copilot-ready scaffold ZIP (context, prompts, instructions, templates, MCP config). | ✅ Iteration 1 |
| `specforge-kit` | Role-based scaffolds (BA/QA/Dev/UX). | 🔜 Iteration 2 |

## SDD flow

`constitution → specify → plan → tasks → implement`

## Quick start

```powershell
cd specdd-kit\website
npm install
npm run dev
```

Then open the Astro URL, complete the 8-step wizard, and download your scaffold ZIP.
Extract it at the root of your project so VS Code / GitHub Copilot auto-loads
`.github/copilot-instructions.md`, `.github/instructions/*` and `.github/prompts/*`.

## References

- `github/spec-kit` — SDD methodology and templates.
```

- [ ] **Step 4: Create `.vscode/settings.json`** (generic)

```json
{
  "editor.formatOnSave": true,
  "files.eol": "\n",
  "chat.promptFiles": true
}
```

- [ ] **Step 5: Create `.github/prompts/specdd-launch.prompt.md`**

```markdown
---
agent: agent
description: Launch the specdd-kit wizard (install deps, bundle, dev server, open browser)
---

# /specdd-launch

Launch the **specdd-kit** wizard locally.

1. Verify Node.js 18+ is installed (`node --version`).
2. Change to `specdd-kit/website`.
3. Install dependencies: `npm install`.
4. Bundle the kit files: `npm run bundle-kit`.
5. Start the dev server: `npm run dev`.
6. Open the printed Astro URL (default `http://localhost:4321`) in Microsoft Edge.
7. Report the final URL, or surface any errors verbatim (do not hide failures).
```

- [ ] **Step 6: Commit**

```bash
git add .gitignore README.md .vscode/settings.json .github/prompts/specdd-launch.prompt.md
git commit -m "chore: repository base files and specdd-launch prompt"
```

---

## Task 2: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `specdd-kit/website` npm scripts (`bundle-kit`, `build`) from later tasks.
- Produces: CI that runs on `specdd-kit/**` changes.

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
    paths: ['specdd-kit/**', '.github/workflows/ci.yml']
  pull_request:
    branches: [main]
    paths: ['specdd-kit/**', '.github/workflows/ci.yml']

jobs:
  specdd-kit-build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: specdd-kit/website
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run bundle-kit
      - run: npm run test:unit
      - run: npm run build
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: build and unit-test specdd-kit on changes"
```

Note: this workflow references scripts created in Tasks 3–5; it will pass once those land. That is expected — CI only runs on push/PR.

---

## Task 3: specdd-kit website skeleton

**Files:**
- Create: `specdd-kit/website/package.json`, `astro.config.mjs`, `playwright.config.js`, `src/pages/index.astro`, `src/layouts/Layout.astro`, `src/styles/wizard.css`, `src/data/.gitkeep`

**Interfaces:**
- Produces: buildable Astro app that mounts `<Wizard client:load />` (Wizard added in Task 6). Until then, `index.astro` renders a placeholder.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "sdd-kit-wizard",
  "version": "1.0.0",
  "type": "module",
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "bundle-kit": "node scripts/bundle-kit.js",
    "predev": "node scripts/bundle-kit.js",
    "prebuild": "node scripts/bundle-kit.js",
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

- [ ] **Step 2: Create `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  server: { port: 4321 },
});
```

- [ ] **Step 3: Create `playwright.config.js`**

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4321' },
});
```

- [ ] **Step 4: Create `src/layouts/Layout.astro`**

```astro
---
const { title = 'SDD Kit Wizard' } = Astro.props;
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

- [ ] **Step 5: Create `src/styles/wizard.css`**

```css
:root { --bg: #0f172a; --panel: #1e293b; --accent: #38bdf8; --text: #e2e8f0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); }
.wizard { max-width: 860px; margin: 2rem auto; padding: 1.5rem; background: var(--panel); border-radius: 12px; }
.wizard h1 { margin-top: 0; }
.wizard .steps { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1rem; font-size: .8rem; }
.wizard .steps .active { color: var(--accent); font-weight: 700; }
.wizard label { display: block; margin: .75rem 0 .25rem; font-weight: 600; }
.wizard input, .wizard textarea, .wizard select { width: 100%; padding: .5rem; border-radius: 6px; border: 1px solid #334155; background: #0b1220; color: var(--text); }
.wizard .nav { display: flex; justify-content: space-between; margin-top: 1.5rem; }
.wizard button { padding: .6rem 1.2rem; border: 0; border-radius: 6px; background: var(--accent); color: #04222f; font-weight: 700; cursor: pointer; }
.wizard button:disabled { opacity: .5; cursor: not-allowed; }
.wizard .preview { max-height: 320px; overflow: auto; background: #0b1220; padding: 1rem; border-radius: 6px; font-size: .8rem; }
.wizard .error { color: #f87171; font-size: .8rem; }
```

- [ ] **Step 6: Create `src/data/.gitkeep`** (empty file — keeps the generated-bundle dir tracked)

- [ ] **Step 7: Create `src/pages/index.astro`** (placeholder until Task 6)

```astro
---
import Layout from '../layouts/Layout.astro';
import '../styles/wizard.css';
---
<Layout title="SDD Kit Wizard">
  <main class="wizard">
    <h1>SDD Kit Wizard</h1>
    <p data-testid="placeholder">Wizard mounts here.</p>
  </main>
</Layout>
```

- [ ] **Step 8: Install and verify build**

Run: `npm install && npm run build`
Expected: `predev`/`prebuild` will fail because `scripts/bundle-kit.js` does not exist yet. That is expected — proceed to Task 4, which creates it. (If you want a green build now, create an empty `src/data/kit-files.json` with `{}` and temporarily skip `prebuild`; not required.)

- [ ] **Step 9: Commit**

```bash
git add specdd-kit/website
git commit -m "feat(specdd-kit): astro+react website skeleton"
```

---

## Task 4: `bundle-kit.js` (snapshot kit files)

**Files:**
- Create: `specdd-kit/website/scripts/bundle-kit.js`
- Test: `specdd-kit/website/scripts/bundle-kit.test.js`

**Interfaces:**
- Produces: `bundleKit(kitRoot, outPath)` — walks `kitRoot`, writes a JSON object `{ "<relative/path>": "<file contents>" }` to `outPath`. Skips dirs `website`, `node_modules`, `.git`, `.astro`, `.idea`, `dist`. Includes extensions `.md .json .yml .yaml .txt .sh .gitignore .gitkeep`. Excludes the four wizard-overlaid defaults. Returns the object.

- [ ] **Step 1: Write the failing test**

```js
// scripts/bundle-kit.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bundleKit } from './bundle-kit.js';

test('bundleKit snapshots allowed files and skips excluded ones', () => {
  const root = mkdtempSync(join(tmpdir(), 'kit-'));
  mkdirSync(join(root, '.github'), { recursive: true });
  mkdirSync(join(root, 'context'), { recursive: true });
  mkdirSync(join(root, 'node_modules'), { recursive: true });
  writeFileSync(join(root, 'README.md'), '# hi');
  writeFileSync(join(root, '.github', 'copilot-instructions.md'), 'overlaid'); // excluded default
  writeFileSync(join(root, 'context', 'project.md'), 'overlaid');              // excluded default
  writeFileSync(join(root, 'context', 'keep.md'), 'keep me');
  writeFileSync(join(root, 'node_modules', 'x.md'), 'nope');                   // excluded dir
  writeFileSync(join(root, 'image.png'), 'binary');                            // excluded ext

  const out = join(root, 'out.json');
  const result = bundleKit(root, out);

  assert.equal(result['README.md'], '# hi');
  assert.equal(result['context/keep.md'], 'keep me');
  assert.ok(!('.github/copilot-instructions.md' in result));
  assert.ok(!('context/project.md' in result));
  assert.ok(!('node_modules/x.md' in result));
  assert.ok(!('image.png' in result));

  const written = JSON.parse(readFileSync(out, 'utf8'));
  assert.deepEqual(written, result);
  rmSync(root, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/bundle-kit.test.js`
Expected: FAIL — `Cannot find module './bundle-kit.js'`.

- [ ] **Step 3: Write `scripts/bundle-kit.js`**

```js
import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, extname, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP_DIRS = new Set(['website', 'node_modules', '.git', '.astro', '.idea', 'dist']);
const ALLOW_EXT = new Set(['.md', '.json', '.yml', '.yaml', '.txt', '.sh']);
const ALLOW_NAMES = new Set(['.gitignore', '.gitkeep']);
const EXCLUDE_DEFAULTS = new Set([
  'context/project.md',
  'context/tech-stack.md',
  'context/constitution.md',
  '.github/copilot-instructions.md',
]);

function isAllowed(name) {
  return ALLOW_NAMES.has(name) || ALLOW_EXT.has(extname(name));
}

function walk(dir, root, acc) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(full, root, acc);
    } else if (isAllowed(basename(full))) {
      const rel = relative(root, full).split('\\').join('/');
      if (EXCLUDE_DEFAULTS.has(rel)) continue;
      acc[rel] = readFileSync(full, 'utf8');
    }
  }
  return acc;
}

export function bundleKit(kitRoot, outPath) {
  const files = walk(kitRoot, kitRoot, {});
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(files, null, 2));
  return files;
}

// CLI: bundle the parent specdd-kit/ into src/data/kit-files.json
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const here = dirname(fileURLToPath(import.meta.url));           // .../website/scripts
  const kitRoot = join(here, '..', '..');                          // .../specdd-kit
  const outPath = join(here, '..', 'src', 'data', 'kit-files.json');
  const files = bundleKit(kitRoot, outPath);
  console.log(`bundle-kit: wrote ${Object.keys(files).length} files to ${outPath}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/bundle-kit.test.js`
Expected: PASS (1 test).

- [ ] **Step 5: Run the CLI against the (still sparse) kit**

Run: `npm run bundle-kit`
Expected: `bundle-kit: wrote N files ...` (N may be small until Tasks 8–12 add content). No error.

- [ ] **Step 6: Commit**

```bash
git add specdd-kit/website/scripts/bundle-kit.js specdd-kit/website/scripts/bundle-kit.test.js
git commit -m "feat(specdd-kit): bundle-kit snapshot script + tests"
```

---

## Task 5: `generators.js` (overlay dynamic files)

**Files:**
- Create: `specdd-kit/website/src/components/generators.js`
- Test: `specdd-kit/website/src/components/generators.test.js`

**Interfaces:**
- Consumes: `kit-files.json` (base object) — passed in as an argument (do NOT import it, to keep the function testable and pure).
- Produces:
  - `generateFiles(baseFiles, input)` → returns a new `{ path: contents }` object = base + overlay.
  - Input shape: `{ project:{name,description,problem}, personas, outcomes, constraints, stack:{languages,frontend,backend,testing,database,infra,swagger,a11y}, principles, mcp:[string], agent:{primary,model}, security:{classification,owaspControls} }`.
  - Overlay files produced: `context/project.md`, `context/tech-stack.md`, `context/constitution.md`, `.github/copilot-instructions.md`, and — only when `input.mcp.length > 0` — `.vscode/mcp.json`, and — only when `input.featuresSpec` is a non-empty string — `specs/features-spec.md`.
  - Helpers (exported): `renderProject(input)`, `renderTechStack(input)`, `renderConstitution(input)`, `renderCopilotInstructions(input)`, `renderMcpJson(mcp)`.
  - MCP JSON must use placeholders only, never real values.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/components/generators.test.js`
Expected: FAIL — `Cannot find module './generators.js'`.

- [ ] **Step 3: Write `src/components/generators.js`**

```js
// Pure generators — no imports of kit-files.json (passed in as `baseFiles`).

const MCP_SERVERS = {
  github: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'], env: { GITHUB_PERSONAL_ACCESS_TOKEN: '${input:github_pat}' } },
  sonarqube: { command: 'npx', args: ['-y', 'sonarqube-mcp-server'], env: { SONAR_TOKEN: '${input:sonar_token}', SONAR_HOST_URL: '${input:sonar_host}' } },
  context7: { command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
  postgresql: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres', '${input:pg_connection_string}'] },
  playwright: { command: 'npx', args: ['-y', '@playwright/mcp'] },
  figma: { command: 'npx', args: ['-y', 'figma-developer-mcp', '--stdio'], env: { FIGMA_API_KEY: '${input:figma_key}' } },
};

export function renderMcpJson(mcp) {
  const servers = {};
  for (const key of mcp) if (MCP_SERVERS[key]) servers[key] = MCP_SERVERS[key];
  return JSON.stringify({ servers }, null, 2);
}

export function renderProject(input) {
  const p = input.project;
  return `# Project: ${p.name}

## Description
${p.description}

## Problem statement
${p.problem}

## Personas
${(input.personas || []).map((x) => `- ${x}`).join('\n')}

## Outcomes
- **User:** ${input.outcomes?.user || ''}
- **Business:** ${input.outcomes?.business || ''}

## Constraints
- **Business:** ${input.constraints?.business || ''}
- **Technical:** ${input.constraints?.technical || ''}
`;
}

export function renderTechStack(input) {
  const s = input.stack || {};
  return `# Tech Stack

- **Languages:** ${(s.languages || []).join(', ')}
- **Frontend:** ${s.frontend || ''}
- **Backend:** ${s.backend || ''}
- **Testing:** ${s.testing || ''}
- **Database:** ${s.database || ''}
- **Infrastructure:** ${s.infra || ''}
- **Swagger/OpenAPI:** ${s.swagger ? 'yes' : 'no'}
- **WCAG/a11y:** ${s.a11y ? 'yes' : 'no'}
`;
}

export function renderConstitution(input) {
  return `# Project Constitution

> Specifications are the source of truth. Code is the output.

## SDD flow
constitution → specify → plan → tasks → implement

## Principles
${(input.principles || []).map((x, i) => `${i + 1}. ${x}`).join('\n')}

## Data classification
${input.security?.classification || 'internal'}
`;
}

export function renderCopilotInstructions(input) {
  const s = input.stack || {};
  return `# Copilot Instructions — ${input.project?.name || 'Project'}

Primary agent: **${input.agent?.primary || 'GitHub Copilot'}** (model: ${input.agent?.model || 'default'}).

Follow Spec-Driven Development: read \`context/\` and \`specs/\` before writing code.
Specifications are the source of truth.

## Stack
Frontend: ${s.frontend || 'n/a'} · Backend: ${s.backend || 'n/a'} · Testing: ${s.testing || 'n/a'}.

## Security
Data classification: ${input.security?.classification || 'internal'}.
OWASP focus: ${(input.security?.owaspControls || []).join(', ') || 'baseline'}.
Never commit secrets. Use environment variables and placeholders.
`;
}

export function generateFiles(baseFiles, input) {
  const out = { ...baseFiles };
  out['context/project.md'] = renderProject(input);
  out['context/tech-stack.md'] = renderTechStack(input);
  out['context/constitution.md'] = renderConstitution(input);
  out['.github/copilot-instructions.md'] = renderCopilotInstructions(input);
  if ((input.mcp || []).length > 0) out['.vscode/mcp.json'] = renderMcpJson(input.mcp);
  if (typeof input.featuresSpec === 'string' && input.featuresSpec.trim()) {
    out['specs/features-spec.md'] = `# Features Spec\n\n${input.featuresSpec}\n`;
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/components/generators.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/components/generators.js specdd-kit/website/src/components/generators.test.js
git commit -m "feat(specdd-kit): file generators with overlay + MCP placeholders"
```

---

## Task 6: Wizard UI (8 steps + ZIP download)

**Files:**
- Create: `specdd-kit/website/src/components/Wizard.jsx`
- Modify: `specdd-kit/website/src/pages/index.astro` (mount the wizard)

**Interfaces:**
- Consumes: `generateFiles` from `./generators.js`; `../data/kit-files.json` (imported at module top); `jszip`.
- Produces: a React component with 8 steps (Welcome, Project, Tech Stack, Principles, MCP Tools, Agent & LLM, Security, Preview/Download). Per-step required-field validation blocks Next. Final step previews generated files and downloads a ZIP.
- Test hooks (used by Task 7): `data-testid` on `next-btn`, `download-btn`, `project-name`, `step-title`.

- [ ] **Step 1: Create `src/components/Wizard.jsx`**

```jsx
import { useState } from 'react';
import JSZip from 'jszip';
import kitFiles from '../data/kit-files.json';
import { generateFiles } from './generators.js';

const STEPS = ['Welcome', 'Project', 'Tech Stack', 'Principles', 'MCP Tools', 'Agent & LLM', 'Security', 'Preview / Download'];
const MCP_OPTIONS = ['github', 'sonarqube', 'context7', 'postgresql', 'playwright', 'figma'];
const AGENTS = ['GitHub Copilot', 'Claude', 'Cursor', 'Gemini'];

const initial = {
  project: { name: '', description: '', problem: '' },
  personas: [], outcomes: { user: '', business: '' },
  constraints: { business: '', technical: '' },
  stack: { languages: [], frontend: '', backend: '', testing: '', database: '', infra: '', swagger: false, a11y: false },
  principles: ['Specifications are the source of truth'],
  mcp: [], agent: { primary: 'GitHub Copilot', model: '' },
  security: { classification: 'internal', owaspControls: [] },
  featuresSpec: '',
};

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initial);
  const [error, setError] = useState('');

  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  function validate() {
    if (step === 1 && !data.project.name.trim()) return 'Project name is required.';
    if (step === 1 && !data.project.description.trim()) return 'Description is required.';
    if (step === 2 && !data.stack.frontend.trim()) return 'Frontend is required.';
    return '';
  }

  function next() {
    const e = validate();
    if (e) { setError(e); return; }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() { setError(''); setStep((s) => Math.max(s - 1, 0)); }

  const files = step === STEPS.length - 1 ? generateFiles(kitFiles, data) : {};

  async function download() {
    const zip = new JSZip();
    for (const [path, contents] of Object.entries(generateFiles(kitFiles, data))) {
      zip.file(path, contents);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.project.name || 'sdd-kit'}-scaffold.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="wizard">
      <h1>SDD Kit Wizard</h1>
      <div className="steps">
        {STEPS.map((s, i) => <span key={s} className={i === step ? 'active' : ''}>{i + 1}. {s}</span>)}
      </div>
      <h2 data-testid="step-title">{STEPS[step]}</h2>

      {step === 0 && <p>Generate a Spec-Driven Development scaffold in under 3 minutes. Click Next to start.</p>}

      {step === 1 && (
        <>
          <label>Project name *</label>
          <input data-testid="project-name" value={data.project.name}
            onChange={(e) => set({ project: { ...data.project, name: e.target.value } })} />
          <label>Description *</label>
          <textarea value={data.project.description}
            onChange={(e) => set({ project: { ...data.project, description: e.target.value } })} />
          <label>Problem statement</label>
          <textarea value={data.project.problem}
            onChange={(e) => set({ project: { ...data.project, problem: e.target.value } })} />
        </>
      )}

      {step === 2 && (
        <>
          <label>Frontend *</label>
          <input value={data.stack.frontend}
            onChange={(e) => set({ stack: { ...data.stack, frontend: e.target.value } })} />
          <label>Backend</label>
          <input value={data.stack.backend}
            onChange={(e) => set({ stack: { ...data.stack, backend: e.target.value } })} />
          <label>Testing</label>
          <input value={data.stack.testing}
            onChange={(e) => set({ stack: { ...data.stack, testing: e.target.value } })} />
          <label>Database</label>
          <input value={data.stack.database}
            onChange={(e) => set({ stack: { ...data.stack, database: e.target.value } })} />
        </>
      )}

      {step === 3 && (
        <>
          <label>Principles (one per line)</label>
          <textarea value={data.principles.join('\n')}
            onChange={(e) => set({ principles: e.target.value.split('\n').filter(Boolean) })} />
        </>
      )}

      {step === 4 && (
        <>
          <label>MCP tools</label>
          {MCP_OPTIONS.map((m) => (
            <label key={m} style={{ fontWeight: 400 }}>
              <input type="checkbox" style={{ width: 'auto', marginRight: '.5rem' }}
                checked={data.mcp.includes(m)}
                onChange={(e) => set({ mcp: e.target.checked ? [...data.mcp, m] : data.mcp.filter((x) => x !== m) })} />
              {m}
            </label>
          ))}
        </>
      )}

      {step === 5 && (
        <>
          <label>Primary agent</label>
          <select value={data.agent.primary}
            onChange={(e) => set({ agent: { ...data.agent, primary: e.target.value } })}>
            {AGENTS.map((a) => <option key={a}>{a}</option>)}
          </select>
          <label>Default model</label>
          <input value={data.agent.model}
            onChange={(e) => set({ agent: { ...data.agent, model: e.target.value } })} />
        </>
      )}

      {step === 6 && (
        <>
          <label>Data classification</label>
          <select value={data.security.classification}
            onChange={(e) => set({ security: { ...data.security, classification: e.target.value } })}>
            {['public', 'internal', 'confidential', 'restricted'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </>
      )}

      {step === 7 && (
        <>
          <p>{Object.keys(files).length} files ready.</p>
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

- [ ] **Step 2: Update `src/pages/index.astro` to mount the wizard**

```astro
---
import Layout from '../layouts/Layout.astro';
import Wizard from '../components/Wizard.jsx';
import '../styles/wizard.css';
---
<Layout title="SDD Kit Wizard">
  <Wizard client:load />
</Layout>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: `prebuild` runs bundle-kit, then Astro build succeeds (`Complete!`). If Playwright/browser errors appear they belong to Task 7, not build.

- [ ] **Step 4: Commit**

```bash
git add specdd-kit/website/src/components/Wizard.jsx specdd-kit/website/src/pages/index.astro
git commit -m "feat(specdd-kit): 8-step wizard with ZIP download"
```

---

## Task 7: e2e wizard test

**Files:**
- Create: `specdd-kit/website/e2e/wizard.spec.js`

**Interfaces:**
- Consumes: running dev server (Playwright `webServer` from Task 3) and `data-testid` hooks from Task 6.

- [ ] **Step 1: Write the e2e test**

```js
import { test, expect } from '@playwright/test';

test('wizard walks steps and downloads a scaffold ZIP', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('step-title')).toHaveText('Welcome');

  await page.getByTestId('next-btn').click(); // -> Project
  await page.getByTestId('next-btn').click(); // validation blocks (name empty)
  await expect(page.getByTestId('error')).toBeVisible();

  await page.getByTestId('project-name').fill('Acme');
  await page.locator('textarea').first().fill('An SDD project');
  await page.getByTestId('next-btn').click(); // -> Tech Stack
  await page.locator('input').first().fill('React');
  await page.getByTestId('next-btn').click(); // -> Principles
  await page.getByTestId('next-btn').click(); // -> MCP
  await page.getByTestId('next-btn').click(); // -> Agent
  await page.getByTestId('next-btn').click(); // -> Security
  await page.getByTestId('next-btn').click(); // -> Preview

  await expect(page.getByTestId('preview')).toContainText('context/project.md');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toContain('scaffold.zip');
});
```

- [ ] **Step 2: Install browsers and run**

Run: `npx playwright install chromium && npm test`
Expected: 1 passed. If browsers cannot be installed, report the exact command `npx playwright install` and the error — do not hide it.

- [ ] **Step 3: Commit**

```bash
git add specdd-kit/website/e2e/wizard.spec.js
git commit -m "test(specdd-kit): e2e wizard walkthrough + ZIP download"
```

---

## Task 8: Kit base content (context defaults, constitution, specs/_template, templates)

**Files:**
- Create: `specdd-kit/context/{project.md,tech-stack.md,constitution.md}` (default fallbacks — bundle-kit excludes them, but they document the shape and let the kit stand alone)
- Create: `specdd-kit/governance/constitution.md`
- Create: `specdd-kit/specs/_template/{spec.md,plan.md,tasks.md,data-model.md,quickstart.md,research.md,checklist.md,api.md,contracts/README.md}`
- Create: `specdd-kit/templates/{spec-template.md,plan-template.md,tasks-template.md,checklist-template.md,constitution-template.md,agents-md-template.md,agent-file-template.md,llms-txt-template.md,vscode-settings.json}` and `templates/commands/{analyze,checklist,clarify,constitution,implement,plan,specify,tasks}.md`
- Create: `specdd-kit/examples/.gitkeep`

**Interfaces:**
- Produces: static kit files that `bundle-kit.js` snapshots (except the three `context/*` defaults it excludes).

**Template — every `specs/_template/*.md` and `templates/*.md` file uses this SDD skeleton:**

```markdown
# <Document Type>

> Part of the Spec-Driven Development flow: constitution → specify → plan → tasks → implement.

## Purpose
<one line: what this document captures>

## Inputs
- <what you need before filling this in>

## Content
<the actual sections for this document type — see per-file sections below>

## Definition of Done
- [ ] <checkable completion criteria>
```

**Fully-worked example — `specs/_template/spec.md`:**

```markdown
# Feature Specification: <feature name>

> Specifications are the source of truth. Code is the output.

## Summary
<what and why, 2-3 sentences>

## Personas & outcomes
- **Persona:** <who>
- **User outcome:** <what they achieve>
- **Business outcome:** <value delivered>

## Requirements
### Functional
- FR-1: <requirement>

### Non-functional
- NFR-1: <performance / security / a11y>

## Acceptance criteria
- [ ] <given/when/then>

## Out of scope
- <excluded item>

## Open questions
- <question needing clarification>
```

**Per-file content sections (apply the skeleton, fill these sections):**
- `plan.md`: Architecture, Components, Data flow, Risks, Testing strategy.
- `tasks.md`: numbered task list, each with Files / Steps / Done.
- `data-model.md`: Entities, Fields, Relationships.
- `quickstart.md`: Prerequisites, Setup steps, Run/verify.
- `research.md`: Question, Options, Decision, Rationale.
- `checklist.md`: pre-merge checkboxes (spec ↔ code ↔ tests).
- `api.md`: Endpoints, Request/Response, Errors.
- `contracts/README.md`: how contract files (OpenAPI/JSON schema) live here.
- `templates/*-template.md`: same as matching `specs/_template` doc, phrased as a blank template.
- `constitution-template.md`: SDD flow, Principles, Data classification (NO L1–L4 levels).
- `agents-md-template.md` / `agent-file-template.md`: agent role, tools, guardrails, safety.
- `llms-txt-template.md`: `# <project>` + sections listing key docs/URLs for LLM context.
- `templates/commands/*.md`: one command doc each mirroring the matching `specdd-*` prompt, describing when/how the agent runs it.

**`governance/constitution.md`** and **`context/constitution.md`** use the constitution template content (SDD flow + generic principles, no L1–L4).
**`context/project.md`** / **`context/tech-stack.md`**: minimal filled examples (used as documentation; excluded from the bundle).
**`templates/vscode-settings.json`:** `{ "chat.promptFiles": true, "files.eol": "\n", "editor.formatOnSave": true }`.

- [ ] **Step 1:** Create the directory tree and every file above, applying the skeleton + per-file sections.

- [ ] **Step 2: Re-bundle and verify the files are captured**

Run: `npm run bundle-kit`
Expected: file count increases; `src/data/kit-files.json` contains `specs/_template/spec.md` and `templates/spec-template.md`, and does NOT contain `context/project.md`.

- [ ] **Step 3: Commit**

```bash
git add specdd-kit/context specdd-kit/governance specdd-kit/specs specdd-kit/templates specdd-kit/examples
git commit -m "feat(specdd-kit): SDD templates, specs/_template, constitution, context defaults"
```

---

## Task 9: Prompts

**Files:**
- Create in `specdd-kit/.github/prompts/`: `specdd-specify.prompt.md`, `specdd-clarify.prompt.md`, `specdd-plan.prompt.md`, `specdd-tasks.prompt.md`, `specdd-analyze.prompt.md`, `specdd-implement.prompt.md`, `specdd-checklist.prompt.md`, `specdd-code-review.prompt.md`, `specdd-constitution.prompt.md`, `specdd-adr.prompt.md`, `specdd-spike.prompt.md`, `specdd-issues-from-spec.prompt.md`, `specdd-issues-from-plan.prompt.md`, `specdd-issues-from-unmet.prompt.md`, `specdd-create-llms.prompt.md`, `specdd-update-llms.prompt.md`, `conventional-commit.prompt.md`

**Interfaces:**
- Produces: Copilot-Chat prompt files; each snapshotted by bundle-kit.

**Template — every prompt file:**

```markdown
---
agent: agent
description: <short imperative description>
---

# /<command-name>

<One paragraph: what this command does in the SDD flow.>

## Steps
1. <read which context/spec files>
2. <what to produce>
3. <where to write output>

## Output
<expected artifact and its location>

## Guardrails
- Specifications are the source of truth.
- Never invent requirements; ask via /specdd-clarify when unsure.
- No secrets in output.
```

**Fully-worked example — `specdd-specify.prompt.md`:**

```markdown
---
agent: agent
description: Turn a feature idea into a formal SDD specification
---

# /specdd-specify

Create a feature specification from the user's intent, using `context/` and any
provided feature notes. This is the `specify` step of the SDD flow.

## Steps
1. Read `context/project.md`, `context/tech-stack.md`, and `context/constitution.md`.
2. Draft a spec following `templates/spec-template.md`.
3. Write it to `specs/<feature-slug>/spec.md`.

## Output
`specs/<feature-slug>/spec.md` with Summary, Personas & outcomes, Requirements,
Acceptance criteria, Out of scope, Open questions.

## Guardrails
- Specifications are the source of truth.
- Mark unknowns as Open questions; do not guess.
- No secrets in output.
```

**Descriptions for the rest** (apply the template, one-line intent each):
- `specdd-clarify`: Ask targeted questions to resolve a spec's open questions.
- `specdd-plan`: Produce an implementation plan from an approved spec (`plan.md`).
- `specdd-tasks`: Break a plan into bite-sized tasks (`tasks.md`).
- `specdd-analyze`: Analyze a codebase/spec gap before implementing.
- `specdd-implement`: Implement tasks TDD-style following the plan.
- `specdd-checklist`: Generate/verify a pre-merge checklist.
- `specdd-code-review`: Review a diff against the spec and constitution.
- `specdd-constitution`: Draft/update the project constitution.
- `specdd-adr`: Record an architecture decision (ADR).
- `specdd-spike`: Time-box a research spike and capture findings in `research.md`.
- `specdd-issues-from-spec`: Derive tracker issues from a spec.
- `specdd-issues-from-plan`: Derive issues from a plan.
- `specdd-issues-from-unmet`: Derive issues from unmet acceptance criteria.
- `specdd-create-llms`: Create `llms.txt` from templates.
- `specdd-update-llms`: Refresh an existing `llms.txt`.
- `conventional-commit`: Produce a Conventional Commits message for staged changes.

- [ ] **Step 1:** Create all 17 prompt files using the template + descriptions.

- [ ] **Step 2: Verify frontmatter**

Run: `node --test` (add `scripts/prompts.test.js` below first).

```js
// scripts/prompts.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

test('every prompt has agent+description frontmatter', () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.github', 'prompts');
  const files = readdirSync(dir).filter((f) => f.endsWith('.prompt.md'));
  assert.ok(files.length >= 17);
  for (const f of files) {
    const txt = readFileSync(join(dir, f), 'utf8');
    assert.match(txt, /^---[\s\S]*?agent:\s*agent[\s\S]*?description:\s*.+[\s\S]*?---/, `${f} frontmatter`);
  }
});
```

Run: `node --test scripts/prompts.test.js`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add specdd-kit/.github/prompts specdd-kit/website/scripts/prompts.test.js
git commit -m "feat(specdd-kit): specdd-* Copilot prompts + frontmatter test"
```

---

## Task 10: Instructions

**Files:**
- Create in `specdd-kit/.github/instructions/` (`*.instructions.md`): `specdd-workflow`, `agent-behavior`, `agent-safety`, `mcp-tools`, `security-and-owasp`, `a11y`, `typescript-5-es2022`, `reactjs`, `angular`, `nextjs`, `nestjs`, `aspnet-rest-apis`, `springboot`, `python`, `swagger-api-docs`, `sonarqube`, `containerization-docker-best-practices`, `kubernetes-deployment-best-practices`, `github-actions`, `performance-optimization`, `code-review-generic`, `context-engineering`, `devops-core-principles`

**Interfaces:**
- Produces: instruction files auto-loaded by Copilot; snapshotted by bundle-kit.

**Template — every instruction file:**

```markdown
---
applyTo: "<glob or 'all'>"
description: <short description>
---

# <Topic> Instructions

## When this applies
<stack/context trigger>

## Guidelines
- <concrete, checkable guidance>
- <...>

## Anti-patterns
- <what not to do>
```

**Fully-worked example — `specdd-workflow.instructions.md`:**

```markdown
---
applyTo: "all"
description: Spec-Driven Development workflow guardrails
---

# SDD Workflow Instructions

## When this applies
Always. This repo follows Spec-Driven Development.

## Guidelines
- Read `context/` and the relevant `specs/<feature>/` before writing code.
- Follow the flow: constitution → specify → plan → tasks → implement.
- Treat specifications as the source of truth; code is the output.
- When a requirement is ambiguous, run `/specdd-clarify` instead of guessing.

## Anti-patterns
- Writing code before an approved spec/plan.
- Silently diverging from the spec.
```

**`applyTo` per file** (stack instructions scope by glob; others use `"all"`):
- `reactjs` → `"**/*.{jsx,tsx}"`; `angular` → `"**/*.{ts,html}"`; `nextjs` → `"**/*.{jsx,tsx}"`; `nestjs` → `"**/*.ts"`; `aspnet-rest-apis` → `"**/*.cs"`; `springboot` → `"**/*.java"`; `python` → `"**/*.py"`; `typescript-5-es2022` → `"**/*.ts"`; `swagger-api-docs` → `"**/*.{yaml,yml,json}"`; `containerization-docker-best-practices` → `"**/Dockerfile*"`; `kubernetes-deployment-best-practices` → `"**/*.{yaml,yml}"`; `github-actions` → `"**/.github/workflows/*.yml"`; the rest (`agent-behavior`, `agent-safety`, `mcp-tools`, `security-and-owasp`, `a11y`, `sonarqube`, `performance-optimization`, `code-review-generic`, `context-engineering`, `devops-core-principles`) → `"all"`.

- [ ] **Step 1:** Create all 23 instruction files using the template + `applyTo` map. Each needs at least 3 real Guidelines and 1 Anti-pattern relevant to its topic.

- [ ] **Step 2: Re-bundle and sanity check**

Run: `npm run bundle-kit`
Expected: `kit-files.json` includes `.github/instructions/reactjs.instructions.md` and `.github/instructions/security-and-owasp.instructions.md`.

- [ ] **Step 3: Commit**

```bash
git add specdd-kit/.github/instructions
git commit -m "feat(specdd-kit): enterprise instruction set (no governance/ADO/Motif)"
```

---

## Task 11: Agents and hooks

**Files:**
- Create in `specdd-kit/.github/agents/` (`*.agent.md`): `specdd-specify`, `specdd-implement`, `specdd-orchestrator`, `se-security-reviewer`, `se-system-architecture-reviewer`, `se-technical-writer`, `tdd-red`, `tdd-green`, `tdd-refactor`
- Create in `specdd-kit/.github/hooks/session-logger/`: `README.md`, `hooks.json`, `on-session-start.sh`, `on-session-end.sh`

**Interfaces:**
- Produces: agent definitions and a session-logger hook; snapshotted by bundle-kit.

**Template — every agent file:**

```markdown
---
name: <agent-name>
description: <short role>
tools: [read, search, edit]
---

# <Agent Name>

## Role
<what this agent is responsible for>

## Inputs
<what it reads>

## Behavior
1. <step>
2. <step>

## Guardrails
- Specifications are the source of truth.
- Never write or log secrets.
- Stay within role; hand off to another agent when out of scope.
```

**Fully-worked example — `tdd-red.agent.md`:**

```markdown
---
name: tdd-red
description: Write a failing test that captures the next requirement
tools: [read, search, edit]
---

# TDD Red

## Role
Given a task, write exactly one failing test that specifies the next behavior.

## Inputs
The task from `tasks.md` and the relevant `spec.md` acceptance criteria.

## Behavior
1. Locate the acceptance criterion the task implements.
2. Write one focused failing test.
3. Run it and confirm it fails for the right reason.

## Guardrails
- Do not write implementation code (that is tdd-green's job).
- Specifications are the source of truth.
- Never write or log secrets.
```

**Roles for the rest:** `specdd-specify` (draft specs), `specdd-implement` (implement tasks TDD-style), `specdd-orchestrator` (route work across agents through the SDD flow), `se-security-reviewer` (OWASP/security review), `se-system-architecture-reviewer` (architecture review), `se-technical-writer` (docs), `tdd-green` (minimal code to pass), `tdd-refactor` (refactor with tests green).

**`hooks/session-logger/hooks.json`:**

```json
{
  "hooks": {
    "SessionStart": [{ "command": "bash .github/hooks/session-logger/on-session-start.sh" }],
    "SessionEnd": [{ "command": "bash .github/hooks/session-logger/on-session-end.sh" }]
  }
}
```

**`on-session-start.sh`:**

```bash
#!/usr/bin/env bash
set -euo pipefail
mkdir -p .specdd/logs
echo "session-start $(date -u +%FT%TZ)" >> .specdd/logs/session.log
```

**`on-session-end.sh`:**

```bash
#!/usr/bin/env bash
set -euo pipefail
mkdir -p .specdd/logs
echo "session-end $(date -u +%FT%TZ)" >> .specdd/logs/session.log
```

**`hooks/session-logger/README.md`:** explain what the hook logs, that it writes only timestamps (no prompt content, no secrets) to `.specdd/logs/session.log`, and how to enable it.

- [ ] **Step 1:** Create all 9 agent files + the 4 session-logger files.

- [ ] **Step 2: Re-bundle and verify**

Run: `npm run bundle-kit`
Expected: `kit-files.json` includes `.github/agents/tdd-red.agent.md` and `.github/hooks/session-logger/hooks.json`.

- [ ] **Step 3: Commit**

```bash
git add specdd-kit/.github/agents specdd-kit/.github/hooks
git commit -m "feat(specdd-kit): agents (specify/implement/orchestrator/reviewers/tdd) + session-logger hook"
```

---

## Task 12: Kit README, SETUP, docs

**Files:**
- Create: `specdd-kit/README.md`, `specdd-kit/SETUP.md`
- Create: `specdd-kit/docs/{starter-guide.md,specdd-methodology.md,workflow.md,greenfield-vs-brownfield.md,faq.md,references.md}`
- Create: `specdd-kit/.github/copilot-instructions.md` (default; excluded from bundle but documents the kit)

**Interfaces:**
- Produces: kit-level documentation.

**Content requirements:**
- `README.md`: opens with "Specifications are the source of truth. Code is the output.", what the kit generates, how to run the wizard (`cd website && npm install && npm run dev`), and how to extract the ZIP at a project root.
- `SETUP.md`: ordered sequence — prerequisites → context → first feature → MCP setup → team adoption timeline.
- `docs/starter-guide.md`: 10-minute first-feature walkthrough.
- `docs/specdd-methodology.md`: SDD explained; relation to `github/spec-kit`; differences (`specdd-*` commands, wizard, multi-agent, no L1–L4).
- `docs/workflow.md`: the constitution→specify→plan→tasks→implement loop with the matching `/specdd-*` prompts.
- `docs/greenfield-vs-brownfield.md`: applying SDD to new vs existing codebases.
- `docs/faq.md`: common questions (secrets, MCP, which agent, offline).
- `docs/references.md`: links to `github/spec-kit` and MCP docs.
- `.github/copilot-instructions.md`: the kit's own default instructions (SDD guardrails), noting the wizard overlays a project-specific version.

- [ ] **Step 1:** Create all documentation files per the content requirements.

- [ ] **Step 2: Commit**

```bash
git add specdd-kit/README.md specdd-kit/SETUP.md specdd-kit/docs specdd-kit/.github/copilot-instructions.md
git commit -m "docs(specdd-kit): README, SETUP, methodology, workflow, faq, references"
```

---

## Task 13: Full validation

**Files:** none (verification only).

- [ ] **Step 1: Clean build from the kit root**

Run (PowerShell):
```powershell
cd specdd-kit\website
npm install
npm run bundle-kit
npm run test:unit
npm run build
```
Expected: bundle prints a file count in the dozens; unit tests pass; `astro build` prints `Complete!`.

- [ ] **Step 2: e2e**

Run: `npx playwright install chromium; npm test`
Expected: 1 passed. If browsers unavailable, report `npx playwright install` and the error verbatim.

- [ ] **Step 3: Secret scan (must find nothing real)**

Run: `git grep -nE "gh[pousr]_[A-Za-z0-9]{20,}|AZURE_CLIENT_SECRET\s*=\s*[A-Za-z0-9]|-----BEGIN" -- specdd-kit .github` (PowerShell: `git grep -nE "..."`)
Expected: no matches (placeholders like `${input:github_pat}` are fine and won't match).

- [ ] **Step 4: Final summary**

Produce a summary of: files created, commands run and their results, and any pending assumptions (e.g., Playwright browsers, specforge-kit deferred to Iteration 2).

- [ ] **Step 5: Commit any remaining tracked changes**

```bash
git add -A
git commit -m "chore(specdd-kit): iteration 1 validation" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- Base repo (README, .gitignore, .vscode, launch prompt) → Task 1. ✅
- CI → Task 2. ✅
- Wizard app (Astro/React/JSZip, 8 steps, bundle-kit, generators, ZIP) → Tasks 3–7. ✅
- MCP básicos as opt-in `mcp.json` with placeholders → Task 5 (`renderMcpJson`) + Task 6 step. ✅
- Multi-agent selection → Task 6 (Agent step) + Task 5 (`renderCopilotInstructions`). ✅
- Prompts/instructions/agents/hooks/templates/docs → Tasks 8–12. ✅
- No governance L1–L4, no Azure DevOps/deploy/Motif → omitted throughout; noted in Tasks 8–10. ✅
- Tests + build + secret scan → Tasks 4,5,7,13. ✅

**Placeholder scan:** Markdown-content tasks (8–12) intentionally provide a strict template + one worked example + the full file list + per-file content specs — that is the executable content for template-driven files, not a TODO. JS/config tasks contain complete code.

**Type consistency:** `bundleKit(kitRoot, outPath)`, `generateFiles(baseFiles, input)`, `renderMcpJson(mcp)`, and the `input` shape are used identically across Tasks 4, 5, 6, and 7. `data-testid` hooks (`next-btn`, `download-btn`, `project-name`, `step-title`, `preview`, `error`) defined in Task 6 match those asserted in Task 7. ✅
```
