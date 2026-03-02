# Self-Service FAQ

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `CLI`: Command Line Interface
- `FQDN`: Fully Qualified Domain Name

## 1) `openclaw` command not found

Install OpenClaw CLI and verify:

```powershell
openclaw --version
```

## 2) PDP health check fails

1. Start/restart PDP:
```powershell
Set-Location C:\dev\sde-enterprise
docker compose -f ops/docker-compose.pdp.yml up --build -d
```
2. Retry:
```powershell
curl -s http://localhost:8001/healthz
```

## 3) Plugin not loaded

```powershell
Set-Location C:\dev\openclaw-trusted-mode
npm install
npm run build
openclaw plugins install C:\dev\openclaw-trusted-mode --no-color
openclaw plugins info openclaw-trusted-mode --no-color
```

## 4) Actions are allowed when they should be denied

Run SDE smoke test to confirm policy behavior:

```powershell
Set-Location C:\dev\sde-enterprise
powershell -ExecutionPolicy Bypass -File scripts\first_success_smoke.ps1
```

If deny still fails, verify policy pack:

- `packs/openclaw_trusted_mode/policy_packs/guard_pro_v2026_02.json`
- rule key must match exact tool name

## 5) `[Trusted Mode BLOCKED] fetch failed`

- PDP is unreachable from plugin.
- Confirm `pdpUrl` in plugin config points to reachable host/port.
- Confirm `docker compose` stack is up and `healthz` is `ok`.

## 6) License-related docs reference unknown endpoint

Populate your org values from `START_HERE.md` section "Remaining org-specific values to fill once":

- license FQDN
- support contact block
- artifact/registry locations
