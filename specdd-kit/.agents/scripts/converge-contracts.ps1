#Requires -Version 7.0
# converge-contracts.ps1 — human-gated Brownfield entity-contract convergence.

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("propose", "apply")]
  [string]$Mode,

  [string]$Root = ".",
  [string]$ProjectDefinitionPath = "context/project-definition.json",
  [string]$ProposalPath = ".agents/evidence/entity-contracts/proposal.json",
  [string[]]$CandidatePaths = @(),
  [string]$SubjectSha256 = "",
  [string]$ReviewedBy = ""
)

$ErrorActionPreference = "Stop"
$rootPath = (Resolve-Path -LiteralPath $Root).Path
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$candidatePrefix = ".agents/evidence/entity-contracts/candidates/"
$evidencePrefix = ".agents/evidence/entity-contracts/"
$specPrefix = ".agents/specs/"

function Stop-Convergence([string]$Code, [string]$Message) {
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
    Stop-Convergence "CONTRACT_PATH_UNSAFE" "Path must remain relative to the project root: $RelativePath"
  }
  $candidate = [System.IO.Path]::GetFullPath((Join-Path $rootPath (Normalize-Relative $RelativePath)))
  $prefix = $rootPath.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
  $comparison = if ($IsWindows) { [StringComparison]::OrdinalIgnoreCase } else { [StringComparison]::Ordinal }
  if (-not $candidate.StartsWith($prefix, $comparison)) {
    Stop-Convergence "CONTRACT_PATH_ESCAPE" "Path escapes the project root: $RelativePath"
  }
  $cursor = $candidate
  while ($cursor -and -not $cursor.Equals($rootPath, $comparison)) {
    if (Test-Path -LiteralPath $cursor) {
      try { $item = Get-Item -LiteralPath $cursor -Force -ErrorAction Stop }
      catch { Stop-Convergence "CONTRACT_PATH_INSPECTION" "Cannot safely inspect path ${RelativePath}: $($_.Exception.Message)" }
      if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        Stop-Convergence "CONTRACT_REPARSE_POINT" "Authorized paths cannot traverse symlinks or junctions: $RelativePath"
      }
    }
    $parent = [System.IO.Path]::GetDirectoryName($cursor)
    if (-not $parent -or $parent -eq $cursor) { break }
    $cursor = $parent
  }
  return $candidate
}

function Get-Sha256Text([string]$Text) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  return [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}

function Get-Sha256File([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    Stop-Convergence "CONTRACT_FILE_MISSING" "Required file is missing: $Path"
  }
  return [Convert]::ToHexString(
    [System.Security.Cryptography.SHA256]::HashData([System.IO.File]::ReadAllBytes($Path))
  ).ToLowerInvariant()
}

function Read-Json([string]$Path, [string]$Code) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    Stop-Convergence $Code "JSON file is missing: $Path"
  }
  try {
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  } catch {
    Stop-Convergence $Code "Invalid JSON in ${Path}: $($_.Exception.Message)"
  }
}

function Write-TextAtomic([string]$Text, [string]$Path) {
  $directory = Split-Path -Parent $Path
  $null = New-Item -ItemType Directory -Path $directory -Force
  $temporary = "$Path.tmp-$PID-$([Guid]::NewGuid().ToString('N'))"
  try {
    [System.IO.File]::WriteAllText($temporary, $Text, $utf8NoBom)
    Move-Item -LiteralPath $temporary -Destination $Path -Force
  } finally {
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
  }
}

function Write-JsonAtomic([object]$Value, [string]$Path) {
  Write-TextAtomic (($Value | ConvertTo-Json -Depth 40) + "`n") $Path
}

function Quote-Yaml([object]$Value) {
  return ([string]($Value ?? "") | ConvertTo-Json -Compress)
}

function Require-String([object]$Value, [string]$Field, [string]$CandidatePath) {
  if (-not $Value -or -not ([string]$Value).Trim()) {
    Stop-Convergence "CONTRACT_CANDIDATE_INVALID" "Candidate $CandidatePath requires a non-empty $Field."
  }
  return ([string]$Value).Trim()
}

function Assert-NoDraftMarker([string]$Value, [string]$Field, [string]$CandidatePath) {
  if ($Value -match "(?i)\bplaceholder\b|\bTODO\b|REPLACE_WITH_|\[NEEDS CLARIFICATION") {
    Stop-Convergence "CONTRACT_DRAFT_MARKER" "Candidate $CandidatePath contains an unresolved marker in $Field."
  }
}

function Read-Candidate([string]$RelativePath) {
  if (Is-UnsafeRelative $RelativePath) {
    Stop-Convergence "CONTRACT_PATH_UNSAFE" "Invalid candidate path: $RelativePath"
  }
  $canonicalCandidatePath = Canonical-Path $RelativePath
  if (-not $canonicalCandidatePath.StartsWith($candidatePrefix) -or -not $canonicalCandidatePath.EndsWith(".json")) {
    Stop-Convergence "CONTRACT_CANDIDATE_PATH" "Candidates must be JSON files under $candidatePrefix"
  }
  $fullPath = Full-Path $RelativePath
  $candidate = Read-Json $fullPath "CONTRACT_CANDIDATE_INVALID"
  if ([int]$candidate.schemaVersion -ne 1 -or [string]$candidate.kind -ne "specdd.entity-contract-candidate") {
    Stop-Convergence "CONTRACT_CANDIDATE_INVALID" "Candidate $RelativePath must use schemaVersion 1 and kind specdd.entity-contract-candidate."
  }

  $entity = Require-String $candidate.entity "entity" $RelativePath
  $targetPath = Normalize-Relative (Require-String $candidate.targetPath "targetPath" $RelativePath)
  $canonicalTargetPath = Canonical-Path $targetPath
  if ((Is-UnsafeRelative $targetPath) -or -not $canonicalTargetPath.StartsWith($specPrefix) -or -not $canonicalTargetPath.EndsWith(".spec.yaml") -or $canonicalTargetPath.StartsWith(".agents/specs/tasks/")) {
    Stop-Convergence "CONTRACT_TARGET_PATH" "Candidate $RelativePath targets an unauthorized path: $targetPath"
  }
  $description = Require-String $candidate.description "description" $RelativePath
  Assert-NoDraftMarker $description "description" $RelativePath

  $evidence = @($candidate.evidence)
  if ($evidence.Count -eq 0) {
    Stop-Convergence "CONTRACT_EVIDENCE_REQUIRED" "Candidate $RelativePath requires at least one repository evidence path."
  }
  $normalizedEvidence = @($evidence | ForEach-Object {
    $path = Normalize-Relative (Require-String $_ "evidence[]" $RelativePath)
    if (Is-UnsafeRelative $path) { Stop-Convergence "CONTRACT_EVIDENCE_PATH" "Unsafe evidence path in ${RelativePath}: $path" }
    if (-not (Test-Path -LiteralPath (Full-Path $path))) { Stop-Convergence "CONTRACT_EVIDENCE_MISSING" "Evidence does not exist for ${RelativePath}: $path" }
    $path
  } | Sort-Object -Unique)

  $requirements = @($candidate.requirements)
  if ($requirements.Count -eq 0) {
    Stop-Convergence "CONTRACT_REQUIREMENTS_REQUIRED" "Candidate $RelativePath requires at least one requirement."
  }
  $requirementIds = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  $normalizedRequirements = @($requirements | ForEach-Object {
    $id = Require-String $_.id "requirements[].id" $RelativePath
    $text = Require-String ($_.text ?? $_.description) "requirements[].text" $RelativePath
    Assert-NoDraftMarker $text "requirements[].text" $RelativePath
    if (-not $requirementIds.Add($id)) { Stop-Convergence "CONTRACT_REQUIREMENT_DUPLICATE" "Duplicate requirement id '$id' in $RelativePath." }
    [ordered]@{ id = $id; text = $text }
  })

  $rawChecks = if ($candidate.acceptanceChecks) { @($candidate.acceptanceChecks) } elseif ($candidate.acceptanceCheck) { @($candidate.acceptanceCheck) } else { @() }
  $waiver = $candidate.checksWaiver
  if ($rawChecks.Count -eq 0 -and -not $waiver) {
    Stop-Convergence "CONTRACT_CHECKS_REQUIRED" "Candidate $RelativePath requires acceptanceChecks or a reasoned checksWaiver."
  }
  $checkIds = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  $normalizedChecks = @($rawChecks | ForEach-Object {
    $id = Require-String $_.id "acceptanceChecks[].id" $RelativePath
    $checkDescription = Require-String $_.description "acceptanceChecks[].description" $RelativePath
    $command = Require-String $_.command "acceptanceChecks[].command" $RelativePath
    Assert-NoDraftMarker $checkDescription "acceptanceChecks[].description" $RelativePath
    Assert-NoDraftMarker $command "acceptanceChecks[].command" $RelativePath
    if (-not $checkIds.Add($id)) { Stop-Convergence "CONTRACT_CHECK_DUPLICATE" "Duplicate acceptance check id '$id' in $RelativePath." }
    $expected = if ($null -eq $_.expectedExitCode) { 0 } else { [int]$_.expectedExitCode }
    [ordered]@{ id = $id; description = $checkDescription; command = $command; expectedExitCode = $expected }
  })
  $normalizedWaiver = $null
  if ($waiver) {
    if ($rawChecks.Count -gt 0) { Stop-Convergence "CONTRACT_WAIVER_WITH_CHECKS" "Candidate $RelativePath cannot declare both checks and a waiver." }
    $waiverReason = Require-String $waiver.reason "checksWaiver.reason" $RelativePath
    Assert-NoDraftMarker $waiverReason "checksWaiver.reason" $RelativePath
    $normalizedWaiver = [ordered]@{ reason = $waiverReason }
  }

  return [pscustomobject]@{
    candidatePath = Normalize-Relative $RelativePath
    candidateFullPath = $fullPath
    candidateSha256 = Get-Sha256File $fullPath
    entity = $entity
    targetPath = $targetPath
    targetFullPath = Full-Path $targetPath
    description = $description
    evidence = $normalizedEvidence
    requirements = $normalizedRequirements
    acceptanceChecks = $normalizedChecks
    checksWaiver = $normalizedWaiver
  }
}

function Resolve-SpecReference([object]$Definition, [object]$Candidate) {
  $matches = @($Definition.specs | Where-Object {
    [string]$_.kind -eq "entity" -and (Canonical-Path ([string]$_.path)) -eq (Canonical-Path $Candidate.targetPath)
  })
  if ($matches.Count -ne 1) {
    Stop-Convergence "CONTRACT_DEFINITION_MAPPING" "Target $($Candidate.targetPath) must map to exactly one entity spec in project-definition.json."
  }
  $spec = $matches[0]
  if ([string]$spec.status -ne "placeholder") {
    Stop-Convergence "CONTRACT_DEFINITION_STATUS" "Canonical spec $($spec.id) is not placeholder."
  }
  $entityRefs = @($spec.targetRefs)
  if ($entityRefs.Count -ne 1) {
    Stop-Convergence "CONTRACT_DEFINITION_MAPPING" "Canonical spec $($spec.id) must reference exactly one entity."
  }
  $entities = @($Definition.project.entities | Where-Object { [string]$_.id -eq [string]$entityRefs[0] })
  if ($entities.Count -ne 1 -or [string]$entities[0].name -ne [string]$Candidate.entity) {
    Stop-Convergence "CONTRACT_ENTITY_MISMATCH" "Candidate entity '$($Candidate.entity)' does not match canonical target $($entityRefs[0])."
  }
  return [pscustomobject]@{ specId = [string]$spec.id; entityId = [string]$entityRefs[0] }
}

function Assert-PlaceholderContract([object]$Candidate) {
  if (-not (Test-Path -LiteralPath $Candidate.targetFullPath -PathType Leaf)) {
    Stop-Convergence "CONTRACT_TARGET_MISSING" "Target spec is missing: $($Candidate.targetPath)"
  }
  $content = Get-Content -LiteralPath $Candidate.targetFullPath -Raw
  if ($content -notmatch "(?im)^\s*status:\s*placeholder\s*$" -or $content -notmatch "(?im)^\s*command:\s*placeholder\s*$") {
    Stop-Convergence "CONTRACT_TARGET_NOT_PLACEHOLDER" "Target must contain the original placeholder status and command: $($Candidate.targetPath)"
  }
}

function New-Subject([string]$DefinitionPath, [string]$DefinitionSha256, [object[]]$Entries) {
  $canonicalEntries = @($Entries | Sort-Object targetPath | ForEach-Object {
    [ordered]@{
      candidatePath = Normalize-Relative ([string]$_.candidatePath)
      candidateSha256 = ([string]$_.candidateSha256).ToLowerInvariant()
      targetPath = Normalize-Relative ([string]$_.targetPath)
      targetBeforeSha256 = ([string]$_.targetBeforeSha256).ToLowerInvariant()
      specId = [string]$_.specId
      entityId = [string]$_.entityId
    }
  })
  return [ordered]@{
    schemaVersion = 1
    kind = "specdd.entity-contract-convergence"
    projectDefinitionPath = Normalize-Relative $DefinitionPath
    projectDefinitionSha256 = $DefinitionSha256.ToLowerInvariant()
    candidates = $canonicalEntries
  }
}

function Get-SubjectHash([object]$Subject) {
  return Get-Sha256Text ($Subject | ConvertTo-Json -Depth 30 -Compress)
}

function Render-Contract([object]$Candidate, [string]$Reviewer, [string]$ApprovedAt) {
  $lines = [System.Collections.Generic.List[string]]::new()
  $lines.Add("entity: $(Quote-Yaml $Candidate.entity)")
  $lines.Add('version: "1.0.0"')
  $lines.Add("description: $(Quote-Yaml $Candidate.description)")
  $lines.Add("brownfieldContext:")
  $lines.Add('  reviewStatus: "implemented"')
  $lines.Add('  evidenceSource: "Approved Brownfield contract convergence"')
  $lines.Add('  confidence: "high"')
  $lines.Add("  evidence:")
  foreach ($evidence in @($Candidate.evidence)) { $lines.Add("    - $(Quote-Yaml $evidence)") }
  $lines.Add("requirements:")
  foreach ($requirement in @($Candidate.requirements)) {
    $lines.Add("  - id: $(Quote-Yaml $requirement.id)")
    $lines.Add("    description: $(Quote-Yaml $requirement.text)")
  }
  $lines.Add("designContract:")
  $lines.Add("  status: approved")
  $lines.Add("  reviewedBy: $(Quote-Yaml $Reviewer)")
  $lines.Add("  approvedAt: $(Quote-Yaml $ApprovedAt)")
  if (@($Candidate.acceptanceChecks).Count -gt 0) {
    $lines.Add("  acceptanceChecks:")
    foreach ($check in @($Candidate.acceptanceChecks)) {
      $lines.Add("    - id: $(Quote-Yaml $check.id)")
      $lines.Add("      description: $(Quote-Yaml $check.description)")
      $lines.Add("      command: $(Quote-Yaml $check.command)")
      $lines.Add("      expectedExitCode: $([int]$check.expectedExitCode)")
    }
    $lines.Add("  checksWaiver: null")
  } else {
    $lines.Add("  acceptanceChecks: []")
    $lines.Add("  checksWaiver:")
    $lines.Add("    reason: $(Quote-Yaml $Candidate.checksWaiver.reason)")
    $lines.Add("    approvedBy: $(Quote-Yaml $Reviewer)")
    $lines.Add("    date: $(Quote-Yaml $ApprovedAt.Substring(0, 10))")
  }
  $lines.Add("clarifications: []")
  return ($lines -join "`n") + "`n"
}

$projectDefinitionFullPath = Full-Path $ProjectDefinitionPath
$proposalFullPath = Full-Path $ProposalPath
if (-not (Canonical-Path $ProposalPath).StartsWith($evidencePrefix)) {
  Stop-Convergence "CONTRACT_EVIDENCE_PATH" "ProposalPath must remain under $evidencePrefix"
}
$contractEvidenceDirectory = Full-Path ".agents/evidence/entity-contracts"
$proposalDirectory = Split-Path -Parent $proposalFullPath
$null = New-Item -ItemType Directory -Path $proposalDirectory -Force
$null = New-Item -ItemType Directory -Path $contractEvidenceDirectory -Force
$lockPath = Join-Path $contractEvidenceDirectory "operation.lock"
$lock = $null

try {
  try {
    $lock = [System.IO.File]::Open($lockPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
  } catch {
    Stop-Convergence "CONTRACT_CONVERGENCE_LOCKED" "Another convergence operation is active or left a stale lock: $lockPath"
  }

  $definition = Read-Json $projectDefinitionFullPath "CONTRACT_DEFINITION_INVALID"
  if ([string]$definition.kind -ne "SpecDDProject" -or [string]$definition.project.scenario -ne "brownfield") {
    Stop-Convergence "CONTRACT_DEFINITION_UNSUPPORTED" "A canonical Brownfield SpecDDProject definition is required."
  }

  if ($Mode -eq "propose") {
    if ($CandidatePaths.Count -eq 0) { Stop-Convergence "CONTRACT_CANDIDATES_REQUIRED" "Propose requires at least one explicit -CandidatePaths entry." }
    if (Test-Path -LiteralPath $proposalFullPath) { Stop-Convergence "CONTRACT_PROPOSAL_EXISTS" "Proposal already exists; preserve or relocate it before creating another." }
    $candidatePathSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $targetPathSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $specIdSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $entries = [System.Collections.Generic.List[object]]::new()
    foreach ($candidatePath in $CandidatePaths) {
      if (-not $candidatePathSet.Add((Canonical-Path $candidatePath))) { Stop-Convergence "CONTRACT_CANDIDATE_DUPLICATE" "Candidate path is duplicated: $candidatePath" }
      $candidate = Read-Candidate $candidatePath
      if (-not $targetPathSet.Add((Canonical-Path $candidate.targetPath))) { Stop-Convergence "CONTRACT_TARGET_DUPLICATE" "More than one candidate targets $($candidate.targetPath)." }
      Assert-PlaceholderContract $candidate
      $mapping = Resolve-SpecReference $definition $candidate
      if (-not $specIdSet.Add($mapping.specId)) { Stop-Convergence "CONTRACT_SPEC_DUPLICATE" "Canonical spec is targeted more than once: $($mapping.specId)" }
      $entries.Add([pscustomobject]@{
        candidatePath = $candidate.candidatePath
        candidateSha256 = $candidate.candidateSha256
        targetPath = $candidate.targetPath
        targetBeforeSha256 = Get-Sha256File $candidate.targetFullPath
        specId = $mapping.specId
        entityId = $mapping.entityId
      })
    }
    $subject = New-Subject $ProjectDefinitionPath (Get-Sha256File $projectDefinitionFullPath) @($entries)
    $subjectSha256 = Get-SubjectHash $subject
    $proposal = [ordered]@{
      schemaVersion = 1
      state = "awaiting-approval"
      createdAtUtc = [DateTime]::UtcNow.ToString("o")
      subjectSha256 = $subjectSha256
      subject = $subject
      approvalNotice = "The exact hash binds every candidate, current target and canonical definition. Apply also requires an explicit reviewer identity."
    }
    Write-JsonAtomic $proposal $proposalFullPath
    Write-Output "[STATUS] AWAITING_APPROVAL"
    Write-Output "[SUBJECT] $subjectSha256"
    Write-Output "[PROPOSAL] $(Normalize-Relative $ProposalPath)"
    exit 0
  }

  if ($SubjectSha256 -notmatch "^[a-f0-9]{64}$") { Stop-Convergence "CONTRACT_SUBJECT_REQUIRED" "Apply requires the exact lowercase SHA-256 subject." }
  $reviewer = $ReviewedBy.Trim()
  if (-not $reviewer) { Stop-Convergence "CONTRACT_REVIEWER_REQUIRED" "Apply requires -ReviewedBy with the human reviewer identity." }
  $proposal = Read-Json $proposalFullPath "CONTRACT_PROPOSAL_INVALID"
  if ([int]$proposal.schemaVersion -ne 1 -or [string]$proposal.state -ne "awaiting-approval") { Stop-Convergence "CONTRACT_PROPOSAL_STATE" "Proposal is not a schema-1 proposal awaiting approval." }
  $subject = New-Subject `
    ([string]$proposal.subject.projectDefinitionPath) `
    ([string]$proposal.subject.projectDefinitionSha256) `
    @($proposal.subject.candidates)
  $actualSubjectSha256 = Get-SubjectHash $subject
  if ($actualSubjectSha256 -ne [string]$proposal.subjectSha256 -or $actualSubjectSha256 -ne $SubjectSha256) {
    Stop-Convergence "CONTRACT_SUBJECT_MISMATCH" "Approval does not match the exact proposal subject."
  }
  if ((Canonical-Path ([string]$subject.projectDefinitionPath)) -ne (Canonical-Path $ProjectDefinitionPath)) {
    Stop-Convergence "CONTRACT_DEFINITION_PATH" "Proposal targets a different project definition."
  }
  $receiptDirectory = Join-Path $contractEvidenceDirectory "receipts"
  $receiptPath = Join-Path $receiptDirectory "$SubjectSha256.json"
  if (Test-Path -LiteralPath $receiptPath) { Stop-Convergence "CONTRACT_REPLAY" "This exact subject already has an application receipt." }
  if ((Get-Sha256File $projectDefinitionFullPath) -ne [string]$subject.projectDefinitionSha256) {
    Stop-Convergence "CONTRACT_DEFINITION_DRIFT" "The canonical project definition changed after proposal creation."
  }

  $candidatePathSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  $targetPathSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  $specIdSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  $approved = [System.Collections.Generic.List[object]]::new()
  foreach ($entry in @($subject.candidates)) {
    if (-not $candidatePathSet.Add((Canonical-Path ([string]$entry.candidatePath)))) { Stop-Convergence "CONTRACT_CANDIDATE_DUPLICATE" "Proposal repeats a candidate path." }
    $candidate = Read-Candidate ([string]$entry.candidatePath)
    if ($candidate.candidateSha256 -ne [string]$entry.candidateSha256) { Stop-Convergence "CONTRACT_CANDIDATE_DRIFT" "Candidate changed after proposal creation: $($entry.candidatePath)" }
    if ((Canonical-Path $candidate.targetPath) -ne (Canonical-Path ([string]$entry.targetPath))) { Stop-Convergence "CONTRACT_TARGET_MISMATCH" "Candidate target differs from the approved subject: $($entry.candidatePath)" }
    if (-not $targetPathSet.Add((Canonical-Path $candidate.targetPath))) { Stop-Convergence "CONTRACT_TARGET_DUPLICATE" "Proposal targets the same contract more than once." }
    Assert-PlaceholderContract $candidate
    if ((Get-Sha256File $candidate.targetFullPath) -ne [string]$entry.targetBeforeSha256) { Stop-Convergence "CONTRACT_TARGET_DRIFT" "Target changed after proposal creation: $($candidate.targetPath)" }
    $mapping = Resolve-SpecReference $definition $candidate
    if ($mapping.specId -ne [string]$entry.specId -or $mapping.entityId -ne [string]$entry.entityId) { Stop-Convergence "CONTRACT_DEFINITION_MAPPING" "Canonical mapping differs from the approved subject for $($candidate.targetPath)." }
    if (-not $specIdSet.Add($mapping.specId)) { Stop-Convergence "CONTRACT_SPEC_DUPLICATE" "Proposal repeats canonical spec $($mapping.specId)." }
    $approved.Add([pscustomobject]@{ entry = $entry; candidate = $candidate; mapping = $mapping })
  }

  $approvedAt = [DateTime]::UtcNow.ToString("o")
  $newContracts = @{}
  foreach ($item in $approved) { $newContracts[(Canonical-Path $item.candidate.targetPath)] = Render-Contract $item.candidate $reviewer $approvedAt }
  foreach ($spec in @($definition.specs)) {
    if ($specIdSet.Contains([string]$spec.id)) { $spec.status = "approved" }
  }
  $newDefinition = ($definition | ConvertTo-Json -Depth 40) + "`n"

  $originals = @{}
  $written = [System.Collections.Generic.List[string]]::new()
  $receiptContracts = [System.Collections.Generic.List[object]]::new()
  $definitionKey = Canonical-Path $ProjectDefinitionPath
  $originals[$definitionKey] = [System.IO.File]::ReadAllBytes($projectDefinitionFullPath)
  foreach ($item in $approved) { $originals[(Canonical-Path $item.candidate.targetPath)] = [System.IO.File]::ReadAllBytes($item.candidate.targetFullPath) }
  try {
    foreach ($item in $approved) {
      $candidate = $item.candidate
      Write-TextAtomic $newContracts[(Canonical-Path $candidate.targetPath)] $candidate.targetFullPath
      $written.Add($candidate.targetFullPath)
      $receiptContracts.Add([ordered]@{
        candidatePath = $candidate.candidatePath
        candidateSha256 = $candidate.candidateSha256
        targetPath = $candidate.targetPath
        beforeSha256 = [string]$item.entry.targetBeforeSha256
        afterSha256 = Get-Sha256File $candidate.targetFullPath
        specId = $item.mapping.specId
        entityId = $item.mapping.entityId
      })
    }
    Write-TextAtomic $newDefinition $projectDefinitionFullPath
    $written.Add($projectDefinitionFullPath)
    foreach ($item in $approved) {
      $expected = Get-Sha256Text $newContracts[(Canonical-Path $item.candidate.targetPath)]
      if ((Get-Sha256File $item.candidate.targetFullPath) -ne $expected) { throw "Post-write contract verification failed: $($item.candidate.targetPath)" }
    }
  } catch {
    foreach ($item in $approved) { [System.IO.File]::WriteAllBytes($item.candidate.targetFullPath, $originals[(Canonical-Path $item.candidate.targetPath)]) }
    [System.IO.File]::WriteAllBytes($projectDefinitionFullPath, $originals[$definitionKey])
    Stop-Convergence "CONTRACT_APPLY_ROLLED_BACK" "Apply failed and every authorized target was restored: $($_.Exception.Message)"
  }

  $receipt = [ordered]@{
    schemaVersion = 1
    kind = "specdd.entity-contract-convergence-receipt"
    appliedAtUtc = $approvedAt
    subjectSha256 = $SubjectSha256
    reviewedBy = $reviewer
    projectDefinition = [ordered]@{
      path = Normalize-Relative $ProjectDefinitionPath
      beforeSha256 = [string]$subject.projectDefinitionSha256
      afterSha256 = Get-Sha256File $projectDefinitionFullPath
      approvedSpecIds = @($specIdSet | Sort-Object)
    }
    contracts = @($receiptContracts)
    approvalEvidence = "Caller supplied the exact approved subject hash and reviewer identity; this local receipt records but does not cryptographically authenticate that identity."
  }
  try {
    Write-JsonAtomic $receipt $receiptPath
  } catch {
    foreach ($item in $approved) { [System.IO.File]::WriteAllBytes($item.candidate.targetFullPath, $originals[(Canonical-Path $item.candidate.targetPath)]) }
    [System.IO.File]::WriteAllBytes($projectDefinitionFullPath, $originals[$definitionKey])
    Stop-Convergence "CONTRACT_RECEIPT_FAILED" "Receipt could not be persisted; every authorized target was restored."
  }
  Write-Output "[STATUS] APPLIED"
  Write-Output "[SUBJECT] $SubjectSha256"
  Write-Output "[RECEIPT] $([System.IO.Path]::GetRelativePath($rootPath, $receiptPath).Replace('\', '/'))"
  exit 0
} finally {
  if ($lock) { $lock.Dispose() }
  if (Test-Path -LiteralPath $lockPath) { Remove-Item -LiteralPath $lockPath -Force }
}
