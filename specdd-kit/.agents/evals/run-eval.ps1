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
  $carriedHistory = @()

  if ($ResetBaseline -and (Test-Path $path)) {
    if (-not $Reason) { Write-Error "-ResetBaseline requires -Reason"; exit 1 }
    $old = Get-Content $path -Raw | ConvertFrom-Json
    $carriedHistory = @($old.history) + @{ resetAt = (Get-Date -Format o); reason = $Reason }
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
    history      = $carriedHistory
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
