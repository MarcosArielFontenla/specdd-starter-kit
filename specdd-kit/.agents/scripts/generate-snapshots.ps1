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
