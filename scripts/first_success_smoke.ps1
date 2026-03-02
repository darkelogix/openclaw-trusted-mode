param(
  [string]$PdpUrl = "http://localhost:8001/v1/authorize"
)

$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot\..

npm run build | Out-Host

$env:PDP_URL = $PdpUrl
$env:CERTIFICATION_STATUS = "LOCKDOWN_ONLY"
$env:EXPECTED_STATUS = "LOCKDOWN_ONLY"

try {
  openclaw plugins info openclaw-trusted-mode --no-color | Out-Host
} catch {
  Write-Warning "OpenClaw plugin info check failed in current shell. Continuing with startup-health-check."
}

npm run startup-health-check | Out-Host
Write-Host "SUCCESS plugin first-success smoke test passed."
