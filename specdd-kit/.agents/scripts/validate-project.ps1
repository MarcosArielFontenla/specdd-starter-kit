#Requires -Version 7.0
# validate-project.ps1 — single post-extraction verification run.
#
# Exit codes:
#   0 = VERIFIED  (all configured checks pass and the scaffold matches its baseline)
#   1 = FAILED    (a structural, integrity or declared check failed)
#   2 = PARTIAL   (the scaffold is usable, but evidence or checks are incomplete)
#
# The script writes context/harness-validation-report.{md,json}. Those report paths
# are excluded from the Brownfield source fingerprint so rerunning this command is
# idempotent from a fidelity perspective.

[CmdletBinding()]
param(
  [string]$Root = ".",
  [string]$ManifestPath = "context/scaffold-manifest.json",
  [string]$ProjectChecksPath = "context/project-validation.json",
  [string]$ReportPath = "context/harness-validation-report.md",
  [string]$JsonReportPath = "context/harness-validation-report.json"
)

$ErrorActionPreference = "Stop"
$rootPath = (Resolve-Path -LiteralPath $Root).Path
$startedAt = [DateTime]::UtcNow
$results = [System.Collections.Generic.List[object]]::new()
$scanWarnings = [System.Collections.Generic.List[string]]::new()

$ignoredDirs = @(
  "node_modules", ".git", "dist", "build", "out", "coverage", "vendor",
  "venv", ".venv", "__pycache__", "bin", "obj", "target"
)
$ignoredPaths = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$null = $ignoredPaths.Add("context/harness-validation-report.md")
$null = $ignoredPaths.Add("context/harness-validation-report.json")

function Normalize-Relative([string]$Path) {
  return ($Path.Replace("\", "/") -replace "^\./", "")
}

function Canonical-Path([string]$Path) {
  return (Normalize-Relative $Path).ToLowerInvariant()
}

function Is-UnsafeRelative([string]$Path) {
  $normalized = Normalize-Relative $Path
  return [System.IO.Path]::IsPathRooted($Path) -or $normalized -eq ".." -or $normalized.StartsWith("../") -or $normalized.Contains("/../")
}

function Full-Path([string]$RelativePath) {
  return Join-Path $rootPath (Normalize-Relative $RelativePath)
}

function Add-Result(
  [string]$Id,
  [string]$Label,
  [ValidateSet("PASS", "FAIL", "PARTIAL", "SKIP")][string]$Status,
  [string]$Details,
  [string[]]$Evidence = @(),
  [string]$Output = ""
) {
  $results.Add([pscustomobject]@{
    id = $Id
    label = $Label
    status = $Status
    details = $Details
    evidence = @($Evidence)
    output = $Output
  })
}

function Limit-Output([string]$Output, [int]$MaxLength = 12000) {
  $value = [string]($Output ?? "")
  if ($value.Length -le $MaxLength) { return $value }
  return $value.Substring(0, $MaxLength) + "`n... output truncated by validate-project.ps1 ..."
}

function Fingerprint-Text([string]$Text) {
  # FNV-1a over UTF-8 bytes. The generator uses the same 32-bit algorithm.
  [uint32]$hash = 2166136261
  foreach ($byte in [System.Text.Encoding]::UTF8.GetBytes([string]($Text ?? ""))) {
    $mixed = ([int64]$hash -bxor [int64]$byte) * 16777619
    $hash = [uint32]($mixed -band 0xFFFFFFFFL)
  }
  return $hash.ToString("x8")
}

function Is-SourcePath([string]$Path) {
  $normalized = Normalize-Relative $Path
  if ($ignoredPaths.Contains($normalized)) { return $false }
  foreach ($segment in ($normalized -split "/")) {
    $lower = $segment.ToLowerInvariant()
    if ($ignoredDirs -contains $lower) { return $false }
    if ($segment.StartsWith(".") -and $lower -ne ".github") { return $false }
  }
  return $true
}

function Get-SourceFiles([string]$Directory, [string]$Relative = "") {
  try {
    $entries = @(Get-ChildItem -LiteralPath $Directory -Force -ErrorAction Stop)
  } catch {
    $scanWarnings.Add("Could not read '$Directory': $($_.Exception.Message)")
    return
  }

  foreach ($entry in $entries) {
    # Do not follow junctions/symlinks while calculating a baseline.
    if (($entry.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
    $candidate = if ($Relative) { "$Relative/$($entry.Name)" } else { $entry.Name }
    if ($entry.PSIsContainer) {
      if (-not (Is-SourcePath $candidate)) { continue }
      foreach ($child in (Get-SourceFiles -Directory $entry.FullName -Relative $candidate)) {
        Write-Output $child
      }
    } elseif (Is-SourcePath $candidate) {
      Write-Output (Normalize-Relative $candidate)
    }
  }
}

function Invoke-ExternalStage(
  [string]$Id,
  [string]$Label,
  [string]$ScriptPath,
  [string[]]$Arguments = @()
) {
  if (-not (Test-Path -LiteralPath $ScriptPath -PathType Leaf)) {
    Add-Result $Id $Label "FAIL" "Required validator is missing: $ScriptPath"
    return
  }

  $outputLines = @()
  $exitCode = 1
  Push-Location $rootPath
  try {
    $outputLines = @(& pwsh -NoProfile -File $ScriptPath @Arguments 2>&1)
    $exitCode = [int]$LASTEXITCODE
  } catch {
    $outputLines += $_.Exception.Message
    $exitCode = 1
  } finally {
    Pop-Location
  }
  $output = Limit-Output ((($outputLines | ForEach-Object { $_.ToString() }) -join "`n").Trim())
  $status = if ($exitCode -eq 0) { "PASS" } else { "FAIL" }
  $details = if ($exitCode -eq 0) { "Validator exited 0." } else { "Validator exited $exitCode." }
  Add-Result $Id $Label $status $details @() $output
}

function Invoke-DeclaredCheck([string]$Id, [string]$Command, [int]$ExpectedExitCode) {
  $outputLines = @()
  $exitCode = 1
  Push-Location $rootPath
  try {
    $outputLines = @(& pwsh -NoProfile -Command $Command 2>&1)
    $exitCode = [int]$LASTEXITCODE
  } catch {
    $outputLines += $_.Exception.Message
    $exitCode = 1
  } finally {
    Pop-Location
  }
  $output = Limit-Output ((($outputLines | ForEach-Object { $_.ToString() }) -join "`n").Trim())
  $status = if ($exitCode -eq $ExpectedExitCode) { "PASS" } else { "FAIL" }
  $details = "Exit $exitCode; expected $ExpectedExitCode."
  return [pscustomobject]@{ id = $Id; status = $status; details = $details; output = $output }
}

function Read-Manifest {
  if (Is-UnsafeRelative $ManifestPath) {
    Add-Result "manifest" "Manifest" "FAIL" "Manifest path must remain relative to the project root: $ManifestPath"
    return $null
  }
  $path = Full-Path $ManifestPath
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    Add-Result "manifest" "Manifest" "FAIL" "Manifest not found: $ManifestPath"
    return $null
  }
  try {
    return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  } catch {
    Add-Result "manifest" "Manifest" "FAIL" "Manifest is not valid JSON: $($_.Exception.Message)"
    return $null
  }
}

function Test-GeneratedIntegrity($Manifest) {
  $fidelity = $Manifest.fidelity
  if (-not $fidelity -or $fidelity.fingerprintAlgorithm -ne "fnv1a32-utf8") {
    Add-Result "integrity" "Generated-file integrity" "PARTIAL" "This scaffold has no supported generated-file fingerprint metadata; regenerate it with the current wizard."
    return
  }

  $generated = @($Manifest.generatedFiles | ForEach-Object { Normalize-Relative ([string]$_) })
  $mutable = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($path in @($fidelity.mutableFiles)) { $null = $mutable.Add((Normalize-Relative ([string]$path))) }
  $hashProperties = @($fidelity.generatedFiles.PSObject.Properties)
  $hashByPath = @{}
  foreach ($property in $hashProperties) { $hashByPath[(Normalize-Relative $property.Name)] = [string]$property.Value }

  $failures = [System.Collections.Generic.List[string]]::new()
  foreach ($path in $generated) {
    if ($path -eq (Normalize-Relative $ManifestPath) -or $mutable.Contains($path)) { continue } # self-hash is circular; mutable files are expected to evolve
    if (-not $hashByPath.ContainsKey($path)) {
      $failures.Add("missing fingerprint for generated file: $path")
      continue
    }
    if (-not (Test-Path -LiteralPath (Full-Path $path) -PathType Leaf)) {
      $failures.Add("missing generated file: $path")
      continue
    }
    $actual = Fingerprint-Text (Get-Content -LiteralPath (Full-Path $path) -Raw)
    if ($actual -ne $hashByPath[$path]) {
      $failures.Add("content fingerprint mismatch: $path (expected $($hashByPath[$path]), got $actual)")
    }
  }
  foreach ($path in $hashByPath.Keys) {
    if ($generated -notcontains $path) { $failures.Add("fingerprint lists a non-generated file: $path") }
  }

  if ($failures.Count) {
    Add-Result "integrity" "Generated-file integrity" "FAIL" "$($failures.Count) generated-file integrity issue(s)." $failures
  } else {
    Add-Result "integrity" "Generated-file integrity" "PASS" "All generated files match the manifest fingerprints (manifest self-hash is intentionally excluded)." @("Algorithm: fnv1a32-utf8")
  }
}

function Test-SourceFidelity($Manifest) {
  if ([string]$Manifest.scenario -ne "brownfield") {
    Add-Result "source-baseline" "Brownfield source baseline" "PASS" "Not applicable to a Greenfield scaffold."
    return
  }

  $source = $Manifest.fidelity.source
  if (-not $source -or $null -eq $source.pathCount -or -not $source.pathFingerprint) {
    Add-Result "source-baseline" "Brownfield source baseline" "PARTIAL" "The scaffold has no complete source path baseline; exact post-extraction fidelity cannot be verified."
    return
  }

  $generated = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($path in @($Manifest.generatedFiles)) { $null = $generated.Add((Canonical-Path ([string]$path))) }
  $existingGenerated = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($path in @($source.existingGeneratedPaths)) { $null = $existingGenerated.Add((Canonical-Path ([string]$path))) }

  $current = @(Get-SourceFiles -Directory $rootPath | ForEach-Object { Canonical-Path $_ } | Sort-Object -Unique)
  $current = @($current | Where-Object {
    (-not $generated.Contains($_)) -or $existingGenerated.Contains($_)
  })
  $currentCount = $current.Count
  $currentFingerprint = Fingerprint-Text ($current -join "`n")
  $expectedCount = [int]$source.pathCount
  $expectedFingerprint = [string]$source.pathFingerprint
  $contentFailures = [System.Collections.Generic.List[string]]::new()
  foreach ($property in @($source.contentFingerprints.PSObject.Properties)) {
    $path = Normalize-Relative $property.Name
    $canonical = Canonical-Path $path
    # A source manifest that was intentionally regenerated by the Harness is
    # represented in the path baseline but cannot retain its old content hash.
    if ($generated.Contains($canonical) -and $existingGenerated.Contains($canonical)) { continue }
    if (-not (Test-Path -LiteralPath (Full-Path $path) -PathType Leaf)) {
      $contentFailures.Add("source file used for analysis is missing: $path")
      continue
    }
    $actual = Fingerprint-Text (Get-Content -LiteralPath (Full-Path $path) -Raw)
    if ($actual -ne [string]$property.Value) {
      $contentFailures.Add("source content fingerprint mismatch: $path (expected $($property.Value), got $actual)")
    }
  }

  $evidence = @(
    "Expected source paths: $expectedCount / $expectedFingerprint",
    "Current source paths: $currentCount / $currentFingerprint"
  )
  if ($contentFailures.Count) { $evidence += $contentFailures }
  if ($source.analysisTruncated -eq $true) { $evidence += "The browser analysis was truncated at its scan cap." }
  if ($scanWarnings.Count) { $evidence += $scanWarnings }

  if ($currentCount -eq $expectedCount -and $currentFingerprint -eq $expectedFingerprint -and $scanWarnings.Count -eq 0 -and $contentFailures.Count -eq 0) {
    Add-Result "source-baseline" "Brownfield source baseline" "PASS" "The extracted project has the same source path inventory recorded during ingestion." $evidence
  } else {
    $detail = "The current source path inventory differs from the ingestion baseline. This means the run cannot claim exact post-extraction fidelity; inspect the report before proceeding."
    Add-Result "source-baseline" "Brownfield source baseline" "PARTIAL" $detail $evidence
  }
}

function Test-ContextReadiness($Manifest) {
  $issues = [System.Collections.Generic.List[string]]::new()
  if ([string]$Manifest.scenario -eq "brownfield") {
    if (-not $Manifest.contextReview -or $Manifest.contextReview.approved -ne $true) {
      $issues.Add("human context review is not approved")
    }
    if ($Manifest.fidelity.source.analysisTruncated -eq $true) {
      $issues.Add("analysis was truncated")
    }
  }

  $reviewStatuses = $Manifest.contextReview.statuses
  if ($reviewStatuses) {
    foreach ($group in $reviewStatuses.PSObject.Properties) {
      foreach ($item in @($group.Value)) {
        if ($item.selected -eq $true -and [string]$item.status -eq "unknown") {
          $issues.Add("selected $($group.Name) context item '$($item.value)' remains unknown")
        }
      }
    }
  }

  $placeholderSpecs = @()
  $specDir = Full-Path ".agents/specs"
  if (Test-Path -LiteralPath $specDir -PathType Container) {
    $placeholderSpecs = @(Get-ChildItem -LiteralPath $specDir -Recurse -Filter "*.spec.yaml" -ErrorAction SilentlyContinue |
      Where-Object { (Get-Content -LiteralPath $_.FullName -Raw) -match "(?im)^\s*status:\s*placeholder\s*$|command:\s*placeholder" } |
      ForEach-Object { Normalize-Relative ([System.IO.Path]::GetRelativePath($rootPath, $_.FullName)) })
  }
  if ($placeholderSpecs.Count) {
    $issues.Add("$($placeholderSpecs.Count) entity spec(s) still contain placeholder contracts")
  }

  $skipped = @($Manifest.skippedPaths)
  $replaced = @($Manifest.replacedPaths)
  $evidence = @("Recorded collisions: $($skipped.Count)", "Recorded harness replacements: $($replaced.Count)")
  if ($issues.Count -eq 0) {
    Add-Result "context" "Context and contract readiness" "PASS" "Approved context is classified and selected contracts are ready." $evidence
  } else {
    Add-Result "context" "Context and contract readiness" "PARTIAL" ($issues -join "; ") $evidence
  }
}

function Test-ProjectChecks {
  if (Is-UnsafeRelative $ProjectChecksPath) {
    Add-Result "project-checks" "Declared project checks" "FAIL" "Project checks path must remain relative to the project root: $ProjectChecksPath"
    return
  }
  $path = Full-Path $ProjectChecksPath
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    Add-Result "project-checks" "Declared project checks" "PARTIAL" "No $ProjectChecksPath exists. Add explicit test/build/lint commands there when the project is ready; spec acceptance checks are still executed separately."
    return
  }
  try {
    $config = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  } catch {
    Add-Result "project-checks" "Declared project checks" "FAIL" "Invalid JSON in ${ProjectChecksPath}: $($_.Exception.Message)"
    return
  }
  $checks = @($config.checks)
  if ($checks.Count -eq 0) {
    Add-Result "project-checks" "Declared project checks" "PARTIAL" "The project-checks file is present but contains no executable checks."
    return
  }

  $failures = [System.Collections.Generic.List[string]]::new()
  $ran = [System.Collections.Generic.List[string]]::new()
  foreach ($check in $checks) {
    $id = [string]$check.id
    $command = [string]$check.command
    if (-not $id -or -not $command -or $command -eq "placeholder") {
      $failures.Add("check must have a non-placeholder id and command")
      continue
    }
    $expected = if ($null -eq $check.expectedExitCode) { 0 } else { [int]$check.expectedExitCode }
    $outcome = Invoke-DeclaredCheck $id $command $expected
    $ran.Add("${id}: $($outcome.details)")
    if ($outcome.status -eq "FAIL") {
      $failures.Add("${id}: $($outcome.details)`n$($outcome.output)")
    }
  }
  if ($failures.Count) {
    Add-Result "project-checks" "Declared project checks" "FAIL" "$($failures.Count) declared project check(s) failed or were invalid." ($ran + $failures)
  } else {
    Add-Result "project-checks" "Declared project checks" "PASS" "All $($ran.Count) declared project check(s) passed." $ran
  }
}

$manifest = Read-Manifest
$manifestRelative = Normalize-Relative $ManifestPath
$harnessScript = Join-Path $rootPath ".agents/scripts/validate-harness.ps1"
$specScript = Join-Path $rootPath ".agents/scripts/validate-spec.ps1"
$budgetScript = Join-Path $rootPath ".agents/scripts/validate-budget.ps1"

Invoke-ExternalStage "structure" "Harness structure and references" $harnessScript @("-Root", $rootPath, "-ManifestPath", $manifestRelative)

if (Get-Module -ListAvailable -Name powershell-yaml) {
  Invoke-ExternalStage "spec" "Specs and executable acceptance checks" $specScript @("-SpecsDir", ".agents/specs", "-Run")
  Invoke-ExternalStage "budget" "Context budget" $budgetScript @("-ManifestPath", ".agents/cold-start/budget-manifest.yaml", "-PrimerPath", "AGENTS.md")
} else {
  $message = "powershell-yaml is not installed; install it with Install-Module powershell-yaml -Scope CurrentUser to run YAML-backed gates."
  Add-Result "spec" "Specs and executable acceptance checks" "PARTIAL" $message
  Add-Result "budget" "Context budget" "PARTIAL" $message
}

if ($manifest) {
  Test-GeneratedIntegrity $manifest
  Test-SourceFidelity $manifest
  Test-ContextReadiness $manifest
  Test-ProjectChecks
}

$hasFailures = @($results | Where-Object { $_.status -eq "FAIL" }).Count -gt 0
$hasPartial = @($results | Where-Object { $_.status -in @("PARTIAL", "SKIP") }).Count -gt 0
$overall = if ($hasFailures) { "FAILED" } elseif ($hasPartial) { "PARTIAL" } else { "VERIFIED" }
$finishedAt = [DateTime]::UtcNow

$nextActions = [System.Collections.Generic.List[string]]::new()
if ($hasFailures) { $nextActions.Add("Resolve every FAILED stage before treating the extraction as valid.") }
if ($hasPartial) { $nextActions.Add("Complete the PARTIAL stages (install powershell-yaml, replace placeholder specs, approve unknown context, or declare project checks) before claiming VERIFIED.") }
if (-not $hasFailures -and -not $hasPartial) { $nextActions.Add("The scaffold is structurally valid and all configured evidence passed. Keep this report with the extraction audit.") }

$reportObject = [ordered]@{
  schemaVersion = 1
  status = $overall
  verified = ($overall -eq "VERIFIED")
  startedAt = $startedAt.ToString("o")
  finishedAt = $finishedAt.ToString("o")
  root = $rootPath
  manifestPath = $manifestRelative
  results = @($results | ForEach-Object {
    [ordered]@{
      id = $_.id
      label = $_.label
      status = $_.status
      details = $_.details
      evidence = @($_.evidence)
      output = $_.output
    }
  })
  nextActions = @($nextActions)
}

function Markdown-Cell([string]$Value) {
  return ([string]($Value ?? "")).Replace("|", "\|").Replace("`r", " ").Replace("`n", " ")
}

$markdown = @(
  "# Harness Validation Report"
  ""
  "- **Status:** $overall"
  "- **Generated:** $($finishedAt.ToString("yyyy-MM-dd HH:mm:ss")) UTC"
  "- **Root:** ``$rootPath``"
  "- **Manifest:** ``$manifestRelative``"
  ""
  "## Summary"
  ""
  "| Stage | Status | Details |"
  "|---|---|---|"
)
foreach ($result in $results) {
  $markdown += "| $(Markdown-Cell $result.label) | **$($result.status)** | $(Markdown-Cell $result.details) |"
}
$markdown += @("", "## Evidence", "")
foreach ($result in $results) {
  $markdown += "### $($result.label) — $($result.status)"
  if (@($result.evidence).Count) {
    foreach ($evidence in @($result.evidence)) { $markdown += "- $(Markdown-Cell $evidence)" }
  }
  if ($result.output) {
    $markdown += "", '```text', $result.output, '```'
  }
  $markdown += ""
}
$markdown += @("## Next actions", "")
foreach ($action in $nextActions) { $markdown += "- $action" }
$markdownText = $markdown -join "`n"

try {
  foreach ($outputPath in @($ReportPath, $JsonReportPath)) {
    if (Is-UnsafeRelative $outputPath) { throw "Report path must remain relative to the project root: $outputPath" }
    $parent = Split-Path -Parent (Full-Path $outputPath)
    if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  }
  Set-Content -LiteralPath (Full-Path $JsonReportPath) -Value ($reportObject | ConvertTo-Json -Depth 8) -Encoding utf8
  Set-Content -LiteralPath (Full-Path $ReportPath) -Value $markdownText -Encoding utf8
} catch {
  Write-Error "Could not write validation reports: $($_.Exception.Message)"
  exit 1
}

Write-Host "[STATUS] $overall"
Write-Host "[REPORT] $ReportPath"
Write-Host "[REPORT] $JsonReportPath"
if ($overall -eq "FAILED") { exit 1 }
if ($overall -eq "PARTIAL") { exit 2 }
exit 0
