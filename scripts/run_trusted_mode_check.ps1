param(
  [string]$PdpUrl = "http://localhost:8001/v1/authorize",
  [string]$PolicyVariant = "guard-pro.v2026.02"
)

Write-Host "Running Trusted Mode Check..."

if (-not (Test-Path "dist/cli.js")) {
  npm run build
}

$env:PDP_URL = $PdpUrl
$env:POLICY_VARIANT = $PolicyVariant

npm run trusted-mode-check
