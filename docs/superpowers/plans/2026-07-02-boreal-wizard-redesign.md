# Boreal Wizard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle both wizards (`specdd-kit`, `specforge-kit`) with the Boreal Design System (dark frosted-glass theme) and a left sidebar-stepper layout, without changing any generation logic.

**Architecture:** Each Astro app gets a copied Boreal token stylesheet, a Google-Fonts `<link>`, and a rewritten `wizard.css` using those tokens. A new `Stepper.jsx` renders the glass sidebar with per-step ✓/●/○ states; `Wizard.jsx` is refactored into a 2-column shell (sidebar + main panel) with a pure `isStepValid` used by both Next and the stepper. Icons come from `lucide-react` (replacing the unused `iconoir-react`). Generators, bundlers, ZIP, and all `data-testid` hooks are untouched.

**Tech Stack:** Astro 5, React 18, JSZip, lucide-react, Playwright (e2e), Node `node:test` (unit), Node 20+ (dev machine runs Node 22).

## Global Constraints

- Preserve every `data-testid`: `step-title`, `next-btn`, `download-btn`, `preview`, `error`, `project-name` (specdd), `feature-title` (specforge), `persona-BA/QA/Dev/UX` (specforge). Preserve the `data-ready` hydration signal on the wizard root.
- Do NOT modify `generators.js`, `bundle-kit.js`, `bundle-skills.js`, or the ZIP flow.
- Build ON the Boreal tokens; do not invent new colors. Dark theme only (no light/toggle).
- No Boreal logo, no travel copy — style only; keep the "SDD Kit Wizard" / "SpecForge Wizard" titles.
- Add `lucide-react` to dependencies; remove `iconoir-react` (currently unused in both apps).
- Fonts via Google Fonts `<link>` (Bricolage Grotesque 700/800, Hanken Grotesk 400/500/600, Space Mono 400/700).
- Node engine `>=20.0.0`; no secrets; do not version `node_modules`, `.astro`, `dist`, `kit-files.json`, `skills.json`.

---

## File Structure

```
specdd-kit/website/
├── src/styles/boreal-tokens.css      # Task 1 — copy of Boreal colors_and_type.css
├── src/styles/wizard.css             # Task 2 — rewritten (imports boreal-tokens)
├── src/layouts/Layout.astro          # Task 1 — add fonts <link> + color-scheme
├── src/components/Stepper.jsx        # Task 2 — new glass sidebar stepper
├── src/components/Wizard.jsx         # Task 2 — refactor to 2-col shell
├── e2e/wizard.spec.js                # Task 2 — add stepper assertion
└── package.json                      # Task 1 — swap iconoir-react → lucide-react

specforge-kit/website/                # mirror: Task 3 (foundation) + Task 4 (restyle)
```

The Boreal source file (do not edit): `Boreal Design System/colors_and_type.css`.

---

## Task 1: specdd-kit — Boreal theme foundation

**Files:**
- Create: `specdd-kit/website/src/styles/boreal-tokens.css`
- Modify: `specdd-kit/website/src/layouts/Layout.astro`, `specdd-kit/website/package.json`

**Interfaces:**
- Produces: `boreal-tokens.css` (all `:root` custom properties + `.b-*` classes) that Task 2's `wizard.css` `@import`s; a Google-Fonts `<link>` in `Layout.astro`; `lucide-react` available as a dependency.

- [ ] **Step 1: Copy the Boreal tokens into the app**

Run (from repo root, Bash):
```bash
cp "Boreal Design System/colors_and_type.css" specdd-kit/website/src/styles/boreal-tokens.css
```
Verify the file starts with `:root {` and contains `--glacier-500` and `--ember-500`.

- [ ] **Step 2: Add fonts + dark color-scheme to `Layout.astro`**

Replace the `<head>` contents of `specdd-kit/website/src/layouts/Layout.astro` so it reads exactly:

```astro
---
const { title = 'SDD Kit Wizard' } = Astro.props;
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

- [ ] **Step 3: Swap the icon dependency in `package.json`**

In `specdd-kit/website/package.json`, in `dependencies`, remove the `"iconoir-react": "^7.0.0",` line and add `"lucide-react": "^0.400.0",` (keep alphabetical-ish order; valid JSON). The `dependencies` block becomes:

```json
  "dependencies": {
    "@astrojs/react": "^4.0.0",
    "astro": "^5.3.0",
    "jszip": "^3.10.1",
    "lucide-react": "^0.400.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
```

- [ ] **Step 4: Install and verify build**

Run:
```bash
cd specdd-kit/website && npm install && npm run build
```
Expected: install succeeds (lucide-react added); `prebuild` runs bundle-kit; astro build prints `Complete!`. (The old `wizard.css` is still in place and unchanged — build stays green.)

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/styles/boreal-tokens.css specdd-kit/website/src/layouts/Layout.astro specdd-kit/website/package.json specdd-kit/website/package-lock.json
git commit -m "feat(specdd-kit): add Boreal tokens, fonts, lucide-react (theme foundation)"
```

---

## Task 2: specdd-kit — Stepper + sidebar layout + Boreal restyle

**Files:**
- Create: `specdd-kit/website/src/components/Stepper.jsx`
- Modify: `specdd-kit/website/src/styles/wizard.css` (full rewrite), `specdd-kit/website/src/components/Wizard.jsx` (refactor), `specdd-kit/website/e2e/wizard.spec.js` (add assertion)

**Interfaces:**
- Consumes: `boreal-tokens.css` (Task 1); `lucide-react` (Task 1).
- Produces: `Stepper({ steps, current, isValid, maxVisited, onJump })` — a React component; and a refactored `Wizard` exposing a pure `isStepValid(i)` shared by `next()` and `Stepper`. Step-nav items carry `data-testid="step-nav-<i>"` and `data-state` ∈ {active, done, visited, upcoming}.

- [ ] **Step 1: Create `src/components/Stepper.jsx`**

```jsx
import { Check, Circle } from 'lucide-react';

export default function Stepper({ steps, current, isValid, maxVisited, onJump }) {
  return (
    <ol className="b-stepper">
      {steps.map((label, i) => {
        const visited = i <= maxVisited;
        const active = i === current;
        const done = visited && !active && isValid(i);
        const state = active ? 'active' : done ? 'done' : visited ? 'visited' : 'upcoming';
        return (
          <li key={label}>
            <button
              type="button"
              className={`b-step b-step--${state}`}
              data-testid={`step-nav-${i}`}
              data-state={state}
              disabled={!visited}
              aria-current={active ? 'step' : undefined}
              onClick={() => { if (visited) onJump(i); }}
            >
              <span className="b-step__icon">
                {done ? <Check size={16} /> : active ? <span className="b-step__dot" /> : <Circle size={16} />}
              </span>
              <span className="b-step__label">{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 2: Rewrite `src/styles/wizard.css`**

Replace the entire file with:

```css
@import './boreal-tokens.css';

* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg1); font-family: var(--font-body); }

.b-shell {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: var(--space-5);
  max-width: 1120px;
  margin: var(--space-6) auto;
  padding: 0 var(--space-5);
  align-items: start;
}

.b-sidebar {
  background: var(--surface-glass);
  backdrop-filter: blur(var(--blur-glass));
  -webkit-backdrop-filter: blur(var(--blur-glass));
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg), var(--shadow-inset-hair);
  padding: var(--space-5);
  position: sticky;
  top: var(--space-5);
}
.b-brand { font-family: var(--font-display); font-weight: var(--w-bold); font-size: var(--text-h3); color: var(--fg1); letter-spacing: var(--ls-tight); }
.b-sidebar__eyebrow { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: var(--ls-eyebrow); text-transform: uppercase; color: var(--glacier-300); margin: var(--space-2) 0 var(--space-5); }

.b-stepper { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-1); }
.b-step { width: 100%; display: flex; align-items: center; gap: var(--space-3); background: transparent; border: 0; border-radius: var(--radius-md); padding: var(--space-3); color: var(--fg2); font-family: var(--font-body); font-size: var(--text-sm); cursor: pointer; text-align: left; transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out); }
.b-step:disabled { cursor: not-allowed; color: var(--fg-muted); }
.b-step:not(:disabled):hover { background: var(--surface-glass-light); color: var(--fg1); }
.b-step:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--glacier-500); }
.b-step__icon { width: 22px; height: 22px; display: grid; place-items: center; border-radius: var(--radius-pill); border: 1px solid var(--border-soft); color: var(--fg3); flex: none; }
.b-step__dot { width: 8px; height: 8px; border-radius: var(--radius-pill); background: var(--ember-500); box-shadow: 0 0 0 3px var(--ember-glow); }
.b-step--done .b-step__icon { color: var(--aurora-500); border-color: rgba(69,196,158,0.4); }
.b-step--active { color: var(--fg1); background: var(--surface-glass-light); }
.b-step--active .b-step__icon { border-color: var(--ember-500); color: var(--ember-500); }
.b-step--active .b-step__label { font-weight: var(--w-semibold); }

.b-main {
  background: var(--surface-glass);
  backdrop-filter: blur(var(--blur-glass));
  -webkit-backdrop-filter: blur(var(--blur-glass));
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg), var(--shadow-frost), var(--shadow-inset-hair);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  min-height: 520px;
}
.b-main__eyebrow { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: var(--ls-eyebrow); text-transform: uppercase; color: var(--glacier-300); }
.b-main__title { font-family: var(--font-display); font-size: var(--text-h1); font-weight: var(--w-bold); letter-spacing: var(--ls-tight); color: var(--fg1); margin: var(--space-2) 0 var(--space-5); }
.b-main__body { flex: 1; }

.b-main label { display: block; font-family: var(--font-body); font-weight: var(--w-medium); color: var(--fg2); margin: var(--space-4) 0 var(--space-2); }
.b-main input:not([type="checkbox"]), .b-main textarea, .b-main select {
  width: 100%; padding: var(--space-3) var(--space-4);
  background: var(--ink-900); color: var(--fg1);
  border: 1px solid var(--border); border-radius: var(--radius-md);
  font-family: var(--font-body); font-size: var(--text-base);
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.b-main input:focus, .b-main textarea:focus, .b-main select:focus { outline: none; border-color: var(--glacier-500); box-shadow: 0 0 0 2px rgba(60,130,180,0.35); }
.b-main textarea { min-height: 96px; resize: vertical; }
.b-check { display: flex; align-items: center; gap: var(--space-2); font-weight: var(--w-regular); color: var(--fg2); }
.b-check input[type="checkbox"] { width: auto; accent-color: var(--ember-500); }

.b-personas { display: flex; gap: var(--space-3); flex-wrap: wrap; }
.b-persona { flex: 1; min-width: 96px; padding: var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--ink-900); color: var(--fg1); font-family: var(--font-display); font-weight: var(--w-semibold); cursor: pointer; transition: border-color var(--dur-fast), box-shadow var(--dur-base); }
.b-persona:hover { border-color: var(--glacier-500); }
.b-persona--active { border-color: var(--ember-500); box-shadow: var(--shadow-ember); }

.b-preview { max-height: 320px; overflow: auto; background: var(--ink-950); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-4); font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg2); white-space: pre-wrap; }

.b-nav { display: flex; justify-content: space-between; gap: var(--space-3); margin-top: var(--space-6); }
.b-btn { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-5); border-radius: var(--radius-pill); border: 1px solid transparent; font-family: var(--font-body); font-weight: var(--w-semibold); font-size: var(--text-base); cursor: pointer; transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), background var(--dur-fast); }
.b-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.b-btn--primary { background: var(--grad-ember); color: var(--fg-on-accent); box-shadow: var(--shadow-ember); }
.b-btn--primary:not(:disabled):hover { transform: translateY(-2px); }
.b-btn--primary:not(:disabled):active { transform: scale(0.98); }
.b-btn--ghost { background: var(--surface-glass-light); color: var(--fg1); border-color: var(--border-glass); }
.b-btn--ghost:not(:disabled):hover { background: var(--surface-glass); }
.b-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--glacier-500), 0 0 0 4px var(--bg); }

.b-error { color: var(--danger); font-family: var(--font-mono); font-size: var(--text-sm); margin-top: var(--space-4); }
.b-lead { color: var(--fg2); font-size: var(--text-lg); line-height: var(--lh-body); }

@media (max-width: 820px) {
  .b-shell { grid-template-columns: 1fr; }
  .b-sidebar { position: static; }
  .b-stepper { flex-direction: row; overflow-x: auto; }
  .b-step__label { display: none; }
}
```

- [ ] **Step 3: Refactor `src/components/Wizard.jsx`**

Replace the entire file with (step content bodies unchanged; only the shell, validation split, stepper, and buttons are new):

```jsx
import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import kitFiles from '../data/kit-files.json';
import { generateFiles } from './generators.js';
import Stepper from './Stepper.jsx';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

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

const pad2 = (n) => String(n).padStart(2, '0');

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [data, setData] = useState(initial);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  function isStepValid(i) {
    if (i === 1) return data.project.name.trim() !== '' && data.project.description.trim() !== '';
    if (i === 2) return data.stack.frontend.trim() !== '';
    return true;
  }
  function errorFor(i) {
    if (i === 1 && !data.project.name.trim()) return 'Project name is required.';
    if (i === 1 && !data.project.description.trim()) return 'Description is required.';
    if (i === 2 && !data.stack.frontend.trim()) return 'Frontend is required.';
    return '';
  }

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

  const files = step === STEPS.length - 1 ? generateFiles(kitFiles, data) : {};

  async function download() {
    const zip = new JSZip();
    for (const [path, contents] of Object.entries(generateFiles(kitFiles, data))) zip.file(path, contents);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.project.name || 'sdd-kit'}-scaffold.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const last = step === STEPS.length - 1;

  return (
    <div className="b-shell" data-ready={ready ? 'true' : 'false'}>
      <aside className="b-sidebar">
        <div className="b-brand">SDD Kit Wizard</div>
        <div className="b-sidebar__eyebrow">STEP {pad2(step + 1)} / {pad2(STEPS.length)}</div>
        <Stepper steps={STEPS} current={step} isValid={isStepValid} maxVisited={maxVisited} onJump={jump} />
      </aside>

      <main className="b-main">
        <div className="b-main__eyebrow">STEP {pad2(step + 1)} · {STEPS[step].toUpperCase()}</div>
        <h2 className="b-main__title" data-testid="step-title">{STEPS[step]}</h2>

        <div className="b-main__body">
          {step === 0 && <p className="b-lead">Generate a Spec-Driven Development scaffold in under 3 minutes. Click Next to start.</p>}

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
                <label className="b-check" key={m}>
                  <input type="checkbox" checked={data.mcp.includes(m)}
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
              <p className="b-lead">{Object.keys(files).length} files ready.</p>
              <pre className="b-preview" data-testid="preview">{Object.keys(files).sort().join('\n')}</pre>
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

- [ ] **Step 4: Update `src/pages/index.astro` if needed**

Confirm `specdd-kit/website/src/pages/index.astro` still imports `../styles/wizard.css` and mounts `<Wizard client:load />`. No change is required (wizard.css now `@import`s the tokens). If the import line is missing, add `import '../styles/wizard.css';` in the frontmatter.

- [ ] **Step 5: Add a stepper assertion to the e2e**

In `specdd-kit/website/e2e/wizard.spec.js`, after the block that fills the Project step and before the Tech Stack step is filled, the test navigates forward. Add these assertions right after the `await page.getByTestId('preview')...` line (before the download block), to verify the stepper reflects completion and back-navigation works:

```js
  // Boreal stepper: completed steps are marked done and are clickable
  await expect(page.getByTestId('step-nav-1')).toHaveAttribute('data-state', 'done');
  await page.getByTestId('step-nav-1').click();
  await expect(page.getByTestId('step-title')).toHaveText('Project');
```

The full test file becomes:

```js
import { test, expect } from '@playwright/test';

test('wizard walks steps and downloads a scaffold ZIP', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();
  await expect(page.getByTestId('step-title')).toHaveText('Welcome');

  await page.getByTestId('next-btn').click(); // -> Project
  await page.getByTestId('next-btn').click(); // validation blocks (name empty)
  await expect(page.getByTestId('error')).toBeVisible();

  await page.getByTestId('project-name').fill('Acme');
  await page.locator('textarea').first().fill('An SDD project');
  await page.getByTestId('next-btn').click(); // -> Tech Stack
  await page.locator('.b-main__body input').first().fill('React');
  await page.getByTestId('next-btn').click(); // -> Principles
  await page.getByTestId('next-btn').click(); // -> MCP
  await page.getByTestId('next-btn').click(); // -> Agent
  await page.getByTestId('next-btn').click(); // -> Security
  await page.getByTestId('next-btn').click(); // -> Preview

  await expect(page.getByTestId('preview')).toContainText('context/project.md');

  // Boreal stepper: completed steps are marked done and are clickable
  await expect(page.getByTestId('step-nav-1')).toHaveAttribute('data-state', 'done');
  await page.getByTestId('step-nav-1').click();
  await expect(page.getByTestId('step-title')).toHaveText('Project');
  await page.getByTestId('step-nav-7').click(); // jump forward to a visited step
  await expect(page.getByTestId('step-title')).toHaveText('Preview / Download');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toContain('scaffold.zip');
});
```

Note the `data-ready` selector changed from `main.wizard[data-ready="true"]` to `.b-shell[data-ready="true"]` (the root is now `.b-shell`), and the Tech Stack input selector is scoped to `.b-main__body input`.

- [ ] **Step 6: Build, then run unit + e2e**

Run:
```bash
cd specdd-kit/website && npm run build && npm run test:unit && npx playwright install chromium && npm test
```
Expected: build `Complete!`; unit 5/5; e2e 1 passed. If Playwright browsers are unavailable, report `npx playwright install` and the error verbatim — do not hide it.

- [ ] **Step 7: Commit**

```bash
git add specdd-kit/website/src/components/Stepper.jsx specdd-kit/website/src/styles/wizard.css specdd-kit/website/src/components/Wizard.jsx specdd-kit/website/e2e/wizard.spec.js
git commit -m "feat(specdd-kit): Boreal sidebar-stepper wizard restyle"
```

---

## Task 3: specforge-kit — Boreal theme foundation

**Files:**
- Create: `specforge-kit/website/src/styles/boreal-tokens.css`
- Modify: `specforge-kit/website/src/layouts/Layout.astro`, `specforge-kit/website/package.json`

**Interfaces:**
- Produces: the same theme foundation as Task 1, for the specforge app.

- [ ] **Step 1: Copy the Boreal tokens**

```bash
cp "Boreal Design System/colors_and_type.css" specforge-kit/website/src/styles/boreal-tokens.css
```

- [ ] **Step 2: Update `Layout.astro`**

Replace `specforge-kit/website/src/layouts/Layout.astro` with (note the title default differs):

```astro
---
const { title = 'SpecForge Wizard' } = Astro.props;
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

- [ ] **Step 3: Swap the icon dependency in `package.json`**

In `specforge-kit/website/package.json` `dependencies`, remove `"iconoir-react": "^7.0.0",` and add `"lucide-react": "^0.400.0",`. Result:

```json
  "dependencies": {
    "@astrojs/react": "^4.0.0",
    "astro": "^5.3.0",
    "jszip": "^3.10.1",
    "lucide-react": "^0.400.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  }
```

- [ ] **Step 4: Install and verify build**

```bash
cd specforge-kit/website && npm install && npm run build
```
Expected: install succeeds; `prebuild` runs bundle-skills; astro build prints `Complete!`.

- [ ] **Step 5: Commit**

```bash
git add specforge-kit/website/src/styles/boreal-tokens.css specforge-kit/website/src/layouts/Layout.astro specforge-kit/website/package.json specforge-kit/website/package-lock.json
git commit -m "feat(specforge-kit): add Boreal tokens, fonts, lucide-react (theme foundation)"
```

---

## Task 4: specforge-kit — Stepper + sidebar layout + Boreal restyle

**Files:**
- Create: `specforge-kit/website/src/components/Stepper.jsx`
- Modify: `specforge-kit/website/src/styles/wizard.css` (full rewrite), `specforge-kit/website/src/components/Wizard.jsx` (refactor), `specforge-kit/website/e2e/wizard.spec.js` (add assertion)

**Interfaces:**
- Consumes: `boreal-tokens.css` and `lucide-react` (Task 3); the identical `Stepper.jsx` and `wizard.css` produced for specdd-kit (Task 2).
- Produces: refactored specforge `Wizard` with the same shell/stepper contract; the mcp/slug derivation is preserved via a pure `withDerived(data)` used at generation time.

- [ ] **Step 1: Copy the Stepper and stylesheet from specdd-kit (they are identical)**

```bash
cp specdd-kit/website/src/components/Stepper.jsx specforge-kit/website/src/components/Stepper.jsx
cp specdd-kit/website/src/styles/wizard.css specforge-kit/website/src/styles/wizard.css
```
Verify `specforge-kit/website/src/styles/wizard.css` begins with `@import './boreal-tokens.css';`.

- [ ] **Step 2: Refactor `src/components/Wizard.jsx`**

Replace the entire file with (persona-dynamic; mcp/slug now derived purely at generation via `withDerived`, removing the old `next()`-side derivation so stepper-jump edits are always reflected):

```jsx
import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import skills from '../data/skills.json';
import { generateFiles } from './generators.js';
import Stepper from './Stepper.jsx';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

const STEPS = ['Welcome', 'Persona', 'Role', 'Context', 'Governance', 'Review'];
const PERSONAS = ['BA', 'QA', 'Dev', 'UX'];

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
const pad2 = (n) => String(n).padStart(2, '0');

function withDerived(d) {
  const slug = slugify(d.project.featureTitle) || 'feature';
  const mcp = { figma: d.persona === 'UX' && d.ux.figmaEnabled, playwright: d.persona === 'QA' && d.qa.approach !== 'manual' };
  return { ...d, project: { ...d.project, featureSlug: slug }, mcp };
}

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [data, setData] = useState(initial);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  function isStepValid(i) {
    if (i === 1) return !!data.persona;
    if (i === 2) return data.project.featureTitle.trim() !== '';
    return true;
  }
  function errorFor(i) {
    if (i === 1 && !data.persona) return 'Pick a persona.';
    if (i === 2 && !data.project.featureTitle.trim()) return 'Feature title is required.';
    return '';
  }

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
  const files = last ? generateFiles(skills, withDerived(data)) : {};
  const skillSlugs = Object.keys(skills);

  async function download() {
    const d = withDerived(data);
    const zip = new JSZip();
    for (const [path, contents] of Object.entries(generateFiles(skills, d))) zip.file(path, contents);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${d.project.name || 'specforge'}-${d.persona || 'scaffold'}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="b-shell" data-ready={ready ? 'true' : 'false'}>
      <aside className="b-sidebar">
        <div className="b-brand">SpecForge Wizard</div>
        <div className="b-sidebar__eyebrow">STEP {pad2(step + 1)} / {pad2(STEPS.length)}</div>
        <Stepper steps={STEPS} current={step} isValid={isStepValid} maxVisited={maxVisited} onJump={jump} />
      </aside>

      <main className="b-main">
        <div className="b-main__eyebrow">STEP {pad2(step + 1)} · {STEPS[step].toUpperCase()}</div>
        <h2 className="b-main__title" data-testid="step-title">{STEPS[step]}</h2>

        <div className="b-main__body">
          {step === 0 && <p className="b-lead">Generate a role-specific Copilot scaffold. Click Next to start.</p>}

          {step === 1 && (
            <div className="b-personas">
              {PERSONAS.map((p) => (
                <button key={p} data-testid={`persona-${p}`} className={`b-persona${data.persona === p ? ' b-persona--active' : ''}`}
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
                <label className="b-check">
                  <input type="checkbox" checked={data.ux.figmaEnabled}
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
                <label className="b-check" key={s}>
                  <input type="checkbox" checked={data.skills.includes(s)}
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
              <p className="b-lead">{Object.keys(files).length} files ready for persona {data.persona}.</p>
              <pre className="b-preview" data-testid="preview">{Object.keys(files).sort().join('\n')}</pre>
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

- [ ] **Step 3: Update the e2e `data-ready` selector + add stepper assertion**

Replace `specforge-kit/website/e2e/wizard.spec.js` with:

```js
import { test, expect } from '@playwright/test';

test('BA persona walkthrough downloads a scaffold ZIP', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();
  await expect(page.getByTestId('step-title')).toHaveText('Welcome');

  await page.getByTestId('next-btn').click(); // -> Persona
  await page.getByTestId('next-btn').click(); // blocked (no persona)
  await expect(page.getByTestId('error')).toBeVisible();
  await page.getByTestId('persona-BA').click();
  await page.getByTestId('next-btn').click(); // -> Role
  await page.getByTestId('feature-title').fill('Login');
  await page.getByTestId('next-btn').click(); // -> Context
  await page.getByTestId('next-btn').click(); // -> Governance
  await page.getByTestId('next-btn').click(); // -> Review

  await expect(page.getByTestId('preview')).toContainText('context/login.md');
  await expect(page.getByTestId('preview')).toContainText('specforge-requirements.prompt.md');

  // Boreal stepper: the Persona step is marked done and is clickable
  await expect(page.getByTestId('step-nav-1')).toHaveAttribute('data-state', 'done');
  await page.getByTestId('step-nav-1').click();
  await expect(page.getByTestId('step-title')).toHaveText('Persona');
  await page.getByTestId('step-nav-5').click(); // back to Review (visited)
  await expect(page.getByTestId('step-title')).toHaveText('Review');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toContain('BA.zip');
});
```

- [ ] **Step 4: Build, then run unit + e2e**

```bash
cd specforge-kit/website && npm run build && npm run test:unit && npx playwright install chromium && npm test
```
Expected: build `Complete!`; unit 7/7; e2e 1 passed. If browsers unavailable, report `npx playwright install` and the error verbatim.

- [ ] **Step 5: Commit**

```bash
git add specforge-kit/website/src/components/Stepper.jsx specforge-kit/website/src/styles/wizard.css specforge-kit/website/src/components/Wizard.jsx specforge-kit/website/e2e/wizard.spec.js
git commit -m "feat(specforge-kit): Boreal sidebar-stepper wizard restyle"
```

---

## Task 5: Cross-app validation + docs

**Files:** none created; verification + a small README note.

- [ ] **Step 1: Validate both apps end-to-end**

Run:
```bash
cd specdd-kit/website && npm run build && npm run test:unit && npm test
cd ../../specforge-kit/website && npm run build && npm run test:unit && npm test
```
Expected: both builds `Complete!`; specdd unit 5/5 + e2e 1 passed; specforge unit 7/7 + e2e 1 passed.

- [ ] **Step 2: Confirm no ADO/secret regressions and iconoir-react removal**

```bash
cd ../../
git grep -n "iconoir-react" -- specdd-kit specforge-kit || echo "iconoir-react fully removed"
git grep -nE "gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN" -- specdd-kit specforge-kit || echo "secret-scan clean"
```
Expected: `iconoir-react fully removed`; `secret-scan clean`.

- [ ] **Step 3: Add a "Design" line to the root README**

In `README.md`, add this line under the `## Kits` table (a new short section):

```markdown
## Design

Both wizards use the **Boreal Design System** (`Boreal Design System/`) — a dark, frosted-glass
theme (glacier/ember palette, Bricolage Grotesque / Hanken Grotesk / Space Mono) with a
left sidebar-stepper layout.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: note Boreal design system usage in both wizards"
```

---

## Self-Review

**Spec coverage:**
- Boreal token delivery per app (copy `colors_and_type.css` → `boreal-tokens.css`, fonts `<link>`) → Tasks 1, 3. ✅
- `wizard.css` rewrite on tokens + 2-column shell → Task 2 (specdd), Task 4 (copies it). ✅
- `Stepper.jsx` with done/active/upcoming/visited states + click-to-visited + `data-testid="step-nav-<i>"`/`data-state` → Task 2, copied in Task 4. ✅
- `Wizard.jsx` refactor: pure `isStepValid`, `maxVisited`, shell, ember CTA, preserved `data-testid`/`data-ready` → Tasks 2, 4. ✅
- lucide-react in, iconoir-react out → Tasks 1, 3; verified in Task 5. ✅
- specforge mcp/slug derivation preserved (via `withDerived`) → Task 4. ✅
- e2e updated for new root selector `.b-shell` + stepper assertion; unit unchanged → Tasks 2, 4. ✅
- Logic (generators/bundlers/ZIP) untouched → enforced by Global Constraints; only presentation files change. ✅
- Dark theme, no logo, no travel copy → Tasks 2, 4 keep wizard titles and technical eyebrows. ✅

**Placeholder scan:** All code blocks are complete files or exact insertions. No TBD/TODO. The only `cp` steps copy a real, named source file.

**Type consistency:** `Stepper({ steps, current, isValid, maxVisited, onJump })` is defined in Task 2 and called identically in Tasks 2 and 4. `isStepValid(i)` / `errorFor(i)` / `withDerived(d)` signatures match their call sites. The e2e root selector `.b-shell[data-ready="true"]` matches the refactored Wizard root in both apps; `data-testid="step-nav-<i>"` matches Stepper output; `data-state` values (`done`/`active`/`visited`/`upcoming`) match the CSS classes `b-step--<state>` and the e2e `toHaveAttribute('data-state','done')` assertion.
```