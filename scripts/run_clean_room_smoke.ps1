param(
  [string]$EnvironmentLabel = "local-clean-room",
  [string]$OpenClawVersion = "unknown",
  [string]$CertificationStatus = "LOCKDOWN_ONLY",
  [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path "$PSScriptRoot\..").Path
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$runId = "$EnvironmentLabel-$timestamp"
$tempRoot = Join-Path $repoRoot ".clean-room\$runId"
$evidenceRoot = Join-Path $repoRoot "release-evidence\matrix"
$runsRoot = Join-Path $evidenceRoot "runs"
$summaryPath = Join-Path $runsRoot "$runId.json"

New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
New-Item -ItemType Directory -Force -Path $runsRoot | Out-Null

$env:NPM_CONFIG_CACHE = Join-Path $tempRoot "npm-cache"
$env:CERTIFICATION_STATUS = $CertificationStatus
$env:OPENCLAW_VERSION = $OpenClawVersion
$env:EXPECTED_STATUS = if ($CertificationStatus -eq "CERTIFIED_ENFORCED") { "ENFORCED_OK" } else { "LOCKDOWN_ONLY" }

$steps = New-Object System.Collections.Generic.List[object]

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Action,
    [switch]$Optional
  )

  $startedAt = [DateTime]::UtcNow.ToString("o")
  try {
    $global:LASTEXITCODE = 0
    & $Action
    if ($global:LASTEXITCODE -ne 0) {
      throw "Native command exited with code $global:LASTEXITCODE"
    }
    $steps.Add([pscustomobject]@{
      name = $Name
      status = "passed"
      optional = [bool]$Optional
      startedAtUtc = $startedAt
      completedAtUtc = [DateTime]::UtcNow.ToString("o")
    })
  } catch {
    $status = if ($Optional) { "warning" } else { "failed" }
    $steps.Add([pscustomobject]@{
      name = $Name
      status = $status
      optional = [bool]$Optional
      startedAtUtc = $startedAt
      completedAtUtc = [DateTime]::UtcNow.ToString("o")
      detail = $_.Exception.Message
    })
    $global:LASTEXITCODE = 0
    if (-not $Optional) {
      throw
    }
  }
}

Push-Location $repoRoot
try {
  Invoke-Step "build" { npm run build | Out-Host }
  Invoke-Step "verify_plugin_schema_contract" { node scripts/verify_plugin_schema_contract.js | Out-Host }
  if (-not $SkipTests) {
    Invoke-Step "test" { npm test | Out-Host }
  }
  Invoke-Step "package_dry_run" { npm pack --dry-run --cache .npm-cache | Out-Host }
  Invoke-Step "startup_health_check" { node scripts/verify_startup_health.js --skip-plugin-check | Out-Host } -Optional
  Invoke-Step "openclaw_plugin_info" {
    $openclaw = Get-Command openclaw -ErrorAction Stop
    & $openclaw.Source plugins info openclaw-trusted-mode --no-color | Out-Host
  } -Optional
} finally {
  Pop-Location
}

$summary = [ordered]@{
  capturedAtUtc = [DateTime]::UtcNow.ToString("o")
  runId = $runId
  environmentLabel = $EnvironmentLabel
  openclawVersion = $OpenClawVersion
  certificationStatus = $CertificationStatus
  repoRoot = $repoRoot
  isolatedTempRoot = $tempRoot
  overallStatus = if ($steps.status -contains "failed") { "failed" } else { "passed" }
  steps = $steps
}

$summary | ConvertTo-Json -Depth 20 | Set-Content $summaryPath
Get-Content $summaryPath
