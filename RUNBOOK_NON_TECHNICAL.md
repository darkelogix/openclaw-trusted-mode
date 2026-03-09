# OpenClaw Trusted Mode Runbook (Non-Technical)

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `PDP`: Policy Decision Point
- `CLI`: Command Line Interface
- `WSL`: Windows Subsystem for Linux

Use this guide if you need to operate the system day-to-day without deep engineering details.

For first-time install and first-success checks, use [`START_HERE.md`](./START_HERE.md) first.

Path defaults used in this runbook:
- `<openclaw-trusted-mode-path>` = local path to `openclaw-trusted-mode`
- `<sde-enterprise-path>` = local path to `sde-enterprise`
- Org keys (for example `<license-server-fqdn>`, `<support-contact-placeholders>`) are defined in `<org-values-file>`.

This runbook covers:

- Start
- Stop
- Health checks
- Reinstall
- Common errors
- Who to contact

## Compatibility (quick check)

- Linux/macOS/Windows supported
- OpenClaw Command Line Interface (CLI) installed in your runtime shell
- Docker Desktop/Engine running
- Plugin ID in config is `openclaw-trusted-mode`
- Ports available:
  - `8001` (Policy Decision Point (PDP))
  - `8002` (hardening, optional)
  - `8003` (license server, optional)

If OpenClaw warns that config was written by a newer CLI version, this is often non-blocking. If behavior looks wrong, update OpenClaw CLI first.

## Command variants

- Use `bash/zsh` commands by default.
- Use PowerShell variants when shown.
- On Windows with WSL:
  - Windows path: `<openclaw-trusted-mode-path>`
  - WSL path: `/mnt/c/path/to/openclaw-trusted-mode`

## Preflight checklist

Before starting:

1. `<openclaw-trusted-mode-path>` exists.
2. `<sde-enterprise-path>` exists.
3. Docker is running.
4. PDP health endpoint responds after startup:
   - `curl -s http://localhost:8001/healthz`
5. OpenClaw plugin status is `loaded`:
   - `openclaw plugins info openclaw-trusted-mode`

## If default ports are not available

You can use different host ports.

Recommended alternate ports:
- PDP: `18001`
- Hardening: `18002`
- License: `18003`

What to change:

1. In compose port mapping, change:
   - `18001:8001` (PDP)
2. In plugin config, set:
   - `pdpUrl = http://localhost:18001/v1/authorize`
3. Health check uses new port:
   - `curl -s http://localhost:18001/healthz`

If OpenClaw in WSL cannot reach `localhost`, use:
- `http://host.docker.internal:18001/v1/authorize`

## Policy pack load/unload (simple)

There is no live "load pack" button/command.

- To load a pack version:
  1. Place `<variant>.json` and `<variant>.sig` in `sde-enterprise\packs\openclaw_trusted_mode\policy_packs\`
  2. Set that variant as active (global or tenant mapping)
  3. Restart PDP

- To unload a pack version:
  1. Remove it from active mapping
  2. Optionally delete the files
  3. Restart PDP

Always run health check after changes:

```powershell
curl -s http://localhost:8001/healthz
```

## What this system does

- OpenClaw sends risky tool actions to a policy service (PDP).
- PDP decides `allow` or `deny`.
- If PDP is down and fail-closed is enabled, risky actions are blocked for safety.

## Quick Start (normal day)

### 1) Start policy service (PDP)

```powershell
cd <sde-enterprise-path>
docker compose -f ops/docker-compose.pdp.yml up -d
```

bash/zsh:

```bash
cd <sde-enterprise-path>
docker compose -f ops/docker-compose.pdp.yml up -d
```

### 2) Verify PDP is healthy

```powershell
curl -s http://localhost:8001/healthz
```

Expected result:

```json
{"status":"ok"}
```

### 3) Restart OpenClaw so plugin is loaded

```powershell
openclaw gateway restart --no-color
```

Windows + WSL example:

```powershell
wsl bash -lc "/home/\$USER/.npm-global/bin/openclaw gateway restart --no-color"
```

### 4) Confirm plugin is loaded

```powershell
openclaw plugins info openclaw-trusted-mode --no-color
```

Windows + WSL example:

```powershell
wsl bash -lc "/home/\$USER/.npm-global/bin/openclaw plugins info openclaw-trusted-mode --no-color"
```

Expected:
- `Status: loaded`

## Stop

```powershell
cd <sde-enterprise-path>
docker compose -f ops/docker-compose.pdp.yml down
```

## If you see: `[Trusted Mode BLOCKED] fetch failed`

Meaning:
- OpenClaw could not reach PDP.

Do this:

1. Start or restart PDP:
```powershell
cd <sde-enterprise-path>
docker compose -f ops/docker-compose.pdp.yml up -d --build
```
2. Re-check health:
```powershell
curl -s http://localhost:8001/healthz
```
3. Restart OpenClaw gateway:
```powershell
openclaw gateway restart --no-color
```

## Reinstall plugin (if needed)

Run these in order:

```powershell
cd <openclaw-trusted-mode-path>
npm install
npm run build
openclaw plugins uninstall openclaw-trusted-mode --no-color || true
openclaw plugins install <openclaw-trusted-mode-path> --no-color
openclaw plugins info openclaw-trusted-mode --no-color
```

Windows + WSL example:

```powershell
cd <openclaw-trusted-mode-path>
npm install
npm run build
wsl bash -lc "rm -rf /home/\$USER/.openclaw/extensions/openclaw-trusted-mode"
wsl bash -lc "/home/\$USER/.npm-global/bin/openclaw plugins install /mnt/c/path/to/openclaw-trusted-mode --no-color"
wsl bash -lc "/home/\$USER/.npm-global/bin/openclaw plugins info openclaw-trusted-mode --no-color"
```

Expected:
- Plugin status returns as `loaded`.

## Smoke test (simple check)

Test that PDP responds:

```powershell
curl -s -X POST http://localhost:8001/v1/authorize `
  -H "Content-Type: application/json" `
  -d "{\"decision_sku\":\"openclaw.trusted_mode.authorize.v1\",\"policy_variant\":\"guard-pro.v2026.02\",\"inputs\":{\"action_request\":{\"tool_name\":\"read_file\",\"params\":{\"path\":\"/tmp/x\"}}},\"tenant_id\":\"trial-tenant\"}"
```

Expected:
- JSON response with `decision` (`allow` or `deny`).

## Common problems

1. Plugin says `plugin not found`
- Reinstall plugin using steps above.

2. PDP health check fails
- Ensure Docker is running.
- Restart PDP compose service.

3. Commands are unexpectedly allowed
- Policy may not include that exact tool name.
- Escalate to engineering for policy update.

4. Commands are unexpectedly blocked
- PDP may be down.
- Check health and restart services.

## Escalation contacts (configure for your organization)

- Primary owner: `<support-primary-owner>`
- Secondary owner: `<support-backup-owner>`
- On-call channel: `<support-oncall-channel>`
- Incident email: `<support-incident-email>`

## Related docs

- Technical guide: `OPERATIONS_GUIDE.md`
- Plugin config schema: `openclaw.plugin.json`

## Production-ready controls checklist

Use this quick checklist before go-live:

1. Version record exists for current deployment:
   - OpenClaw version
   - Plugin version
   - PDP image/tag
   - Active policy variant
2. Backups completed:
   - OpenClaw config
   - entitlements/tenant variants
   - policy pack `.json/.sig`
3. Validation completed:
   - plugin loaded
   - PDP health ok
   - known allow case works
   - known deny case blocks
4. Logging confirmed:
   - OpenClaw logs accessible
   - PDP logs accessible
   - audit file path working (if enabled)
5. Incident contacts filled:
   - primary + backup owner
   - on-call channel
   - incident email

## Quick incident flows

### PDP down

1. Restart PDP service.
2. Check health endpoint.
3. Retry OpenClaw action.
4. Escalate if still failing.

### Unexpected allow

1. Capture command/tool used.
2. Escalate to policy owner to verify rule name match.
3. After fix, rerun deny test.

### Unexpected deny

1. Capture deny reason/code.
2. Check tenant mapping/entitlements.
3. Escalate for policy correction.

### Signature error

1. Restore known-good `.json/.sig` pair.
2. Restart PDP.
3. Re-test.



