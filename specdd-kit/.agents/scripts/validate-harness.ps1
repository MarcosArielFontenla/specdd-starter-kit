#Requires -Version 7.0
# validate-harness.ps1 — post-extraction SpecDD Harness gate. Read-only by design.
#   default : validates the generated manifest, structure, references and safe content
#   -RunGates: also runs validate-spec.ps1 and validate-budget.ps1 from the extracted Harness

[CmdletBinding()]
param(
  [string]$Root = ".",
  [string]$ManifestPath = "context/scaffold-manifest.json",
  [switch]$RunGates
)

$ErrorActionPreference = "Stop"
$rootPath = (Resolve-Path -LiteralPath $Root).Path
$failures = [System.Collections.Generic.List[string]]::new()

function Fail([string]$Message) {
  $script:failures.Add($Message)
  Write-Warning "[HARNESS INVALID] $Message"
}

function Normalize-Relative([string]$Path) {
  return $Path.Replace('\', '/')
}

function Is-UnsafeRelative([string]$Path) {
  $normalized = Normalize-Relative $Path
  return [System.IO.Path]::IsPathRooted($Path) -or $normalized -eq '..' -or $normalized.StartsWith('../') -or $normalized.Contains('/../')
}

function Full-Path([string]$RelativePath) {
  return Join-Path $rootPath (Normalize-Relative $RelativePath)
}

function Require-File([string]$RelativePath) {
  if (-not (Test-Path -LiteralPath (Full-Path $RelativePath) -PathType Leaf)) {
    Fail "missing required file: $RelativePath"
  }
}

function Read-Relative([string]$RelativePath) {
  return Get-Content -LiteralPath (Full-Path $RelativePath) -Raw
}

function Slugify([string]$Value) {
  $slug = $Value.Trim().ToLowerInvariant() -replace '[^a-z0-9]+', '-'
  return $slug.Trim('-')
}

if (Is-UnsafeRelative $ManifestPath) {
  Fail "manifest path must stay relative to the extracted root: $ManifestPath"
} elseif (-not (Test-Path -LiteralPath (Full-Path $ManifestPath) -PathType Leaf)) {
  Fail "manifest not found: $ManifestPath"
}

$manifest = $null
if ($failures.Count -eq 0) {
  try {
    $manifest = Get-Content -LiteralPath (Full-Path $ManifestPath) -Raw | ConvertFrom-Json
  } catch {
    Fail "manifest is not valid JSON: $ManifestPath"
  }
}

if ($manifest) {
  if ([int]$manifest.schemaVersion -ne 1) { Fail "unsupported manifest schemaVersion: $($manifest.schemaVersion)" }

  $generatedPaths = @($manifest.generatedFiles | ForEach-Object { Normalize-Relative ([string]$_) })
  if ($generatedPaths.Count -eq 0) { Fail "manifest does not list generatedFiles" }
  if ((@($generatedPaths | Group-Object | Where-Object Count -gt 1)).Count -gt 0) { Fail "manifest contains duplicate generated file paths" }

  $manifestRelative = Normalize-Relative $ManifestPath
  if ($generatedPaths -notcontains $manifestRelative) { Fail "manifest does not list itself in generatedFiles" }

  foreach ($path in $generatedPaths) {
    if (Is-UnsafeRelative $path) {
      Fail "unsafe generated path in manifest: $path"
      continue
    }
    Require-File $path
  }

  $skippedPaths = @($manifest.skippedPaths | ForEach-Object { Normalize-Relative ([string]$_) })
  $replacedPaths = @($manifest.replacedPaths | ForEach-Object { Normalize-Relative ([string]$_) })
  foreach ($path in @($skippedPaths + $replacedPaths)) {
    if ($generatedPaths -contains $path) { Fail "collision path is also listed as generated: $path" }
  }

  foreach ($required in @('AGENTS.md', '.agents/REGISTRY.md', '.agents/orchestration/ROUTING.md', '.agents/cold-start/budget-manifest.yaml')) {
    Require-File $required
    if ($generatedPaths -notcontains $required) { Fail "required Harness file is not listed in generatedFiles: $required" }
  }

  $selected = $manifest.selected
  foreach ($domain in @($selected.domains)) {
    $path = ".agents/skills/$(Slugify ([string]$domain))/SKILL.md"
    Require-File $path
    if ($generatedPaths -notcontains $path) { Fail "selected domain is missing from generatedFiles: $domain" }
  }
  foreach ($entity in @($selected.entities)) {
    $path = ".agents/specs/$(Slugify ([string]$entity)).spec.yaml"
    Require-File $path
    if ($generatedPaths -notcontains $path) { Fail "selected entity is missing from generatedFiles: $entity" }
  }
  if (@($selected.features).Count -gt 0) {
    Require-File 'specs/features-spec.md'
    if ($generatedPaths -notcontains 'specs/features-spec.md') { Fail 'selected features are missing specs/features-spec.md' }
  }

  if ([string]$manifest.scenario -eq 'brownfield') {
    Require-File 'context/brownfield-analysis.md'
    if ($generatedPaths -notcontains 'context/brownfield-analysis.md') { Fail 'Brownfield analysis report is not listed in generatedFiles' }
    if (-not $manifest.contextReview -or $manifest.contextReview.approved -ne $true) {
      Fail 'Brownfield manifest does not contain an approved context review'
    }
    $convergeListed = $generatedPaths -contains '.agents/workflows/spec-converge.md'
    $convergeSkipped = $skippedPaths -contains '.agents/workflows/spec-converge.md'
    if (-not ($convergeListed -or $convergeSkipped)) {
      Fail 'Brownfield scaffold does not list spec-converge as generated or skipped'
    }
  }

  $routing = Read-Relative '.agents/orchestration/ROUTING.md'
  $routingRefs = [regex]::Matches($routing, '\.agents/skills/[A-Za-z0-9._/-]+/SKILL\.md') | ForEach-Object Value | Sort-Object -Unique
  foreach ($ref in $routingRefs) { Require-File $ref }

  $registry = Read-Relative '.agents/REGISTRY.md'
  $registryRefs = [regex]::Matches($registry, '\.agents/(?:skills|specs|evals)/[A-Za-z0-9._/-]+') | ForEach-Object Value | Sort-Object -Unique
  foreach ($ref in $registryRefs) {
    if ($ref -match '/specs/[^/]+\.spec\.yaml$' -or $ref -match '/skills/[^/]+/SKILL\.md$' -or $ref -match '/evals/rubrics/[^/]+\.yaml$') {
      Require-File $ref
    }
  }

  $budget = Read-Relative '.agents/cold-start/budget-manifest.yaml'
  $budgetRefs = [regex]::Matches($budget, '\.agents/skills/[A-Za-z0-9._/-]+/SKILL\.md') | ForEach-Object Value | Sort-Object -Unique
  foreach ($ref in $budgetRefs) { Require-File $ref }

  $yamlModule = Get-Module -ListAvailable -Name powershell-yaml
  if ($yamlModule) {
    Import-Module powershell-yaml
    $yamlFiles = @((Full-Path '.agents/cold-start/budget-manifest.yaml'))
    $yamlFiles += @(Get-ChildItem -LiteralPath (Full-Path '.agents/specs') -Recurse -Filter '*.spec.yaml' -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
    foreach ($yamlPath in $yamlFiles) {
      try { $null = ConvertFrom-Yaml (Get-Content -LiteralPath $yamlPath -Raw) }
      catch { Fail "invalid YAML: $yamlPath" }
    }
  } else {
    Write-Warning "[HARNESS CHECK] powershell-yaml is not installed; YAML parsing was skipped."
  }

  $secretPattern = '(?im)-----BEGIN [^-]+PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}'
  foreach ($path in $generatedPaths) {
    $contents = Read-Relative $path
    if ($contents -match $secretPattern) { Fail "secret-like token detected in generated file: $path" }
  }
}

if ($RunGates -and $failures.Count -eq 0) {
  Push-Location $rootPath
  try {
    foreach ($gate in @('.agents/scripts/validate-spec.ps1', '.agents/scripts/validate-budget.ps1')) {
      if (-not (Test-Path -LiteralPath $gate -PathType Leaf)) { Fail "requested gate is missing: $gate"; continue }
      & pwsh -NoProfile -File $gate
      if ($LASTEXITCODE -ne 0) { Fail "gate failed: $gate" }
    }
  } finally {
    Pop-Location
  }
}

if ($failures.Count -gt 0) {
  Write-Error "$($failures.Count) post-extraction Harness validation failure(s)"
  exit 1
}

Write-Host "[OK] Post-extraction Harness validation passed"
exit 0
