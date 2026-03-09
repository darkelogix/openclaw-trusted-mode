# OpenClaw Trusted Mode + SDE-PDP Operator Guide

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `PEP`: Policy Enforcement Point
- `SKU`: Stock Keeping Unit
- `CLI`: Command Line Interface
- `WSL`: Windows Subsystem for Linux
- `JSONL`: JSON Lines
- `SLA`: Service Level Agreement
- `MTTD`: Mean Time To Detect
- `MTTR`: Mean Time To Resolve

This guide covers end-to-end operations for:

- OpenClaw Trusted Mode plugin (`openclaw-trusted-mode` repo)
- Strategic Decision Engine (SDE) Policy Decision Point (PDP) service (`sde-enterprise` repo)

For first-time setup (single linear flow), start with [`START_HERE.md`](./START_HERE.md).

It includes install, reinstall, uninstall, startup, configuration, selective allow/deny policy edits, troubleshooting, and support handoff info.

If you need a simpler day-to-day version, use [`RUNBOOK_NON_TECHNICAL.md`](./RUNBOOK_NON_TECHNICAL.md).

Path defaults used in this guide:
- `<openclaw-trusted-mode-path>` = local path to `openclaw-trusted-mode`
- `<sde-enterprise-path>` = local path to `sde-enterprise`
- Org keys (for example `<license-server-fqdn>`, `<support-contact-placeholders>`) are defined in `<org-values-file>`.

## Compatibility Matrix

| Component | Tested / Required |
|---|---|
| Host OS | Linux/macOS/Windows supported (commands below include variants) |
| OpenClaw CLI | Tested with `2026.2.15` (plugin works). Newer versions should be revalidated. |
| OpenClaw config version | If config was written by newer CLI (example `2026.2.16`) and current CLI is older (`2026.2.15`), warning may appear; usually non-blocking. |
| Node.js (plugin build/runtime) | Tested with Node `22.22.0` |
| Docker | Docker Desktop/Engine with Compose support |
| PDP runtime | Python `3.11` (from `ops/Dockerfile.pdp`) |

## Preflight Checklist

Before install/startup, confirm:

1. `<openclaw-trusted-mode-path>` exists and `npm run build` succeeds.
2. `<sde-enterprise-path>` exists and includes:
   - `ops/Dockerfile.pdp`
   - `ops/docker-compose.pdp.yml`
   - `packs/openclaw_trusted_mode/policy_packs/*.json` and matching `*.sig`
3. OpenClaw plugin ID is consistent everywhere as `openclaw-trusted-mode`:
   - `openclaw.plugin.json -> id`
   - `~/.openclaw/openclaw.json -> plugins.entries.openclaw-trusted-mode`
4. Required ports are free/available:
   - `8001` PDP
   - `8002` hardening service (optional)
   - `8003` license server (optional)
5. PDP endpoint is reachable from OpenClaw runtime:
   - `pdpUrl` (default `http://localhost:8001/v1/authorize`)
6. Tenant and entitlement config are set for production use:
   - `tenantId` in plugin config
   - `ops/entitlements.json` contains that tenant and SKU

## Port Overrides (when defaults are unavailable)

Default host ports:
- `8001` -> PDP
- `8002` -> hardening service
- `8003` -> license server

If these ports are in use, you can remap host ports without changing container internals.

Example host remap:
- PDP on `18001`
- Hardening on `18002`
- License server on `18003`

### Compose override example

Create `<sde-enterprise-path>/ops/docker-compose.override.ports.yml`:

```yaml
services:
  sde-pdp:
    ports:
      - "18001:8001"
```

For reference stack (`docker-compose.reference.yml`):

```yaml
services:
  pdp:
    ports:
      - "18001:8001"
  hardening:
    ports:
      - "18002:8002"
  license-server:
    ports:
      - "18003:8003"
```

Run with overrides:

```bash
cd <sde-enterprise-path>
docker compose -f ops/docker-compose.pdp.yml -f ops/docker-compose.override.ports.yml up --build -d
```

PowerShell:

```powershell
cd <sde-enterprise-path>
docker compose -f ops/docker-compose.pdp.yml -f ops/docker-compose.override.ports.yml up --build -d
```

### Required follow-up changes

1. Update plugin `pdpUrl` to new host port:
   - `http://localhost:18001/v1/authorize`
2. Update all health/smoke commands to new host port:
   - `curl -s http://localhost:18001/healthz`
3. If OpenClaw runs in WSL and `localhost` mapping fails, use:
   - `http://host.docker.internal:18001/v1/authorize`

### Check active listeners (Windows)

```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 8001,8002,8003,18001,18002,18003 } |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

## 1) Architecture and Responsibilities

- `openclaw-trusted-mode` plugin (PEP):
  - Runs on OpenClaw `before_tool_call`
  - Sends tool action requests to PDP (`/v1/authorize`)
  - Blocks or allows tool calls based on PDP decision
- `sde-pdp` (PDP):
  - Verifies signed policy packs
  - Applies policy rules per request
  - Enforces tenant entitlements (`ops/entitlements.json`)
  - Returns `allow`/`deny` + optional constraints + trace

## 2) Prerequisites

- Docker Engine/Desktop + Docker Compose
- Node.js/npm
- OpenClaw CLI (`openclaw`) available in your shell environment
- Repos available locally:
  - `<openclaw-trusted-mode-path>`
  - `<sde-enterprise-path>`

Recommended (not required):
- WSL2 on Windows for Linux-like OpenClaw runtime

## 2.1) Command Variants

Use POSIX shell (`bash/zsh`) commands by default. Use PowerShell equivalents where shown.

Path mapping examples:
- POSIX: `/path/to/openclaw-trusted-mode`
- Windows: `C:\path\to\openclaw-trusted-mode`
- WSL view of Windows path: `/mnt/c/path/to/openclaw-trusted-mode`

Notes:
- This plugin relies on explicit hook return blocking (`{ block: true }`) for fail-closed enforcement.
- Policy rule keys must match actual tool names seen by PDP (for example `exec` vs `execute_shell`).

## 3) Fresh Install

### 3.1 Build the plugin

```bash
cd <openclaw-trusted-mode-path>
npm install
npm run build
```

PowerShell:

```powershell
cd <openclaw-trusted-mode-path>
npm install
npm run build
```

### 3.2 Install plugin into OpenClaw

```bash
openclaw plugins install <openclaw-trusted-mode-path> --no-color
openclaw plugins info openclaw-trusted-mode --no-color
```

Windows + WSL example:

```powershell
wsl bash -lc "/home/\$USER/.npm-global/bin/openclaw plugins install /mnt/c/path/to/openclaw-trusted-mode --no-color"
wsl bash -lc "/home/\$USER/.npm-global/bin/openclaw plugins info openclaw-trusted-mode --no-color"
```

Expected:
- Plugin ID: `openclaw-trusted-mode`
- Status: `loaded`

### 3.3 Start SDE-PDP

Option A: PDP only

```powershell
cd <sde-enterprise-path>
docker compose -f ops/docker-compose.pdp.yml up --build
```

Option B: Reference stack (PDP + hardening + license server)

```powershell
cd <sde-enterprise-path>
docker compose -f ops/docker-compose.reference.yml up --build
```

### 3.4 Health checks

```bash
curl -s http://localhost:8001/healthz
```

PowerShell:

```powershell
curl -s http://localhost:8001/healthz
```

Expected:

```json
{"status":"ok"}
```

If `/healthz` is not implemented by your PDP build (404), treat `/v1/authorize` smoke test success as minimum liveness proof.

Authorization smoke test:

```bash
curl -s -X POST http://localhost:8001/v1/authorize \
  -H "Content-Type: application/json" \
  -d '{"decision_sku":"openclaw.trusted_mode.authorize.v1","policy_variant":"guard-pro.v2026.02","inputs":{"action_request":{"tool_name":"read_file","params":{"path":"/tmp/x"}}},"tenant_id":"trial-tenant"}'
```

PowerShell:

```powershell
curl -s -X POST http://localhost:8001/v1/authorize `
  -H "Content-Type: application/json" `
  -d "{\"decision_sku\":\"openclaw.trusted_mode.authorize.v1\",\"policy_variant\":\"guard-pro.v2026.02\",\"inputs\":{\"action_request\":{\"tool_name\":\"read_file\",\"params\":{\"path\":\"/tmp/x\"}}},\"tenant_id\":\"trial-tenant\"}"
```

## 4) Startup / Shutdown (Daily Ops)

### Start

1. Start PDP stack:
```powershell
cd <sde-enterprise-path>
docker compose -f ops/docker-compose.pdp.yml up -d
```
2. Start/restart OpenClaw gateway:
```powershell
openclaw gateway restart --no-color
```
3. Verify OpenClaw:
```powershell
openclaw status --no-color
```

### Stop

```powershell
cd <sde-enterprise-path>
docker compose -f ops/docker-compose.pdp.yml down
```

## 5) Configuration

## 5.1 Plugin config (`~/.openclaw/openclaw.json`)

Plugin entry key must be:
- `plugins.entries.openclaw-trusted-mode`

Example:

```json
{
  "plugins": {
    "entries": {
      "openclaw-trusted-mode": {
        "enabled": true,
        "config": {
          "pdpUrl": "http://localhost:8001/v1/authorize",
          "policyVariant": "guard-pro.v2026.02",
          "pdpTimeoutMs": 5000,
          "failClosed": true,
          "tenantId": "trial-tenant",
          "toolPolicyMode": "ALLOWLIST_ONLY",
          "allowedTools": ["read_file", "list_files"],
          "requireTenantId": true,
          "allowedTenantIds": ["trial-tenant", "enterprise-tenant"],
          "highRiskTools": ["exec", "execute_shell", "run_shell_command", "shell", "delete_file", "remove_file", "write_file", "edit_file"],
          "contextCurator": {
            "enabled": false,
            "redactKeys": [],
            "dropPaths": [],
            "maxStringLength": 0
          }
        }
      }
    }
  }
}
```

Config schema source:
- `<openclaw-trusted-mode-path>/openclaw.plugin.json`

### 5.1.1 Hardening options (plugin)

| Option | Purpose | Recommended production setting | Management notes |
|---|---|---|---|
| `failClosed` | Block on PDP failure/timeouts | `true` | Keep enabled except controlled troubleshooting windows. |
| `certificationStatus` | Runtime posture (`CERTIFIED_ENFORCED` vs fallback) | `CERTIFIED_ENFORCED` only on certified builds | For uncertified builds use `LOCKDOWN_ONLY`. |
| `highRiskTools` | Certification fallback blocklist | Include shell/write/delete families | Keep list aligned with runtime tool catalog. |
| `toolPolicyMode` | Local pre-PDP gating mode (`PDP` or `ALLOWLIST_ONLY`) | `ALLOWLIST_ONLY` for standalone/free mode; `PDP` for SDE-backed mode | In `ALLOWLIST_ONLY`, non-allowlisted tools are blocked before PDP. |
| `allowedTools` | Local allowlist when `toolPolicyMode=ALLOWLIST_ONLY` | Explicit minimal list | Empty list in allowlist mode causes fail-closed blocking. |
| `requireTenantId` | Enforce tenant ID presence | `true` for multi-tenant/enterprise | Missing `tenantId` causes hard block in plugin. |
| `allowedTenantIds` | Restrict plugin to explicit tenant IDs | Explicit tenant set | If `tenantId` not in list, plugin blocks all tool calls. |
| `contextCurator` | Minimize/redact PDP payload context | Enabled with targeted redactions in production | Test redactions to avoid policy signal loss. |

### 5.1.2 Hardening mode examples

Strict enterprise profile:

```json
{
  "toolPolicyMode": "ALLOWLIST_ONLY",
  "allowedTools": ["read_file", "list_files", "search_files"],
  "requireTenantId": true,
  "allowedTenantIds": ["enterprise-tenant-a"],
  "failClosed": true,
  "certificationStatus": "CERTIFIED_ENFORCED"
}
```

Certification fallback profile (uncertified runtime):

```json
{
  "toolPolicyMode": "PDP",
  "requireTenantId": true,
  "certificationStatus": "LOCKDOWN_ONLY",
  "highRiskTools": ["exec", "execute_shell", "delete_file", "write_file", "edit_file"]
}
```

### 5.2 PDP configs

- Entitlements:
  - `<sde-enterprise-path>/ops/entitlements.json`
- Tenant -> policy variant mapping:
  - `<sde-enterprise-path>/ops/tenant_variants.json`
- Policy pack:
  - `<sde-enterprise-path>/packs/openclaw_trusted_mode/policy_packs/guard_pro_v2026_02.json`
  - Signature file: same base with `.sig`

Optional env vars:
- `POLICY_VARIANT` (default policy pack at startup)
- `AUDIT_EXPORT_PATH` (emit JSONL audit logs)
- `ENFORCE_TENANT_POLICY_VARIANT_LOCK` (default `true`; denies runtime variant override as `POLICY_VARIANT_IMMUTABLE`)
- `REQUIRE_TENANT_VARIANT_MAPPING` (default `false`; when `true`, denies unmapped tenant variant requests as `POLICY_VARIANT_MAPPING_REQUIRED`)
- `OUTCOME_SIGNING_PRIVATE_KEY` (optional Ed25519 private key hex; signs `outcome_event` in PDP response)

## 6) Selective Allow / Deny

Policy lives in:
- `packs/openclaw_trusted_mode/policy_packs/guard_pro_v2026_02.json`

Current example policy format:

```json
{
  "version": "guard-pro.v2026.02",
  "rules": {
    "default": {"action": "allow"},
    "exec": {"action": "deny", "code": "HIGH_BLAST", "reason": "Shell execution blocked by default policy"},
    "delete_file": {"action": "deny", "code": "HIGH_BLAST", "reason": "File deletion blocked"},
    "write_file": {"action": "allow", "constraints": [{"key": "path", "allowed_prefixes": ["/tmp", "/safe"]}]}
  }
}
```

Important:
- Rules are keyed by `tool_name` received by PDP.
- If your OpenClaw tool call arrives as `exec` (not `execute_shell`), `execute_shell` rule will not match.
- In that case add a rule for `exec`:

```json
"exec": {
  "action": "deny",
  "code": "HIGH_BLAST",
  "reason": "Direct shell exec blocked"
}
```

After policy edits:

1. Re-sign policy pack if signature enforcement is active.
2. Restart PDP container:
```powershell
cd <sde-enterprise-path>
docker compose -f ops/docker-compose.pdp.yml up --build -d
```

Tenant-level allow/deny:
- Allowlist SKUs per tenant in `ops/entitlements.json`.
- Missing or unauthorized tenant receives:
  - `decision: deny`
  - `deny_code: ENTITLEMENT_DENIED`

## 6.1) Policy Pack Activation / Rollback (Load/Unload)

This PDP does not expose runtime `load`/`unload` commands. Operationally:

- "Load" means: deploy pack files + map/select variant + restart PDP.
- "Unload" means: remove variant mapping (or remove files) + restart PDP.

### Load / Activate a pack version

1. Add pack JSON and signature:
   - `<sde-enterprise-path>/packs/openclaw_trusted_mode/policy_packs/<variant>.json`
   - `<sde-enterprise-path>/packs/openclaw_trusted_mode/policy_packs/<variant>.sig`
2. Activate variant:
   - Global default: set `POLICY_VARIANT=<variant>` for PDP service
   - Per tenant: update `ops/tenant_variants.json`
3. Restart PDP:
```powershell
cd <sde-enterprise-path>
docker compose -f ops/docker-compose.pdp.yml up --build -d
```
4. Verify:
   - `curl -s http://localhost:8001/healthz`
   - Run authorize request and confirm `trace.policy_variant` matches expected variant.

### Unload / Deactivate a pack version

1. Remove references to the variant:
   - Delete/replace global `POLICY_VARIANT` setting
   - Remove tenant mappings from `ops/tenant_variants.json`
2. Optional: remove `<variant>.json` and `<variant>.sig` from `policy_packs/`
3. Restart PDP.
4. Re-run health and authorize checks.

### Rollback (recommended standard procedure)

1. Keep prior known-good pack files (`.json` + `.sig`) available.
2. Point `POLICY_VARIANT` or `tenant_variants.json` back to known-good variant.
3. Restart PDP.
4. Confirm decisions and traces are back to expected behavior.

## 7) Reinstallation

### 7.1 Plugin reinstall

```powershell
cd <openclaw-trusted-mode-path>
npm run build
```

If install fails with `plugin not found` due stale config entry:
- Remove stale key from `~/.openclaw/openclaw.json` first.

Then reinstall:

```powershell
openclaw plugins uninstall openclaw-trusted-mode --no-color || true
openclaw plugins install <openclaw-trusted-mode-path> --no-color
openclaw plugins info openclaw-trusted-mode --no-color
```

Windows + WSL example:

```powershell
wsl bash -lc "rm -rf /home/\$USER/.openclaw/extensions/openclaw-trusted-mode"
wsl bash -lc "/home/\$USER/.npm-global/bin/openclaw plugins install /mnt/c/path/to/openclaw-trusted-mode --no-color"
wsl bash -lc "/home/\$USER/.npm-global/bin/openclaw plugins info openclaw-trusted-mode --no-color"
```

### 7.2 SDE-PDP reinstall

```powershell
cd <sde-enterprise-path>
docker compose -f ops/docker-compose.pdp.yml down
docker compose -f ops/docker-compose.pdp.yml up --build -d
```

## 8) Uninstall

### 8.1 Plugin uninstall

Try CLI uninstall first:

```powershell
openclaw plugins uninstall openclaw-trusted-mode --no-color
```

If OpenClaw reports unmanaged install record:

```powershell
rm -rf ~/.openclaw/extensions/openclaw-trusted-mode
```

Windows + WSL example:

```powershell
wsl bash -lc "rm -rf /home/\$USER/.openclaw/extensions/openclaw-trusted-mode"
```

Also remove plugin entry from:
- `~/.openclaw/openclaw.json`
- `plugins.entries.openclaw-trusted-mode`

### 8.2 SDE-PDP uninstall

```powershell
cd <sde-enterprise-path>
docker compose -f ops/docker-compose.pdp.yml down
docker image rm sde-pdp:local
```

## 9) What Happens When PDP/SDE Fetch Fails

If plugin cannot reach PDP (network/down/timeout):

- With `failClosed: true`:
  - Plugin returns `block: true`
  - Tool call is blocked with message like:
    - `[Trusted Mode BLOCKED] fetch failed`
- With `failClosed: false`:
  - Plugin logs warning
  - Tool call is allowed (fail-open behavior)

Operational takeaway:
- If PDP is down and `failClosed` is true, governance remains safe but availability drops.
- If PDP is down and `failClosed` is false, availability remains but governance is weakened.

## 10) What SDE Adds (vs Plugin-only)

Without SDE/PDP:
- Plugin can only block on local failure mode; no policy intelligence.

With SDE/PDP:
- Signed policy-pack verification
- Centralized allow/deny logic
- Tenant entitlement checks
- Optional per-tenant policy variant routing
- Audit export support (`AUDIT_EXPORT_PATH`)
- Deterministic trace payloads for governance evidence

## 11) Common Issues and Resolutions

1. `plugin not found` in OpenClaw config
- Cause: stale `plugins.entries.<id>` points to missing extension directory.
- Fix: remove stale config entry, reinstall plugin.

2. `Config invalid ... plugin not found` during install
- Cause: OpenClaw validates config before install.
- Fix: remove stale plugin entry from `~/.openclaw/openclaw.json`, rerun install.

3. Plugin ID mismatch warning
- Cause: manifest ID differs from package/install key.
- Fix: keep IDs aligned to `openclaw-trusted-mode` in manifest + config.

4. Command expected to be denied but was allowed
- Cause: policy rule key mismatch (`exec` vs `execute_shell`) or default allow rule.
- Fix: add/adjust exact tool name rule in policy pack, restart PDP.

5. `[Trusted Mode BLOCKED] fetch failed`
- Cause: PDP not reachable or timed out.
- Fix:
  - Ensure `docker compose ... up` is running
  - Verify `http://localhost:8001/healthz`
  - Confirm plugin `pdpUrl` points to reachable host from OpenClaw runtime

6. `POLICY_SIGNATURE_INVALID`
- Cause: pack/signature mismatch or bad key.
- Fix: restore matching `.json` + `.sig`, verify signing key and pack version.

7. `ENTITLEMENT_DENIED`
- Cause: missing `tenantId` in plugin config or tenant not allowlisted.
- Fix: set plugin `tenantId`, update `ops/entitlements.json`.

## 12) Contact and Escalation

Current metadata:
- Plugin author field: `Darkelogix`

Recommended operational contact block (fill in for your org):

- Primary owner: `<support-primary-owner>`
- Backup owner: `<support-backup-owner>`
- On-call channel: `<support-oncall-channel>`
- Incident email: `<support-incident-email>`
- Escalation path: `<support-escalation-path>`

## 13) Release and Version Management

Track and publish a version tuple for each release:

- OpenClaw CLI version
- Plugin version (`package.json`)
- SDE-PDP container image/tag
- Policy pack variant(s)

Recommended release record format:

```yaml
release_id: "tm-2026-03-01"
openclaw_cli: "2026.2.15"
plugin:
  id: "openclaw-trusted-mode"
  version: "1.0.0"
  source_commit: "<git-sha>"
sde_pdp:
  image: "sde-pdp:local"
  source_commit: "<git-sha>"
policy_packs:
  - variant: "guard-pro.v2026.02"
    signature: "present"
validated_on: "2026-03-01"
```

### Upgrade procedure (safe)

1. Backup config/artifacts (see Section 15).
2. Upgrade plugin and rebuild.
3. Reinstall plugin.
4. Upgrade/rebuild PDP image.
5. Restart services.
6. Run post-change validation checklist (Section 16).
7. If any critical check fails, rollback (Sections 6.1 and 15).

### Compatibility policy

- Treat OpenClaw minor updates as "revalidate required".
- If OpenClaw config warns about newer/older writer version, run full validation before production traffic.

## 14) Security and Hardening Baseline

### OpenClaw hardening

1. Use plugin allowlist where possible:
   - Set `plugins.allow` to trusted plugin IDs.
2. Keep `plugins.entries.openclaw-trusted-mode.enabled = true`.
3. Prefer `failClosed = true` for production governance.
4. Restrict risky tool policies at OpenClaw profile level in addition to PDP policy.
5. For high-assurance environments, set:
   - `toolPolicyMode = ALLOWLIST_ONLY`
   - tightly scoped `allowedTools`
6. Enforce tenant isolation in plugin config:
   - `requireTenantId = true`
   - `allowedTenantIds = [...]`

### Hardening option management

1. Baseline:
   - Keep a versioned JSON snippet for approved plugin hardening config.
2. Change control:
   - Any change to `toolPolicyMode`, `allowedTools`, `allowedTenantIds`, or `highRiskTools` requires peer review and validation evidence.
3. Validation:
   - Run `npm run startup-health-check` after each hardening change.
   - Run deny/allow end-to-end tests from Section 16.
4. Drift checks:
   - Compare live `~/.openclaw/openclaw.json` against approved baseline at least once per release cycle.
5. Emergency relaxations:
   - If temporary fail-open or allowlist expansion is required, timebox it and log rationale in incident record.

### PDP hardening

1. Bind/public exposure:
   - Prefer local/private network exposure only.
   - If exposed, place behind reverse proxy with TLS and access controls.
2. Secrets and credentials:
   - Do not hardcode sensitive values in compose or source.
   - Use secret manager / env-injection mechanism.
3. File permissions:
   - Restrict write access to policy pack/signature directories.
   - Protect entitlement and tenant mapping files.
4. Audit logs:
   - If `AUDIT_EXPORT_PATH` is enabled, protect file permissions and retention.
5. Image trust:
   - Pin base images and dependency versions.
   - Scan images before promotion.

### Network requirements

- OpenClaw runtime must reach PDP `pdpUrl`.
- Ensure firewalls/NAT rules allow chosen host port.
- Validate connectivity from the same runtime context where OpenClaw executes.

## 15) Backup, Restore, and Rollback

### What to back up

- OpenClaw config:
  - `~/.openclaw/openclaw.json`
- Plugin package/config snapshot:
  - `<openclaw-trusted-mode-path>/openclaw.plugin.json`
  - `<openclaw-trusted-mode-path>/package.json`
- PDP runtime configs:
  - `<sde-enterprise-path>/ops/entitlements.json`
  - `<sde-enterprise-path>/ops/tenant_variants.json`
- Policy packs:
  - `<sde-enterprise-path>/packs/openclaw_trusted_mode/policy_packs/*.json`
  - `<sde-enterprise-path>/packs/openclaw_trusted_mode/policy_packs/*.sig`
- Optional:
  - audit export files referenced by `AUDIT_EXPORT_PATH`

### Backup example

```bash
mkdir -p ./backup/trusted-mode
cp ~/.openclaw/openclaw.json ./backup/trusted-mode/openclaw.json.bak
cp <sde-enterprise-path>/ops/entitlements.json ./backup/trusted-mode/entitlements.json.bak
cp <sde-enterprise-path>/ops/tenant_variants.json ./backup/trusted-mode/tenant_variants.json.bak
cp <sde-enterprise-path>/packs/openclaw_trusted_mode/policy_packs/* ./backup/trusted-mode/
```

PowerShell:

```powershell
New-Item -ItemType Directory -Force .\backup\trusted-mode | Out-Null
Copy-Item $HOME\.openclaw\openclaw.json .\backup\trusted-mode\openclaw.json.bak -Force
Copy-Item <sde-enterprise-path>\ops\entitlements.json .\backup\trusted-mode\entitlements.json.bak -Force
Copy-Item <sde-enterprise-path>\ops\tenant_variants.json .\backup\trusted-mode\tenant_variants.json.bak -Force
Copy-Item <sde-enterprise-path>\packs\openclaw_trusted_mode\policy_packs\* .\backup\trusted-mode\ -Force
```

### Restore / rollback procedure

1. Stop/quiet traffic.
2. Restore files from backup.
3. Restart PDP and OpenClaw gateway.
4. Run validation checklist (Section 16).
5. Re-open traffic only if checks pass.

## 16) Post-Change Validation Checklist (Required)

Run after any install/reinstall/upgrade/policy change:

1. Plugin load check:
   - `openclaw plugins info openclaw-trusted-mode --no-color`
2. PDP health:
   - `curl -s http://localhost:<PDP_PORT>/healthz`
3. Allow-path check:
   - send a known low-risk request; expect `decision: allow`
4. Deny-path check:
   - send a known blocked action (for example `exec` rule); expect `decision: deny`
5. End-to-end tool block check:
   - from OpenClaw, run known denied tool action and confirm block message.
6. Audit check (if enabled):
   - confirm new records written to `AUDIT_EXPORT_PATH`.
7. Tenant entitlement check:
   - unknown tenant request should return `ENTITLEMENT_DENIED`.
8. Enforcement artifact check:
   - confirm PDP response includes `decision_hash`, `decision_proof`, and `outcome_event`.
   - if `OUTCOME_SIGNING_PRIVATE_KEY` is configured, confirm `outcome_event.signature_status` is `signed`.
   - for deterministic certification proof, confirm `decision_proof.signature_status` is `signed`.
9. Test-pack matrix:
   - run `npm run test-pack-matrix` in `openclaw-trusted-mode` against live PDP.

Minimum go/no-go:
- All checks 1-5 must pass.
- If audit is enabled, check 6 must pass.

## 16.1) Operator Verification: Certification Modes

Use this when validating certification posture for release evidence.

### A) `CERTIFIED_ENFORCED` verification

Expected result:
- `status: ENFORCED_OK`
- `runtime_certification_status: CERTIFIED_ENFORCED`
- `attestation_signature_verified: true`

POSIX:

```bash
cd <openclaw-trusted-mode-path>
node scripts/mock_pdp.js &
PDP_PID=$!
sleep 1
PDP_URL=http://localhost:8001/v1/authorize \
CERTIFICATION_STATUS=CERTIFIED_ENFORCED \
OPENCLAW_VERSION=2026.2.15 \
npm run trusted-mode-check -- --json
kill $PDP_PID
```

PowerShell:

```powershell
cd <openclaw-trusted-mode-path>
$p = Start-Process -FilePath node -ArgumentList 'scripts/mock_pdp.js' -PassThru
Start-Sleep -Seconds 1
$env:PDP_URL='http://localhost:8001/v1/authorize'
$env:CERTIFICATION_STATUS='CERTIFIED_ENFORCED'
$env:OPENCLAW_VERSION='2026.2.15'
npm run trusted-mode-check -- --json
Stop-Process -Id $p.Id -Force
```

### B) `LOCKDOWN_ONLY` verification

Expected result:
- `status: LOCKDOWN_ONLY`
- `runtime_certification_status: LOCKDOWN_ONLY`
- `axis_scores.certified_compatibility: WARN`

POSIX:

```bash
cd <openclaw-trusted-mode-path>
node scripts/mock_pdp.js &
PDP_PID=$!
sleep 1
PDP_URL=http://localhost:8001/v1/authorize \
CERTIFICATION_STATUS=LOCKDOWN_ONLY \
EXPECTED_STATUS=LOCKDOWN_ONLY \
OPENCLAW_VERSION=2026.2.16 \
npm run trusted-mode-check -- --json
kill $PDP_PID
```

PowerShell:

```powershell
cd <openclaw-trusted-mode-path>
$p = Start-Process -FilePath node -ArgumentList 'scripts/mock_pdp.js' -PassThru
Start-Sleep -Seconds 1
$env:PDP_URL='http://localhost:8001/v1/authorize'
$env:CERTIFICATION_STATUS='LOCKDOWN_ONLY'
$env:EXPECTED_STATUS='LOCKDOWN_ONLY'
$env:OPENCLAW_VERSION='2026.2.16'
npm run trusted-mode-check -- --json
Remove-Item Env:EXPECTED_STATUS -ErrorAction SilentlyContinue
Stop-Process -Id $p.Id -Force
```

### C) Required attestation files

Trusted Mode Check reads:
- `<openclaw-trusted-mode-path>/attestation/trusted_mode_attest_v1.json`
- `<openclaw-trusted-mode-path>/attestation/trusted_mode_attest_v1.sig`

If signature verification fails, status will move to `UNSAFE`.

### D) Unified startup health command

Run a single orchestration check for plugin config/install presence, attestation integrity, PDP health, and expected certification status:

```bash
cd <openclaw-trusted-mode-path>
PDP_URL=http://localhost:8001/v1/authorize \
CERTIFICATION_STATUS=CERTIFIED_ENFORCED \
EXPECTED_STATUS=ENFORCED_OK \
npm run startup-health-check
```

PowerShell:

```powershell
cd <openclaw-trusted-mode-path>
$env:PDP_URL='http://localhost:8001/v1/authorize'
$env:CERTIFICATION_STATUS='CERTIFIED_ENFORCED'
$env:EXPECTED_STATUS='ENFORCED_OK'
npm run startup-health-check
```

If OpenClaw CLI is unavailable in the current shell, skip plugin inspection explicitly:

```bash
npm run startup-health-check -- --skip-plugin-check
```

## 17) Logging and Observability

### Where logs are

- OpenClaw logs (WSL typical path):
  - `/tmp/openclaw/openclaw-*.log`
- PDP logs:
  - `docker compose logs` for `sde-pdp` / `pdp` service
- Audit export:
  - path defined by `AUDIT_EXPORT_PATH`

### Useful commands

```bash
# OpenClaw trusted-mode events
grep -n "Trusted Mode DEBUG\|before_tool_call\|BLOCKED\|fetch failed" /tmp/openclaw/openclaw-*.log | tail -n 200

# PDP logs
cd <sde-enterprise-path>
docker compose -f ops/docker-compose.pdp.yml logs --tail=200
```

PowerShell (OpenClaw logs from WSL):

```powershell
wsl bash -lc "grep -n 'Trusted Mode DEBUG\|before_tool_call\|BLOCKED\|fetch failed' /tmp/openclaw/openclaw-*.log | tail -n 200"
```

### Key log signatures

- Hook fired:
  - `HOOK FIRED: before_tool_call`
- PDP call attempted:
  - `Sending to PDP`
- Fail-closed block:
  - `[Trusted Mode BLOCKED] ...`
- PDP unreachable:
  - `fetch failed` or timeout message
- Entitlement deny:
  - PDP response with `ENTITLEMENT_DENIED`
- Signature invalid:
  - PDP deny with `POLICY_SIGNATURE_INVALID`
- Policy variant override blocked:
  - PDP deny with `POLICY_VARIANT_IMMUTABLE`
- Tenant variant mapping missing (strict mode):
  - PDP deny with `POLICY_VARIANT_MAPPING_REQUIRED`

## 18) Policy Authoring and Change Standards

### Standards

1. Tool-name canonicalization:
   - Policies must match actual runtime tool name (example `exec`).
2. Deny schema consistency:
   - Every deny rule should include both `code` and `reason`.
3. Default behavior:
   - Document and intentionally approve `default` action (`allow` or `deny`).
4. Constraints:
   - Use explicit keys and bounded values; avoid ambiguous semantics.

### Change control

For production policy changes require:

1. Change ticket with reason and blast-radius assessment.
2. Peer review (at least 1 reviewer).
3. Test evidence:
   - allow + deny + entitlement + signature checks.
4. Signed policy pack artifacts committed and traceable.
5. Rollback variant prepared before promotion.

## 19) Incident Runbooks

### A) PDP down / unreachable

Symptoms:
- `[Trusted Mode BLOCKED] fetch failed`
- health check fails

Actions:
1. Check PDP container status/logs.
2. Restart PDP stack.
3. Verify health endpoint.
4. Re-run blocked command test.
5. If still failing, rollback recent config/policy changes.

### B) Unexpected allow

Symptoms:
- High-risk action executes when expected deny.

Actions:
1. Confirm hook fired in OpenClaw logs.
2. Confirm tool name in payload (`exec` vs other).
3. Check policy rule key match.
4. Verify active variant mapping and entitlements.
5. Apply policy fix, restart PDP, validate.

### C) Unexpected deny

Symptoms:
- Legitimate low-risk actions blocked.

Actions:
1. Capture deny code/reason and trace policy variant.
2. Check tenant entitlement and variant mapping.
3. Check policy rule/default action.
4. Adjust policy/entitlement and redeploy.
5. Run validation checklist.

### D) Signature failure

Symptoms:
- `POLICY_SIGNATURE_INVALID`

Actions:
1. Verify `.json` and `.sig` correspond.
2. Verify expected public key and pack variant naming.
3. Restore known-good signed pack.
4. Restart PDP and re-test.

### E) Plugin not loading / config invalid

Symptoms:
- `plugin not found` config error

Actions:
1. Remove stale `plugins.entries.<id>` entry.
2. Reinstall plugin.
3. Re-enable correct ID `openclaw-trusted-mode`.
4. Confirm plugin status `loaded`.

## 20) Ownership, Support, and SLA

Fill this for production operations:

- Service owner: `<support-service-owner>`
- Secondary owner: `<support-backup-owner>`
- On-call schedule: `<support-oncall-schedule>`
- Contact channels:
  - Chat: `<support-oncall-channel>`
  - Email: `<support-contact-email>`
  - Ticket queue: `<support-ticket-queue>`

Recommended SLA targets:

- P1 (governance bypass risk / full outage): response in 15 min, mitigation in 60 min.
- P2 (partial deny/allow misbehavior): response in 1 hour, mitigation in 4 hours.
- P3 (non-critical warnings/docs/tooling): response in 1 business day.

Track:
- MTTD, MTTR, incident count, rollback frequency, failed change rate.



