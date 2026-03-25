# Self-Service FAQ

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `CLI`: Command Line Interface
- `FQDN`: Fully Qualified Domain Name
- `SKU`: Stock Keeping Unit
- `WSL`: Windows Subsystem for Linux

## 1) `openclaw` command not found

Install OpenClaw CLI and verify:

```powershell
openclaw --version
```

If still not found:

1. Confirm CLI install location is on PATH.
2. Open a new terminal and retry.

## 2) PDP health check fails

If you are using the free standalone plugin mode, you can ignore this section. PDP is required only for SDE-backed governed mode.

1. Start/restart PDP:

```powershell
Set-Location <sde-enterprise-path>
docker compose -f ops/docker-compose.pdp.yml up --build -d
```

2. Retry health:

```powershell
curl -s http://localhost:8001/healthz
```

Expected: `{"status":"ok"}`.

If not:

- Check container status: `docker ps`
- Check PDP logs: `docker compose -f ops/docker-compose.pdp.yml logs`

## 3) Plugin not loaded

```powershell
Set-Location <openclaw-trusted-mode-path>
npm install
npm run build
openclaw plugins install <openclaw-trusted-mode-path> --no-color
openclaw plugins info openclaw-trusted-mode --no-color
```

Expected: plugin status is `loaded`.

If not loaded:

1. Confirm plugin ID matches `openclaw-trusted-mode`.
2. Reinstall plugin and restart OpenClaw gateway.

## 4) Actions are allowed when they should be denied

If you are using standalone free mode, check these first:

1. Confirm `toolPolicyMode` is `ALLOWLIST_ONLY`.
2. Confirm the blocked tool is not present in `allowedTools`.
3. For shell execution, verify the runtime tool name is `exec`.

Run SDE smoke test:

```powershell
Set-Location <sde-enterprise-path>
powershell -ExecutionPolicy Bypass -File scripts\first_success_smoke.ps1
```

Then verify:

1. Active policy pack includes exact runtime tool key.
2. Tenant variant mapping points to intended variant.
3. Entitlement and tenant ID are correct.

## 5) `[Trusted Mode BLOCKED] fetch failed`

Meaning: plugin cannot reach PDP.

If you intended to use the free standalone plugin only, switch to:

- `toolPolicyMode = ALLOWLIST_ONLY`
- a non-empty `allowedTools` list

That removes the PDP dependency.

Check in order:

1. PDP is running and healthy.
2. Plugin `pdpUrl` points to reachable host/port.
3. If using WSL, test `host.docker.internal` endpoint.
4. Keep `failClosed=true` in production.

## 6) License endpoint or support placeholders are unresolved

Define and verify the values from `START_HERE.md` section "Remaining org-specific values to fill once":

1. License server FQDN.
2. Support contacts and escalation channel.
3. Artifact/registry coordinates used by your deployment.

After setting values:

1. Re-run licensing/activation check (`sde-cli license status`).
2. Re-run pilot or production readiness checklist.

## 7) `ENTITLEMENT_DENIED` for expected active tenant

1. Inspect `ops/entitlements.json` for exact tenant key and SKU.
2. Confirm request `tenant_id` matches exactly.
3. Restart PDP after file changes.
4. Re-test with:

```powershell
Set-Location <sde-enterprise-path>
python ops\pdp_admin_cli.py authorize-test --tenant-id <tenant_id> --tool-name read_file --gateway-id gw-1 --environment prod
```

## 8) Policy pack signature verification errors

1. Confirm both files exist for active variant:
- `<variant>.json`
- `<variant>.sig`
2. Validate with:

```powershell
Set-Location <sde-enterprise-path>
python ops\pdp_admin_cli.py validate-policy-pack --variant <variant>
```

3. If validation fails, restore known-good signed pair and restart PDP.

## 9) Where to go next

- First-time setup: `START_HERE.md`
- Detailed operations: `OPERATIONS_GUIDE.md`
- Non-technical operations: `RUNBOOK_NON_TECHNICAL.md`
- Governance controls: `<sde-enterprise-path>\docs\governance_control_plane.md`
