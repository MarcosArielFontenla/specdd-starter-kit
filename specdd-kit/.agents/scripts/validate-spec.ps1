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
