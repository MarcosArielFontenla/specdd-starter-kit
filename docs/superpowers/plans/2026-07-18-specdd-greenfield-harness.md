# SpecDD Greenfield Scenario + Portable Agent Harness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the SpecDD wizard into a scenario-driven generator whose Greenfield output is structured around the vendor-neutral **SpecDD Harness** (`.agents/` core + root `AGENTS.md` primer + per-tool pointer adapters), rescuing all orphaned wizard model fields.

**Architecture:** Static harness artifacts (PowerShell validators, workflows, telemetry contract) are committed as real files under `specdd-kit/.agents/` and picked up by the existing bundler. Personalized artifacts (primer, adapters, registry, routing, skill skeletons, spec placeholders, rubrics, budget manifest) are rendered by new pure functions in `generators.js`. The wizard gains a Scenario step and computes its step list per scenario — the seam for the future Brownfield branch.

**Tech Stack:** Astro 5 + React 18 islands, JSZip, Node ≥20 built-in test runner (`node --test`), Playwright, PowerShell 7 scripts (as generated *content*, not run by this repo's CI).

**Spec:** `docs/superpowers/specs/2026-07-18-specdd-greenfield-harness-design.md`

## Global Constraints

- **Confidentiality (hard rule):** No committed file — including this plan's outputs, code comments, and tests — may reference the private harness source documents by filename, version label, or authorship trail. The architecture is always called the **SpecDD Harness**, versioned independently starting at `1.0.0`.
- Primer `AGENTS.md` hard limit: **≤40 lines** including frontmatter (unit-tested).
- Adapter files hard limit: **≤5 lines**, zero rules (unit-tested).
- Nothing fabricated: no synthetic baselines, snapshots, telemetry events, or invented acceptance-check commands. `evals/baselines/` and `cold-start/snapshots/` ship empty. All `acceptanceChecks` use `command: placeholder`. Rubrics start at `reviewTriggerAction: log_only`.
- No `spec-converge.md` and no multi-agent artifacts in Greenfield output.
- `.github/**` content is included in the ZIP **only** when "GitHub Copilot" is among selected tools.
- Generated artifact language: English.
- SpecForge, SpecDeploy, and `packages/ui` are untouched.
- All work happens on `main` (repo convention), one commit per task.

---

### Task 1: Confidentiality guard in .gitignore

**Files:**
- Modify: `.gitignore` (repo root)

**Interfaces:**
- Produces: a gitignored `/_private/` directory where the repo owner can park private documents.

- [ ] **Step 1: Add the private-directory entry**

Append to the end of `.gitignore` (after the existing `PROMPT_SPECDDSTARTERKIT.md` line):

```gitignore
# private working documents (never committed)
/_private/
```

- [ ] **Step 2: Verify git ignores the directory**

Run (Git Bash, repo root): `mkdir -p _private && touch _private/probe.md && git status --porcelain | grep -c _private; rm -rf _private`
Expected output: `0` (no `_private` lines in git status).

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore /_private/ for local-only working documents"
```

---

### Task 2: Static harness scripts under specdd-kit/.agents/ + bundler .ps1 support

**Files:**
- Create: `specdd-kit/.agents/scripts/generate-snapshots.ps1`
- Create: `specdd-kit/.agents/scripts/validate-spec.ps1`
- Create: `specdd-kit/.agents/scripts/validate-budget.ps1`
- Create: `specdd-kit/.agents/evals/run-eval.ps1`
- Create: `specdd-kit/.agents/evals/baselines/.gitkeep`
- Create: `specdd-kit/.agents/cold-start/snapshots/.gitkeep`
- Create: `specdd-kit/.agents/specs/tasks/.gitkeep`
- Modify: `specdd-kit/website/scripts/bundle-kit.js:6` (extension allowlist)
- Test: `specdd-kit/website/scripts/bundle-kit.test.js`

**Interfaces:**
- Produces: base-bundle keys `.agents/scripts/generate-snapshots.ps1`, `.agents/scripts/validate-spec.ps1`, `.agents/scripts/validate-budget.ps1`, `.agents/evals/run-eval.ps1`, plus `.gitkeep` markers for the three empty dirs. Later tasks rely on these paths existing in `kit-files.json`.

- [ ] **Step 1: Write the failing bundler test**

Append to `specdd-kit/website/scripts/bundle-kit.test.js`:

```js
test('bundler includes .ps1 files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kit-ps1-'));
  mkdirSync(join(dir, '.agents', 'scripts'), { recursive: true });
  writeFileSync(join(dir, '.agents', 'scripts', 'validate-spec.ps1'), 'Write-Host "ok"');
  const out = bundleKit(dir, join(dir, 'out.json'));
  assert.ok('.agents/scripts/validate-spec.ps1' in out);
});
```

If the existing test file does not already import `mkdtempSync`/`tmpdir`/`mkdirSync`/`writeFileSync`, mirror the import style already used at the top of that file (it already builds temp fixtures — reuse its helpers/imports).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: FAIL — `.agents/scripts/validate-spec.ps1` not in bundle output.

- [ ] **Step 3: Allow `.ps1` in the bundler**

In `specdd-kit/website/scripts/bundle-kit.js` change line 6:

```js
const ALLOW_EXT = new Set(['.md', '.json', '.yml', '.yaml', '.txt', '.sh', '.ps1']);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: PASS (all tests).

- [ ] **Step 5: Create the three `.gitkeep` files**

Create empty files:
- `specdd-kit/.agents/evals/baselines/.gitkeep`
- `specdd-kit/.agents/cold-start/snapshots/.gitkeep`
- `specdd-kit/.agents/specs/tasks/.gitkeep`

- [ ] **Step 6: Create `specdd-kit/.agents/scripts/generate-snapshots.ps1`**

```powershell
#Requires -Version 7.0
<#
  generate-snapshots.ps1 — snapshot scaffolder + freshness validator (SpecDD Harness)
  -Check    : validate that every skill has a snapshot matching its version AND content hash. Exit 1 on stale/missing. CI-safe.
  -Scaffold : create/refresh snapshot skeletons (frontmatter filled; compressed sections are agent work).
#>
param(
  [switch]$Check,
  [switch]$Scaffold,
  [string]$SkillsDir = ".agents/skills",
  [string]$SnapshotsDir = ".agents/cold-start/snapshots"
)

if (-not (Get-Module -ListAvailable -Name powershell-yaml)) {
  Write-Error "Missing module 'powershell-yaml'. Run: Install-Module powershell-yaml -Scope CurrentUser"
  exit 1
}
Import-Module powershell-yaml

function Get-Frontmatter([string]$Path) {
  $raw = Get-Content $Path -Raw
  if ($raw -match '(?s)^---\s*\n(.*?)\n---') { return ConvertFrom-Yaml $Matches[1] }
  return $null
}

# Content hash makes staleness detection independent of version discipline:
# an edited SKILL.md body with an un-bumped version still fails -Check.
function Get-SkillHash([string]$Path) {
  (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.Substring(0, 16)
}

$failures = 0
$skills = Get-ChildItem $SkillsDir -Recurse -Filter "SKILL.md" -ErrorAction SilentlyContinue

foreach ($skill in $skills) {
  $fm = Get-Frontmatter $skill.FullName
  if (-not $fm) { Write-Warning "No frontmatter: $($skill.FullName)"; $failures++; continue }
  $name = $fm.name; $version = $fm.version
  $hash = Get-SkillHash $skill.FullName
  $snapPath = Join-Path $SnapshotsDir "$name.snapshot.md"

  if ($Check) {
    if (-not (Test-Path $snapPath)) {
      Write-Warning "[STALE] Missing snapshot for '$name' (skill v$version)"; $failures++; continue
    }
    $snapFm = Get-Frontmatter $snapPath
    if ($snapFm.sourceVersion -ne $version) {
      Write-Warning "[STALE] Snapshot '$name' is v$($snapFm.sourceVersion), skill is v$version — regenerate"; $failures++
    } elseif ($snapFm.sourceHash -ne $hash) {
      Write-Warning "[STALE] Snapshot '$name': skill content changed without version bump (hash mismatch) — bump version and regenerate"; $failures++
    } else {
      Write-Host "[OK] $name snapshot matches v$version ($hash)"
    }
  }

  if ($Scaffold) {
    $skeleton = @"
---
sourceSkill: $name
sourceVersion: $version
sourceHash: $hash
generatedAt: $(Get-Date -Format 'yyyy-MM-dd')
---

# $name — Snapshot

## Must rules
<!-- AGENT: compress each Must Rule to <=10 words -->

## Never do
<!-- AGENT: compress each Never Rule to <=8 words -->

## Key check
``[most important verification command from the skill]``

## Full skill
``$($skill.FullName -replace '\\','/')`` v$version
"@
    New-Item -ItemType Directory -Force -Path $SnapshotsDir | Out-Null
    Set-Content -Path $snapPath -Value $skeleton
    Write-Host "[SCAFFOLD] $snapPath (fill compressed sections before commit)"
  }
}

if ($Check -and $failures -gt 0) { Write-Error "$failures snapshot(s) stale or missing"; exit 1 }
```

- [ ] **Step 7: Create `specdd-kit/.agents/scripts/validate-spec.ps1`**

```powershell
#Requires -Version 7.0
# validate-spec.ps1 — spec gate validator (SpecDD Harness). CI-safe: exit 1 on violation.
#   default : structural gate — approved specs need real (or waived) acceptanceChecks and zero clarification markers
#   -Run    : execute every acceptanceCheck and compare exit codes (done-gate)
param(
  [string]$SpecsDir = ".agents/specs",
  [string]$SpecPath = "",
  [switch]$Run
)

if (-not (Get-Module -ListAvailable -Name powershell-yaml)) {
  Write-Error "Missing module 'powershell-yaml'. Run: Install-Module powershell-yaml -Scope CurrentUser"
  exit 1
}
Import-Module powershell-yaml

$specs = if ($SpecPath) { @(Get-Item $SpecPath) } else { Get-ChildItem $SpecsDir -Recurse -Filter "*.spec.yaml" -ErrorAction SilentlyContinue }
$failures = 0

foreach ($file in $specs) {
  $spec = ConvertFrom-Yaml (Get-Content $file.FullName -Raw)
  $dc = $spec.designContract
  if (-not $dc) { continue }
  $name = $file.Name

  if ($dc.status -eq 'approved') {
    $placeholders = @($dc.acceptanceChecks | Where-Object { $_.command -eq 'placeholder' })
    $hasChecks = ($dc.acceptanceChecks) -and (@($dc.acceptanceChecks).Count -gt 0)

    if ((Get-Content $file.FullName -Raw) -match '\[NEEDS CLARIFICATION') {
      Write-Warning "[SPEC INVALID] $name : approved with unresolved [NEEDS CLARIFICATION] markers — run the clarify stage"
      $failures++
    }
    if ((-not $hasChecks -or $placeholders.Count -gt 0) -and -not $dc.checksWaiver) {
      Write-Warning "[SPEC INVALID] $name : approved without executable acceptanceChecks and no checksWaiver — demote to proposed or wire real commands"
      $failures++
    }
    if ($dc.checksWaiver -and (-not $dc.checksWaiver.reason -or -not $dc.checksWaiver.approvedBy)) {
      Write-Warning "[SPEC INVALID] $name : checksWaiver must carry reason and approvedBy"
      $failures++
    }
    if (-not $dc.reviewedBy -or -not $dc.approvedAt) {
      Write-Warning "[SPEC INVALID] $name : approved without reviewedBy/approvedAt"
      $failures++
    }
  }

  if ($Run -and $dc.status -eq 'approved' -and $dc.acceptanceChecks) {
    foreach ($check in $dc.acceptanceChecks) {
      if ($check.command -eq 'placeholder') { continue }
      Write-Host "[RUN] $name / $($check.id): $($check.command)"
      & pwsh -NoProfile -Command $check.command | Out-Null
      $expected = [int]($check.expectedExitCode ?? 0)
      if ($LASTEXITCODE -ne $expected) {
        Write-Warning "[CHECK FAILED] $name / $($check.id): exit $LASTEXITCODE, expected $expected"
        $failures++
      } else {
        Write-Host "[OK] $name / $($check.id)"
      }
    }
  }
}

if ($failures -gt 0) { Write-Error "$failures spec violation(s)"; exit 1 }
Write-Host "[OK] All specs satisfy the gate"
```

- [ ] **Step 8: Create `specdd-kit/.agents/scripts/validate-budget.ps1`**

```powershell
#Requires -Version 7.0
# validate-budget.ps1 — static worst-case context budget check (SpecDD Harness). CI-safe: exit 1 on violation.
param(
  [string]$ManifestPath = ".agents/cold-start/budget-manifest.yaml",
  [string]$PrimerPath   = "AGENTS.md"
)

if (-not (Get-Module -ListAvailable -Name powershell-yaml)) {
  Write-Error "Missing module 'powershell-yaml'. Run: Install-Module powershell-yaml -Scope CurrentUser"
  exit 1
}
Import-Module powershell-yaml

$manifest = ConvertFrom-Yaml (Get-Content $ManifestPath -Raw)
$budget = [int]($manifest.budgetLines ?? 500)
$primerLines = (Get-Content $PrimerPath).Count
$failures = 0

foreach ($class in $manifest.taskClasses) {
  $total = $primerLines
  foreach ($artifact in $class.artifacts) {
    if (-not (Test-Path $artifact)) { Write-Warning "[BUDGET] '$($class.name)': missing artifact $artifact"; $failures++; continue }
    $total += (Get-Content $artifact).Count
  }
  if ($total -gt $budget) {
    Write-Warning "[BUDGET EXCEEDED] '$($class.name)': worst case $total lines > $budget — split the skill, compress the snapshot, or decompose the class"
    $failures++
  } else {
    Write-Host "[OK] '$($class.name)': $total / $budget lines"
  }
}

if ($failures -gt 0) { Write-Error "$failures budget violation(s)"; exit 1 }
```

- [ ] **Step 9: Create `specdd-kit/.agents/evals/run-eval.ps1`**

```powershell
#Requires -Version 7.0
# run-eval.ps1 — drift analysis vs a frozen, persisted baseline (SpecDD Harness).
# Baselines freeze from real score runs only; resetting requires -ResetBaseline -Reason.
param(
  [string]$SkillName = "",
  [switch]$AllSkills,
  [switch]$ResetBaseline,
  [string]$Reason = "",
  [switch]$IncludeTelemetry,
  [string]$ScoresDir    = ".agents/evals/scores",
  [string]$BaselineDir  = ".agents/evals/baselines",
  [string]$ReportDir    = ".agents/evals/reports",
  [string]$RubricsDir   = ".agents/evals/rubrics",
  [string]$TelemetryDir = ".agents/telemetry/events"
)

if (-not (Get-Module -ListAvailable -Name powershell-yaml)) {
  Write-Error "Missing module 'powershell-yaml'. Run: Install-Module powershell-yaml -Scope CurrentUser"
  exit 1
}
Import-Module powershell-yaml

function Get-AllScores([string]$Skill) {
  Get-ChildItem "$ScoresDir/$Skill-*.json" -ErrorAction SilentlyContinue |
    ForEach-Object { Get-Content $_ -Raw | ConvertFrom-Json } |
    Sort-Object timestamp
}

function Get-OrCreateBaseline {
  param([string]$Skill, $Policy)
  $path = Join-Path $BaselineDir "$Skill.baseline.json"

  if ($ResetBaseline -and (Test-Path $path)) {
    if (-not $Reason) { Write-Error "-ResetBaseline requires -Reason"; exit 1 }
    $old = Get-Content $path -Raw | ConvertFrom-Json
    $old.history += @{ resetAt = (Get-Date -Format o); reason = $Reason }
    Remove-Item $path
    Write-Host "  [baseline] Reset for $Skill — reason logged."
  }
  if (Test-Path $path) { return Get-Content $path -Raw | ConvertFrom-Json }

  $all = Get-AllScores $Skill
  $n = [int]($Policy.baselineRuns ?? 10)
  $windowDays = [int]($Policy.windowDays ?? 7)

  $source = switch ($Policy.baselineStrategy) {
    'rolling_pre_window' {
      $cutoff = (Get-Date).AddDays(-$windowDays)
      $hist = @($all | Where-Object { [datetime]$_.timestamp -lt $cutoff })
      if ($hist.Count -lt $n) { $null } else { $hist | Select-Object -Last $n }
    }
    'manual' { Write-Warning "  [baseline] strategy=manual but no baseline file for $Skill — create it by hand."; $null }
    default  { if ($all.Count -lt $n) { $null } else { $all | Select-Object -First $n } }
  }
  if (-not $source) { Write-Host "  [baseline] Insufficient history to freeze baseline for $Skill"; return $null }

  $baseline = [ordered]@{
    skill        = $Skill
    strategy     = "$($Policy.baselineStrategy ?? 'first_N_runs')"
    frozenAt     = (Get-Date -Format o)
    runCount     = $n
    baselineAvg  = [math]::Round(($source | Measure-Object -Property overallScore -Average).Average, 4)
    sourceRunIds = @($source | ForEach-Object { $_.runId })
    history      = @()
  }
  New-Item -ItemType Directory -Force -Path $BaselineDir | Out-Null
  $baseline | ConvertTo-Json -Depth 5 | Set-Content $path
  Write-Host "  [baseline] Frozen for $Skill at $($baseline.baselineAvg) ($($baseline.strategy), N=$n)"
  return [pscustomobject]$baseline
}

function Get-TelemetryViolations([string]$Skill, [int]$WindowDays) {
  if (-not (Test-Path $TelemetryDir)) { return 0 }
  $cutoff = (Get-Date).AddDays(-$WindowDays)
  $count = 0
  Get-ChildItem "$TelemetryDir/*.jsonl" -ErrorAction SilentlyContinue | ForEach-Object {
    Get-Content $_ | ForEach-Object {
      try { $e = $_ | ConvertFrom-Json } catch { return }
      if ($e.event -eq 'rule_violation' -and $e.skill -eq $Skill -and [datetime]$e.ts -gt $cutoff) { $count++ }
    }
  }
  return $count
}

function Invoke-DriftAnalysis {
  param([string]$Skill, [string]$RubricPath)
  $rubric = ConvertFrom-Yaml (Get-Content $RubricPath -Raw)
  $policy = $rubric.driftPolicy
  if (-not $policy) { return }

  $baseline = Get-OrCreateBaseline -Skill $Skill -Policy $policy
  if (-not $baseline) { return }

  $windowDays = [int]($policy.windowDays ?? 7)
  $cutoff = (Get-Date).AddDays(-$windowDays)
  $recent = @(Get-AllScores $Skill | Where-Object { [datetime]$_.timestamp -gt $cutoff })

  if ($recent.Count -lt [int]($policy.minRunsForTrend ?? 5)) {
    Write-Host "  [drift] Insufficient recent runs ($($recent.Count)) for $Skill"; return
  }

  # median aggregation resists single-run outliers
  $lastRuns = @($recent | Select-Object -Last 5 | ForEach-Object { [double]$_.overallScore })
  $recentAvg = if (($policy.aggregation ?? 'median') -eq 'median') {
    $sorted = $lastRuns | Sort-Object
    $mid = [math]::Floor($sorted.Count / 2)
    if ($sorted.Count % 2) { $sorted[$mid] } else { ($sorted[$mid - 1] + $sorted[$mid]) / 2 }
  } else {
    ($lastRuns | Measure-Object -Average).Average
  }
  $drop = $baseline.baselineAvg - $recentAvg
  $violations = if ($IncludeTelemetry) { Get-TelemetryViolations $Skill $windowDays } else { $null }

  if ($drop -gt ([double]($policy.skillDriftThreshold ?? 0.10))) {
    Write-Warning "  [DRIFT ALERT] $Skill : baseline $([math]::Round($baseline.baselineAvg,3)) -> recent $([math]::Round($recentAvg,3)) (drop $([math]::Round($drop,3)))"
    $reportPath = "$ReportDir/$Skill-drift-$(Get-Date -Format 'yyyy-MM-dd').md"
    $telLine = if ($null -ne $violations) { "- Rule violations in window (telemetry): $violations" } else { "- Telemetry: not included (run with -IncludeTelemetry)" }
    New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
    Set-Content -Path $reportPath -Value @"
# Drift Report — $Skill — $(Get-Date -Format 'yyyy-MM-dd')

## Summary
- Baseline ($($baseline.strategy), frozen $($baseline.frozenAt)): $([math]::Round($baseline.baselineAvg, 3))
- Recent (last 5 runs in window): $([math]::Round($recentAvg, 3))
- Drop: $([math]::Round($drop, 3))
$telLine

## Next step
Run the Skill Review Workflow: .agents/workflows/skill-review.md
The proposal MUST include a unified diff of the proposed SKILL.md change.
"@
    Write-Host "  [drift] Report written to $reportPath"

    # ci_fail requires persistence: K consecutive drifted windows, counted from prior reports
    $k = [int]($policy.ciFailConsecutiveWindows ?? 2)
    $lookback = (Get-Date).AddDays(-($windowDays * $k))
    $priorReports = @(Get-ChildItem "$ReportDir/$Skill-drift-*.md" -ErrorAction SilentlyContinue |
      Where-Object { $_.LastWriteTime -gt $lookback -and $_.FullName -ne (Resolve-Path $reportPath -ErrorAction SilentlyContinue).Path })

    switch ($policy.reviewTriggerAction) {
      'workflow' { Write-Host "  [drift] Trigger: run .agents/workflows/skill-review.md" }
      'ci_fail'  {
        if (($priorReports.Count + 1) -ge $k) {
          Write-Error "  [drift] ci_fail: drift persisted across $($priorReports.Count + 1) window(s) (threshold $k) — failing build"; exit 1
        } else {
          Write-Warning "  [drift] ci_fail armed: window 1 of $k — report written, build NOT failed yet"
        }
      }
      default    { Write-Host "  [drift] log_only — report written, no workflow triggered" }
    }
  }
}

$rubrics = if ($SkillName) { @(Get-Item (Join-Path $RubricsDir "$SkillName.yaml")) }
           else { Get-ChildItem $RubricsDir -Filter "*.yaml" -ErrorAction SilentlyContinue }
foreach ($rubric in $rubrics) {
  $skill = [System.IO.Path]::GetFileNameWithoutExtension($rubric.Name)
  Write-Host "[eval] $skill"
  Invoke-DriftAnalysis -Skill $skill -RubricPath $rubric.FullName
}
```

- [ ] **Step 10: Rebundle and verify the files land in the bundle**

Run: `npm run bundle-kit -w sdd-kit-wizard`
Then: `node -e "const k=require('./specdd-kit/website/src/data/kit-files.json'); const want=['.agents/scripts/generate-snapshots.ps1','.agents/scripts/validate-spec.ps1','.agents/scripts/validate-budget.ps1','.agents/evals/run-eval.ps1','.agents/evals/baselines/.gitkeep','.agents/cold-start/snapshots/.gitkeep','.agents/specs/tasks/.gitkeep']; const miss=want.filter(w=>!(w in k)); if(miss.length){console.error('MISSING',miss);process.exit(1)}; console.log('all present')"`
Expected: `all present`

- [ ] **Step 11: Commit**

```bash
git add specdd-kit/.agents specdd-kit/website/scripts/bundle-kit.js specdd-kit/website/scripts/bundle-kit.test.js
git commit -m "feat(specdd-kit): harness validation scripts + .ps1 bundler support"
```

---

### Task 3: Static harness workflows, telemetry contract, and harness doc

**Files:**
- Create: `specdd-kit/.agents/workflows/spec-first-feature.md`
- Create: `specdd-kit/.agents/workflows/skill-review.md`
- Create: `specdd-kit/.agents/telemetry/EVENTS.md`
- Create: `specdd-kit/.agents/telemetry/events/.gitignore`
- Create: `specdd-kit/docs/harness.md`
- Modify: `specdd-kit/README.md` (add one section)

**Interfaces:**
- Produces: base-bundle keys `.agents/workflows/spec-first-feature.md`, `.agents/workflows/skill-review.md`, `.agents/telemetry/EVENTS.md`, `.agents/telemetry/events/.gitignore`, `docs/harness.md`.

- [ ] **Step 1: Create `specdd-kit/.agents/workflows/spec-first-feature.md`**

```markdown
# Spec-First Feature Workflow

Pipeline: **specify → clarify → approve → tasks → implement → done-gate**

Trigger: a new primary entity OR a feature touching ≥2 domains. A single-file change
never enters this workflow — that is ceremony, not engineering.

## 1. Specify
Author or amend the entity's `.agents/specs/[entity].spec.yaml`. Draft
`acceptanceChecks` with `command: placeholder` — derive each `description` from the
spec's own requirements; never invent commands. Mark every genuine ambiguity inline as
`[NEEDS CLARIFICATION: question]` — never resolve one by assumption. Maximum 5 markers
per spec; more means the intent is underspecified — go back to the human first.

## 2. Clarify
Ask ONE question at a time, coverage-ordered: scope → behavior → data → edge cases.
Log each answer in the spec's `clarifications` list and remove the marker in the same
edit:

```yaml
clarifications:
  - date: "YYYY-MM-DD"
    question: "[the marker's question, verbatim]"
    answer: "[the human's answer, condensed]"
    affects: "[section or acceptanceCheck id it changed]"
```

## 3. Approve (human gate)
`proposed → approved` requires: zero placeholder commands (or a complete
`checksWaiver` with reason/approvedBy/date), zero `[NEEDS CLARIFICATION]` markers,
`reviewedBy` and `approvedAt` set. Mechanically enforced:
`pwsh .agents/scripts/validate-spec.ps1`

## 4. Tasks
Create `.agents/specs/tasks/[feature-slug].tasks.md`: dependency-ordered phases, `[P]`
only on tasks with different target files and no dependency edge, every task names its
real target path(s), every phase maps to ≥1 acceptanceCheck id. The agent drafts; the
human approves BEFORE implementation starts.

## 5. Implement
Work the tasks in dependency order. Tests are written before or alongside the code
they verify — never after the done-gate.

## 6. Done-gate
`pwsh .agents/scripts/validate-spec.ps1 -Run -SpecPath .agents/specs/[entity].spec.yaml`
Every acceptanceCheck must return its expected exit code. Archive or delete the tasks
file after the gate passes (history lives in git).
```

- [ ] **Step 2: Create `specdd-kit/.agents/workflows/skill-review.md`**

```markdown
# Skill Review Workflow

Run when a drift report exists in `.agents/evals/reports/` or a human requests a rule
change.

## 1. Gather evidence
Read the drift report, the skill's recent scores (`.agents/evals/scores/`), and any
`rule_violation` telemetry events in the window.

## 2. Reproduce
Confirm the drop is real: re-run the skill's eval tasks. If it does not reproduce, the
report was noise — log that and stop.

## 3. Classify the drift cause (always one of these five)
1. **Rule is wrong** — the rule causes worse output
2. **Rule is stale** — the codebase evolved; the rule no longer maps to reality
3. **Rule is unclear** — agents interpret it differently each time
4. **Benchmark is wrong** — the eval task doesn't represent real work
5. **Threshold is wrong** — the alert is a false positive

## 4. Draft the proposal (agent work, diff-based)
Write `.agents/evals/proposals/[skill]-[date].md` containing a mandatory section:

    ## Proposed diff (pre-generated — pending human review)
    ```diff
    --- a/.agents/skills/[domain]/SKILL.md
    +++ b/.agents/skills/[domain]/SKILL.md
    @@ [context] @@
    -[current rule, quoted exactly]
    +[proposed rule]
    ```
    ## Why this diff
    [Rationale tied to the drift classification and the evidence]

A proposal without a diff is incomplete and cannot be approved.

## 5. Human review (hard boundary)
**The proposal diff never self-applies.** Only a human applies it after review. After
approval: apply the diff, bump the skill version, regenerate its snapshot
(`generate-snapshots.ps1 -Scaffold` → fill → `-Check`), and reset the baseline ONLY if
the change redefines the quality bar (`run-eval.ps1 -ResetBaseline -Reason "..."`).
```

- [ ] **Step 3: Create `specdd-kit/.agents/telemetry/EVENTS.md`**

```markdown
# Telemetry Event Contract v1

Storage: `.agents/telemetry/events/[YYYY-MM].jsonl` — one JSON object per line.
Gitignored (local/ephemeral; aggregate via reports, not raw commits). Retention: 90 days.

Every event: `{ "event": string, "ts": ISO-8601, "tool": string, ... }`
`tool` is free-text self-identification of the coding agent in use.

| event | extra fields | emitted when |
|-------|-------------|--------------|
| session_start | project | session begins |
| context_injected | artifact (path), lines (int) | any .agents/ artifact is loaded into context |
| rule_violation | skill, rule (short id/quote), detectedBy (eval\|review\|self) | a Must/Never rule was violated |
| task_completed | category (ROUTING class), sessionMinutes (int) | task ends |
| session_summary | linesInjected (int), skillsLoaded (int), violations (int) | session ends (fallback mode: this may be the ONLY event) |

Rules:
- Append-only. Never edit past lines.
- Unknown fields are allowed; unknown events are ignored by consumers.
- Emitting is best-effort: a missed event is acceptable, a fabricated one is not.
- The instruction-based fallback is EXPECTEDLY LOSSY: a session-end instruction sits in
  the weakest position of a long context and will be dropped some fraction of the time.
  Consumers must treat fallback data as a sample, not a census. The emission rate itself
  is a metric: sessions observed (via VCS activity) vs session_summary lines is the
  fallback's real coverage.
- If your agent runtime supports session-end lifecycle hooks, wire the hook to append
  `session_summary` mechanically — a hook fires 100% of the time; an instruction does
  not. Hook config lives in the tool's own config file, never in `.agents/`.
```

- [ ] **Step 4: Create `specdd-kit/.agents/telemetry/events/.gitignore`**

```gitignore
*
!.gitignore
```

- [ ] **Step 5: Create `specdd-kit/docs/harness.md`**

```markdown
# The SpecDD Harness

The scaffold's `.agents/` directory plus the root `AGENTS.md` form the **SpecDD
Harness** (v1.0.0): a vendor-neutral core that is the single source of truth for
skills, specs, routing, evals, workflows, and telemetry. Each AI coding tool reaches
the core through a pointer adapter of ≤5 lines (`CLAUDE.md`, `GEMINI.md`,
`.github/copilot-instructions.md`); tools that read root `AGENTS.md` natively need no
adapter. Adapters contain zero rules — rules found in an adapter are architecture
drift: move them into `.agents/` and restore the pointer.

## Prerequisites
The harness validation scripts require:
- **PowerShell 7+** (`pwsh`, cross-platform: Windows/macOS/Linux)
- The **powershell-yaml** module: `Install-Module powershell-yaml -Scope CurrentUser`

## Layout
| Path | Purpose |
|------|---------|
| `AGENTS.md` (root) | Session primer, ≤40 lines. What every agent session loads first. |
| `.agents/REGISTRY.md` | Full artifact registry + systems status. Load only when working on the harness itself. |
| `.agents/orchestration/ROUTING.md` | Task classification → which skill to load. |
| `.agents/skills/<domain>/SKILL.md` | Per-domain rules. Skeletons at scaffold time — fill as the domain takes shape. |
| `.agents/specs/<entity>.spec.yaml` | Per-entity spec with designContract + executable acceptanceChecks (placeholder until approved). |
| `.agents/evals/` | Rubrics (drift policy), scores, frozen baselines, run-eval.ps1. Baselines freeze from ≥10 real runs — never fabricated. |
| `.agents/cold-start/` | Budget manifest + compressed skill snapshots (generated once skills have real content). |
| `.agents/workflows/` | spec-first-feature.md, skill-review.md. |
| `.agents/telemetry/` | EVENTS.md contract; events/ is gitignored. |
| `.agents/scripts/` | generate-snapshots.ps1, validate-spec.ps1, validate-budget.ps1. |

## Lifecycle after scaffolding
1. Fill each skill skeleton with the domain's real Must/Never rules as they emerge.
2. Run `pwsh .agents/scripts/generate-snapshots.ps1 -Scaffold`, compress, then `-Check`.
3. Author specs through `.agents/workflows/spec-first-feature.md` (specify → clarify →
   approve → tasks → implement → done-gate).
4. Wire `pwsh .agents/scripts/validate-spec.ps1` and `generate-snapshots.ps1 -Check`
   into CI when the team is ready.
5. Multi-agent orchestration artifacts are deliberately absent — add them only when a
   real multi-agent workflow with named sub-agents exists.
```

- [ ] **Step 6: Add a harness section to `specdd-kit/README.md`**

Read the README first, then insert this section after its opening/overview section (adjust heading level to match the file's structure):

```markdown
## The SpecDD Harness

Generated scaffolds are structured around a vendor-neutral agent harness: a `.agents/`
core (skills, specs, routing, evals, workflows, telemetry) reached by every AI coding
tool through a ≤5-line pointer adapter, with a root `AGENTS.md` session primer.
See [docs/harness.md](docs/harness.md). The harness validation scripts require
PowerShell 7+ and the `powershell-yaml` module
(`Install-Module powershell-yaml -Scope CurrentUser`).
```

- [ ] **Step 7: Rebundle and verify**

Run: `npm run bundle-kit -w sdd-kit-wizard`
Then: `node -e "const k=require('./specdd-kit/website/src/data/kit-files.json'); const want=['.agents/workflows/spec-first-feature.md','.agents/workflows/skill-review.md','.agents/telemetry/EVENTS.md','.agents/telemetry/events/.gitignore','docs/harness.md']; const miss=want.filter(w=>!(w in k)); if(miss.length){console.error('MISSING',miss);process.exit(1)}; console.log('all present')"`
Expected: `all present`

- [ ] **Step 8: Run unit tests, then commit**

Run: `npm run test:unit -w sdd-kit-wizard` — Expected: PASS.

```bash
git add specdd-kit/.agents specdd-kit/docs/harness.md specdd-kit/README.md
git commit -m "feat(specdd-kit): harness workflows, telemetry contract, harness doc"
```

---

### Task 4: Generators — slugify, renderPrimer, renderAdapter

**Files:**
- Modify: `specdd-kit/website/src/components/generators.js`
- Test: `specdd-kit/website/src/components/generators.test.js`

**Interfaces:**
- Produces (exact exports from `generators.js`):
  - `slugify(s: string): string` — lowercase, non-alphanumerics → `-`, trimmed.
  - `renderPrimer(input, today: string): string` — root `AGENTS.md`, ≤40 lines.
  - `renderAdapter(tool: string): { path: string, content: string } | null` — `'GitHub Copilot'` → `.github/copilot-instructions.md`, `'Claude Code'` → `CLAUDE.md`, `'Gemini'` → `GEMINI.md`, `'Cursor'`/`'Codex'` → `null` (they read root `AGENTS.md` natively).
- Consumes: the wizard input model (Task 8 shape) — relevant fields here: `project.name`, `project.description`, `stack.frontend`, `stack.backend`, `domains: string[]`.

- [ ] **Step 1: Write the failing tests**

Append to `generators.test.js` (extend the top import line to include the new names):

```js
import { generateFiles, renderMcpJson, slugify, renderPrimer, renderAdapter } from './generators.js';

const harnessInput = {
  ...input,
  scenario: 'greenfield',
  domains: ['Auth', 'Billing & Invoicing'],
  entities: ['User', 'Invoice'],
  features: ['User can sign up', 'Monthly invoice generation'],
  tools: ['GitHub Copilot', 'Claude Code'],
  model: 'default',
};

test('slugify normalizes domain names', () => {
  assert.equal(slugify('Billing & Invoicing'), 'billing-invoicing');
  assert.equal(slugify('  Auth  '), 'auth');
});

test('primer is <=40 lines, has frontmatter, one row per domain', () => {
  const primer = renderPrimer({ ...harnessInput, domains: ['a','b','c','d','e','f','g','h'] }, '2026-07-18');
  assert.ok(primer.split('\n').length <= 40, `primer has ${primer.split('\n').length} lines`);
  assert.match(primer, /^---\n/);
  assert.match(primer, /registry: \.agents\/REGISTRY\.md/);
  const short = renderPrimer(harnessInput, '2026-07-18');
  assert.match(short, /\.agents\/skills\/auth\/SKILL\.md/);
  assert.match(short, /\.agents\/skills\/billing-invoicing\/SKILL\.md/);
  assert.match(short, /session_summary/);
});

test('adapters: <=5 lines, zero rules, correct paths', () => {
  const claude = renderAdapter('Claude Code');
  assert.equal(claude.path, 'CLAUDE.md');
  assert.ok(claude.content.split('\n').filter(Boolean).length <= 5);
  assert.match(claude.content, /AGENTS\.md/);
  assert.equal(renderAdapter('GitHub Copilot').path, '.github/copilot-instructions.md');
  assert.equal(renderAdapter('Gemini').path, 'GEMINI.md');
  assert.equal(renderAdapter('Cursor'), null);
  assert.equal(renderAdapter('Codex'), null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: FAIL — `slugify`, `renderPrimer`, `renderAdapter` are not exported.

- [ ] **Step 3: Implement in `generators.js`**

Add below the existing renderers:

```js
export const slugify = (s) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const ADAPTER_CONTENT = `<!-- Adapter file — do not add rules here. All rules live in the vendor-neutral core. -->
Read the \`AGENTS.md\` file at the repository root and follow it completely before starting any task.
`;

const ADAPTER_PATHS = {
  'GitHub Copilot': '.github/copilot-instructions.md',
  'Claude Code': 'CLAUDE.md',
  Gemini: 'GEMINI.md',
  // Cursor and Codex read the root AGENTS.md natively — no adapter needed.
};

export function renderAdapter(tool) {
  const path = ADAPTER_PATHS[tool];
  return path ? { path, content: ADAPTER_CONTENT } : null;
}

export function renderPrimer(input, today) {
  const name = input.project?.name || 'Project';
  const desc = (input.project?.description || '').split(/\.\s|\n/)[0];
  const stack = [input.stack?.frontend, input.stack?.backend].filter(Boolean).join(' + ') || 'n/a';
  const rows = (input.domains || [])
    .map((d) => `| ${d} work | .agents/skills/${slugify(d)}/SKILL.md |`)
    .join('\n');
  return `---
version: 1.0.0
lastUpdated: ${today}
role: session-primer
registry: .agents/REGISTRY.md
---

# ${name} — Agent Session Primer

## What this is
${desc}. Stack: ${stack}.
Full artifact registry: \`.agents/REGISTRY.md\` (load only when modifying the harness itself).

## Load order (always)
1. \`.agents/orchestration/ROUTING.md\` — classify the task
2. The skill ROUTING points to — its always-load sections only
3. The spec for that domain — only if the task touches a primary entity

## Never load at session start
- Skills not selected by ROUTING for this task
- Workflow files unless executing a named workflow
- Telemetry events or decision logs

## Fast task classification
| Task pattern | Load |
|--------------|------|
${rows}
| update .agents/ | .agents/REGISTRY.md |

## Context budget
<=500 injected lines per session. Exceeded? Stop, decompose the task, re-classify.

## Session end (telemetry — best effort)
Append one session_summary line to .agents/telemetry/events/[YYYY-MM].jsonl per .agents/telemetry/EVENTS.md.
`;
}
```

Line-count guarantee: the fixed skeleton is 31 lines; one row per domain and the wizard caps domains at 8 (Task 8 validation) → worst case 39 ≤ 40.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/components/generators.js specdd-kit/website/src/components/generators.test.js
git commit -m "feat(specdd-kit): slugify, primer and adapter renderers"
```

---

### Task 5: Generators — renderRegistry, renderRouting

**Files:**
- Modify: `specdd-kit/website/src/components/generators.js`
- Test: `specdd-kit/website/src/components/generators.test.js`

**Interfaces:**
- Produces:
  - `renderRegistry(input, today: string): string` — `.agents/REGISTRY.md` content.
  - `renderRouting(input): string` — `.agents/orchestration/ROUTING.md` content.
- Consumes: `slugify` (Task 4), fields `project.name`, `domains[]`, `entities[]`, `tools[]`.

- [ ] **Step 1: Write the failing tests**

Append to `generators.test.js` (add `renderRegistry, renderRouting` to the import):

```js
test('registry lists per-domain and per-entity artifacts + systems status', () => {
  const reg = renderRegistry(harnessInput, '2026-07-18');
  assert.match(reg, /role: registry/);
  assert.match(reg, /\.agents\/skills\/auth\/SKILL\.md/);
  assert.match(reg, /\.agents\/specs\/user\.spec\.yaml/);
  assert.match(reg, /\.agents\/evals\/rubrics\/billing-invoicing\.yaml/);
  assert.match(reg, /Multi-Agent \| inactive/);
  assert.match(reg, /Evals Loop \| log_only/);
});

test('routing has one row per domain and a fallback rule', () => {
  const routing = renderRouting(harnessInput);
  assert.match(routing, /\| Auth work \| \.agents\/skills\/auth\/SKILL\.md \|/);
  assert.match(routing, /\| Billing & Invoicing work \| \.agents\/skills\/billing-invoicing\/SKILL\.md \|/);
  assert.match(routing, /No match\?/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: FAIL — `renderRegistry`, `renderRouting` not exported.

- [ ] **Step 3: Implement in `generators.js`**

```js
export function renderRouting(input) {
  const rows = (input.domains || [])
    .map((d) => `| ${d} work | .agents/skills/${slugify(d)}/SKILL.md | .agents/specs/[entity].spec.yaml if a primary entity is touched |`)
    .join('\n');
  return `# ROUTING — Task Classification

Classify every task BEFORE loading anything else. Load ONLY what the matching row
points to.

| Task pattern | Skill | Also load |
|--------------|-------|-----------|
${rows}
| update .agents/ | .agents/REGISTRY.md | — |

No match? Load the closest domain skill and record the gap in the session summary —
that gap is a signal a new skill or routing row is needed.
`;
}

export function renderRegistry(input, today) {
  const name = input.project?.name || 'Project';
  const skillRows = (input.domains || [])
    .map((d) => `| Skill: ${d} | .agents/skills/${slugify(d)}/SKILL.md | Domain rules (skeleton — fill as the domain takes shape) |`)
    .join('\n');
  const rubricRows = (input.domains || [])
    .map((d) => `| Rubric: ${d} | .agents/evals/rubrics/${slugify(d)}.yaml | Eval criteria + drift policy (log_only) |`)
    .join('\n');
  const specRows = (input.entities || [])
    .map((e) => `| Spec: ${e} | .agents/specs/${slugify(e)}.spec.yaml | Entity contract (designContract: placeholder) |`)
    .join('\n');
  const adapters = (input.tools || []).map((t) => renderAdapter(t)).filter(Boolean).map((a) => a.path).join(', ') || 'none';
  return `---
version: 1.0.0
lastUpdated: ${today}
role: registry
---

# ${name} — Harness Registry

Load this file only when working ON the harness (adding skills, specs, or systems).
Every agent session starts from the root \`AGENTS.md\` primer instead.

## Artifacts
| Artifact | Path | Purpose |
|----------|------|---------|
| Session primer | AGENTS.md | Entry point for every session (<=40 lines) |
| Adapters | ${adapters} | <=5-line pointers to the primer — zero rules |
| Routing | .agents/orchestration/ROUTING.md | Task classification table |
${skillRows}
${specRows}
${rubricRows}
| Budget manifest | .agents/cold-start/budget-manifest.yaml | Task class -> injected artifacts map |
| Workflows | .agents/workflows/spec-first-feature.md, .agents/workflows/skill-review.md | Spec pipeline + drift review |
| Telemetry contract | .agents/telemetry/EVENTS.md | Vendor-neutral JSONL event schema |
| Scripts | .agents/scripts/*.ps1, .agents/evals/run-eval.ps1 | Mechanical gates (pwsh 7+, powershell-yaml) |

## Harness Systems Status
| System | Status | Notes |
|--------|--------|-------|
| Portability | active | Root primer + adapters for the team's tools |
| Cold-Start | scaffolded | Snapshots empty until skills gain real content; then generate-snapshots.ps1 -Scaffold / -Check |
| Evals Loop | log_only | Baselines freeze after >=10 real runs — never fabricated |
| Spec-First | active | validate-spec.ps1 gates approval; done-gate runs acceptance checks |
| Multi-Agent | inactive | Activate only when a real multi-agent workflow with named sub-agents exists |
| Telemetry | fallback | session_summary appended at session end per EVENTS.md |
`;
}
```

Note: `renderRegistry` must be defined after `renderAdapter` (same module scope, order irrelevant at runtime, but keep the file readable: slugify → adapters → primer → routing → registry).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/components/generators.js specdd-kit/website/src/components/generators.test.js
git commit -m "feat(specdd-kit): registry and routing renderers"
```

---

### Task 6: Generators — skill skeletons, specs, rubrics, budget manifest, features spec

**Files:**
- Modify: `specdd-kit/website/src/components/generators.js`
- Test: `specdd-kit/website/src/components/generators.test.js`

**Interfaces:**
- Produces:
  - `renderSkillSkeleton(domain: string): string`
  - `renderRubric(domain: string): string`
  - `renderSpecYaml(entity: string): string`
  - `renderBudgetManifest(input): string`
  - `renderFeaturesSpec(input): string`
- Consumes: `slugify` (Task 4); fields `domains[]`, `entities[]`, `features[]`, `project.name`.

- [ ] **Step 1: Write the failing tests**

Append to `generators.test.js` (extend the import accordingly):

```js
test('skill skeleton has harness frontmatter with pointer-only drift policy', () => {
  const skill = renderSkillSkeleton('Billing & Invoicing');
  assert.match(skill, /name: billing-invoicing/);
  assert.match(skill, /snapshotPath: \.agents\/cold-start\/snapshots\/billing-invoicing\.snapshot\.md/);
  assert.match(skill, /driftPolicyPath: \.agents\/evals\/rubrics\/billing-invoicing\.yaml/);
  assert.ok(!/driftPolicy:\n/.test(skill)); // pointer only — never inline
});

test('rubric starts at log_only with median aggregation', () => {
  const rubric = renderRubric('Auth');
  assert.match(rubric, /skill: auth/);
  assert.match(rubric, /reviewTriggerAction: log_only/);
  assert.match(rubric, /aggregation: median/);
  assert.match(rubric, /ciFailConsecutiveWindows: 2/);
});

test('spec yaml is placeholder-status with placeholder checks and empty clarifications', () => {
  const spec = renderSpecYaml('Invoice');
  assert.match(spec, /entity: Invoice/);
  assert.match(spec, /status: placeholder/);
  assert.match(spec, /command: placeholder/);
  assert.match(spec, /clarifications: \[\]/);
  assert.match(spec, /reviewedBy: null/);
});

test('budget manifest has one task class per domain referencing real artifacts', () => {
  const manifest = renderBudgetManifest(harnessInput);
  assert.match(manifest, /budgetLines: 500/);
  assert.match(manifest, /- name: Auth work/);
  assert.match(manifest, /\.agents\/skills\/billing-invoicing\/SKILL\.md/);
});

test('features spec lists captured features as unchecked items', () => {
  const spec = renderFeaturesSpec(harnessInput);
  assert.match(spec, /- \[ \] User can sign up/);
  assert.match(spec, /- \[ \] Monthly invoice generation/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: FAIL — the five renderers are not exported.

- [ ] **Step 3: Implement in `generators.js`**

```js
export function renderSkillSkeleton(domain) {
  const slug = slugify(domain);
  return `---
name: ${slug}
version: 0.1.0
snapshotPath: .agents/cold-start/snapshots/${slug}.snapshot.md
snapshotVersion: 0.1.0
driftPolicyPath: .agents/evals/rubrics/${slug}.yaml
---

# ${domain} — Skill

> Skeleton generated at scaffold time. Fill each section with the domain's REAL rules
> as they emerge — then bump \`version\` and regenerate the snapshot
> (\`.agents/scripts/generate-snapshots.ps1 -Scaffold\` -> compress -> \`-Check\`).

## Scope
What ${domain} covers in this project, and what it explicitly does not.

## Must rules
<!-- Rules the agent must always follow in this domain. One imperative sentence each. -->

## Never do
<!-- Hard prohibitions. One sentence each. -->

## Verification
<!-- The command(s) that prove ${domain} work is correct (test runner filtered to this domain). -->
`;
}

export function renderRubric(domain) {
  const slug = slugify(domain);
  return `skill: ${slug}
criteria:
  - id: rule-adherence
    description: "Output follows the skill's Must rules and violates no Never rules"
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

export function renderSpecYaml(entity) {
  return `entity: ${entity}
version: 0.1.0
description: "Primary entity captured at scaffold time. Specify via the spec-first workflow."
requirements: []
designContract:
  status: placeholder
  reviewedBy: null
  approvedAt: null
  acceptanceChecks:
    - id: ac-001
      description: "Define the first acceptance criterion for ${entity} from its requirements"
      command: placeholder
      expectedExitCode: 0
  checksWaiver: null
clarifications: []
`;
}

export function renderBudgetManifest(input) {
  const classes = (input.domains || [])
    .map((d) => `  - name: ${d} work
    artifacts:
      - .agents/orchestration/ROUTING.md
      - .agents/skills/${slugify(d)}/SKILL.md`)
    .join('\n');
  return `# One entry per task pattern in the primer's fast-classification table.
# The primer itself is always counted by validate-budget.ps1.
budgetLines: 500
taskClasses:
${classes}
`;
}

export function renderFeaturesSpec(input) {
  const items = (input.features || []).map((f) => `- [ ] ${f}`).join('\n');
  return `# Features Spec — ${input.project?.name || 'Project'}

Initial feature list captured at scaffold time. Refine each into a full spec via
\`.agents/workflows/spec-first-feature.md\` before implementation.

${items}
`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/components/generators.js specdd-kit/website/src/components/generators.test.js
git commit -m "feat(specdd-kit): skill, spec, rubric, budget and features renderers"
```

---

### Task 7: generateFiles rewiring — harness overlay, tool filtering, confidentiality test

**Files:**
- Modify: `specdd-kit/website/src/components/generators.js` (rewrite `generateFiles`, delete `renderCopilotInstructions`)
- Test: `specdd-kit/website/src/components/generators.test.js`

**Interfaces:**
- Produces: `generateFiles(baseFiles, input, today?): Record<string, string>` — the only function `Wizard.jsx` calls. New behavior:
  - drops all base paths starting `.github/` unless `'GitHub Copilot' ∈ input.tools`;
  - overlays `AGENTS.md`, `.agents/REGISTRY.md`, `.agents/orchestration/ROUTING.md`, `.agents/cold-start/budget-manifest.yaml`, per-domain skills/rubrics, per-entity specs, per-tool adapters;
  - `specs/features-spec.md` from `features[]` (replaces the old `featuresSpec` string);
  - `today` defaults to the current date (`YYYY-MM-DD`), injectable for tests.
- Consumes: all renderers from Tasks 4–6.
- **Breaking model change:** input fields `agent: {primary, model}` and `featuresSpec: string` are replaced by `tools: string[]`, `model: string`, `features: string[]`. Task 8 updates the wizard to match.

- [ ] **Step 1: Update existing tests + write the failing tests**

In `generators.test.js`: in the shared `input` fixture, replace `agent: { primary: 'GitHub Copilot', model: 'gpt-4o' },` with `tools: ['GitHub Copilot'], model: 'gpt-4o',` and replace `featuresSpec: '',` with `features: [],`. In the first test, replace the `.github/copilot-instructions.md` assertion with `assert.match(out['.github/copilot-instructions.md'], /AGENTS\.md/);` and the features assertion with `assert.ok(!('specs/features-spec.md' in out));`. Then append:

```js
const baseWithGithub = { ...base, '.github/prompts/specdd-specify.prompt.md': 'copilot prompt' };

test('greenfield output contains the harness core', () => {
  const out = generateFiles(baseWithGithub, harnessInput, '2026-07-18');
  assert.ok('AGENTS.md' in out);
  assert.ok('.agents/REGISTRY.md' in out);
  assert.ok('.agents/orchestration/ROUTING.md' in out);
  assert.ok('.agents/cold-start/budget-manifest.yaml' in out);
  assert.ok('.agents/skills/auth/SKILL.md' in out);
  assert.ok('.agents/evals/rubrics/auth.yaml' in out);
  assert.ok('.agents/specs/user.spec.yaml' in out);
  assert.ok('CLAUDE.md' in out);                                  // Claude Code adapter
  assert.ok('specs/features-spec.md' in out);
  assert.ok(!Object.keys(out).some((p) => p.includes('spec-converge'))); // greenfield: no converge
});

test('.github content ships only when Copilot is selected', () => {
  const withCopilot = generateFiles(baseWithGithub, harnessInput, '2026-07-18');
  assert.ok('.github/prompts/specdd-specify.prompt.md' in withCopilot);
  assert.match(withCopilot['.github/copilot-instructions.md'], /AGENTS\.md/); // pointer adapter

  const noCopilot = generateFiles(baseWithGithub, { ...harnessInput, tools: ['Claude Code'] }, '2026-07-18');
  assert.ok(!Object.keys(noCopilot).some((p) => p.startsWith('.github/')));
});

test('adapters carry zero rules and generated content carries no private version tags', () => {
  const out = generateFiles(baseWithGithub, harnessInput, '2026-07-18');
  for (const adapterPath of ['CLAUDE.md', '.github/copilot-instructions.md']) {
    assert.ok(out[adapterPath].split('\n').filter(Boolean).length <= 5, `${adapterPath} too long`);
  }
  for (const [path, contents] of Object.entries(out)) {
    if (path === '.github/prompts/specdd-specify.prompt.md') continue; // base fixture, not generated
    assert.ok(!/\bV\d+(\.\d+)?\b/.test(contents), `version tag leaked in ${path}`);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: FAIL — harness paths missing from `generateFiles` output.

- [ ] **Step 3: Rewrite `generateFiles` and remove `renderCopilotInstructions`**

Delete the `renderCopilotInstructions` function entirely. Replace `generateFiles` with:

```js
export function generateFiles(baseFiles, input, today = new Date().toISOString().slice(0, 10)) {
  const tools = input.tools || [];
  const hasCopilot = tools.includes('GitHub Copilot');

  const out = {};
  for (const [path, contents] of Object.entries(baseFiles)) {
    if (!hasCopilot && path.startsWith('.github/')) continue; // Copilot projection is opt-in
    out[path] = contents;
  }

  out['context/project.md'] = renderProject(input);
  out['context/tech-stack.md'] = renderTechStack(input);
  out['context/constitution.md'] = renderConstitution(input);

  out['AGENTS.md'] = renderPrimer(input, today);
  out['.agents/REGISTRY.md'] = renderRegistry(input, today);
  out['.agents/orchestration/ROUTING.md'] = renderRouting(input);
  out['.agents/cold-start/budget-manifest.yaml'] = renderBudgetManifest(input);
  for (const domain of input.domains || []) {
    out[`.agents/skills/${slugify(domain)}/SKILL.md`] = renderSkillSkeleton(domain);
    out[`.agents/evals/rubrics/${slugify(domain)}.yaml`] = renderRubric(domain);
  }
  for (const entity of input.entities || []) {
    out[`.agents/specs/${slugify(entity)}.spec.yaml`] = renderSpecYaml(entity);
  }
  for (const tool of tools) {
    const adapter = renderAdapter(tool);
    if (adapter) out[adapter.path] = adapter.content;
  }

  if ((input.mcp || []).length > 0) out['.vscode/mcp.json'] = renderMcpJson(input.mcp);
  if ((input.features || []).length > 0) out['specs/features-spec.md'] = renderFeaturesSpec(input);
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: PASS (all tests, including the updated legacy ones).

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/components/generators.js specdd-kit/website/src/components/generators.test.js
git commit -m "feat(specdd-kit): generateFiles emits harness core with per-tool adapters"
```

---

### Task 8: Wizard step model — steps.js with scenario branching and validation

**Files:**
- Create: `specdd-kit/website/src/components/steps.js`
- Test: `specdd-kit/website/src/components/steps.test.js`

**Interfaces:**
- Produces (exact exports from `steps.js`):
  - `TOOLS = ['GitHub Copilot', 'Claude Code', 'Cursor', 'Codex', 'Gemini']`
  - `OWASP_CONTROLS: string[]` (10 entries, `'A01 Broken Access Control'` … `'A10 Server-Side Request Forgery'`)
  - `MAX_DOMAINS = 8`
  - `stepsFor(scenario: string): string[]` — for `'greenfield'` returns `['Welcome', 'Scenario', 'Project', 'Tech Stack', 'Domains & Entities', 'Features', 'Principles', 'MCP Tools', 'Agents & Tools', 'Security', 'Preview / Download']`. Any other value also returns this list for now (Brownfield branch plugs in here later).
  - `errorFor(stepName: string, data): string` — `''` when valid.
- Consumes: the wizard data model (Task 9's `initial`).

- [ ] **Step 1: Write the failing tests**

Create `specdd-kit/website/src/components/steps.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepsFor, errorFor, TOOLS, OWASP_CONTROLS, MAX_DOMAINS } from './steps.js';

const valid = {
  project: { name: 'Acme', description: 'desc', problem: '' },
  stack: { frontend: 'React' },
  domains: ['auth'], entities: [], features: [],
  tools: ['GitHub Copilot'],
};

test('greenfield step list', () => {
  assert.deepEqual(stepsFor('greenfield'), [
    'Welcome', 'Scenario', 'Project', 'Tech Stack', 'Domains & Entities', 'Features',
    'Principles', 'MCP Tools', 'Agents & Tools', 'Security', 'Preview / Download',
  ]);
});

test('validation by step name', () => {
  assert.equal(errorFor('Project', valid), '');
  assert.match(errorFor('Project', { ...valid, project: { name: '', description: 'd' } }), /name/i);
  assert.match(errorFor('Tech Stack', { ...valid, stack: { frontend: '' } }), /Frontend/);
  assert.match(errorFor('Domains & Entities', { ...valid, domains: [] }), /at least one domain/i);
  assert.match(errorFor('Domains & Entities', { ...valid, domains: Array.from({ length: MAX_DOMAINS + 1 }, (_, i) => `d${i}`) }), /at most/i);
  assert.match(errorFor('Agents & Tools', { ...valid, tools: [] }), /at least one tool/i);
  assert.equal(errorFor('Welcome', valid), '');
});

test('constants', () => {
  assert.equal(TOOLS.length, 5);
  assert.equal(OWASP_CONTROLS.length, 10);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: FAIL — `steps.js` does not exist.

- [ ] **Step 3: Create `specdd-kit/website/src/components/steps.js`**

```js
// Step model for the SpecDD wizard. Pure — no React imports.
// stepsFor(scenario) is the seam where the Brownfield branch will plug in.

export const TOOLS = ['GitHub Copilot', 'Claude Code', 'Cursor', 'Codex', 'Gemini'];

export const OWASP_CONTROLS = [
  'A01 Broken Access Control',
  'A02 Cryptographic Failures',
  'A03 Injection',
  'A04 Insecure Design',
  'A05 Security Misconfiguration',
  'A06 Vulnerable and Outdated Components',
  'A07 Identification and Authentication Failures',
  'A08 Software and Data Integrity Failures',
  'A09 Security Logging and Monitoring Failures',
  'A10 Server-Side Request Forgery',
];

// Primer stays <=40 lines only if the classification table stays bounded.
export const MAX_DOMAINS = 8;

const GREENFIELD_STEPS = [
  'Welcome', 'Scenario', 'Project', 'Tech Stack', 'Domains & Entities', 'Features',
  'Principles', 'MCP Tools', 'Agents & Tools', 'Security', 'Preview / Download',
];

export function stepsFor(scenario) {
  // Brownfield gets its own branch (folder ingestion + analysis) in a later phase.
  return GREENFIELD_STEPS;
}

export function errorFor(stepName, data) {
  if (stepName === 'Project') {
    if (!data.project.name.trim()) return 'Project name is required.';
    if (!data.project.description.trim()) return 'Description is required.';
  }
  if (stepName === 'Tech Stack' && !data.stack.frontend.trim()) return 'Frontend is required.';
  if (stepName === 'Domains & Entities') {
    if ((data.domains || []).length === 0) return 'Add at least one domain — the harness routing is built from them.';
    if (data.domains.length > MAX_DOMAINS) return `Keep at most ${MAX_DOMAINS} domains — decompose broader areas later.`;
  }
  if (stepName === 'Agents & Tools' && (data.tools || []).length === 0) return 'Select at least one tool your team uses.';
  return '';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w sdd-kit-wizard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/components/steps.js specdd-kit/website/src/components/steps.test.js
git commit -m "feat(specdd-kit): scenario-branched step model with validation"
```

---

### Task 9: Wizard UI — scenario step, new/enriched steps, chips, grouped preview

**Files:**
- Create: `specdd-kit/website/src/components/ChipInput.jsx`
- Modify: `specdd-kit/website/src/components/Wizard.jsx` (full rework of step rendering)

**Interfaces:**
- Consumes: `stepsFor`, `errorFor`, `TOOLS`, `OWASP_CONTROLS` from `./steps.js`; `generateFiles(kitFiles, data)` from Task 7.
- Produces: UI test hooks used by Task 10's e2e: `data-testid="scenario-greenfield"`, `data-testid="scenario-brownfield"` (disabled), `data-testid="domain-input"`, `data-testid="entity-input"`, `data-testid="tool-<slug>"` checkboxes (e.g. `tool-github-copilot`), `data-testid="preview"` retained.

- [ ] **Step 1: Create `specdd-kit/website/src/components/ChipInput.jsx`**

```jsx
import { useState } from 'react';

// Text input that turns Enter/comma into removable chips. Controlled via values/onChange.
export default function ChipInput({ label, values, onChange, placeholder, testid }) {
  const [draft, setDraft] = useState('');

  function commit() {
    const v = draft.trim().replace(/,+$/, '');
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  }
  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
    if (e.key === 'Backspace' && !draft && values.length) onChange(values.slice(0, -1));
  }

  return (
    <>
      <label>{label}</label>
      <div className="b-chips">
        {values.map((v) => (
          <button type="button" className="b-chip" key={v} onClick={() => onChange(values.filter((x) => x !== v))}>
            {v} ×
          </button>
        ))}
        <input data-testid={testid} value={draft} placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown} onBlur={commit} />
      </div>
    </>
  );
}
```

(If `.b-chips`/`.b-chip` classes don't exist in `@specdd/ui/styles/wizard.css`, add minimal styles there: `.b-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center}` and `.b-chip{font:inherit;border:1px solid currentColor;border-radius:999px;padding:2px 10px;background:transparent;cursor:pointer}` — follow the file's existing token conventions.)

- [ ] **Step 2: Rework `Wizard.jsx`**

Replace the hardcoded `STEPS`/`AGENTS` constants and index-based rendering with name-based rendering. The full set of changes:

Imports and model:

```jsx
import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import kitFiles from '../data/kit-files.json';
import { generateFiles } from './generators.js';
import { stepsFor, errorFor as stepError, TOOLS, OWASP_CONTROLS } from './steps.js';
import ChipInput from './ChipInput.jsx';
import Stepper from '@specdd/ui/stepper';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

const MCP_OPTIONS = ['github', 'sonarqube', 'context7', 'postgresql', 'playwright', 'figma'];

const initial = {
  scenario: 'greenfield',
  project: { name: '', description: '', problem: '' },
  personas: [], outcomes: { user: '', business: '' },
  constraints: { business: '', technical: '' },
  domains: [], entities: [], features: [],
  stack: { languages: [], frontend: '', backend: '', testing: '', database: '', infra: '', swagger: false, a11y: false },
  principles: ['Specifications are the source of truth'],
  mcp: [], tools: ['GitHub Copilot'], model: '',
  security: { classification: 'internal', owaspControls: [] },
};
```

Inside the component, derive steps and validation from the model:

```jsx
const steps = stepsFor(data.scenario);
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
const last = step === steps.length - 1;
const files = last ? generateFiles(kitFiles, data) : {};
```

Replace every `{step === N && …}` block with `{stepName === '…' && …}`. Existing blocks keep their content under their names: `'Welcome'`, `'Project'`, `'Tech Stack'`, `'Principles'`, `'MCP Tools'`, `'Security'`. The Stepper call becomes `<Stepper steps={steps} current={step} isValid={isStepValid} maxVisited={maxVisited} onJump={jump} />` and the two `STEPS.length` usages in the sidebar/eyebrow become `steps.length`.

New **Scenario** step block:

```jsx
{stepName === 'Scenario' && (
  <div className="b-cards">
    <button type="button" data-testid="scenario-greenfield"
      className={`b-card ${data.scenario === 'greenfield' ? 'b-card--active' : ''}`}
      onClick={() => set({ scenario: 'greenfield' })}>
      <strong>Greenfield</strong>
      <p>New project — pour in all the context you have and get a fully personalized harness scaffold.</p>
    </button>
    <button type="button" data-testid="scenario-brownfield" className="b-card" disabled>
      <strong>Brownfield</strong>
      <p>Existing project — the wizard will analyze your codebase. Coming soon.</p>
    </button>
  </div>
)}
```

(Add `.b-cards`/`.b-card` styles to `@specdd/ui/styles/wizard.css` if absent, matching Boreal conventions; `.b-card:disabled{opacity:.5;cursor:not-allowed}`.)

Enriched **Project** step — append below the existing three fields:

```jsx
<ChipInput label="Personas" values={data.personas} onChange={(v) => set({ personas: v })}
  placeholder="e.g. Admin — press Enter" testid="persona-input" />
<label>User outcome</label>
<input value={data.outcomes.user} onChange={(e) => set({ outcomes: { ...data.outcomes, user: e.target.value } })} />
<label>Business outcome</label>
<input value={data.outcomes.business} onChange={(e) => set({ outcomes: { ...data.outcomes, business: e.target.value } })} />
<label>Business constraints</label>
<input value={data.constraints.business} onChange={(e) => set({ constraints: { ...data.constraints, business: e.target.value } })} />
<label>Technical constraints</label>
<input value={data.constraints.technical} onChange={(e) => set({ constraints: { ...data.constraints, technical: e.target.value } })} />
```

New **Domains & Entities** step:

```jsx
{stepName === 'Domains & Entities' && (
  <>
    <p className="b-lead">Domains become skills and routing rows; primary entities become spec placeholders.</p>
    <ChipInput label="Domains * (1–8, e.g. auth, billing)" values={data.domains}
      onChange={(v) => set({ domains: v })} placeholder="Type a domain, press Enter" testid="domain-input" />
    <ChipInput label="Primary entities (e.g. User, Invoice)" values={data.entities}
      onChange={(v) => set({ entities: v })} placeholder="Type an entity, press Enter" testid="entity-input" />
  </>
)}
```

New **Features** step:

```jsx
{stepName === 'Features' && (
  <>
    <label>Initial features (one per line)</label>
    <textarea data-testid="features-input" value={data.features.join('\n')}
      onChange={(e) => set({ features: e.target.value.split('\n').filter(Boolean) })} />
  </>
)}
```

**Agents & Tools** step (replaces the old `'Agent & LLM'` block):

```jsx
{stepName === 'Agents & Tools' && (
  <>
    <label>Team tools * (one pointer adapter is generated per tool)</label>
    {TOOLS.map((t) => (
      <label className="b-check" key={t}>
        <input type="checkbox" data-testid={`tool-${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
          checked={data.tools.includes(t)}
          onChange={(e) => set({ tools: e.target.checked ? [...data.tools, t] : data.tools.filter((x) => x !== t) })} />
        {t}
      </label>
    ))}
    <label>Default model (informative)</label>
    <input value={data.model} onChange={(e) => set({ model: e.target.value })} />
  </>
)}
```

Enriched **Security** step — append below the classification select:

```jsx
<label>OWASP focus controls</label>
{OWASP_CONTROLS.map((c) => (
  <label className="b-check" key={c}>
    <input type="checkbox" checked={data.security.owaspControls.includes(c)}
      onChange={(e) => set({ security: { ...data.security, owaspControls: e.target.checked ? [...data.security.owaspControls, c] : data.security.owaspControls.filter((x) => x !== c) } })} />
    {c}
  </label>
))}
```

Grouped **Preview / Download** step (replaces the single `<pre>`):

```jsx
{stepName === 'Preview / Download' && (() => {
  const paths = Object.keys(files).sort();
  const isHarness = (p) => p === 'AGENTS.md' || p === 'CLAUDE.md' || p === 'GEMINI.md' || p.startsWith('.agents/');
  const isCopilot = (p) => p.startsWith('.github/');
  const groups = [
    ['Harness core & adapters', paths.filter(isHarness)],
    ['Copilot projection', paths.filter(isCopilot)],
    ['Project content', paths.filter((p) => !isHarness(p) && !isCopilot(p))],
  ].filter(([, items]) => items.length > 0);
  return (
    <>
      <p className="b-lead">{paths.length} files ready.</p>
      <div data-testid="preview">
        {groups.map(([title, items]) => (
          <details key={title} open>
            <summary>{title} ({items.length})</summary>
            <pre className="b-preview">{items.join('\n')}</pre>
          </details>
        ))}
      </div>
    </>
  );
})()}
```

Note: `renderProject` and `renderConstitution` already consume `personas`, `outcomes`, `constraints`, and `security.owaspControls` is consumed by the security content in `context/` — no generator change needed here.

- [ ] **Step 3: Verify unit tests still pass and the site builds**

Run: `npm run test:unit -w sdd-kit-wizard` — Expected: PASS.
Run: `npm run build -w sdd-kit-wizard` — Expected: build succeeds (bundles kit first via `prebuild`).

- [ ] **Step 4: Manual smoke check**

Run: `npm run dev -w sdd-kit-wizard` and open `http://localhost:4321`. Walk: Welcome → Scenario (Brownfield card disabled) → fill Project → Stack → add a domain chip + entity chip → a feature line → Principles → MCP → tools multi-select → Security OWASP checkboxes → Preview shows the three groups → Download produces a ZIP. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add specdd-kit/website/src/components/Wizard.jsx specdd-kit/website/src/components/ChipInput.jsx packages/ui
git commit -m "feat(specdd-kit): scenario-branched wizard with harness inputs and grouped preview"
```

---

### Task 10: E2E update + full verification

**Files:**
- Modify: `specdd-kit/website/e2e/wizard.spec.js`
- Verify (no edits expected unless broken): `platform/e2e/`, `platform/src/pages/specdd.astro`

**Interfaces:**
- Consumes: test hooks from Task 9 (`scenario-brownfield`, `domain-input`, `entity-input`, `preview`, `download-btn`, `step-nav-*`).

- [ ] **Step 1: Update the e2e walkthrough**

Replace the body of `specdd-kit/website/e2e/wizard.spec.js` with:

```js
import { test, expect } from '@playwright/test';

test('greenfield wizard walks all steps and downloads a harness scaffold ZIP', async ({ page }) => {
  await page.goto('/');
  await page.locator('.b-shell[data-ready="true"]').waitFor();
  await expect(page.getByTestId('step-title')).toHaveText('Welcome');

  await page.getByTestId('next-btn').click(); // -> Scenario
  await expect(page.getByTestId('scenario-brownfield')).toBeDisabled();
  await page.getByTestId('next-btn').click(); // -> Project (greenfield preselected)

  await page.getByTestId('next-btn').click(); // validation blocks (name empty)
  await expect(page.getByTestId('error')).toBeVisible();
  await page.getByTestId('project-name').fill('Acme');
  await page.locator('textarea').first().fill('An SDD project');
  await page.getByTestId('next-btn').click(); // -> Tech Stack

  await page.locator('.b-main__body input').first().fill('React');
  await page.getByTestId('next-btn').click(); // -> Domains & Entities

  await page.getByTestId('next-btn').click(); // validation blocks (no domains)
  await expect(page.getByTestId('error')).toBeVisible();
  await page.getByTestId('domain-input').fill('auth');
  await page.getByTestId('domain-input').press('Enter');
  await page.getByTestId('entity-input').fill('User');
  await page.getByTestId('entity-input').press('Enter');
  await page.getByTestId('next-btn').click(); // -> Features

  await page.getByTestId('features-input').fill('User can sign up');
  await page.getByTestId('next-btn').click(); // -> Principles
  await page.getByTestId('next-btn').click(); // -> MCP Tools
  await page.getByTestId('next-btn').click(); // -> Agents & Tools (Copilot preselected)
  await page.getByTestId('next-btn').click(); // -> Security
  await page.getByTestId('next-btn').click(); // -> Preview

  await expect(page.getByTestId('preview')).toContainText('AGENTS.md');
  await expect(page.getByTestId('preview')).toContainText('.agents/skills/auth/SKILL.md');
  await expect(page.getByTestId('preview')).toContainText('.agents/specs/user.spec.yaml');
  await expect(page.getByTestId('preview')).toContainText('context/project.md');

  // Boreal stepper: completed steps are marked done and are clickable
  await expect(page.getByTestId('step-nav-2')).toHaveAttribute('data-state', 'done');
  await page.getByTestId('step-nav-2').click();
  await expect(page.getByTestId('step-title')).toHaveText('Project');
  await page.getByTestId('step-nav-10').click(); // jump forward to a visited step
  await expect(page.getByTestId('step-title')).toHaveText('Preview / Download');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-btn').click(),
  ]);
  expect(download.suggestedFilename()).toContain('scaffold.zip');
});
```

- [ ] **Step 2: Run the kit e2e**

Run: `npm test -w sdd-kit-wizard`
Expected: PASS. If a selector drifted from the Task 9 implementation, fix the implementation's testids (not the test's intent).

- [ ] **Step 3: Check the platform e2e for SpecDD coupling**

Read `platform/e2e/` specs. If any test walks the SpecDD wizard steps by index or old step names, update it to match the new flow (same edits as Step 1). If they only check the wizard mounts, leave untouched.
Run: `npm test -w specdd-platform` (or the platform's Playwright script name — check `platform/package.json`).
Expected: PASS.

- [ ] **Step 4: Full workspace verification**

Run from repo root:
- `npm run test:unit -w sdd-kit-wizard` — PASS
- `npm run build -w sdd-kit-wizard` — succeeds
- `npm run build -w specdd-platform` — succeeds (platform bundles all kits via `prebuild`)

- [ ] **Step 5: Confidentiality final sweep**

Run: `git grep -nE '\bV[0-9]+(\.[0-9]+)?\b' -- ':!node_modules'`
Expected: no hits in any file this plan touched (hits in pre-existing unrelated files, if any, are out of scope — report them).
Also verify the private root working documents remain untracked (`git status --porcelain` shows them only as `??`).

- [ ] **Step 6: Commit**

```bash
git add specdd-kit/website/e2e/wizard.spec.js platform/e2e
git commit -m "test(specdd-kit): e2e covers greenfield scenario and harness output"
```

---

## Self-review notes

- **Spec coverage:** confidentiality → Tasks 1, 7 (regex test), 10 (sweep); static harness artifacts → Tasks 2–3; personalized renderers → Tasks 4–6; conditional `.github/` + adapters → Task 7; scenario step + branching seam + orphaned fields UI → Tasks 8–9; grouped preview → Task 9; e2e → Task 10; harness prerequisites documented → Task 3 (docs/harness.md + README).
- **Deliberately omitted per spec:** `spec-converge.md`, multi-agent artifacts (`validate-contract`, subagent projection), CI changes, SpecForge/SpecDeploy.
- The `.github/hooks/session-logger/` content ships inside the Copilot projection group unchanged; harness telemetry (EVENTS.md) is the vendor-neutral contract and does not conflict with it.
