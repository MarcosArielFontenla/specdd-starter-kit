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
