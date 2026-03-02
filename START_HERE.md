# Start Here: Self-Service Setup

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `CLI`: Command Line Interface

This guide is the single entrypoint for first-time users of:

- `C:\dev\openclaw-trusted-mode` (plugin)
- `C:\dev\sde-enterprise` (Strategic Decision Engine (SDE) Policy Decision Point (PDP) runtime)

Goal: download, install, configure, test, and run without direct support.

Org-specific values are centralized in `C:\dev\ORG_VALUES.md`.

## 0) One-command bootstrap (recommended)

```powershell
powershell -ExecutionPolicy Bypass -File C:\dev\bootstrap_self_service.ps1
```

Optional (also install `sde-cli`):

```powershell
powershell -ExecutionPolicy Bypass -File C:\dev\bootstrap_self_service.ps1 -InstallSdeCli
```

## 1) Prerequisites

- Windows PowerShell 7+ or bash
- Git
- Docker Desktop (or Docker Engine + Compose)
- Node.js 22.x (plugin build/runtime)
- Python 3.11+ (for `sde-cli` and plugin matrix test)
- OpenClaw Command Line Interface (CLI) available in shell as `openclaw`

Quick version checks:

```powershell
node --version
python --version
docker --version
docker compose version
openclaw --version
```

## 2) Acquire the two repos

Option A: you already have them locally at:

- `C:\dev\openclaw-trusted-mode`
- `C:\dev\sde-enterprise`

Option B: clone them:

```powershell
git clone ORG_OPENCLAW_TRUSTED_MODE_REPO_URL C:\dev\openclaw-trusted-mode
git clone ORG_SDE_ENTERPRISE_REPO_URL C:\dev\sde-enterprise
```

## 3) Configure known-good local defaults

1. Create local SDE env file:

```powershell
Copy-Item C:\dev\sde-enterprise\.env.example C:\dev\sde-enterprise\.env -Force
```

2. Use the default tenant/policy mapping (already present in repo):
- `C:\dev\sde-enterprise\ops\entitlements.json`
- `C:\dev\sde-enterprise\ops\tenant_variants.json`

3. Optional plugin config template:
- `C:\dev\openclaw-trusted-mode\openclaw.user-config.entry.example.json`

## 4) Build and run SDE PDP (Policy Decision Point)

```powershell
Set-Location C:\dev\sde-enterprise
docker compose -f ops/docker-compose.pdp.yml up --build -d
```

Verify health:

```powershell
curl -s http://localhost:8001/healthz
```

Expected:

```json
{"status":"ok"}
```

## 5) Build and install plugin

```powershell
Set-Location C:\dev\openclaw-trusted-mode
npm install
npm run build
openclaw plugins install C:\dev\openclaw-trusted-mode --no-color
openclaw plugins info openclaw-trusted-mode --no-color
```

Expected: plugin status is `loaded`.

## 6) Run first-success smoke tests

Run SDE smoke test:

```powershell
Set-Location C:\dev\sde-enterprise
powershell -ExecutionPolicy Bypass -File scripts\first_success_smoke.ps1
```

Run plugin startup health:

```powershell
Set-Location C:\dev\openclaw-trusted-mode
powershell -ExecutionPolicy Bypass -File scripts\first_success_smoke.ps1
```

## 7) Day-2 operations docs

- Primary technical ops: `C:\dev\openclaw-trusted-mode\OPERATIONS_GUIDE.md`
- Non-technical runbook: `C:\dev\openclaw-trusted-mode\RUNBOOK_NON_TECHNICAL.md`
- SDE deployment docs: `C:\dev\sde-enterprise\README.md`

## 8) Remaining org-specific values to fill once

For full production self-service, fill these once and publish internally:

1. `ORG_OPENCLAW_TRUSTED_MODE_REPO_URL`
2. `ORG_SDE_ENTERPRISE_REPO_URL`
3. `ORG_LICENSE_SERVER_FQDN`
4. Support contact block (owner/channel/email)
5. Private registry/image coordinates (if used)
