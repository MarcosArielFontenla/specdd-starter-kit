# Legacy Harness Detection & Deprecation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the Brownfield wizard ingests a repo that already carries an agent harness, warn (never ask), require an explicit acknowledgment, replace colliding harness paths on extract, and pre-generate `.agents/specs/tasks/harness-migration.tasks.md` so the developer's agent migrates the old harness without hand-written prompts.

**Architecture:** A pure `detectLegacyHarness(paths)` classifier (mechanism vs knowledge, path-based) runs on the RAW ingested path list inside `analyzeProject`. `generateScaffold` gains a third output `replaced[]`: with a detected+acknowledged legacy harness, colliding harness paths stay in the ZIP instead of being skipped, and a new `renderMigrationTasks` emits the pre-populated migration tasks file. The Ingest step shows a warning card with a mandatory checkbox gated by `steps.js` validation.

**Tech Stack:** same as the kit — Astro 5 + React 18 islands, Node ≥20 test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-07-18-specdd-legacy-harness-deprecation-design.md`

## Global Constraints

- **Confidentiality (hard rule):** no committed content references private harness source documents by filename or version label; the architecture is the **SpecDD Harness**. The existing guard test (`\bV\d+(\.\d+)?\b` over generated output) must keep passing and covers the new renderer automatically.
- **Warn, never ask.** No merge/replace choice UI. One acknowledgment checkbox; Next blocked while a detected legacy harness is unacknowledged.
- **Collision policy:** ONLY harness paths (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.agents/**`) override never-clobber, and only when detected + acknowledged. All other collisions keep the `skipped[]` behavior. Greenfield completely unaffected.
- **The wizard never deletes/moves files** — archival is the agent's job via the generated tasks file (`status: draft`, human approval required before implementation).
- Detection runs on **raw** paths (the analyzer's dot-folder ignore filter must NOT be applied first).
- Re-run on a previous SpecDD scaffold gets the same treatment (no special update mode).
- All work on `main`, one commit per task; never stage the unrelated "Boreal Design System/" working-tree deletions.

---

### Task 1: `detectLegacyHarness` + wiring into `analyzeProject`

**Files:**
- Modify: `specdd-kit/website/src/components/analyzer.js`
- Test: `specdd-kit/website/src/components/analyzer.test.js`

**Interfaces:**
- Produces (exact exports from `analyzer.js`):
  - `detectLegacyHarness(paths: string[]): { detected: boolean, mechanism: string[], knowledge: string[] }` — both arrays sorted.
  - `analyzeProject` result gains `legacyHarness` (the object above), computed from the RAW `paths` argument before any ignore filtering.
- Consumes: nothing new.

- [ ] **Step 1: Write the failing tests**

Append to `specdd-kit/website/src/components/analyzer.test.js` (extend the import with `detectLegacyHarness`):

```js
test('detectLegacyHarness classifies mechanism vs knowledge', () => {
  const r = detectLegacyHarness([
    'AGENTS.md', 'SYSTEM_PROMPT.md', 'CLAUDE.md',
    '.github/copilot-instructions.md',
    '.agents/AGENTS.md', '.agents/scripts/validate-agent-architecture.ps1',
    '.agents/subagents/frontend-developer.agent.md',
    '.agents/skills/angular-core/SKILL.md', '.agents/skills/testing/assets/TEST-TEMPLATE.md',
    '.agents/patterns/coding.md', '.agents/adrs/001-initial.md',
    '.claude/skills/foo/SKILL.md', '.cursor/rules/core.mdc',
    'src/app/main.ts', 'README.md', 'package.json',
  ]);
  assert.equal(r.detected, true);
  assert.deepEqual(r.knowledge, [
    '.agents/adrs/001-initial.md',
    '.agents/patterns/coding.md',
    '.agents/skills/angular-core/SKILL.md',
    '.agents/skills/testing/assets/TEST-TEMPLATE.md',
    '.claude/skills/foo/SKILL.md',
  ]);
  assert.deepEqual(r.mechanism, [
    '.agents/AGENTS.md',
    '.agents/scripts/validate-agent-architecture.ps1',
    '.agents/subagents/frontend-developer.agent.md',
    '.cursor/rules/core.mdc',
    '.github/copilot-instructions.md',
    'AGENTS.md', 'CLAUDE.md', 'SYSTEM_PROMPT.md',
  ]);
});

test('no false positives on a harness-free repo', () => {
  const r = detectLegacyHarness(['src/index.js', 'README.md', '.github/workflows/ci.yml', 'docs/agents-overview.md']);
  assert.deepEqual(r, { detected: false, mechanism: [], knowledge: [] });
});

test('analyzeProject exposes legacyHarness from RAW paths (dot-folders included)', async () => {
  const a = await analyzeProject({
    folderName: 'legacy',
    paths: ['.agents/skills/old/SKILL.md', 'AGENTS.md', 'src/index.js'],
    readFile: () => Promise.reject(new Error('no')),
  });
  assert.equal(a.legacyHarness.detected, true);
  assert.deepEqual(a.legacyHarness.knowledge, ['.agents/skills/old/SKILL.md']);
  assert.deepEqual(a.legacyHarness.mechanism, ['AGENTS.md']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: FAIL — `detectLegacyHarness` not exported.

- [ ] **Step 3: Implement in `analyzer.js`**

Append after `suggestEntities`:

```js
// ---- Legacy harness detection (Brownfield deprecation flow) ----
// Runs on the RAW ingested path list: the ignore filter above drops dot-folders,
// so detection must never reuse the filtered list.

const HARNESS_ROOT_FILES = new Set([
  'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'SYSTEM_PROMPT.md',
  '.github/copilot-instructions.md',
]);
const HARNESS_DIR_PREFIXES = ['.agents/', '.claude/', '.cursor/rules/'];
// Files that carry project rules worth rescuing (triaged by the agent);
// everything else harness-related is mechanism (deprecated directly).
const KNOWLEDGE_SEGMENTS = new Set(['skills', 'patterns', 'adrs']);

export function detectLegacyHarness(paths) {
  const mechanism = [];
  const knowledge = [];
  for (const p of paths) {
    const inHarnessDir = HARNESS_DIR_PREFIXES.some((d) => p.startsWith(d));
    if (!inHarnessDir && !HARNESS_ROOT_FILES.has(p)) continue;
    const isKnowledge = inHarnessDir && p.split('/').some((seg) => KNOWLEDGE_SEGMENTS.has(seg));
    (isKnowledge ? knowledge : mechanism).push(p);
  }
  mechanism.sort();
  knowledge.sort();
  return { detected: mechanism.length + knowledge.length > 0, mechanism, knowledge };
}
```

And in `analyzeProject`'s return object, add one line after `truncated,`:

```js
    legacyHarness: detectLegacyHarness(paths),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: PASS (48 tests).

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/components/analyzer.js specdd-kit/website/src/components/analyzer.test.js
git commit -m "feat(specdd-kit): legacy harness detection with mechanism/knowledge split"
```

---

### Task 2: Acknowledgment validation in steps.js

**Files:**
- Modify: `specdd-kit/website/src/components/steps.js` (inside `errorFor`)
- Test: `specdd-kit/website/src/components/steps.test.js`

**Interfaces:**
- Consumes: `data.analysis.legacyHarness.detected` (Task 1) and a new wizard model field `data.legacyAck: boolean` (wired in Task 5).
- Produces: `errorFor('Ingest & Analyze', data)` returns an error when a detected legacy harness is unacknowledged.

- [ ] **Step 1: Write the failing test**

Append to `steps.test.js`:

```js
test('ingest step blocks on unacknowledged legacy harness', () => {
  const legacy = { ...valid, analysis: { fileCount: 3, legacyHarness: { detected: true, mechanism: ['AGENTS.md'], knowledge: [] } } };
  assert.match(errorFor('Ingest & Analyze', { ...legacy, legacyAck: false }), /deprecat/i);
  assert.equal(errorFor('Ingest & Analyze', { ...legacy, legacyAck: true }), '');
  const clean = { ...valid, analysis: { fileCount: 3, legacyHarness: { detected: false, mechanism: [], knowledge: [] } } };
  assert.equal(errorFor('Ingest & Analyze', { ...clean, legacyAck: false }), '');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: FAIL — no acknowledgment rule yet.

- [ ] **Step 3: Implement**

In `steps.js`, replace the existing Ingest rule block:

```js
  if (stepName === 'Ingest & Analyze') {
    if (!data.analysis) return 'Choose your project folder — the analysis pre-fills the next steps.';
    if (data.analysis.legacyHarness?.detected && !data.legacyAck) {
      return 'A previous harness was detected — acknowledge its deprecation to continue.';
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: PASS (49 tests; the pre-existing `ingest step requires a completed analysis` test still passes — its fixture has no `legacyHarness`).

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/components/steps.js specdd-kit/website/src/components/steps.test.js
git commit -m "feat(specdd-kit): ingest validation requires legacy-harness acknowledgment"
```

---

### Task 3: `renderMigrationTasks`

**Files:**
- Modify: `specdd-kit/website/src/components/generators.js`
- Test: `specdd-kit/website/src/components/generators.test.js`

**Interfaces:**
- Produces: `renderMigrationTasks(input, today: string): string` — the content of `.agents/specs/tasks/harness-migration.tasks.md`. Consumes `input.analysis.legacyHarness.{mechanism,knowledge}`.
- Task 4 wires it into `generateScaffold`.

- [ ] **Step 1: Write the failing test**

Append to `generators.test.js` (extend the import with `renderMigrationTasks`):

```js
const legacyInput = {
  ...brownInput,
  legacyAck: true,
  analysis: {
    ...brownInput.analysis,
    legacyHarness: {
      detected: true,
      mechanism: ['.agents/AGENTS.md', 'AGENTS.md', 'SYSTEM_PROMPT.md'],
      knowledge: ['.agents/patterns/coding.md', '.agents/skills/angular-core/SKILL.md'],
    },
  },
};

test('migration tasks file: draft status, real paths, phases, defaults, questions', () => {
  const tasks = renderMigrationTasks(legacyInput, '2026-07-18');
  assert.match(tasks, /status: draft/);
  assert.match(tasks, /M001.*`\.agents\/AGENTS\.md`/);
  assert.match(tasks, /M003.*`SYSTEM_PROMPT\.md`/);
  assert.match(tasks, /K002.*`\.agents\/skills\/angular-core\/SKILL\.md`/);
  assert.match(tasks, /\.agents\/_archive\//);
  assert.match(tasks, /driftPolicyPath/);
  assert.match(tasks, /Phase 3 — Rewire/);
  assert.match(tasks, /validate-spec\.ps1/);
  assert.match(tasks, /Snapshots: deferred/);
  assert.match(tasks, /## Questions for the human/);
});
```

Note: `brownInput` already exists in this test file (declared above the confidentiality test). Place `legacyInput` right after `brownInput`'s declaration.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: FAIL — `renderMigrationTasks` not exported.

- [ ] **Step 3: Implement in `generators.js`** (append after `renderBrownfieldAnalysis`)

```js
export function renderMigrationTasks(input, today) {
  const lh = input.analysis?.legacyHarness || { mechanism: [], knowledge: [] };
  const pad3 = (n) => String(n).padStart(3, '0');
  const mechRows = lh.mechanism
    .map((p, i) => `- [ ] M${pad3(i + 1)} Move \`${p}\` → \`.agents/_archive/${p}\``)
    .join('\n');
  const knowRows = lh.knowledge
    .map((p, i) => `- [ ] K${pad3(i + 1)} Triage \`${p}\`: integrate its content into the matching new skill (migrate frontmatter to snapshotPath/snapshotVersion/driftPolicyPath pointers and create a log_only rubric in .agents/evals/rubrics/) or archive it to \`.agents/_archive/${p}\` if dead`)
    .join('\n');
  return `---
feature: harness-migration
status: draft
createdAt: ${today}
---

# Tasks — Legacy Harness Migration

Pre-generated by the SpecDD wizard from ingestion-time detection. A human must
approve this file BEFORE implementation starts. Converge rules apply: append, never
rewrite or uncheck completed work; never retro-approve any designContract; adapters
stay <=5 lines with zero rules.

## Pre-resolved defaults
- Snapshots: deferred until the rescued skills stabilize (Cold-Start stays scaffolded).
- Runbooks and docs that only describe retired mechanism files are archived with them.

## Phase 1 — Archive legacy mechanism files
${mechRows || '- [ ] (none detected)'}

## Phase 2 — Triage legacy knowledge files
${knowRows || '- [ ] (none detected)'}

## Phase 3 — Rewire
- [ ] R001 Add a ROUTING row, REGISTRY entry and budget-manifest class for every rescued skill; the root AGENTS.md primer stays <=40 lines
- [ ] R002 Remove every REGISTRY/ROUTING reference to archived files (no dangling references)

## Phase 4 — Verify (done gate)
- [ ] C001 \`pwsh .agents/scripts/validate-spec.ps1\` exits 0
- [ ] C002 \`pwsh .agents/scripts/validate-budget.ps1\` exits 0

## Questions for the human (content judgment — answer before Phase 2)
- Which legacy knowledge files are still authoritative vs dead? Mark each K-task's
  integrate/archive choice accordingly before approving.
`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: PASS (50 tests).

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/components/generators.js specdd-kit/website/src/components/generators.test.js
git commit -m "feat(specdd-kit): pre-generated legacy harness migration tasks renderer"
```

---

### Task 4: generateScaffold override (`replaced[]`) + analysis-report legacy section

**Files:**
- Modify: `specdd-kit/website/src/components/generators.js` (`generateScaffold`, `renderBrownfieldAnalysis`)
- Test: `specdd-kit/website/src/components/generators.test.js`

**Interfaces:**
- Produces:
  - `generateScaffold(baseFiles, input, today?) → { files, skipped: string[], replaced: string[] }` (breaking: adds `replaced`, always present — `[]` for greenfield and clean brownfield).
  - `renderBrownfieldAnalysis(input, skipped: string[], replaced: string[], today: string)` (breaking: new third parameter).
  - With `input.analysis.legacyHarness.detected && input.legacyAck`: harness-path collisions are kept in `files` and listed in `replaced`; `.agents/specs/tasks/harness-migration.tasks.md` is emitted; the analysis report gains a "Legacy harness detected" section and its kickoff points to the migration tasks file first.
- Consumes: `renderMigrationTasks` (Task 3), `legacyInput` fixture (Task 3).

- [ ] **Step 1: Write the failing tests**

Append to `generators.test.js`:

```js
const baseWithHarnessCollisions = {
  ...baseWithGithub,
  '.agents/workflows/spec-converge.md': 'converge workflow',
};

test('acknowledged legacy harness: harness collisions replaced, others skipped', () => {
  const input2 = { ...legacyInput, existingPaths: ['AGENTS.md', 'CLAUDE.md', '.agents/REGISTRY.md', 'README.md'] };
  const { files, skipped, replaced } = generateScaffold(baseWithHarnessCollisions, input2, '2026-07-18');
  assert.deepEqual(replaced, ['.agents/REGISTRY.md', 'AGENTS.md', 'CLAUDE.md']);
  assert.ok('AGENTS.md' in files);                       // replaced → still shipped
  assert.ok('.agents/REGISTRY.md' in files);
  assert.deepEqual(skipped, ['README.md']);              // non-harness keeps never-clobber
  assert.ok(!('README.md' in files));
  assert.ok('.agents/specs/tasks/harness-migration.tasks.md' in files);
  const report = files['context/brownfield-analysis.md'];
  assert.match(report, /## Legacy harness detected/);
  assert.match(report, /SYSTEM_PROMPT\.md/);             // inventory listed
  assert.match(report, /harness-migration\.tasks\.md/);  // kickoff points to migration first
});

test('clean brownfield (no legacy) unchanged: no migration tasks, replaced empty', () => {
  const { files, skipped, replaced } = generateScaffold(baseWithGithub, brownInput, '2026-07-18');
  assert.deepEqual(replaced, []);
  assert.ok(!('.agents/specs/tasks/harness-migration.tasks.md' in files));
  assert.ok(!/Legacy harness detected/.test(files['context/brownfield-analysis.md']));
  assert.deepEqual(skipped, ['.github/prompts/specdd-specify.prompt.md', 'README.md']);
});

test('greenfield returns empty replaced and no migration artifacts', () => {
  const { files, skipped, replaced } = generateScaffold(baseWithGithub, harnessInput, '2026-07-18');
  assert.deepEqual(skipped, []);
  assert.deepEqual(replaced, []);
  assert.ok(!Object.keys(files).some((p) => p.includes('harness-migration')));
});
```

Also update the two existing `generateScaffold` destructurings in older tests if they use exact `deepEqual` on the whole return — they don't (they destructure `{ files, skipped }`), so no edits needed there.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: FAIL — `replaced` undefined / no legacy section.

- [ ] **Step 3: Implement**

Replace `generateScaffold` and update `renderBrownfieldAnalysis` in `generators.js`:

```js
const HARNESS_OUTPUT_PATHS = new Set(['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md']);
const isHarnessPath = (p) => HARNESS_OUTPUT_PATHS.has(p) || p.startsWith('.agents/');

export function generateScaffold(baseFiles, input, today = new Date().toISOString().slice(0, 10)) {
  const files = generateFiles(baseFiles, input, today);
  if (input.scenario !== 'brownfield') return { files, skipped: [], replaced: [] };

  const deprecating = !!(input.analysis?.legacyHarness?.detected && input.legacyAck);
  const existing = new Set(input.existingPaths || []);
  const skipped = [];
  const replaced = [];
  for (const p of Object.keys(files)) {
    if (!existing.has(p) || p === ANALYSIS_REPORT_PATH) continue;
    if (deprecating && isHarnessPath(p)) replaced.push(p);
    else skipped.push(p);
  }
  skipped.sort();
  replaced.sort();
  for (const p of skipped) delete files[p];
  if (deprecating) {
    files['.agents/specs/tasks/harness-migration.tasks.md'] = renderMigrationTasks(input, today);
  }
  files[ANALYSIS_REPORT_PATH] = renderBrownfieldAnalysis(input, skipped, replaced, today);
  return { files, skipped, replaced };
}
```

In `renderBrownfieldAnalysis`, change the signature to `(input, skipped, replaced, today)` and:

a) replace the Kickoff section with:

```js
  const lh = input.analysis?.legacyHarness;
  const deprecating = !!(lh?.detected && input.legacyAck);
  const kickoff = deprecating
    ? `A legacy harness was detected and its deprecation acknowledged. First session:
get the human's approval on \`.agents/specs/tasks/harness-migration.tasks.md\`, then
execute it. Afterwards run \`.agents/workflows/spec-converge.md\` to measure the
delta between this codebase and the specs in \`.agents/specs/\`.`
    : `Run \`.agents/workflows/spec-converge.md\` to measure the delta between this codebase
and the specs in \`.agents/specs/\`. Treat the suggestions below as leads, not facts.`;
```

and use `${kickoff}` under `## Kickoff (first agent session)`.

b) append after the Skipped section (only when `deprecating`):

```js
  const legacyBlock = deprecating
    ? `
## Legacy harness detected
Mechanism files (deprecated — archived by the agent, replaced on extract where paths collide):
${list(lh.mechanism)}

Knowledge files (triaged by the agent — integrate or archive):
${list(lh.knowledge)}

Scaffold files replacing legacy paths on extract:
${list(replaced)}
`
    : '';
```

and interpolate `${legacyBlock}` at the end of the template string.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: PASS (53 tests) — including the untouched greenfield/clean-brownfield tests and the confidentiality guard (now also scanning the migration tasks + legacy section via the `legacyInput` brownfield output? The guard uses `brownInput` — extend it: inside the existing confidentiality test, add:

```js
  const legacy = generateScaffold(baseWithHarnessCollisions, legacyInput, '2026-07-18').files;
  for (const [path, contents] of Object.entries(legacy)) {
    if (path === '.github/prompts/specdd-specify.prompt.md' || path === '.agents/workflows/spec-converge.md') continue;
    assert.ok(!/\bV\d+(\.\d+)?\b/.test(contents), `version tag leaked in ${path}`);
  }
```

(The two skipped paths are base-fixture stand-ins, not generated content.)

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/components/generators.js specdd-kit/website/src/components/generators.test.js
git commit -m "feat(specdd-kit): harness-path collision override with replaced list and legacy report section"
```

---

### Task 5: Wizard UI — warning card, acknowledgment, replaced preview group

**Files:**
- Modify: `specdd-kit/website/src/components/IngestStep.jsx`
- Modify: `specdd-kit/website/src/components/Wizard.jsx`
- Modify: `packages/ui/styles/wizard.css` (one class)

**Interfaces:**
- Consumes: `analysis.legacyHarness` (Task 1), `errorFor` gate (Task 2), `generateScaffold → { files, skipped, replaced }` (Task 4).
- Produces UI hooks for Task 6's e2e: `legacy-warning` (card), `legacy-ack` (checkbox), `replaced-group` (preview details). New model field `legacyAck: boolean` (reset to `false` on every new analysis).

- [ ] **Step 1: IngestStep — warning card + ack checkbox + replaced count**

In `IngestStep.jsx`:
- Change the signature to `IngestStep({ data, skippedCount, replacedCount, onAnalyzed, onAck })`.
- Update the Collisions card paragraph to:

```jsx
            <p>{skippedCount} file(s) skipped · {replacedCount} legacy harness file(s) replaced on extract</p>
```

- Insert the warning card right after the `analysis-summary` div (sibling, still inside the `a && !busy` region — wrap both in a fragment):

```jsx
      {a && !busy && a.legacyHarness?.detected && (
        <div className="b-card b-card--warning" data-testid="legacy-warning">
          <strong>⚠ Legacy harness detected</strong>
          <p>
            {a.legacyHarness.mechanism.length + a.legacyHarness.knowledge.length} files —{' '}
            {a.legacyHarness.mechanism.length} mechanism file(s) will be deprecated (archived by
            your agent; replaced on extract where paths collide) and{' '}
            {a.legacyHarness.knowledge.length} knowledge file(s) will be triaged into the new
            harness by your agent via the pre-generated migration tasks.
          </p>
          <label className="b-check">
            <input type="checkbox" data-testid="legacy-ack" checked={!!data.legacyAck}
              onChange={(e) => onAck(e.target.checked)} />
            I understand the previous harness will be deprecated and its mechanism files
            replaced by the new scaffold.
          </label>
        </div>
      )}
```

- [ ] **Step 2: Wizard wiring**

In `Wizard.jsx`:
- Model: add `legacyAck: false,` to `initial` (after `existingPaths: [],`).
- `applyAnalysis`: inside the `setData` patch add `legacyAck: false,` (every new analysis resets consent).
- Scaffold destructure becomes:

```jsx
  const { files, skipped, replaced } = needsScaffold ? generateScaffold(kitFiles, data) : { files: {}, skipped: [], replaced: [] };
```

- Ingest render passes the new props:

```jsx
          {stepName === 'Ingest & Analyze' && (
            <IngestStep data={data} skippedCount={skipped.length} replacedCount={replaced.length}
              onAnalyzed={applyAnalysis} onAck={(v) => set({ legacyAck: v })} />
          )}
```

- Preview: after the existing `skipped-group` details block add:

```jsx
                  {replaced.length > 0 && (
                    <details data-testid="replaced-group" open>
                      <summary>Replaced — legacy harness files ({replaced.length})</summary>
                      <pre className="b-preview">{replaced.join('\n')}</pre>
                    </details>
                  )}
```

- [ ] **Step 3: Warning style**

In `packages/ui/styles/wizard.css`, next to the existing `.b-card` rules add (follow the file's token conventions; use an existing warm/ember Boreal token if one is defined there, otherwise this fallback):

```css
.b-card--warning { border-color: var(--warn-500, #b45309); }
```

- [ ] **Step 4: Verify unit tests and build**

Run: `npm run test:unit -w sdd-kit-wizard` — Expected: PASS (no unit tests touch the UI).
Run: `npm run build -w sdd-kit-wizard` — Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/components/IngestStep.jsx specdd-kit/website/src/components/Wizard.jsx packages/ui/styles/wizard.css
git commit -m "feat(specdd-kit): legacy harness warning with mandatory acknowledgment and replaced preview"
```

---

### Task 6: E2E with legacy fixture + full verification + README note

**Files:**
- Create: `specdd-kit/website/e2e/fixtures/brownfield-legacy/package.json`
- Create: `specdd-kit/website/e2e/fixtures/brownfield-legacy/README.md`
- Create: `specdd-kit/website/e2e/fixtures/brownfield-legacy/AGENTS.md`
- Create: `specdd-kit/website/e2e/fixtures/brownfield-legacy/SYSTEM_PROMPT.md`
- Create: `specdd-kit/website/e2e/fixtures/brownfield-legacy/.agents/AGENTS.md`
- Create: `specdd-kit/website/e2e/fixtures/brownfield-legacy/.agents/skills/old-skill/SKILL.md`
- Create: `specdd-kit/website/e2e/fixtures/brownfield-legacy/src/auth/login.js`
- Modify: `specdd-kit/website/e2e/wizard.spec.js` (append one test; existing tests untouched)
- Modify: `README.md` (repo root — one sentence)

**Interfaces:**
- Consumes: UI hooks `legacy-warning`, `legacy-ack`, `replaced-group` (Task 5) and existing testids.

- [ ] **Step 1: Create the legacy fixture**

`package.json`:

```json
{
  "name": "legacy-app",
  "description": "App with an old harness",
  "dependencies": { "react": "^18.0.0" }
}
```

`README.md`: `# legacy-app` — `AGENTS.md`: `# Old primer — legacy generation` — `SYSTEM_PROMPT.md`: `Legacy system prompt.` — `.agents/AGENTS.md`: `# Old internal registry` — `.agents/skills/old-skill/SKILL.md`:

```markdown
---
name: old-skill
version: 1.0.0
---
# Old Skill
Real legacy rules live here.
```

`src/auth/login.js`: `export const login = () => 'ok';`

- [ ] **Step 2: Append the e2e test**

Append to `specdd-kit/website/e2e/wizard.spec.js` (the file already imports `fileURLToPath`/`dirname`/`join` and defines `fixtureDir` — add a sibling const next to it):

```js
const legacyFixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'brownfield-legacy');

test('brownfield with legacy harness: warning gates next, replaced group and migration tasks appear', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();

  await page.getByTestId('next-btn').click(); // -> Scenario
  await page.getByTestId('scenario-brownfield').click();
  await page.getByTestId('next-btn').click(); // -> Ingest & Analyze

  await page.getByTestId('folder-input').setInputFiles(legacyFixtureDir);
  await expect(page.getByTestId('legacy-warning')).toBeVisible();

  await page.getByTestId('next-btn').click(); // blocked: unacknowledged
  await expect(page.getByTestId('error')).toContainText(/deprecat/i);

  await page.getByTestId('legacy-ack').check();
  await page.getByTestId('next-btn').click(); // -> Project

  await page.getByTestId('next-btn').click(); // -> Tech Stack (react pre-filled)
  await page.getByTestId('next-btn').click(); // -> Domains & Entities (auth suggested)
  await page.getByTestId('next-btn').click(); // -> Features
  await page.getByTestId('next-btn').click(); // -> Principles
  await page.getByTestId('next-btn').click(); // -> MCP Tools
  await page.getByTestId('next-btn').click(); // -> Agents & Tools
  await page.getByTestId('next-btn').click(); // -> Security
  await page.getByTestId('next-btn').click(); // -> Preview

  await expect(page.getByTestId('preview')).toContainText('.agents/specs/tasks/harness-migration.tasks.md');
  await expect(page.getByTestId('replaced-group')).toContainText('AGENTS.md');
  await expect(page.getByTestId('skipped-group')).toContainText('README.md');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toContain('scaffold.zip');
});
```

- [ ] **Step 3: Run the kit e2e**

Run: `npm test -w sdd-kit-wizard`
Expected: 3 passed (greenfield, brownfield clean, brownfield legacy). If the directory upload drops dot-folder files (`.agents/**` missing from the FileList), report it — that would undermine detection in real browsers and needs a decision, not a silent workaround.

- [ ] **Step 4: README note**

In the repo-root `README.md`, in the Scenarios table's Brownfield row, append to the end of the description cell:

` If a previous agent harness is detected in the folder, the wizard warns you, requires an explicit acknowledgment, and pre-generates `.agents/specs/tasks/harness-migration.tasks.md` so your agent migrates it (mechanism archived, knowledge triaged) without hand-written prompts.`

- [ ] **Step 5: Full verification**

- `npm run test:unit -w sdd-kit-wizard` — PASS
- `npm run build -w sdd-kit-wizard` and `npm run build -w specdd-platform` — succeed
- `npm test -w specdd-platform` — PASS
- Confidentiality sweep: `git grep -nE '\bV[0-9]+(\.[0-9]+)?\b' -- ':!node_modules' ':!awesome-copilot-main'` — no hits in files this plan touched.

- [ ] **Step 6: Commit**

```bash
git add specdd-kit/website/e2e README.md
git commit -m "test(specdd-kit): legacy harness e2e fixture and walkthrough; README note"
```

---

## Self-review notes

- **Spec coverage:** detection on raw paths + classification → Task 1; warn-not-ask + checkbox gate → Tasks 2/5; collision override + `replaced[]` + report section + kickoff rewire → Task 4; pre-generated migration tasks with phases/defaults/questions → Task 3; preview group + counts → Task 5; e2e legacy fixture incl. dot-folder upload check → Task 6; re-run same-treatment needs no code (detection treats a previous SpecDD scaffold like any harness — covered by Task 1's classification of `.agents/**`).
- **Type consistency:** `legacyHarness {detected, mechanism, knowledge}` (Tasks 1/2/3/4/5), `legacyAck` (Tasks 2/4/5), `generateScaffold → {files, skipped, replaced}` (Tasks 4/5), `renderBrownfieldAnalysis(input, skipped, replaced, today)` (Task 4 only), testids `legacy-warning`/`legacy-ack`/`replaced-group` (Tasks 5/6).
- **Known risk surfaced, not hidden:** Playwright directory upload may exclude dot-folders; Task 6 Step 3 makes that an explicit checkpoint instead of letting the test silently pass without exercising detection.
