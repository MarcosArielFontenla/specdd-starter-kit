# specdeploy-kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `specdeploy-kit` — a Boreal-styled wizard that generates a ZIP of deployment artifacts (CI/CD pipelines, IaC, runbook, manifest) for 6 infrastructure providers, where each provider is pure data (descriptor + templates) and adding one requires zero wizard code changes.

**Architecture:** Same proven pattern as specdd-kit/specforge-kit: a build-time bundler packs `providers/**` into `src/data/providers.json`; a React wizard (Astro island) collects inputs and renders provider fields dynamically from descriptors; pure `generators.js` + a minimal template renderer produce the file map; JSZip downloads it. No backend, no credentials — generated files reference secrets **by name only**.

**Tech Stack:** Astro ^5.3, React ^18.3, JSZip ^3.10, lucide-react ^0.400, Node >=20 (`node --test` for unit tests), Playwright ^1.42 for e2e, `yaml` ^2.4 (devDependency, tests only).

**Spec:** `docs/superpowers/specs/2026-07-02-specdeploy-kit-design.md`

## Global Constraints

- Node `>=20.0.0`; all commands work on Windows (Git Bash) and Ubuntu CI.
- **Zero secrets** in any source or generated file: pipelines reference `${{ secrets.NAME }}` (GHA) / `$(NAME)` (AzP) only; the wizard never captures secret values.
- `specdeploy-kit/website/src/data/providers.json` is a generated bundle → git-ignored (like `kit-files.json`/`skills.json`).
- Dev server port **4323** (specdd uses 4321, specforge 4322).
- Wizard shell/classes/test-ids follow the Boreal pattern of `specforge-kit/website` exactly (`b-shell`, `data-ready`, `data-testid="step-title|next-btn|download-btn|error|preview|step-nav-N"`).
- Prompt frontmatter: `agent: agent` + `description:`.
- Template placeholder syntax: `{{var}}` / `{{#if var}}…{{/if}}`; GitHub Actions expressions `${{ … }}` are never touched by the renderer.
- Unit test runner: `node --test` (files named `*.test.js` under `website/`).

---

### Task 1: Website scaffold (configs, Boreal assets, placeholder page)

**Files:**
- Create: `specdeploy-kit/website/package.json`
- Create: `specdeploy-kit/website/astro.config.mjs`
- Create: `specdeploy-kit/website/playwright.config.js`
- Create: `specdeploy-kit/website/src/layouts/Layout.astro`
- Create: `specdeploy-kit/website/src/pages/index.astro` (placeholder; replaced in Task 10)
- Create: `specdeploy-kit/website/src/data/.gitkeep`
- Copy: `specforge-kit/website/src/styles/boreal-tokens.css` → `specdeploy-kit/website/src/styles/boreal-tokens.css`
- Copy: `specforge-kit/website/src/styles/wizard.css` → `specdeploy-kit/website/src/styles/wizard.css` (then append `.b-help` rule)
- Copy: `specforge-kit/website/src/components/Stepper.jsx` → `specdeploy-kit/website/src/components/Stepper.jsx`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a building Astro site; `Stepper.jsx` component with props `{ steps, current, isValid, maxVisited, onJump }` (unchanged copy); CSS classes `b-*` + new `.b-help`.

- [ ] **Step 1: Create directories and copy Boreal assets** (run from repo root)

```bash
mkdir -p specdeploy-kit/website/src/components specdeploy-kit/website/src/styles \
  specdeploy-kit/website/src/layouts specdeploy-kit/website/src/pages \
  specdeploy-kit/website/src/data specdeploy-kit/website/scripts \
  specdeploy-kit/website/e2e specdeploy-kit/providers/_schema specdeploy-kit/docs
cp specforge-kit/website/src/styles/boreal-tokens.css specdeploy-kit/website/src/styles/boreal-tokens.css
cp specforge-kit/website/src/styles/wizard.css specdeploy-kit/website/src/styles/wizard.css
cp specforge-kit/website/src/components/Stepper.jsx specdeploy-kit/website/src/components/Stepper.jsx
touch specdeploy-kit/website/src/data/.gitkeep
```

- [ ] **Step 2: Append the `.b-help` rule to `specdeploy-kit/website/src/styles/wizard.css`** (helper text under dynamic provider fields; Boreal tokens only)

```css

.b-help { color: var(--fg3); font-family: var(--font-body); font-size: var(--text-sm); margin: var(--space-1) 0 0; }
```

- [ ] **Step 3: Write `specdeploy-kit/website/package.json`**

```json
{
  "name": "specdeploy-wizard",
  "version": "1.0.0",
  "description": "SpecDeploy Wizard - generate infrastructure-agnostic deployment artifacts (pipelines, IaC, runbook)",
  "type": "module",
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "bundle-providers": "node scripts/bundle-providers.js",
    "predev": "node scripts/bundle-providers.js",
    "prebuild": "node scripts/bundle-providers.js",
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
    "jszip": "^3.10.1",
    "lucide-react": "^0.400.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.42.0",
    "yaml": "^2.4.0"
  }
}
```

- [ ] **Step 4: Write `specdeploy-kit/website/astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  server: { port: 4323 },
});
```

- [ ] **Step 5: Write `specdeploy-kit/website/playwright.config.js`**

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4323',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4323' },
});
```

- [ ] **Step 6: Write `specdeploy-kit/website/src/layouts/Layout.astro`**

```astro
---
const { title = 'SpecDeploy Wizard' } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Hanken+Grotesk:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>
```

- [ ] **Step 7: Write placeholder `specdeploy-kit/website/src/pages/index.astro`** (replaced in Task 10 — keeps the build green until the Wizard exists)

```astro
---
import Layout from '../layouts/Layout.astro';
import '../styles/wizard.css';
---
<Layout title="SpecDeploy Wizard">
  <p class="b-lead">SpecDeploy Wizard — coming in Task 10.</p>
</Layout>
```

- [ ] **Step 8: Install and verify the build** (use `npx astro build` directly — the `prebuild` hook needs `bundle-providers.js`, which arrives in Task 3)

```bash
cd specdeploy-kit/website
npm install
npx astro build
```

Expected: `Complete!` from Astro; `dist/` created; no errors.

- [ ] **Step 9: Commit**

```bash
git add specdeploy-kit
git commit -m "feat(specdeploy-kit): website scaffold with Boreal assets"
```

---

### Task 2: Template renderer (`render-template.js`)

**Files:**
- Create: `specdeploy-kit/website/src/components/render-template.js`
- Test: `specdeploy-kit/website/src/components/render-template.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `renderTemplate(template: string, ctx: object): string` — replaces `{{var}}` (dotted paths allowed), evaluates `{{#if var}}…{{/if}}` (truthy check, no else/loops), leaves `${{ … }}` untouched, **throws** on any unresolved `{{…}}`.

- [ ] **Step 1: Write the failing tests** — `specdeploy-kit/website/src/components/render-template.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTemplate } from './render-template.js';

test('replaces {{var}} including dotted paths', () => {
  const out = renderTemplate('Deploy {{app.name}} to {{region}}', { app: { name: 'Demo' }, region: 'westeurope' });
  assert.equal(out, 'Deploy Demo to westeurope');
});

test('{{#if}} keeps block when truthy, drops when falsy (inline and block form)', () => {
  const t = 'branches: [main{{#if envDev}}, develop{{/if}}]';
  assert.equal(renderTemplate(t, { envDev: true }), 'branches: [main, develop]');
  assert.equal(renderTemplate(t, { envDev: false }), 'branches: [main]');
  const block = 'a\n{{#if api}}\napi: yes\n{{/if}}\nb';
  assert.match(renderTemplate(block, { api: true }), /api: yes/);
  assert.ok(!renderTemplate(block, { api: false }).includes('api: yes'));
});

test('throws on unresolved placeholder', () => {
  assert.throws(() => renderTemplate('hello {{missing}}', {}), /unresolved/);
});

test('leaves GitHub Actions ${{ }} expressions untouched', () => {
  const t = 'token: ${{ secrets.MY_TOKEN }}';
  assert.equal(renderTemplate(t, {}), t);
});

test('vars inside a kept if-block are rendered', () => {
  const out = renderTemplate('{{#if api}}dir: {{app.apiDir}}{{/if}}', { api: true, app: { apiDir: 'api' } });
  assert.equal(out, 'dir: api');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd specdeploy-kit/website
npm run test:unit
```

Expected: FAIL — `Cannot find module ... render-template.js`.

- [ ] **Step 3: Write `specdeploy-kit/website/src/components/render-template.js`**

```js
// Minimal template renderer: {{var}} (dotted paths) and {{#if var}}...{{/if}}.
// No else, no loops. GitHub Actions expressions `${{ ... }}` are left untouched.

function lookup(ctx, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
}

export function renderTemplate(template, ctx) {
  const afterIfs = template.replace(
    /\{\{#if ([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, body) => (lookup(ctx, key) ? body : ''),
  );
  const out = afterIfs.replace(/(?<!\$)\{\{([\w.]+)\}\}/g, (_, key) => {
    const v = lookup(ctx, key);
    if (v === undefined || v === null) throw new Error(`renderTemplate: unresolved placeholder {{${key}}}`);
    return String(v);
  });
  const withoutGha = out.replace(/\$\{\{[^}]*\}\}/g, '');
  if (withoutGha.includes('{{')) throw new Error('renderTemplate: unresolved placeholder remains after render');
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit
```

Expected: all render-template tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/render-template.js src/components/render-template.test.js
git commit -m "feat(specdeploy-kit): minimal template renderer with if-blocks and GHA-expression safety"
```

---

### Task 3: Provider bundler (`bundle-providers.js`) + descriptor schema

**Files:**
- Create: `specdeploy-kit/website/scripts/bundle-providers.js`
- Create: `specdeploy-kit/providers/_schema/provider.schema.json`
- Test: `specdeploy-kit/website/scripts/bundle-providers.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `readProviders(providersDir: string): object` — returns `{ [id]: { ...descriptor, templates: { [templateName]: content } } }`; skips folders starting with `_`; **throws** with a clear message on invalid descriptors or missing templates.
  - `validateDescriptor(folderName: string, desc: object): void` — throws on rule violations.
  - CLI (`node scripts/bundle-providers.js`) writes `src/data/providers.json`.

- [ ] **Step 1: Write the failing tests** — `specdeploy-kit/website/scripts/bundle-providers.test.js` (fixtures built in a temp dir)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readProviders } from './bundle-providers.js';

function makeProvider(root, name, desc, templates = {}) {
  const dir = join(root, name);
  mkdirSync(join(dir, 'templates'), { recursive: true });
  if (desc !== null) writeFileSync(join(dir, 'provider.json'), JSON.stringify(desc));
  for (const [file, content] of Object.entries(templates)) {
    writeFileSync(join(dir, 'templates', file), content);
  }
  return dir;
}

const validDesc = {
  id: 'fake-cloud', label: 'Fake Cloud', description: 'test provider', supportsApi: false,
  ci: ['github-actions'],
  fields: [{ key: 'siteName', label: 'Site name', type: 'text', required: true }],
  secrets: [{ name: 'FAKE_TOKEN', description: 'token', where: 'CI secrets' }],
  artifacts: [
    { template: 'gha.yml', output: '.github/workflows/deploy.yml', when: 'ci:github-actions' },
    { template: 'runbook.md', output: 'docs/deploy-runbook.md' },
  ],
};
const validTemplates = { 'gha.yml': 'name: {{app.name}}\n', 'runbook.md': '# Runbook\n' };

test('bundles a valid provider with its template contents', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  makeProvider(root, 'fake-cloud', validDesc, validTemplates);
  mkdirSync(join(root, '_schema'), { recursive: true }); // must be skipped
  const bundle = readProviders(root);
  assert.deepEqual(Object.keys(bundle), ['fake-cloud']);
  assert.equal(bundle['fake-cloud'].templates['gha.yml'], 'name: {{app.name}}\n');
  assert.equal(bundle['fake-cloud'].label, 'Fake Cloud');
  rmSync(root, { recursive: true, force: true });
});

test('fails when provider.json is missing', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  makeProvider(root, 'broken', null, {});
  assert.throws(() => readProviders(root), /missing provider\.json/);
  rmSync(root, { recursive: true, force: true });
});

test('fails when an artifact references a missing template', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  makeProvider(root, 'fake-cloud', validDesc, { 'gha.yml': 'x' }); // runbook.md missing
  assert.throws(() => readProviders(root), /missing template runbook\.md/);
  rmSync(root, { recursive: true, force: true });
});

test('fails when id does not match the folder name', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  makeProvider(root, 'wrong-name', validDesc, validTemplates);
  assert.throws(() => readProviders(root), /id must equal folder name/);
  rmSync(root, { recursive: true, force: true });
});

test('fails on empty ci array', () => {
  const root = mkdtempSync(join(tmpdir(), 'prov-'));
  makeProvider(root, 'fake-cloud', { ...validDesc, ci: [] }, validTemplates);
  assert.throws(() => readProviders(root), /ci must be a non-empty array/);
  rmSync(root, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd specdeploy-kit/website
npm run test:unit
```

Expected: FAIL — `Cannot find module ... bundle-providers.js`.

- [ ] **Step 3: Write `specdeploy-kit/website/scripts/bundle-providers.js`**

```js
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateDescriptor(folderName, desc) {
  const fail = (msg) => { throw new Error(`bundle-providers: ${folderName}: ${msg}`); };
  if (!desc.id || desc.id !== folderName) fail(`id must equal folder name ("${folderName}")`);
  if (!desc.label) fail('label is required');
  if (!desc.description) fail('description is required');
  if (typeof desc.supportsApi !== 'boolean') fail('supportsApi must be boolean');
  if (!Array.isArray(desc.ci) || desc.ci.length === 0) fail('ci must be a non-empty array');
  if (!Array.isArray(desc.artifacts) || desc.artifacts.length === 0) fail('artifacts must be a non-empty array');
  for (const f of desc.fields || []) {
    if (!f.key || !f.label || !f.type) fail('every field needs key, label and type');
    if (f.type === 'select' && (!Array.isArray(f.options) || f.options.length === 0)) fail(`select field ${f.key} needs options`);
  }
  for (const s of desc.secrets || []) {
    if (!s.name || !s.description || !s.where) fail('every secret needs name, description and where');
  }
  for (const a of desc.artifacts) {
    if (!a.template || !a.output) fail('every artifact needs template and output');
  }
}

export function readProviders(providersDir) {
  const bundle = {};
  for (const name of readdirSync(providersDir)) {
    if (name.startsWith('_')) continue;
    const dir = join(providersDir, name);
    if (!statSync(dir).isDirectory()) continue;
    const descPath = join(dir, 'provider.json');
    if (!existsSync(descPath)) throw new Error(`bundle-providers: ${name} is missing provider.json`);
    let desc;
    try {
      desc = JSON.parse(readFileSync(descPath, 'utf8'));
    } catch (err) {
      throw new Error(`bundle-providers: ${name}/provider.json is not valid JSON (${err.message})`);
    }
    validateDescriptor(name, desc);
    const templates = {};
    for (const artifact of desc.artifacts) {
      const tplPath = join(dir, 'templates', artifact.template);
      if (!existsSync(tplPath)) throw new Error(`bundle-providers: ${name} references missing template ${artifact.template}`);
      templates[artifact.template] = readFileSync(tplPath, 'utf8');
    }
    bundle[desc.id] = { ...desc, templates };
  }
  return bundle;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const here = dirname(fileURLToPath(import.meta.url));       // .../website/scripts
  const providersDir = join(here, '..', '..', 'providers');   // .../specdeploy-kit/providers
  const outPath = join(here, '..', 'src', 'data', 'providers.json');
  const bundle = readProviders(providersDir);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(bundle, null, 2));
  console.log(`bundle-providers: wrote ${Object.keys(bundle).length} providers to ${outPath}`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit
```

Expected: all bundle-providers tests PASS (render-template tests still green).

- [ ] **Step 5: Write `specdeploy-kit/providers/_schema/provider.schema.json`** (documentation + reference for provider authors; the bundler enforces the same rules in code)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "specdeploy provider descriptor",
  "description": "Contract for providers/<id>/provider.json. The wizard renders `fields` dynamically; `artifacts` map templates to output paths with optional `when` conditions.",
  "type": "object",
  "required": ["id", "label", "description", "supportsApi", "ci", "artifacts"],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z0-9-]+$", "description": "Must equal the provider folder name." },
    "label": { "type": "string" },
    "description": { "type": "string" },
    "supportsApi": { "type": "boolean", "description": "Whether the generated pipeline deploys the optional API folder." },
    "ci": { "type": "array", "minItems": 1, "items": { "enum": ["github-actions", "azure-pipelines"] } },
    "fields": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["key", "label", "type"],
        "properties": {
          "key": { "type": "string", "pattern": "^[a-zA-Z][\\w]*$" },
          "label": { "type": "string" },
          "type": { "enum": ["text", "select"] },
          "required": { "type": "boolean" },
          "pattern": { "type": "string", "description": "JS RegExp source validated by the wizard." },
          "options": { "type": "array", "items": { "type": "string" } },
          "default": { "type": "string" },
          "help": { "type": "string" }
        }
      }
    },
    "secrets": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "description", "where"],
        "properties": {
          "name": { "type": "string", "pattern": "^[A-Z][A-Z0-9_]*$" },
          "description": { "type": "string" },
          "where": { "type": "string" }
        }
      }
    },
    "artifacts": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["template", "output"],
        "properties": {
          "template": { "type": "string", "description": "File name inside templates/." },
          "output": { "type": "string", "description": "Path inside the generated ZIP." },
          "when": { "type": "string", "description": "Condition: `ci:<id>` | `api` | `!api` | `field.<key>:<value>`. Combine with `&&`." }
        }
      }
    }
  }
}
```

- [ ] **Step 6: Run the CLI against the (still empty) providers dir**

```bash
npm run bundle-providers
```

Expected: `bundle-providers: wrote 0 providers to ...providers.json` (only `_schema` exists; it is skipped).

- [ ] **Step 7: Commit**

```bash
git add scripts/bundle-providers.js scripts/bundle-providers.test.js ../providers/_schema/provider.schema.json
git commit -m "feat(specdeploy-kit): provider bundler with descriptor validation + schema"
```

---

### Task 4: Generators core (`generators.js`)

**Files:**
- Create: `specdeploy-kit/website/src/components/generators.js`
- Test: `specdeploy-kit/website/src/components/generators.test.js`

**Interfaces:**
- Consumes: `renderTemplate(template, ctx)` from `./render-template.js`.
- Produces (all exported from `generators.js`):
  - `KIT_VERSION = '1.0.0'`
  - `slugify(s: string): string` — lowercase kebab (same as specforge).
  - `matchesWhen(when: string|undefined, ctx: object): boolean` — supports `ci:<id>`, `api`, `!<flag>`, `field.<key>:<value>`, combined with `&&`.
  - `buildContext(input, provider): object` — spreads `input.providerFields` at top level, adds `app`, `appSlug`, `api` (bool), `apiUnsupported`, `ciGithub`, `ciAzp`, `ci` (array), `envDev`, `approvalGate`, `providerLabel`, `kitVersion`, `secretsTable` (markdown rows), and for each **select** field value a flag `<key>_<value>: true` (e.g. `server_nginx`).
  - `renderEnvExample(provider): string`
  - `generateFiles(providersBundle, input): { [path]: content }` — provider artifacts (filtered by `when`) + always `specdeploy.json` + `.env.example`. Throws on unknown `input.providerId`.
- **Input shape** (produced by the Wizard in Task 10, consumed here and by all tests):

```js
{
  app: { name: 'Demo Site', preset: 'astro', buildCommand: 'npm run build', outputDir: 'dist', api: 'none' | 'node', apiDir: 'api' },
  providerId: 'azure-swa',
  providerFields: { appName: 'demo-site', region: 'westeurope', ... },
  ci: ['github-actions', 'azure-pipelines'],   // subset of provider.ci
  envs: 'prod' | 'dev+prod',
  approvalGate: false,
  ack: true,
}
```

- [ ] **Step 1: Write the failing tests** — `specdeploy-kit/website/src/components/generators.test.js` (inline fixture provider; no real providers needed yet)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFiles, buildContext, matchesWhen, slugify, KIT_VERSION } from './generators.js';

const fixture = {
  'fake-cloud': {
    id: 'fake-cloud', label: 'Fake Cloud', description: 'test', supportsApi: false,
    ci: ['github-actions', 'azure-pipelines'],
    fields: [
      { key: 'siteName', label: 'Site name', type: 'text', required: true },
      { key: 'server', label: 'Server', type: 'select', options: ['nginx', 'iis'], default: 'nginx' },
    ],
    secrets: [{ name: 'FAKE_TOKEN', description: 'deploy token', where: 'CI secrets' }],
    artifacts: [
      { template: 'gha.yml', output: '.github/workflows/deploy.yml', when: 'ci:github-actions' },
      { template: 'azp.yml', output: 'azure-pipelines.yml', when: 'ci:azure-pipelines' },
      { template: 'nginx.conf', output: 'deploy/nginx.conf', when: 'field.server:nginx' },
      { template: 'api-note.md', output: 'docs/api-note.md', when: 'api' },
      { template: 'runbook.md', output: 'docs/deploy-runbook.md' },
    ],
    templates: {
      'gha.yml': 'name: Deploy {{app.name}} to {{siteName}}\n',
      'azp.yml': 'trigger: [main]\n# site {{siteName}}\n',
      'nginx.conf': 'server {}\n',
      'api-note.md': 'api dir: {{app.apiDir}}\n',
      'runbook.md': '# Runbook {{providerLabel}} v{{kitVersion}}\n\n{{secretsTable}}\n',
    },
  },
};

const baseInput = {
  app: { name: 'Demo Site', preset: 'astro', buildCommand: 'npm run build', outputDir: 'dist', api: 'none', apiDir: 'api' },
  providerId: 'fake-cloud',
  providerFields: { siteName: 'demo', server: 'nginx' },
  ci: ['github-actions'],
  envs: 'prod',
  approvalGate: false,
  ack: true,
};

test('slugify kebab-cases names', () => {
  assert.equal(slugify('Demo Site 2!'), 'demo-site-2');
});

test('matchesWhen handles ci, api, negation, field equality and &&', () => {
  const ctx = { ci: ['github-actions'], api: false, server: 'nginx' };
  assert.ok(matchesWhen('ci:github-actions', ctx));
  assert.ok(!matchesWhen('ci:azure-pipelines', ctx));
  assert.ok(!matchesWhen('api', ctx));
  assert.ok(matchesWhen('!api', ctx));
  assert.ok(matchesWhen('field.server:nginx', ctx));
  assert.ok(!matchesWhen('field.server:iis', ctx));
  assert.ok(matchesWhen('ci:github-actions && !api', ctx));
  assert.ok(matchesWhen(undefined, ctx));
});

test('buildContext derives flags, secretsTable and select-value flags', () => {
  const ctx = buildContext({ ...baseInput, ci: ['github-actions', 'azure-pipelines'], envs: 'dev+prod', approvalGate: true, app: { ...baseInput.app, api: 'node' } }, fixture['fake-cloud']);
  assert.equal(ctx.siteName, 'demo');
  assert.equal(ctx.appSlug, 'demo-site');
  assert.equal(ctx.api, true);
  assert.equal(ctx.apiUnsupported, true); // fake-cloud has supportsApi: false
  assert.equal(ctx.ciGithub, true);
  assert.equal(ctx.ciAzp, true);
  assert.equal(ctx.envDev, true);
  assert.equal(ctx.approvalGate, true);
  assert.equal(ctx.server_nginx, true);
  assert.match(ctx.secretsTable, /`FAKE_TOKEN`/);
});

test('generateFiles filters artifacts by ci and api, always adds manifest and env example', () => {
  const out = generateFiles(fixture, baseInput);
  assert.ok('.github/workflows/deploy.yml' in out);
  assert.ok(!('azure-pipelines.yml' in out));        // ci not selected
  assert.ok(!('docs/api-note.md' in out));           // api none
  assert.ok('deploy/nginx.conf' in out);             // field.server:nginx
  assert.ok('docs/deploy-runbook.md' in out);
  assert.match(out['.github/workflows/deploy.yml'], /Deploy Demo Site to demo/);
  const manifest = JSON.parse(out['specdeploy.json']);
  assert.equal(manifest.kit, 'specdeploy-kit');
  assert.equal(manifest.version, KIT_VERSION);
  assert.equal(manifest.provider, 'fake-cloud');
  assert.match(out['.env.example'], /FAKE_TOKEN/);
  assert.match(out['.env.example'], /no real values/i);
});

test('generateFiles includes api artifact when api is enabled, and both pipelines when both ci selected', () => {
  const out = generateFiles(fixture, { ...baseInput, ci: ['github-actions', 'azure-pipelines'], app: { ...baseInput.app, api: 'node' } });
  assert.ok('docs/api-note.md' in out);
  assert.ok('azure-pipelines.yml' in out);
});

test('generateFiles throws on unknown provider', () => {
  assert.throws(() => generateFiles(fixture, { ...baseInput, providerId: 'nope' }), /unknown provider/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd specdeploy-kit/website
npm run test:unit
```

Expected: FAIL — `Cannot find module ... generators.js`.

- [ ] **Step 3: Write `specdeploy-kit/website/src/components/generators.js`**

```js
// Pure generators — the providers bundle is passed in (no import of providers.json).
import { renderTemplate } from './render-template.js';

export const KIT_VERSION = '1.0.0';

export const slugify = (s) => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function matchesWhen(when, ctx) {
  if (!when) return true;
  return when.split('&&').map((c) => c.trim()).every((cond) => {
    if (cond.startsWith('ci:')) return ctx.ci.includes(cond.slice(3));
    if (cond.startsWith('field.')) {
      const [key, expected] = cond.slice(6).split(':');
      return String(ctx[key]) === expected;
    }
    if (cond.startsWith('!')) return !ctx[cond.slice(1)];
    return !!ctx[cond];
  });
}

export function buildContext(input, provider) {
  const api = input.app.api !== 'none';
  const secretsTable = (provider.secrets || [])
    .map((s) => `| \`${s.name}\` | ${s.description} | ${s.where} |`)
    .join('\n');
  const ctx = {
    ...input.providerFields,
    app: { ...input.app },
    appSlug: slugify(input.app.name) || 'app',
    api,
    apiUnsupported: api && !provider.supportsApi,
    ci: input.ci,
    ciGithub: input.ci.includes('github-actions'),
    ciAzp: input.ci.includes('azure-pipelines'),
    envDev: input.envs === 'dev+prod',
    approvalGate: !!input.approvalGate,
    providerLabel: provider.label,
    kitVersion: KIT_VERSION,
    secretsTable,
  };
  for (const f of provider.fields || []) {
    if (f.type === 'select') {
      const v = String(input.providerFields[f.key] ?? '').replace(/[^\w]/g, '_');
      if (v) ctx[`${f.key}_${v}`] = true;
    }
  }
  return ctx;
}

export function renderEnvExample(provider) {
  const lines = [
    '# specdeploy — environment reference (no real values here, ever)',
    '# Secrets are created in your CI system and referenced by name:',
    ...(provider.secrets || []).map((s) => `# ${s.name} — ${s.where}`),
  ];
  return lines.join('\n') + '\n';
}

export function generateFiles(providersBundle, input) {
  const provider = providersBundle[input.providerId];
  if (!provider) throw new Error(`generateFiles: unknown provider: ${input.providerId}`);
  const ctx = buildContext(input, provider);
  const out = {};
  for (const artifact of provider.artifacts) {
    if (!matchesWhen(artifact.when, ctx)) continue;
    out[artifact.output] = renderTemplate(provider.templates[artifact.template], ctx);
  }
  out['specdeploy.json'] = JSON.stringify({
    kit: 'specdeploy-kit',
    version: KIT_VERSION,
    provider: input.providerId,
    app: input.app,
    fields: input.providerFields,
    ci: input.ci,
    envs: input.envs,
    approvalGate: !!input.approvalGate,
  }, null, 2);
  out['.env.example'] = renderEnvExample(provider);
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit
```

Expected: all generators tests PASS (previous suites still green).

- [ ] **Step 5: Commit**

```bash
git add src/components/generators.js src/components/generators.test.js
git commit -m "feat(specdeploy-kit): pure generators with when-conditions, manifest and env example"
```

---

### Task 5: `azure-swa` provider (reference) + matrix test

**Files:**
- Create: `specdeploy-kit/providers/azure-swa/provider.json`
- Create: `specdeploy-kit/providers/azure-swa/templates/github-actions.yml`
- Create: `specdeploy-kit/providers/azure-swa/templates/azure-pipelines.yml`
- Create: `specdeploy-kit/providers/azure-swa/templates/main.bicep`
- Create: `specdeploy-kit/providers/azure-swa/templates/runbook.md`
- Test: `specdeploy-kit/website/src/components/matrix.test.js`

**Interfaces:**
- Consumes: `readProviders` (Task 3), `generateFiles` (Task 4), `yaml` devDependency.
- Produces: the reference provider; a **generic** matrix test that automatically covers every provider added later (provider × each supported ci × api on/off → renders, asserts no unresolved `{{`, parseable YAML/JSON, no secret-looking values, pipeline + runbook + manifest present).

- [ ] **Step 1: Write the failing matrix test** — `specdeploy-kit/website/src/components/matrix.test.js`

```js
// Renders EVERY provider × each supported CI × api on/off. This test discovers
// providers from disk, so new providers are covered automatically.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { readProviders } from '../../scripts/bundle-providers.js';
import { generateFiles } from './generators.js';

const providersDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'providers');
const providers = readProviders(providersDir);

const SECRET_PATTERNS = /(ghp_[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|xox[bp]-|-----BEGIN [A-Z ]*PRIVATE KEY)/;

function sampleFields(provider) {
  const fields = {};
  for (const f of provider.fields || []) {
    fields[f.key] = f.default ?? (f.type === 'select' ? f.options[0] : 'sample-1');
  }
  return fields;
}

test('at least one provider exists', () => {
  assert.ok(Object.keys(providers).length >= 1);
});

for (const [id, provider] of Object.entries(providers)) {
  for (const ci of provider.ci) {
    for (const api of [false, true]) {
      test(`matrix: ${id} × ${ci} × api=${api}`, () => {
        const input = {
          app: { name: 'Matrix App', preset: 'astro', buildCommand: 'npm run build', outputDir: 'dist', api: api ? 'node' : 'none', apiDir: 'api' },
          providerId: id,
          providerFields: sampleFields(provider),
          ci: [ci],
          envs: 'dev+prod',
          approvalGate: true,
          ack: true,
        };
        const out = generateFiles(providers, input);
        for (const [path, content] of Object.entries(out)) {
          const withoutGha = content.replace(/\$\{\{[^}]*\}\}/g, '');
          assert.ok(!withoutGha.includes('{{'), `${id}:${path} has an unresolved placeholder`);
          assert.ok(!SECRET_PATTERNS.test(content), `${id}:${path} contains a secret-looking value`);
          if (path.endsWith('.yml') || path.endsWith('.yaml')) parseYaml(content);
          if (path.endsWith('.json')) JSON.parse(content);
        }
        assert.ok(out['docs/deploy-runbook.md'], `${id}: runbook missing`);
        assert.ok(out['specdeploy.json'], `${id}: manifest missing`);
        assert.ok(out['.env.example'], `${id}: env example missing`);
        const pipeline = ci === 'github-actions' ? '.github/workflows/deploy.yml' : 'azure-pipelines.yml';
        assert.ok(pipeline in out, `${id}: expected ${pipeline} for ci=${ci}`);
      });
    }
  }
}
```

- [ ] **Step 2: Run to verify it fails** (`at least one provider exists` fails — bundle is empty)

```bash
cd specdeploy-kit/website
npm run test:unit
```

Expected: FAIL — `at least one provider exists`.

- [ ] **Step 3: Write `specdeploy-kit/providers/azure-swa/provider.json`**

```json
{
  "id": "azure-swa",
  "label": "Azure Static Web Apps",
  "description": "Azure SWA with optional managed Functions API",
  "supportsApi": true,
  "ci": ["github-actions", "azure-pipelines"],
  "fields": [
    { "key": "appName", "label": "Static Web App name", "type": "text", "required": true,
      "pattern": "^[a-z0-9-]{2,60}$", "help": "Azure resource name (lowercase, digits, dashes)." },
    { "key": "resourceGroup", "label": "Resource group", "type": "text", "required": true,
      "pattern": "^[\\w-]{1,90}$" },
    { "key": "region", "label": "Region", "type": "select",
      "options": ["westeurope", "eastus2", "centralus", "eastasia"], "default": "westeurope" },
    { "key": "sku", "label": "SKU", "type": "select", "options": ["Free", "Standard"], "default": "Free" }
  ],
  "secrets": [
    { "name": "AZURE_STATIC_WEB_APPS_API_TOKEN",
      "description": "SWA deployment token",
      "where": "GitHub → Settings → Secrets and variables → Actions, or AzDO → Pipelines → Library (variable group, mark secret)" }
  ],
  "artifacts": [
    { "template": "github-actions.yml", "output": ".github/workflows/deploy.yml", "when": "ci:github-actions" },
    { "template": "azure-pipelines.yml", "output": "azure-pipelines.yml", "when": "ci:azure-pipelines" },
    { "template": "main.bicep", "output": "infra/main.bicep" },
    { "template": "runbook.md", "output": "docs/deploy-runbook.md" }
  ]
}
```

- [ ] **Step 4: Write `specdeploy-kit/providers/azure-swa/templates/github-actions.yml`**

```yaml
name: Deploy {{app.name}} to Azure Static Web Apps

on:
  push:
    branches: [main{{#if envDev}}, develop{{/if}}]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
{{#if approvalGate}}
    environment: production
{{/if}}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Build
        run: |
          npm ci
          {{app.buildCommand}}
      - name: Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: upload
          app_location: /
          output_location: {{app.outputDir}}
{{#if api}}
          api_location: {{app.apiDir}}
{{/if}}
          skip_app_build: true
```

- [ ] **Step 5: Write `specdeploy-kit/providers/azure-swa/templates/azure-pipelines.yml`**

```yaml
trigger:
  branches:
    include:
      - main
{{#if envDev}}
      - develop
{{/if}}

pool:
  vmImage: ubuntu-latest

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
  - script: |
      npm ci
      {{app.buildCommand}}
    displayName: Build
  - task: AzureStaticWebApp@0
    inputs:
      app_location: /
      output_location: {{app.outputDir}}
{{#if api}}
      api_location: {{app.apiDir}}
{{/if}}
      skip_app_build: true
      azure_static_web_apps_api_token: $(AZURE_STATIC_WEB_APPS_API_TOKEN)
```

- [ ] **Step 6: Write `specdeploy-kit/providers/azure-swa/templates/main.bicep`**

```bicep
param name string = '{{appName}}'
param location string = '{{region}}'
param sku string = '{{sku}}'

resource swa 'Microsoft.Web/staticSites@2023-01-01' = {
  name: name
  location: location
  sku: {
    name: sku
    tier: sku
  }
  properties: {}
}

output defaultHostname string = swa.properties.defaultHostname
```

- [ ] **Step 7: Write `specdeploy-kit/providers/azure-swa/templates/runbook.md`**

````md
# Deploy runbook — {{app.name}} → {{providerLabel}}

Generated by specdeploy-kit v{{kitVersion}}. No secret values live in this repo — only names.

## Prerequisites

- Azure subscription with rights to create resources in resource group `{{resourceGroup}}`.
- Azure CLI (`az`) logged in (`az login`).

## 1. Provision (once)

```bash
az group create --name {{resourceGroup}} --location {{region}}
az deployment group create --resource-group {{resourceGroup}} --template-file infra/main.bicep
```

## 2. Create the CI secrets (names only — never commit values)

| Secret | Purpose | Where to create it |
|--------|---------|--------------------|
{{secretsTable}}

Get the deployment token:

```bash
az staticwebapp secrets list --name {{appName}} --resource-group {{resourceGroup}} --query "properties.apiKey" -o tsv
```

## 3. First deploy

Push to `main` (or run the pipeline manually). The pipeline builds with
`{{app.buildCommand}}` and publishes `{{app.outputDir}}`.
{{#if api}}
The API in `{{app.apiDir}}` is deployed as managed Azure Functions.
{{/if}}
{{#if envDev}}
Pushes to `develop` also deploy (dev environment).
{{/if}}

## 4. Verify & rollback

- Verify: `az staticwebapp show --name {{appName}} --resource-group {{resourceGroup}} --query "defaultHostname" -o tsv` and open the URL.
- Rollback: `git revert` the offending commit and push — the pipeline redeploys the previous state.
{{#if approvalGate}}

## Approval gate

Production deploys wait for approval: configure the `production` environment protection rule
(GitHub → Settings → Environments) or environment approvals in Azure DevOps.
{{/if}}
````

- [ ] **Step 8: Run tests to verify the matrix passes**

```bash
npm run test:unit
```

Expected: PASS — 4 matrix cases for azure-swa (2 ci × 2 api) plus all prior suites.

- [ ] **Step 9: Commit**

```bash
git add ../providers/azure-swa src/components/matrix.test.js
git commit -m "feat(specdeploy-kit): azure-swa reference provider + provider matrix test"
```

---

### Task 6: `cloudflare-pages` provider

**Files:**
- Create: `specdeploy-kit/providers/cloudflare-pages/provider.json`
- Create: `specdeploy-kit/providers/cloudflare-pages/templates/github-actions.yml`
- Create: `specdeploy-kit/providers/cloudflare-pages/templates/azure-pipelines.yml`
- Create: `specdeploy-kit/providers/cloudflare-pages/templates/runbook.md`

**Interfaces:**
- Consumes: descriptor contract from Task 3; context keys from Task 4 (`app.*`, `appSlug`, `api`, `apiUnsupported`, `envDev`, `approvalGate`, `secretsTable`, `kitVersion`, `providerLabel`).
- Produces: provider `cloudflare-pages` (covered automatically by the matrix test).

- [ ] **Step 1: Write `specdeploy-kit/providers/cloudflare-pages/provider.json`**

```json
{
  "id": "cloudflare-pages",
  "label": "Cloudflare Pages",
  "description": "Static hosting on Cloudflare Pages via Wrangler",
  "supportsApi": false,
  "ci": ["github-actions", "azure-pipelines"],
  "fields": [
    { "key": "projectName", "label": "Pages project name", "type": "text", "required": true,
      "pattern": "^[a-z0-9-]+$", "help": "Created once with `wrangler pages project create` (see runbook)." }
  ],
  "secrets": [
    { "name": "CLOUDFLARE_API_TOKEN", "description": "API token with Pages:Edit permission", "where": "GitHub Actions secrets / AzDO variable group (secret)" },
    { "name": "CLOUDFLARE_ACCOUNT_ID", "description": "Cloudflare account id", "where": "GitHub Actions secrets / AzDO variable group" }
  ],
  "artifacts": [
    { "template": "github-actions.yml", "output": ".github/workflows/deploy.yml", "when": "ci:github-actions" },
    { "template": "azure-pipelines.yml", "output": "azure-pipelines.yml", "when": "ci:azure-pipelines" },
    { "template": "runbook.md", "output": "docs/deploy-runbook.md" }
  ]
}
```

- [ ] **Step 2: Write `specdeploy-kit/providers/cloudflare-pages/templates/github-actions.yml`**

```yaml
name: Deploy {{app.name}} to Cloudflare Pages

on:
  push:
    branches: [main{{#if envDev}}, develop{{/if}}]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
{{#if approvalGate}}
    environment: production
{{/if}}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Build
        run: |
          npm ci
          {{app.buildCommand}}
      - name: Deploy
        run: npx wrangler pages deploy {{app.outputDir}} --project-name={{projectName}}
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 3: Write `specdeploy-kit/providers/cloudflare-pages/templates/azure-pipelines.yml`**

```yaml
trigger:
  branches:
    include:
      - main
{{#if envDev}}
      - develop
{{/if}}

pool:
  vmImage: ubuntu-latest

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
  - script: |
      npm ci
      {{app.buildCommand}}
    displayName: Build
  - script: npx wrangler pages deploy {{app.outputDir}} --project-name={{projectName}}
    displayName: Deploy
    env:
      CLOUDFLARE_API_TOKEN: $(CLOUDFLARE_API_TOKEN)
      CLOUDFLARE_ACCOUNT_ID: $(CLOUDFLARE_ACCOUNT_ID)
```

- [ ] **Step 4: Write `specdeploy-kit/providers/cloudflare-pages/templates/runbook.md`**

````md
# Deploy runbook — {{app.name}} → {{providerLabel}}

Generated by specdeploy-kit v{{kitVersion}}. No secret values live in this repo — only names.

## Prerequisites

- Cloudflare account; Node 20+ locally for the one-time project creation.

## 1. Create the Pages project (once)

```bash
npx wrangler login
npx wrangler pages project create {{projectName}}
```

## 2. Create the CI secrets (names only — never commit values)

| Secret | Purpose | Where to create it |
|--------|---------|--------------------|
{{secretsTable}}

Create the API token at Cloudflare Dashboard → My Profile → API Tokens (permission: Pages → Edit).

## 3. First deploy

Push to `main` (or run the pipeline manually). The pipeline builds with
`{{app.buildCommand}}` and deploys `{{app.outputDir}}`.
{{#if envDev}}
Pushes to `develop` also deploy.
{{/if}}
{{#if apiUnsupported}}

> **Note:** this pipeline does not deploy your `{{app.apiDir}}` folder. Cloudflare Pages
> Functions use a different model (`functions/` directory); see Cloudflare docs, or pick a
> provider with API support (Azure SWA, on-prem Docker).
{{/if}}

## 4. Verify & rollback

- Verify: open `https://{{projectName}}.pages.dev`.
- Rollback: Cloudflare Dashboard → Pages → {{projectName}} → Deployments → "Rollback to this deployment".
{{#if approvalGate}}

## Approval gate

Configure the `production` environment protection rule (GitHub → Settings → Environments)
or environment approvals in Azure DevOps.
{{/if}}
````

- [ ] **Step 5: Run the matrix test**

```bash
cd specdeploy-kit/website
npm run test:unit
```

Expected: PASS — matrix now includes `cloudflare-pages × github-actions|azure-pipelines × api=false|true`.

- [ ] **Step 6: Commit**

```bash
git add ../providers/cloudflare-pages
git commit -m "feat(specdeploy-kit): cloudflare-pages provider"
```

---

### Task 7: `aws-s3-cloudfront` provider

**Files:**
- Create: `specdeploy-kit/providers/aws-s3-cloudfront/provider.json`
- Create: `specdeploy-kit/providers/aws-s3-cloudfront/templates/github-actions.yml`
- Create: `specdeploy-kit/providers/aws-s3-cloudfront/templates/azure-pipelines.yml`
- Create: `specdeploy-kit/providers/aws-s3-cloudfront/templates/main.tf`
- Create: `specdeploy-kit/providers/aws-s3-cloudfront/templates/runbook.md`

**Interfaces:**
- Consumes: same descriptor/context contracts as Task 6.
- Produces: provider `aws-s3-cloudfront` with Terraform IaC.

- [ ] **Step 1: Write `specdeploy-kit/providers/aws-s3-cloudfront/provider.json`**

```json
{
  "id": "aws-s3-cloudfront",
  "label": "AWS S3 + CloudFront",
  "description": "Private S3 bucket behind a CloudFront distribution (Terraform)",
  "supportsApi": false,
  "ci": ["github-actions", "azure-pipelines"],
  "fields": [
    { "key": "bucketName", "label": "S3 bucket name", "type": "text", "required": true,
      "pattern": "^[a-z0-9.-]{3,63}$", "help": "Globally unique." },
    { "key": "region", "label": "AWS region", "type": "select",
      "options": ["us-east-1", "eu-west-1", "eu-central-1", "sa-east-1"], "default": "us-east-1" }
  ],
  "secrets": [
    { "name": "AWS_ACCESS_KEY_ID", "description": "CI deploy user access key (prefer OIDC in production — see runbook)", "where": "GitHub Actions secrets / AzDO variable group (secret)" },
    { "name": "AWS_SECRET_ACCESS_KEY", "description": "CI deploy user secret key", "where": "GitHub Actions secrets / AzDO variable group (secret)" },
    { "name": "CLOUDFRONT_DISTRIBUTION_ID", "description": "Output of terraform apply", "where": "GitHub Actions secrets / AzDO variable group" }
  ],
  "artifacts": [
    { "template": "github-actions.yml", "output": ".github/workflows/deploy.yml", "when": "ci:github-actions" },
    { "template": "azure-pipelines.yml", "output": "azure-pipelines.yml", "when": "ci:azure-pipelines" },
    { "template": "main.tf", "output": "infra/main.tf" },
    { "template": "runbook.md", "output": "docs/deploy-runbook.md" }
  ]
}
```

- [ ] **Step 2: Write `specdeploy-kit/providers/aws-s3-cloudfront/templates/github-actions.yml`**

```yaml
name: Deploy {{app.name}} to AWS S3 + CloudFront

on:
  push:
    branches: [main{{#if envDev}}, develop{{/if}}]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
{{#if approvalGate}}
    environment: production
{{/if}}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Build
        run: |
          npm ci
          {{app.buildCommand}}
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: {{region}}
      - name: Sync to S3
        run: aws s3 sync {{app.outputDir}} s3://{{bucketName}} --delete
      - name: Invalidate CloudFront
        run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

- [ ] **Step 3: Write `specdeploy-kit/providers/aws-s3-cloudfront/templates/azure-pipelines.yml`**

```yaml
trigger:
  branches:
    include:
      - main
{{#if envDev}}
      - develop
{{/if}}

pool:
  vmImage: ubuntu-latest

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
  - script: |
      npm ci
      {{app.buildCommand}}
    displayName: Build
  - script: |
      aws s3 sync {{app.outputDir}} s3://{{bucketName}} --delete
      aws cloudfront create-invalidation --distribution-id $(CLOUDFRONT_DISTRIBUTION_ID) --paths "/*"
    displayName: Deploy
    env:
      AWS_ACCESS_KEY_ID: $(AWS_ACCESS_KEY_ID)
      AWS_SECRET_ACCESS_KEY: $(AWS_SECRET_ACCESS_KEY)
      AWS_DEFAULT_REGION: {{region}}
```

- [ ] **Step 4: Write `specdeploy-kit/providers/aws-s3-cloudfront/templates/main.tf`**

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "{{region}}"
}

resource "aws_s3_bucket" "site" {
  bucket = "{{bucketName}}"
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "{{bucketName}}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-{{bucketName}}"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-{{bucketName}}"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontRead"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.site.arn}/*"
      Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.site.arn } }
    }]
  })
}

output "distribution_id" {
  value = aws_cloudfront_distribution.site.id
}

output "cdn_domain" {
  value = aws_cloudfront_distribution.site.domain_name
}
```

- [ ] **Step 5: Write `specdeploy-kit/providers/aws-s3-cloudfront/templates/runbook.md`**

````md
# Deploy runbook — {{app.name}} → {{providerLabel}}

Generated by specdeploy-kit v{{kitVersion}}. No secret values live in this repo — only names.

## Prerequisites

- AWS account; Terraform >= 1.5; AWS CLI configured locally for the one-time provision.

## 1. Provision (once)

```bash
cd infra
terraform init
terraform apply
```

Note the outputs: `distribution_id` (goes into the `CLOUDFRONT_DISTRIBUTION_ID` secret) and `cdn_domain`.

## 2. Create the CI secrets (names only — never commit values)

| Secret | Purpose | Where to create it |
|--------|---------|--------------------|
{{secretsTable}}

> Production hardening: prefer GitHub OIDC + `role-to-assume` over long-lived access keys
> (`aws-actions/configure-aws-credentials` supports both).

## 3. First deploy

Push to `main` (or run the pipeline manually). The pipeline builds with
`{{app.buildCommand}}`, syncs `{{app.outputDir}}` to `s3://{{bucketName}}` and invalidates CloudFront.
{{#if envDev}}
Pushes to `develop` also deploy.
{{/if}}
{{#if apiUnsupported}}

> **Note:** this pipeline does not deploy your `{{app.apiDir}}` folder. For an API on AWS
> consider Lambda + API Gateway (out of scope for this kit), or pick a provider with API
> support (Azure SWA, on-prem Docker).
{{/if}}

## 4. Verify & rollback

- Verify: open `https://<cdn_domain>` from the Terraform output.
- Rollback: `git revert` and push — the sync restores the previous files.
{{#if approvalGate}}

## Approval gate

Configure the `production` environment protection rule (GitHub → Settings → Environments)
or environment approvals in Azure DevOps.
{{/if}}
````

- [ ] **Step 6: Run the matrix test**

```bash
cd specdeploy-kit/website
npm run test:unit
```

Expected: PASS including `aws-s3-cloudfront` cases.

- [ ] **Step 7: Commit**

```bash
git add ../providers/aws-s3-cloudfront
git commit -m "feat(specdeploy-kit): aws-s3-cloudfront provider with Terraform IaC"
```

---

### Task 8: `vercel` + `netlify` providers (thin, GitHub Actions only)

These two intentionally declare `"ci": ["github-actions"]` — they exercise the wizard's CI-filtering logic (Azure Pipelines must not be offered for them).

**Files:**
- Create: `specdeploy-kit/providers/vercel/provider.json`
- Create: `specdeploy-kit/providers/vercel/templates/github-actions.yml`
- Create: `specdeploy-kit/providers/vercel/templates/vercel.json`
- Create: `specdeploy-kit/providers/vercel/templates/runbook.md`
- Create: `specdeploy-kit/providers/netlify/provider.json`
- Create: `specdeploy-kit/providers/netlify/templates/github-actions.yml`
- Create: `specdeploy-kit/providers/netlify/templates/netlify.toml`
- Create: `specdeploy-kit/providers/netlify/templates/runbook.md`

**Interfaces:** same contracts as Tasks 6–7.

- [ ] **Step 1: Write `specdeploy-kit/providers/vercel/provider.json`**

```json
{
  "id": "vercel",
  "label": "Vercel",
  "description": "Deploy via Vercel CLI (Git integration is the recommended alternative)",
  "supportsApi": false,
  "ci": ["github-actions"],
  "fields": [
    { "key": "projectName", "label": "Vercel project name", "type": "text", "required": true,
      "pattern": "^[a-z0-9-]+$" }
  ],
  "secrets": [
    { "name": "VERCEL_TOKEN", "description": "Personal/CI token", "where": "GitHub Actions secrets" },
    { "name": "VERCEL_ORG_ID", "description": "From `vercel link` (.vercel/project.json)", "where": "GitHub Actions secrets" },
    { "name": "VERCEL_PROJECT_ID", "description": "From `vercel link` (.vercel/project.json)", "where": "GitHub Actions secrets" }
  ],
  "artifacts": [
    { "template": "github-actions.yml", "output": ".github/workflows/deploy.yml", "when": "ci:github-actions" },
    { "template": "vercel.json", "output": "vercel.json" },
    { "template": "runbook.md", "output": "docs/deploy-runbook.md" }
  ]
}
```

- [ ] **Step 2: Write `specdeploy-kit/providers/vercel/templates/vercel.json`**

```json
{
  "buildCommand": "{{app.buildCommand}}",
  "outputDirectory": "{{app.outputDir}}"
}
```

- [ ] **Step 3: Write `specdeploy-kit/providers/vercel/templates/github-actions.yml`**

```yaml
name: Deploy {{app.name}} to Vercel

on:
  push:
    branches: [main{{#if envDev}}, develop{{/if}}]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
{{#if approvalGate}}
    environment: production
{{/if}}
    env:
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      - run: npx vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      - run: npx vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

- [ ] **Step 4: Write `specdeploy-kit/providers/vercel/templates/runbook.md`**

````md
# Deploy runbook — {{app.name}} → {{providerLabel}}

Generated by specdeploy-kit v{{kitVersion}}. No secret values live in this repo — only names.

> Vercel's native Git integration (importing the repo at vercel.com) is the simplest path.
> This pipeline is the CLI alternative for teams that keep deploys inside their own CI.

## 1. Link the project (once)

```bash
npx vercel login
npx vercel link --project {{projectName}}
```

`.vercel/project.json` now contains `orgId` and `projectId` — copy them into the CI secrets below, and do NOT commit the `.vercel/` folder.

## 2. Create the CI secrets (names only — never commit values)

| Secret | Purpose | Where to create it |
|--------|---------|--------------------|
{{secretsTable}}

## 3. First deploy

Push to `main` (or run the workflow manually).
{{#if apiUnsupported}}

> **Note:** this pipeline does not deploy your `{{app.apiDir}}` folder. Vercel serverless
> functions use the `api/` convention inside the Vercel build; see Vercel docs, or pick a
> provider with API support (Azure SWA, on-prem Docker).
{{/if}}

## 4. Verify & rollback

- Verify: the deploy step prints the production URL.
- Rollback: Vercel Dashboard → Deployments → previous deployment → "Promote to Production".
{{#if approvalGate}}

## Approval gate

Configure the `production` environment protection rule (GitHub → Settings → Environments).
{{/if}}
````

- [ ] **Step 5: Write `specdeploy-kit/providers/netlify/provider.json`**

```json
{
  "id": "netlify",
  "label": "Netlify",
  "description": "Deploy via Netlify CLI (Git integration is the recommended alternative)",
  "supportsApi": false,
  "ci": ["github-actions"],
  "fields": [
    { "key": "siteName", "label": "Netlify site name", "type": "text", "required": true,
      "pattern": "^[a-z0-9-]+$" }
  ],
  "secrets": [
    { "name": "NETLIFY_AUTH_TOKEN", "description": "Personal access token", "where": "GitHub Actions secrets" },
    { "name": "NETLIFY_SITE_ID", "description": "Site ID (Site settings → General)", "where": "GitHub Actions secrets" }
  ],
  "artifacts": [
    { "template": "github-actions.yml", "output": ".github/workflows/deploy.yml", "when": "ci:github-actions" },
    { "template": "netlify.toml", "output": "netlify.toml" },
    { "template": "runbook.md", "output": "docs/deploy-runbook.md" }
  ]
}
```

- [ ] **Step 6: Write `specdeploy-kit/providers/netlify/templates/netlify.toml`**

```toml
[build]
  command = "{{app.buildCommand}}"
  publish = "{{app.outputDir}}"
```

- [ ] **Step 7: Write `specdeploy-kit/providers/netlify/templates/github-actions.yml`**

```yaml
name: Deploy {{app.name}} to Netlify

on:
  push:
    branches: [main{{#if envDev}}, develop{{/if}}]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
{{#if approvalGate}}
    environment: production
{{/if}}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Build
        run: |
          npm ci
          {{app.buildCommand}}
      - name: Deploy
        run: npx netlify-cli deploy --prod --dir {{app.outputDir}}
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

- [ ] **Step 8: Write `specdeploy-kit/providers/netlify/templates/runbook.md`**

````md
# Deploy runbook — {{app.name}} → {{providerLabel}}

Generated by specdeploy-kit v{{kitVersion}}. No secret values live in this repo — only names.

> Netlify's native Git integration is the simplest path. This pipeline is the CLI
> alternative for teams that keep deploys inside their own CI.

## 1. Create the site (once)

```bash
npx netlify-cli login
npx netlify-cli sites:create --name {{siteName}}
```

## 2. Create the CI secrets (names only — never commit values)

| Secret | Purpose | Where to create it |
|--------|---------|--------------------|
{{secretsTable}}

## 3. First deploy

Push to `main` (or run the workflow manually). The pipeline builds with
`{{app.buildCommand}}` and publishes `{{app.outputDir}}`.
{{#if apiUnsupported}}

> **Note:** this pipeline does not deploy your `{{app.apiDir}}` folder. Netlify Functions
> use the `netlify/functions/` convention; see Netlify docs, or pick a provider with API
> support (Azure SWA, on-prem Docker).
{{/if}}

## 4. Verify & rollback

- Verify: the deploy step prints the production URL.
- Rollback: Netlify Dashboard → Deploys → previous deploy → "Publish deploy".
{{#if approvalGate}}

## Approval gate

Configure the `production` environment protection rule (GitHub → Settings → Environments).
{{/if}}
````

- [ ] **Step 9: Run the matrix test**

```bash
cd specdeploy-kit/website
npm run test:unit
```

Expected: PASS — vercel/netlify appear with github-actions only (2 cases each).

- [ ] **Step 10: Commit**

```bash
git add ../providers/vercel ../providers/netlify
git commit -m "feat(specdeploy-kit): vercel and netlify thin providers (GHA only)"
```

---

### Task 9: `onprem-docker` provider (Nginx / IIS)

**Files:**
- Create: `specdeploy-kit/providers/onprem-docker/provider.json`
- Create: `specdeploy-kit/providers/onprem-docker/templates/Dockerfile.nginx`
- Create: `specdeploy-kit/providers/onprem-docker/templates/Dockerfile.iis`
- Create: `specdeploy-kit/providers/onprem-docker/templates/nginx.conf`
- Create: `specdeploy-kit/providers/onprem-docker/templates/web.config`
- Create: `specdeploy-kit/providers/onprem-docker/templates/docker-compose.yml`
- Create: `specdeploy-kit/providers/onprem-docker/templates/github-actions.yml`
- Create: `specdeploy-kit/providers/onprem-docker/templates/azure-pipelines.yml`
- Create: `specdeploy-kit/providers/onprem-docker/templates/runbook.md`
- Modify: `specdeploy-kit/website/src/components/generators.test.js` (add IIS-variant test — matrix only exercises the default `server=nginx`)

**Interfaces:**
- Consumes: `field.<key>:<value>` artifact conditions and `<key>_<value>` context flags (Task 4).
- Produces: provider `onprem-docker`; the site is built in CI/locally first, then baked into the image (both Dockerfiles copy `{{app.outputDir}}`).

- [ ] **Step 1: Write `specdeploy-kit/providers/onprem-docker/provider.json`**

```json
{
  "id": "onprem-docker",
  "label": "On-prem: Docker",
  "description": "Containerized static site (Nginx on Linux or IIS on Windows) pushed to a private registry",
  "supportsApi": true,
  "ci": ["github-actions", "azure-pipelines"],
  "fields": [
    { "key": "server", "label": "Web server", "type": "select", "options": ["nginx", "iis"], "default": "nginx",
      "help": "nginx = Linux containers; iis = Windows containers (Windows hosts only)." },
    { "key": "registry", "label": "Container registry host", "type": "text", "required": true,
      "pattern": "^[\\w.-]+(:\\d+)?$", "help": "e.g. registry.company.com or localhost:5000" },
    { "key": "port", "label": "Host port", "type": "text", "default": "8080", "pattern": "^\\d+$" }
  ],
  "secrets": [
    { "name": "REGISTRY_USERNAME", "description": "Registry login user", "where": "GitHub Actions secrets / AzDO variable group" },
    { "name": "REGISTRY_PASSWORD", "description": "Registry login password/token", "where": "GitHub Actions secrets / AzDO variable group (secret)" }
  ],
  "artifacts": [
    { "template": "Dockerfile.nginx", "output": "Dockerfile", "when": "field.server:nginx" },
    { "template": "Dockerfile.iis", "output": "Dockerfile", "when": "field.server:iis" },
    { "template": "nginx.conf", "output": "deploy/nginx.conf", "when": "field.server:nginx" },
    { "template": "web.config", "output": "deploy/web.config", "when": "field.server:iis" },
    { "template": "docker-compose.yml", "output": "docker-compose.yml" },
    { "template": "github-actions.yml", "output": ".github/workflows/deploy.yml", "when": "ci:github-actions" },
    { "template": "azure-pipelines.yml", "output": "azure-pipelines.yml", "when": "ci:azure-pipelines" },
    { "template": "runbook.md", "output": "docs/deploy-runbook.md" }
  ]
}
```

- [ ] **Step 2: Write `specdeploy-kit/providers/onprem-docker/templates/Dockerfile.nginx`**

```dockerfile
# Build the site first (locally or in CI): npm ci && {{app.buildCommand}}
FROM nginx:1.27-alpine
COPY {{app.outputDir}}/ /usr/share/nginx/html/
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Step 3: Write `specdeploy-kit/providers/onprem-docker/templates/Dockerfile.iis`**

```dockerfile
# escape=`
# Windows containers only. Build the site first: npm ci && {{app.buildCommand}}
FROM mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
COPY {{app.outputDir}}/ C:/inetpub/wwwroot/
COPY deploy/web.config C:/inetpub/wwwroot/web.config
EXPOSE 80
```

- [ ] **Step 4: Write `specdeploy-kit/providers/onprem-docker/templates/nginx.conf`**

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
{{#if api}}

  location /api/ {
    proxy_pass http://api:3000/;
    proxy_set_header Host $host;
  }
{{/if}}
}
```

- [ ] **Step 5: Write `specdeploy-kit/providers/onprem-docker/templates/web.config`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".webp" mimeType="image/webp" />
    </staticContent>
    <defaultDocument>
      <files>
        <clear />
        <add value="index.html" />
      </files>
    </defaultDocument>
  </system.webServer>
</configuration>
```

- [ ] **Step 6: Write `specdeploy-kit/providers/onprem-docker/templates/docker-compose.yml`**

```yaml
services:
  web:
    build: .
    image: {{registry}}/{{appSlug}}-web:latest
    ports:
      - "{{port}}:80"
{{#if api}}
  api:
    image: node:20-alpine
    working_dir: /srv/api
    volumes:
      - ./{{app.apiDir}}:/srv/api
    command: sh -c "npm ci && npm start"
    expose:
      - "3000"
{{/if}}
```

- [ ] **Step 7: Write `specdeploy-kit/providers/onprem-docker/templates/github-actions.yml`**

```yaml
name: Build and push {{app.name}} image

on:
  push:
    branches: [main{{#if envDev}}, develop{{/if}}]
  workflow_dispatch:

jobs:
  build-push:
    runs-on: {{#if server_nginx}}ubuntu-latest{{/if}}{{#if server_iis}}windows-latest{{/if}}
{{#if approvalGate}}
    environment: production
{{/if}}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Build site
        run: |
          npm ci
          {{app.buildCommand}}
      - name: Log in to registry
        run: echo "${{ secrets.REGISTRY_PASSWORD }}" | docker login {{registry}} -u "${{ secrets.REGISTRY_USERNAME }}" --password-stdin
      - name: Build image
        run: docker build -t {{registry}}/{{appSlug}}-web:latest .
      - name: Push image
        run: docker push {{registry}}/{{appSlug}}-web:latest
```

- [ ] **Step 8: Write `specdeploy-kit/providers/onprem-docker/templates/azure-pipelines.yml`**

```yaml
trigger:
  branches:
    include:
      - main
{{#if envDev}}
      - develop
{{/if}}

pool:
{{#if server_nginx}}
  vmImage: ubuntu-latest
{{/if}}
{{#if server_iis}}
  vmImage: windows-latest
{{/if}}

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
  - script: |
      npm ci
      {{app.buildCommand}}
    displayName: Build site
  - task: Docker@2
    displayName: Build and push image
    inputs:
      command: buildAndPush
      repository: {{appSlug}}-web
      dockerfile: Dockerfile
      containerRegistry: onprem-registry
      tags: latest
```

- [ ] **Step 9: Write `specdeploy-kit/providers/onprem-docker/templates/runbook.md`**

````md
# Deploy runbook — {{app.name}} → {{providerLabel}} ({{server}})

Generated by specdeploy-kit v{{kitVersion}}. No secret values live in this repo — only names.

## Prerequisites

- Docker on the target host ({{#if server_iis}}Windows Server with Windows containers{{/if}}{{#if server_nginx}}any Linux host{{/if}}).
- Access to the registry `{{registry}}`.

## 1. Create the CI secrets (names only — never commit values)

| Secret | Purpose | Where to create it |
|--------|---------|--------------------|
{{secretsTable}}

> Azure Pipelines: also create a Docker registry **service connection** named `onprem-registry`
> (Project settings → Service connections) — the pipeline references it by that name.

## 2. Build and run locally

```bash
npm ci
{{app.buildCommand}}
docker compose up --build -d
```

Open `http://localhost:{{port}}`.
{{#if api}}
The API in `{{app.apiDir}}` runs as the `api` service; the web server proxies `/api/` to it.
{{/if}}

## 3. Deploy to the host

CI builds and pushes `{{registry}}/{{appSlug}}-web:latest`. On the target host:

```bash
docker compose pull && docker compose up -d
```

(Or wire a deploy agent/webhook — site-specific and out of scope for this kit.)

## 4. Verify & rollback

- Verify: `curl -I http://<host>:{{port}}`.
- Rollback: retag and push the previous image, then `docker compose up -d` again. Pin image
  tags (e.g. git SHA) instead of `latest` when you formalize releases.
{{#if approvalGate}}

## Approval gate

Configure the `production` environment protection rule (GitHub → Settings → Environments)
or environment approvals in Azure DevOps.
{{/if}}
````

- [ ] **Step 10: Add the IIS-variant test** — append to `specdeploy-kit/website/src/components/generators.test.js`:

```js
test('onprem-docker iis variant swaps Dockerfile and server config (real provider)', async () => {
  const { readProviders } = await import('../../scripts/bundle-providers.js');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const providersDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'providers');
  const providers = readProviders(providersDir);
  const input = {
    app: { name: 'Intranet', preset: 'vite', buildCommand: 'npm run build', outputDir: 'dist', api: 'none', apiDir: 'api' },
    providerId: 'onprem-docker',
    providerFields: { server: 'iis', registry: 'registry.company.com', port: '8080' },
    ci: ['github-actions'],
    envs: 'prod',
    approvalGate: false,
    ack: true,
  };
  const out = generateFiles(providers, input);
  assert.match(out['Dockerfile'], /iis/i);
  assert.ok('deploy/web.config' in out);
  assert.ok(!('deploy/nginx.conf' in out));
  assert.match(out['.github/workflows/deploy.yml'], /windows-latest/);
});
```

- [ ] **Step 11: Run all unit tests**

```bash
cd specdeploy-kit/website
npm run test:unit
```

Expected: PASS — full matrix (azure-swa 4, cloudflare-pages 4, aws 4, vercel 2, netlify 2, onprem-docker 4 = 20 matrix cases) + IIS variant test.

- [ ] **Step 12: Commit**

```bash
git add ../providers/onprem-docker src/components/generators.test.js
git commit -m "feat(specdeploy-kit): onprem-docker provider (nginx/iis variants)"
```

---

### Task 10: Wizard UI + e2e

**Files:**
- Create: `specdeploy-kit/website/src/components/Wizard.jsx`
- Modify: `specdeploy-kit/website/src/pages/index.astro` (replace placeholder)
- Test: `specdeploy-kit/website/e2e/wizard.spec.js`

**Interfaces:**
- Consumes: `providers.json` bundle (via `bundle-providers`), `generateFiles`/`slugify` (Task 4), `Stepper` (Task 1).
- Produces: the 6-step wizard; download filename `<appSlug>-<providerId>.zip`; test-ids `app-name`, `output-dir`, `provider-<id>`, `field-<key>`, `ci-<id>`, `envs`, `approval-gate`, `api-warning`, `secrets-list`, `ack`, `preview`, `preview-select`, `preview-content` (plus the shared Boreal ones).

- [ ] **Step 1: Write the failing e2e test** — `specdeploy-kit/website/e2e/wizard.spec.js`

```js
import { test, expect } from '@playwright/test';

test('Azure SWA + GitHub Actions walkthrough downloads a deploy ZIP', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();
  await expect(page.getByTestId('step-title')).toHaveText('Welcome');

  await page.getByTestId('next-btn').click(); // -> App
  await page.getByTestId('next-btn').click(); // blocked (no app name)
  await expect(page.getByTestId('error')).toBeVisible();
  await page.getByTestId('app-name').fill('Demo Site');
  await page.getByTestId('next-btn').click(); // -> Target

  await page.getByTestId('provider-azure-swa').click();
  await page.getByTestId('field-appName').fill('demo-site');
  await page.getByTestId('field-resourceGroup').fill('rg-demo');
  await page.getByTestId('next-btn').click(); // -> CI/CD

  await expect(page.getByTestId('ci-github-actions')).toBeChecked();
  await page.getByTestId('next-btn').click(); // -> Security

  await expect(page.getByTestId('secrets-list')).toContainText('AZURE_STATIC_WEB_APPS_API_TOKEN');
  await page.getByTestId('next-btn').click(); // blocked (no ack)
  await expect(page.getByTestId('error')).toBeVisible();
  await page.getByTestId('ack').check();
  await page.getByTestId('next-btn').click(); // -> Review

  await expect(page.getByTestId('preview')).toContainText('.github/workflows/deploy.yml');
  await expect(page.getByTestId('preview')).toContainText('infra/main.bicep');
  await expect(page.getByTestId('preview')).toContainText('docs/deploy-runbook.md');
  await expect(page.getByTestId('preview')).toContainText('specdeploy.json');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toBe('demo-site-azure-swa.zip');
});

test('vercel provider hides Azure Pipelines (ci filtering)', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();
  await page.getByTestId('next-btn').click();
  await page.getByTestId('app-name').fill('Demo');
  await page.getByTestId('next-btn').click();
  await page.getByTestId('provider-vercel').click();
  await page.getByTestId('field-projectName').fill('demo');
  await page.getByTestId('next-btn').click(); // -> CI/CD
  await expect(page.getByTestId('ci-github-actions')).toBeVisible();
  await expect(page.getByTestId('ci-azure-pipelines')).toHaveCount(0);
});
```

- [ ] **Step 2: Write `specdeploy-kit/website/src/components/Wizard.jsx`**

```jsx
import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import providers from '../data/providers.json';
import { generateFiles, slugify } from './generators.js';
import Stepper from './Stepper.jsx';
import { ChevronLeft, ChevronRight, Download, Copy, TriangleAlert } from 'lucide-react';

const STEPS = ['Welcome', 'App', 'Target', 'CI/CD', 'Security', 'Review'];
const PRESETS = {
  astro: { buildCommand: 'npm run build', outputDir: 'dist' },
  vite: { buildCommand: 'npm run build', outputDir: 'dist' },
  'next-export': { buildCommand: 'npm run build', outputDir: 'out' },
  cra: { buildCommand: 'npm run build', outputDir: 'build' },
  plain: { buildCommand: '', outputDir: '.' },
  custom: { buildCommand: '', outputDir: '' },
};
const CI_OPTIONS = [
  { id: 'github-actions', label: 'GitHub Actions' },
  { id: 'azure-pipelines', label: 'Azure Pipelines' },
];

const initial = {
  app: { name: '', preset: 'astro', buildCommand: 'npm run build', outputDir: 'dist', api: 'none', apiDir: 'api' },
  providerId: '',
  providerFields: {},
  ci: ['github-actions'],
  envs: 'prod',
  approvalGate: false,
  ack: false,
};
const pad2 = (n) => String(n).padStart(2, '0');

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [data, setData] = useState(initial);
  const [error, setError] = useState('');
  const [previewPath, setPreviewPath] = useState('specdeploy.json');
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const provider = data.providerId ? providers[data.providerId] : null;

  function selectPreset(preset) {
    const p = PRESETS[preset] || PRESETS.custom;
    set({ app: { ...data.app, preset, buildCommand: p.buildCommand, outputDir: p.outputDir } });
  }

  function selectProvider(id) {
    const p = providers[id];
    const fields = {};
    for (const f of p.fields || []) fields[f.key] = f.default ?? (f.type === 'select' ? f.options[0] : '');
    const kept = data.ci.filter((c) => p.ci.includes(c));
    set({ providerId: id, providerFields: fields, ci: kept.length ? kept : [p.ci[0]] });
  }

  function fieldError(f) {
    const v = String(data.providerFields[f.key] ?? '');
    if (f.required && v.trim() === '') return `${f.label} is required.`;
    if (f.pattern && v && !new RegExp(f.pattern).test(v)) return `${f.label} is invalid.`;
    return '';
  }
  function errorFor(i) {
    if (i === 1) {
      if (!data.app.name.trim()) return 'App name is required.';
      if (!data.app.outputDir.trim()) return 'Output directory is required.';
    }
    if (i === 2) {
      if (!data.providerId) return 'Pick a deployment target.';
      for (const f of provider?.fields || []) { const e = fieldError(f); if (e) return e; }
    }
    if (i === 3 && data.ci.length === 0) return 'Pick at least one CI/CD system.';
    if (i === 4 && !data.ack) return 'Please acknowledge the secrets checklist.';
    return '';
  }
  const isStepValid = (i) => errorFor(i) === '';

  function next() {
    const e = errorFor(step);
    if (e) { setError(e); return; }
    setError('');
    const target = Math.min(step + 1, STEPS.length - 1);
    setStep(target);
    setMaxVisited((m) => Math.max(m, target));
  }
  function back() { setError(''); setStep((s) => Math.max(s - 1, 0)); }
  function jump(i) { if (i <= maxVisited) { setError(''); setStep(i); } }

  const last = step === STEPS.length - 1;
  const files = last ? generateFiles(providers, data) : {};
  const apiUnsupported = data.app.api !== 'none' && provider && !provider.supportsApi;

  async function download() {
    const zip = new JSZip();
    for (const [path, contents] of Object.entries(generateFiles(providers, data))) zip.file(path, contents);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugify(data.app.name) || 'specdeploy'}-${data.providerId}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="b-shell" data-ready={ready ? 'true' : 'false'}>
      <aside className="b-sidebar">
        <div className="b-brand">SpecDeploy Wizard</div>
        <div className="b-sidebar__eyebrow">STEP {pad2(step + 1)} / {pad2(STEPS.length)}</div>
        <Stepper steps={STEPS} current={step} isValid={isStepValid} maxVisited={maxVisited} onJump={jump} />
      </aside>

      <main className="b-main">
        <div className="b-main__eyebrow">STEP {pad2(step + 1)} · {STEPS[step].toUpperCase()}</div>
        <h2 className="b-main__title" data-testid="step-title">{STEPS[step]}</h2>

        <div className="b-main__body">
          {step === 0 && (
            <p className="b-lead">
              Generate deployment artifacts (CI/CD pipeline, IaC, runbook) for your stack.
              This wizard never deploys and never asks for credentials — secrets are referenced
              by name only. Click Next to start.
            </p>
          )}

          {step === 1 && (
            <>
              <label>App name *</label>
              <input data-testid="app-name" value={data.app.name}
                onChange={(e) => set({ app: { ...data.app, name: e.target.value } })} />
              <label>Framework preset</label>
              <select data-testid="preset" value={data.app.preset} onChange={(e) => selectPreset(e.target.value)}>
                {Object.keys(PRESETS).map((p) => <option key={p}>{p}</option>)}
              </select>
              <label>Build command</label>
              <input value={data.app.buildCommand}
                onChange={(e) => set({ app: { ...data.app, buildCommand: e.target.value } })} />
              <label>Output directory *</label>
              <input data-testid="output-dir" value={data.app.outputDir}
                onChange={(e) => set({ app: { ...data.app, outputDir: e.target.value } })} />
              <label>API</label>
              <select data-testid="api" value={data.app.api}
                onChange={(e) => set({ app: { ...data.app, api: e.target.value } })}>
                <option value="none">none</option>
                <option value="node">Node serverless</option>
              </select>
              {data.app.api !== 'none' && (
                <>
                  <label>API directory</label>
                  <input value={data.app.apiDir}
                    onChange={(e) => set({ app: { ...data.app, apiDir: e.target.value } })} />
                </>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="b-personas">
                {Object.values(providers).map((p) => (
                  <button key={p.id} data-testid={`provider-${p.id}`}
                    className={`b-persona${data.providerId === p.id ? ' b-persona--active' : ''}`}
                    onClick={() => selectProvider(p.id)}>{p.label}</button>
                ))}
              </div>
              {apiUnsupported && (
                <p className="b-error" data-testid="api-warning">
                  <TriangleAlert size={14} /> {provider.label} does not deploy the API folder — the runbook explains alternatives.
                </p>
              )}
              {provider && (provider.fields || []).map((f) => (
                <div key={f.key}>
                  <label>{f.label}{f.required ? ' *' : ''}</label>
                  {f.type === 'select'
                    ? (
                      <select data-testid={`field-${f.key}`} value={data.providerFields[f.key] ?? ''}
                        onChange={(e) => set({ providerFields: { ...data.providerFields, [f.key]: e.target.value } })}>
                        {f.options.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    )
                    : (
                      <input data-testid={`field-${f.key}`} value={data.providerFields[f.key] ?? ''}
                        onChange={(e) => set({ providerFields: { ...data.providerFields, [f.key]: e.target.value } })} />
                    )}
                  {f.help && <p className="b-help">{f.help}</p>}
                </div>
              ))}
            </>
          )}

          {step === 3 && (
            <>
              <label>CI/CD systems</label>
              {CI_OPTIONS.filter((c) => !provider || provider.ci.includes(c.id)).map((c) => (
                <label className="b-check" key={c.id}>
                  <input type="checkbox" data-testid={`ci-${c.id}`} checked={data.ci.includes(c.id)}
                    onChange={(e) => set({ ci: e.target.checked ? [...data.ci, c.id] : data.ci.filter((x) => x !== c.id) })} />
                  {c.label}
                </label>
              ))}
              <label>Environments</label>
              <select data-testid="envs" value={data.envs} onChange={(e) => set({ envs: e.target.value })}>
                <option value="prod">prod only</option>
                <option value="dev+prod">dev + prod</option>
              </select>
              <label className="b-check">
                <input type="checkbox" data-testid="approval-gate" checked={data.approvalGate}
                  onChange={(e) => set({ approvalGate: e.target.checked })} />
                Approval gate for prod
              </label>
            </>
          )}

          {step === 4 && (
            <>
              <p className="b-lead">
                The generated pipeline references these secrets <strong>by name</strong>.
                Create them in your CI system — this wizard never asks for values.
              </p>
              <pre className="b-preview" data-testid="secrets-list">
                {(provider?.secrets || []).map((s) => `${s.name}\n  ${s.description}\n  → ${s.where}`).join('\n\n') || 'No secrets required.'}
              </pre>
              <label className="b-check">
                <input type="checkbox" data-testid="ack" checked={data.ack}
                  onChange={(e) => set({ ack: e.target.checked })} />
                I understand secrets are created in the CI system and never committed.
              </label>
            </>
          )}

          {step === 5 && (
            <>
              <p className="b-lead">{Object.keys(files).length} files ready for {provider?.label}.</p>
              <pre className="b-preview" data-testid="preview">{Object.keys(files).sort().join('\n')}</pre>
              <label>Preview file</label>
              <select data-testid="preview-select" value={previewPath} onChange={(e) => setPreviewPath(e.target.value)}>
                {Object.keys(files).sort().map((p) => <option key={p}>{p}</option>)}
              </select>
              <pre className="b-preview" data-testid="preview-content">{files[previewPath] || ''}</pre>
              <button className="b-btn b-btn--ghost" onClick={() => navigator.clipboard.writeText(files[previewPath] || '')}>
                <Copy size={16} />Copy file
              </button>
            </>
          )}
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

- [ ] **Step 3: Replace `specdeploy-kit/website/src/pages/index.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';
import Wizard from '../components/Wizard.jsx';
import '../styles/wizard.css';
---
<Layout title="SpecDeploy Wizard">
  <Wizard client:load />
</Layout>
```

- [ ] **Step 4: Bundle providers and run the e2e** (install Playwright browsers first if missing: `npx playwright install chromium` — report, don't hide, any failure)

```bash
cd specdeploy-kit/website
npm run bundle-providers
npm test
```

Expected: both e2e tests PASS (dev server auto-starts on 4323 via playwright config).

- [ ] **Step 5: Run the full local suite**

```bash
npm run test:unit && npm run build
```

Expected: all unit tests PASS; Astro build completes.

- [ ] **Step 6: Commit**

```bash
git add src/components/Wizard.jsx src/pages/index.astro e2e/wizard.spec.js
git commit -m "feat(specdeploy-kit): 6-step Boreal wizard with dynamic provider fields + e2e"
```

---

### Task 11: Docs, launcher prompt, CI, gitignore, root README

**Files:**
- Create: `specdeploy-kit/README.md`
- Create: `specdeploy-kit/SETUP.md`
- Create: `specdeploy-kit/docs/provider-authoring.md`
- Create: `.github/prompts/specdeploy-launch.prompt.md`
- Modify: `.github/workflows/ci.yml` (add job + trigger path)
- Modify: `.gitignore` (ignore generated `providers.json`)
- Modify: `README.md` (root — add specdeploy-kit row and note)

**Interfaces:**
- Consumes: everything built in Tasks 1–10.
- Produces: docs + CI coverage; no code.

- [ ] **Step 1: Write `specdeploy-kit/README.md`**

```md
# specdeploy-kit

Infrastructure-agnostic **deploy wizard**: collects your app's build info, a deployment
target and CI/CD choices, then generates a ZIP with everything needed to deploy —
pipeline (GitHub Actions / Azure Pipelines), IaC, a step-by-step runbook, a `specdeploy.json`
manifest and `.env.example`.

> It generates artifacts. It never deploys, never runs a backend, never touches credentials.
> Generated pipelines reference secrets **by name only**.

## Providers (v1)

| Provider | CI | API support | IaC |
|----------|----|-------------|-----|
| Azure Static Web Apps | GHA + AzP | ✅ managed Functions | Bicep |
| Cloudflare Pages | GHA + AzP | — | — |
| AWS S3 + CloudFront | GHA + AzP | — | Terraform |
| Vercel | GHA | — | — |
| Netlify | GHA | — | — |
| On-prem Docker (Nginx/IIS) | GHA + AzP | ✅ Node sidecar | docker-compose |

Providers are **data, not code**: a folder under `providers/` with a `provider.json`
descriptor + templates. Adding one requires no wizard changes — see
[`docs/provider-authoring.md`](docs/provider-authoring.md).

## Quick start

```powershell
cd specdeploy-kit\website
npm install
npm run dev
```

Open http://localhost:4323, complete the 6 steps, download the ZIP and extract it at the
root of the project you want to deploy. Then follow `docs/deploy-runbook.md` inside the ZIP.

## Design

Boreal Design System (dark frosted-glass, sidebar-stepper) — same as specdd-kit/specforge-kit.
```

- [ ] **Step 2: Write `specdeploy-kit/SETUP.md`**

```md
# specdeploy-kit — Setup

## Prerequisites

- Node.js 20+
- npm

## Run the wizard

```powershell
cd specdeploy-kit\website
npm install
npm run dev        # bundles providers automatically (predev), serves on :4323
```

## Tests

```powershell
npm run test:unit  # renderer, bundler, generators + full provider matrix
npm test           # Playwright e2e (npx playwright install chromium first, once)
npm run build      # production build
```

## Using the generated ZIP

1. Extract the ZIP at the root of the project you want to deploy.
2. Read `docs/deploy-runbook.md` — it lists prerequisites, the exact secret **names** to
   create in your CI system, first-deploy steps, verification and rollback.
3. Commit the generated files. Never commit secret values; `.env.example` documents names only.

## Adapting to a new company / stack

Write a provider folder (descriptor + templates) — no wizard code changes needed.
Full guide: `docs/provider-authoring.md`. The provider matrix test covers new providers
automatically.
```

- [ ] **Step 3: Write `specdeploy-kit/docs/provider-authoring.md`**

````md
# Provider authoring guide

A provider is a **data folder** — the wizard renders its fields and generates its artifacts
without any code changes. This is how specdeploy-kit adapts to a new company's stack.

## Anatomy

```text
providers/<provider-id>/
├── provider.json        # descriptor (validated against _schema/provider.schema.json)
└── templates/           # one file per artifact, with {{placeholders}}
```

## 1. The descriptor (`provider.json`)

```json
{
  "id": "my-cloud",
  "label": "My Cloud",
  "description": "Static hosting on My Cloud",
  "supportsApi": false,
  "ci": ["github-actions"],
  "fields": [
    { "key": "siteName", "label": "Site name", "type": "text", "required": true,
      "pattern": "^[a-z0-9-]+$", "help": "Shown under the input." },
    { "key": "tier", "label": "Tier", "type": "select", "options": ["free", "pro"], "default": "free" }
  ],
  "secrets": [
    { "name": "MYCLOUD_TOKEN", "description": "Deploy token", "where": "GitHub Actions secrets" }
  ],
  "artifacts": [
    { "template": "github-actions.yml", "output": ".github/workflows/deploy.yml", "when": "ci:github-actions" },
    { "template": "runbook.md", "output": "docs/deploy-runbook.md" }
  ]
}
```

Rules enforced by `bundle-providers` (build fails with a clear message otherwise):

- `id` must equal the folder name.
- `ci` non-empty; only `github-actions` / `azure-pipelines`.
- Every artifact's `template` file must exist under `templates/`.
- `fields` need `key`/`label`/`type`; `select` fields need `options`.
- `secrets` need `name`/`description`/`where`. **Names only — never values.**

## 2. Templates

Minimal syntax (see `render-template.js`):

- `{{var}}` — value substitution, dotted paths allowed (`{{app.outputDir}}`).
- `{{#if flag}}…{{/if}}` — truthy block. No else, no loops.
- GitHub Actions expressions `${{ secrets.X }}` pass through untouched.
- Any unresolved `{{…}}` after rendering **throws** — the matrix test catches it.

Context available inside templates:

| Key | Meaning |
|-----|---------|
| `app.name`, `app.buildCommand`, `app.outputDir`, `app.apiDir` | From the App step |
| `appSlug` | Kebab-cased app name (safe for image/resource names) |
| every field `key` | Your descriptor fields (e.g. `{{siteName}}`) |
| `<key>_<value>` | Boolean flag per **select** field value (e.g. `{{#if tier_pro}}`) |
| `api` / `apiUnsupported` | API chosen / chosen but unsupported by this provider |
| `ciGithub`, `ciAzp`, `envDev`, `approvalGate` | CI/CD step choices |
| `providerLabel`, `kitVersion`, `secretsTable` | Metadata (secretsTable = markdown rows) |

Artifact `when` conditions: `ci:<id>`, `api`, `!api`, `field.<key>:<value>`, combinable with `&&`.

## 3. Conventions

- Always ship a `runbook.md` → `docs/deploy-runbook.md`: prerequisites, secrets table
  (`{{secretsTable}}`), first deploy, verify, rollback.
- If `supportsApi` is `false`, include an `{{#if apiUnsupported}}` note in the runbook.
- Pipelines reference secrets by name (`${{ secrets.X }}` / `$(X)`); never inline values.

## 4. Test it

Nothing to register — the matrix test discovers providers from disk:

```bash
cd website
npm run test:unit    # your provider now renders in every ci × api combination
npm run dev          # it appears as a card in the Target step
```

## 5. Checklist before PR

- [ ] `npm run test:unit` green (matrix covers the new provider).
- [ ] Wizard shows the provider and its fields; ZIP downloads.
- [ ] Runbook is accurate for a first-time operator.
- [ ] No secret values anywhere.
````

- [ ] **Step 4: Write `.github/prompts/specdeploy-launch.prompt.md`**

```md
---
agent: agent
description: Launch the specdeploy-kit wizard (install deps, bundle providers, dev server, open browser)
---

# /specdeploy-launch

Launch the **specdeploy-kit** wizard locally.

1. Verify Node.js 20+ is installed (`node --version`).
2. Change to `specdeploy-kit/website`.
3. Install dependencies: `npm install`.
4. Bundle the providers: `npm run bundle-providers`.
5. Start the dev server: `npm run dev`.
6. Open the printed Astro URL (default `http://localhost:4323`) in Microsoft Edge.
7. Report the final URL, or surface any errors verbatim (do not hide failures).
```

- [ ] **Step 5: Update `.github/workflows/ci.yml`** — add `'specdeploy-kit/**'` to both `paths` lists and append this job:

```yaml
  specdeploy-kit-build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: specdeploy-kit/website
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run bundle-providers
      - run: npm run test:unit
      - run: npm run build
```

- [ ] **Step 6: Update `.gitignore`** — next to the existing generated-bundle entries (`specdd-kit/website/src/data/kit-files.json`, `specforge-kit/website/src/data/skills.json`) add:

```gitignore
specdeploy-kit/website/src/data/providers.json
```

- [ ] **Step 7: Update root `README.md`** — add this row to the Kits table:

```md
| [`specdeploy-kit`](specdeploy-kit/) | Infrastructure-agnostic deploy wizard: generates CI/CD pipelines, IaC and a runbook for 6 providers (Azure SWA, Cloudflare, AWS, Vercel, Netlify, on-prem Docker). Providers are data — see `specdeploy-kit/docs/provider-authoring.md`. | ✅ Iteration 3 |
```

- [ ] **Step 8: Full verification**

```bash
cd specdeploy-kit/website
npm run bundle-providers && npm run test:unit && npm run build && npm test
```

Expected: 6 providers bundled; all unit + matrix tests PASS; build OK; e2e PASS.

- [ ] **Step 9: Commit**

```bash
git add specdeploy-kit/README.md specdeploy-kit/SETUP.md specdeploy-kit/docs/provider-authoring.md \
  .github/prompts/specdeploy-launch.prompt.md .github/workflows/ci.yml .gitignore README.md
git commit -m "docs(specdeploy-kit): README, setup, provider authoring guide; CI job + launcher"
```
