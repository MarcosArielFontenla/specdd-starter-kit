#Requires -Version 7.0
# rebaseline-source.ps1 — exact, human-gated acceptance of approved Brownfield content drift.

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("propose", "apply")]
  [string]$Mode,

  [string]$Root = ".",
  [string]$ManifestPath = "context/scaffold-manifest.json",
  [string]$ProposalPath = ".agents/evidence/source-baseline/proposal.json",
  [string[]]$Paths = @(),
  [string]$SubjectSha256 = ""
)

$ErrorActionPreference = "Stop"
$rootPath = (Resolve-Path -LiteralPath $Root).Path
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$ignoredDirs = @(
  "node_modules", ".git", "dist", "build", "out", "out-tsc", "coverage", "vendor",
  "venv", ".venv", "__pycache__", "bin", "obj", "target"
)
$ignoredPaths = @(
  "context/harness-validation-report.md",
  "context/harness-validation-report.json"
)

function Stop-Rebaseline([string]$Code, [string]$Message) {
  [Console]::Error.WriteLine("[$Code] $Message")
  exit 1
}

function Normalize-Relative([string]$Path) {
  return ($Path.Replace("\", "/") -replace "^\./", "").Trim()
}

function Canonical-Path([string]$Path) {
  return (Normalize-Relative $Path).ToLowerInvariant()
}

function Is-UnsafeRelative([string]$Path) {
  $normalized = Normalize-Relative $Path
  return [System.IO.Path]::IsPathRooted($Path) -or -not $normalized -or
    $normalized -eq ".." -or $normalized.StartsWith("../") -or $normalized.Contains("/../")
}

function Full-Path([string]$RelativePath) {
  if (Is-UnsafeRelative $RelativePath) {
    Stop-Rebaseline "REBASELINE_PATH_UNSAFE" "Path must remain relative to the project root: $RelativePath"
  }
  $candidate = [System.IO.Path]::GetFullPath((Join-Path $rootPath (Normalize-Relative $RelativePath)))
  $prefix = $rootPath.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
  $comparison = if ($IsWindows) { [StringComparison]::OrdinalIgnoreCase } else { [StringComparison]::Ordinal }
  if (-not $candidate.StartsWith($prefix, $comparison)) {
    Stop-Rebaseline "REBASELINE_PATH_ESCAPE" "Path escapes the project root: $RelativePath"
  }
  return $candidate
}

function Is-SourcePath([string]$Path) {
  $normalized = Normalize-Relative $Path
  if ($ignoredPaths -contains $normalized.ToLowerInvariant()) { return $false }
  foreach ($segment in ($normalized -split "/")) {
    $lower = $segment.ToLowerInvariant()
    if ($ignoredDirs -contains $lower) { return $false }
    if ($segment.StartsWith(".") -and $lower -ne ".github") { return $false }
  }
  return $true
}

function Get-SourceFiles([string]$Directory, [string]$Relative = "") {
  foreach ($entry in @(Get-ChildItem -LiteralPath $Directory -Force -ErrorAction Stop)) {
    if (($entry.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
    $candidate = if ($Relative) { "$Relative/$($entry.Name)" } else { $entry.Name }
    if ($entry.PSIsContainer) {
      if (-not (Is-SourcePath $candidate)) { continue }
      foreach ($child in (Get-SourceFiles -Directory $entry.FullName -Relative $candidate)) {
        Write-Output $child
      }
    } elseif (Is-SourcePath $candidate) {
      Write-Output (Canonical-Path $candidate)
    }
  }
}

function Fingerprint-Bytes([byte[]]$Bytes) {
  [uint32]$hash = 2166136261
  foreach ($byte in $Bytes) {
    $mixed = ([int64]$hash -bxor [int64]$byte) * 16777619
    $hash = [uint32]($mixed -band 0xFFFFFFFFL)
  }
  return $hash.ToString("x8")
}

function Fingerprint-Text([string]$Text) {
  return Fingerprint-Bytes ([System.Text.Encoding]::UTF8.GetBytes([string]($Text ?? "")))
}

function Fingerprint-File([string]$RelativePath) {
  $fullPath = Full-Path $RelativePath
  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
    Stop-Rebaseline "REBASELINE_FILE_MISSING" "Fingerprint target is missing: $RelativePath"
  }
  return Fingerprint-Bytes ([System.IO.File]::ReadAllBytes($fullPath))
}

function Get-Sha256Text([string]$Text) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  return [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}

function Get-Sha256File([string]$Path) {
  return [Convert]::ToHexString(
    [System.Security.Cryptography.SHA256]::HashData([System.IO.File]::ReadAllBytes($Path))
  ).ToLowerInvariant()
}

function Write-JsonAtomic([object]$Value, [string]$Path) {
  $directory = Split-Path -Parent $Path
  $null = New-Item -ItemType Directory -Path $directory -Force
  $temporary = "$Path.tmp-$PID-$([Guid]::NewGuid().ToString('N'))"
  try {
    [System.IO.File]::WriteAllText($temporary, (($Value | ConvertTo-Json -Depth 20) + "`n"), $utf8NoBom)
    Move-Item -LiteralPath $temporary -Destination $Path -Force
  } finally {
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
  }
}

function New-Subject(
  [string]$SubjectManifestPath,
  [string]$ManifestSha256,
  [string]$FingerprintAlgorithm,
  [int]$PathCount,
  [string]$PathFingerprint,
  [object[]]$Changes
) {
  $canonicalChanges = @($Changes | Sort-Object path | ForEach-Object {
    [ordered]@{
      path = Canonical-Path ([string]$_.path)
      beforeFingerprint = ([string]$_.beforeFingerprint).ToLowerInvariant()
      afterFingerprint = ([string]$_.afterFingerprint).ToLowerInvariant()
    }
  })
  return [ordered]@{
    schemaVersion = 1
    kind = "specdd.source-baseline-reapproval"
    manifestPath = Normalize-Relative $SubjectManifestPath
    manifestSha256 = $ManifestSha256.ToLowerInvariant()
    fingerprintAlgorithm = $FingerprintAlgorithm
    baseline = [ordered]@{
      pathCount = $PathCount
      pathFingerprint = $PathFingerprint.ToLowerInvariant()
    }
    changes = $canonicalChanges
  }
}

function Get-SubjectHash([object]$Subject) {
  return Get-Sha256Text ($Subject | ConvertTo-Json -Depth 20 -Compress)
}

function Read-Manifest([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    Stop-Rebaseline "REBASELINE_MANIFEST_MISSING" "Manifest not found: $ManifestPath"
  }
  try {
    $manifest = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  } catch {
    Stop-Rebaseline "REBASELINE_MANIFEST_INVALID" "Manifest is not valid JSON: $($_.Exception.Message)"
  }
  if ($manifest.fidelity.fingerprintAlgorithm -ne "fnv1a32-utf8" -or -not $manifest.fidelity.source) {
    Stop-Rebaseline "REBASELINE_MANIFEST_UNSUPPORTED" "A Brownfield schema-2 source baseline using fnv1a32-utf8 is required."
  }
  return $manifest
}

function Assert-PathInventory([object]$Manifest) {
  $Source = $Manifest.fidelity.source
  $current = @(Get-SourceFiles -Directory $rootPath | Sort-Object -Unique)
  $generated = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($path in @($Manifest.generatedFiles)) { $null = $generated.Add((Canonical-Path ([string]$path))) }
  $existingGenerated = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($path in @($Source.existingGeneratedPaths)) { $null = $existingGenerated.Add((Canonical-Path ([string]$path))) }
  $current = @($current | Where-Object {
    (-not $generated.Contains($_)) -or $existingGenerated.Contains($_)
  })
  $currentFingerprint = Fingerprint-Text ($current -join "`n")
  if ($current.Count -ne [int]$Source.pathCount -or $currentFingerprint -ne [string]$Source.pathFingerprint) {
    $detail = "Expected $($Source.pathCount) / $($Source.pathFingerprint); current $($current.Count) / $currentFingerprint."
    if ($Source.paths) {
      $expected = @($Source.paths | Where-Object { $_ } | ForEach-Object { Canonical-Path ([string]$_) } | Sort-Object -Unique)
      $difference = @(Compare-Object -ReferenceObject $expected -DifferenceObject $current)
      $added = @($difference | Where-Object SideIndicator -eq "=>" | ForEach-Object InputObject)
      $removed = @($difference | Where-Object SideIndicator -eq "<=" | ForEach-Object InputObject)
      $detail += " Added: $($added -join ', '); removed: $($removed -join ', ')."
    }
    Stop-Rebaseline "REBASELINE_PATH_DRIFT" "Content-only rebaseline rejects added or removed paths. $detail"
  }
}

$manifestFullPath = Full-Path $ManifestPath
$proposalFullPath = Full-Path $ProposalPath
$evidencePrefix = ".agents/evidence/source-baseline/"
if (-not (Canonical-Path $ProposalPath).StartsWith($evidencePrefix)) {
  Stop-Rebaseline "REBASELINE_EVIDENCE_PATH" "ProposalPath must remain under $evidencePrefix"
}
$evidenceDirectory = Split-Path -Parent $proposalFullPath
$null = New-Item -ItemType Directory -Path $evidenceDirectory -Force
$lockPath = Join-Path $evidenceDirectory "operation.lock"
$lock = $null

try {
  try {
    $lock = [System.IO.File]::Open($lockPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
  } catch {
    Stop-Rebaseline "REBASELINE_LOCKED" "Another rebaseline operation is active or left a stale lock: $lockPath"
  }

  $manifest = Read-Manifest $manifestFullPath
  $source = $manifest.fidelity.source
  Assert-PathInventory $manifest
  $fingerprintProperties = @($source.contentFingerprints.PSObject.Properties)
  $fingerprintByPath = @{}
  foreach ($property in $fingerprintProperties) {
    $fingerprintByPath[(Canonical-Path $property.Name)] = $property
  }

  if ($Mode -eq "propose") {
    if ($Paths.Count -eq 0) {
      Stop-Rebaseline "REBASELINE_PATHS_REQUIRED" "Propose requires at least one explicit -Paths entry."
    }
    if (Test-Path -LiteralPath $proposalFullPath) {
      Stop-Rebaseline "REBASELINE_PROPOSAL_EXISTS" "Proposal already exists; preserve or relocate it before creating another."
    }

    $allowed = @($Paths | ForEach-Object {
      if (Is-UnsafeRelative $_) { Stop-Rebaseline "REBASELINE_PATH_UNSAFE" "Invalid explicit path: $_" }
      Canonical-Path $_
    } | Sort-Object -Unique)
    $changes = [System.Collections.Generic.List[object]]::new()
    foreach ($property in $fingerprintProperties) {
      $canonical = Canonical-Path $property.Name
      $actual = Fingerprint-File $property.Name
      if ($actual -eq [string]$property.Value) { continue }
      if ($allowed -notcontains $canonical) {
        Stop-Rebaseline "REBASELINE_UNAPPROVED_DRIFT" "Drift exists outside the explicit allowlist: $($property.Name)"
      }
      $changes.Add([pscustomobject]@{
        path = $canonical
        beforeFingerprint = [string]$property.Value
        afterFingerprint = $actual
      })
    }
    foreach ($path in $allowed) {
      if (-not $fingerprintByPath.ContainsKey($path)) {
        Stop-Rebaseline "REBASELINE_PATH_NOT_FINGERPRINTED" "Explicit path was not content-fingerprinted during ingestion: $path"
      }
      if (-not ($changes | Where-Object path -eq $path)) {
        Stop-Rebaseline "REBASELINE_PATH_UNCHANGED" "Explicit path has no content drift: $path"
      }
    }

    $subject = New-Subject `
      -SubjectManifestPath $ManifestPath `
      -ManifestSha256 (Get-Sha256File $manifestFullPath) `
      -FingerprintAlgorithm ([string]$manifest.fidelity.fingerprintAlgorithm) `
      -PathCount ([int]$source.pathCount) `
      -PathFingerprint ([string]$source.pathFingerprint) `
      -Changes @($changes)
    $subjectSha256 = Get-SubjectHash $subject
    $proposal = [ordered]@{
      schemaVersion = 1
      state = "awaiting-approval"
      createdAtUtc = [DateTime]::UtcNow.ToString("o")
      subjectSha256 = $subjectSha256
      subject = $subject
      approvalNotice = "The hash identifies the exact subject; it does not authenticate the approver. Apply requires the separately supplied exact hash."
    }
    Write-JsonAtomic $proposal $proposalFullPath
    Write-Output "[STATUS] AWAITING_APPROVAL"
    Write-Output "[SUBJECT] $subjectSha256"
    Write-Output "[PROPOSAL] $(Normalize-Relative $ProposalPath)"
    exit 0
  }

  if ($SubjectSha256 -notmatch "^[a-f0-9]{64}$") {
    Stop-Rebaseline "REBASELINE_SUBJECT_REQUIRED" "Apply requires the exact lowercase SHA-256 subject."
  }
  if (-not (Test-Path -LiteralPath $proposalFullPath -PathType Leaf)) {
    Stop-Rebaseline "REBASELINE_PROPOSAL_MISSING" "Proposal not found: $ProposalPath"
  }
  try {
    $proposal = Get-Content -LiteralPath $proposalFullPath -Raw | ConvertFrom-Json
  } catch {
    Stop-Rebaseline "REBASELINE_PROPOSAL_INVALID" "Proposal is not valid JSON: $($_.Exception.Message)"
  }
  if ($proposal.state -ne "awaiting-approval") {
    Stop-Rebaseline "REBASELINE_PROPOSAL_STATE" "Proposal is not awaiting approval."
  }
  $subject = New-Subject `
    -SubjectManifestPath ([string]$proposal.subject.manifestPath) `
    -ManifestSha256 ([string]$proposal.subject.manifestSha256) `
    -FingerprintAlgorithm ([string]$proposal.subject.fingerprintAlgorithm) `
    -PathCount ([int]$proposal.subject.baseline.pathCount) `
    -PathFingerprint ([string]$proposal.subject.baseline.pathFingerprint) `
    -Changes @($proposal.subject.changes)
  $actualSubjectSha256 = Get-SubjectHash $subject
  if ($actualSubjectSha256 -ne [string]$proposal.subjectSha256 -or $actualSubjectSha256 -ne $SubjectSha256) {
    Stop-Rebaseline "REBASELINE_SUBJECT_MISMATCH" "Approval does not match the exact proposal subject."
  }
  $receiptDirectory = Join-Path $evidenceDirectory "receipts"
  $receiptPath = Join-Path $receiptDirectory "$SubjectSha256.json"
  if (Test-Path -LiteralPath $receiptPath) {
    Stop-Rebaseline "REBASELINE_REPLAY" "This exact subject already has an application receipt."
  }
  if ((Get-Sha256File $manifestFullPath) -ne [string]$subject.manifestSha256) {
    Stop-Rebaseline "REBASELINE_MANIFEST_DRIFT" "The manifest changed after proposal creation."
  }

  $changeByPath = @{}
  foreach ($change in @($subject.changes)) { $changeByPath[(Canonical-Path $change.path)] = $change }
  foreach ($property in $fingerprintProperties) {
    $canonical = Canonical-Path $property.Name
    $actual = Fingerprint-File $property.Name
    if ($changeByPath.ContainsKey($canonical)) {
      $change = $changeByPath[$canonical]
      if ([string]$property.Value -ne [string]$change.beforeFingerprint -or $actual -ne [string]$change.afterFingerprint) {
        Stop-Rebaseline "REBASELINE_TOCTOU" "Approved file changed after proposal creation: $canonical"
      }
    } elseif ($actual -ne [string]$property.Value) {
      Stop-Rebaseline "REBASELINE_UNAPPROVED_DRIFT" "Additional drift appeared after proposal creation: $canonical"
    }
  }

  $beforeManifest = Get-Content -LiteralPath $manifestFullPath -Raw
  foreach ($change in @($subject.changes)) {
    $fingerprintByPath[(Canonical-Path $change.path)].Value = [string]$change.afterFingerprint
  }
  Write-JsonAtomic $manifest $manifestFullPath

  # Verify the approved source state again after the atomic manifest replacement.
  Assert-PathInventory $manifest
  foreach ($change in @($subject.changes)) {
    if ((Fingerprint-File $change.path) -ne [string]$change.afterFingerprint) {
      [System.IO.File]::WriteAllText($manifestFullPath, $beforeManifest, $utf8NoBom)
      Stop-Rebaseline "REBASELINE_TOCTOU" "Source changed while applying the approved baseline; manifest was restored."
    }
  }

  $receipt = [ordered]@{
    schemaVersion = 1
    kind = "specdd.source-baseline-reapproval-receipt"
    appliedAtUtc = [DateTime]::UtcNow.ToString("o")
    subjectSha256 = $SubjectSha256
    beforeManifestSha256 = [string]$subject.manifestSha256
    afterManifestSha256 = Get-Sha256File $manifestFullPath
    changes = @($subject.changes)
    approvalEvidence = "Caller supplied the exact approved subject hash; approver identity is not authenticated by this local script."
  }
  Write-JsonAtomic $receipt $receiptPath
  Write-Output "[STATUS] APPLIED"
  Write-Output "[SUBJECT] $SubjectSha256"
  Write-Output "[RECEIPT] $([System.IO.Path]::GetRelativePath($rootPath, $receiptPath).Replace('\', '/'))"
  exit 0
} finally {
  if ($lock) { $lock.Dispose() }
  if (Test-Path -LiteralPath $lockPath) { Remove-Item -LiteralPath $lockPath -Force }
}
