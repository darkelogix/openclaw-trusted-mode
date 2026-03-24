# Start Here: Self-Service Setup

This guide assumes an npm-first customer path:

- install the public adapter/plugin from npm
- use standalone mode immediately if you only need local hardening
- obtain the licensed SDE runtime and deployment materials through the Darkelogix customer console only if you want governed mode

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `CLI`: Command Line Interface

This guide is the single entrypoint for first-time users of:

- `<openclaw-trusted-mode-path>` (plugin)
- `<sde-enterprise-path>` (Strategic Decision Engine (SDE) Policy Decision Point (PDP) runtime)

Goal: download, install, configure, test, and run without direct support.

There are two valid setup paths:

- npm package: public adapter/plugin only
- customer console: licensed SDE runtime, deployment bundles, and governed rollout instructions

Then choose one of these runtime paths:

- Free standalone plugin hardening:
  - local allowlist-only mode
  - no SDE PDP required
- SDE-backed governed mode:
  - requires `<sde-enterprise-path>`
  - adds PDP authorization, signed policy packs, and entitlements

Org-specific values are centralized in `<org-values-file>`.

## 0) One-command bootstrap (recommended)

If you are coming from the public npm package, you can install it first with:

```powershell
npm install @darkelogix/openclaw-trusted-mode
```

Use the bootstrap path when you want the guided local setup flow.


```powershell
powershell -ExecutionPolicy Bypass -File <bootstrap-self-service-script-path>
```

Optional (also install `sde-cli`):

```powershell
powershell -ExecutionPolicy Bypass -File <bootstrap-self-service-script-path> -InstallSdeCli
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

- `<openclaw-trusted-mode-path>`
- `<sde-enterprise-path>`

Option B: clone them:

```powershell
git clone <openclaw-trusted-mode-repo-url> <openclaw-trusted-mode-path>
git clone <sde-enterprise-repo-url> <sde-enterprise-path>
```

## 3) Configure known-good local defaults

1. Create local SDE env file:

```powershell
Copy-Item <sde-enterprise-path>\.env.example <sde-enterprise-path>\.env -Force
```

2. Use the default tenant/policy mapping (already present in repo):
- `<sde-enterprise-path>\ops\entitlements.json`
- `<sde-enterprise-path>\ops\tenant_variants.json`

3. Optional plugin config template:
- `<openclaw-trusted-mode-path>\openclaw.user-config.entry.example.json`

## 4) Free standalone plugin install

Use this path if you want practical local hardening without SDE PDP.

```powershell
Set-Location <openclaw-trusted-mode-path>
npm install
npm run build
openclaw plugins install <openclaw-trusted-mode-path> --no-color
openclaw plugins info openclaw-trusted-mode --no-color
```

Expected: plugin status is `loaded`.

Default free posture:

- `toolPolicyMode = ALLOWLIST_ONLY`
- `allowedTools = ["read_file", "list_files", "search_files"]`
- shell/write/delete tools blocked locally

## 5) Build and run SDE PDP (Policy Decision Point)

Use this governed path only after you have licensed access to SDE. The supported customer-facing way to obtain the runtime, bundles, and instructions is through the Darkelogix customer console, not by assuming direct source-repo access.


Use the hardened profile for all production-style and release validation runs.

```powershell
Set-Location <sde-enterprise-path>
docker compose -f ops/docker-compose.pdp.yml -f ops/docker-compose.pdp.hardened.yml up --build -d
```

Verify health:

```powershell
curl -s http://localhost:8001/healthz
```

Expected:

```json
{"status":"ok"}
```

## 6) Build and install plugin for SDE-backed mode

```powershell
Set-Location <openclaw-trusted-mode-path>
npm install
npm run build
openclaw plugins install <openclaw-trusted-mode-path> --no-color
openclaw plugins info openclaw-trusted-mode --no-color
```

Expected: plugin status is `loaded`.

## 7) Run first-success smoke tests

Standalone free-mode smoke test:

1. Confirm `read_file` still works in OpenClaw.
2. Confirm high-risk actions such as `exec` are blocked.

SDE-backed smoke test:

```powershell
Set-Location <sde-enterprise-path>
powershell -ExecutionPolicy Bypass -File scripts\first_success_smoke.ps1
```

Run plugin startup health:

```powershell
Set-Location <openclaw-trusted-mode-path>
powershell -ExecutionPolicy Bypass -File scripts\first_success_smoke.ps1
```

## 8) Day-2 operations docs

- Primary technical ops: `<openclaw-trusted-mode-path>\OPERATIONS_GUIDE.md`
- Non-technical runbook: `<openclaw-trusted-mode-path>\RUNBOOK_NON_TECHNICAL.md`
- SDE deployment docs: `<sde-enterprise-path>\README.md`

## 9) Remaining org-specific values to fill once

For full production self-service, define these values once in your operations documentation:

1. `<openclaw-trusted-mode-repo-url>`
2. `<sde-enterprise-repo-url>`
3. `<license-server-fqdn>`
4. Support contact block (owner/channel/email)
5. Private registry/image coordinates (if used)

These values are release-ops inputs, not blockers for local build/test validation.


