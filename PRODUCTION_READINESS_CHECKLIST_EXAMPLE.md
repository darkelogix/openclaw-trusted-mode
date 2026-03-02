# Production Readiness Checklist (Example - Pre-Filled)

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `PDP`: Policy Decision Point
- `CLI`: Command Line Interface
- `WSL`: Windows Subsystem for Linux

## 0) Release Metadata

- [ ] Release ID assigned (`tm-<YYYYMMDD>-<n>`)
- [ ] Change window approved
- [ ] Rollback owner assigned
- [ ] Version tuple recorded:
  - [ ] OpenClaw CLI: `2026.2.15` (or current)
  - [ ] Plugin version: `1.0.0` (or current from `package.json`)
  - [ ] PDP image: `sde-pdp:local`
  - [ ] Policy variant: `guard-pro.v2026.02`

---

## 1) Environment and Platform Readiness

- [ ] Docker running
- [ ] OpenClaw CLI reachable in runtime shell
- [ ] Node/npm available for plugin build
- [ ] Repos present:
  - [ ] `C:\dev\openclaw-trusted-mode`
  - [ ] `C:\dev\sde-enterprise`
- [ ] Ports available:
  - [ ] `8001` PDP
  - [ ] `8002` hardening (optional)
  - [ ] `8003` license server (optional)

If ports unavailable, pick alternates (example `18001/18002/18003`) and update plugin `pdpUrl`.

---

## 2) Security and Governance Baseline

- [ ] `plugins.entries.openclaw-trusted-mode.enabled=true`
- [ ] `failClosed=true` in plugin config
- [ ] `tenantId="trial-tenant"` (or production tenant) in plugin config
- [ ] `plugins.allow` set to trusted plugin IDs (recommended)
- [ ] Entitlements updated for production tenant(s) in:
  - `C:\dev\sde-enterprise\ops\entitlements.json`
- [ ] Variant mapping set as needed in:
  - `C:\dev\sde-enterprise\ops\tenant_variants.json`
- [ ] Policy pack + signature present:
  - `guard_pro_v2026_02.json`
  - `guard_pro_v2026_02.sig`

---

## 3) Install and Configure

### 3.1 Build plugin

```powershell
cd C:\dev\openclaw-trusted-mode
npm install
npm run build
```

- [ ] Build successful

### 3.2 Install plugin

Preferred (same runtime shell as OpenClaw):

```bash
openclaw plugins install /mnt/c/dev/openclaw-trusted-mode --no-color
openclaw plugins info openclaw-trusted-mode --no-color
```

Windows + WSL example:

```powershell
wsl bash -lc "/home/\$USER/.npm-global/bin/openclaw plugins install /mnt/c/dev/openclaw-trusted-mode --no-color"
wsl bash -lc "/home/\$USER/.npm-global/bin/openclaw plugins info openclaw-trusted-mode --no-color"
```

- [ ] Plugin status is `loaded`

### 3.3 Start PDP

```powershell
cd C:\dev\sde-enterprise
docker compose -f ops/docker-compose.pdp.yml up --build -d
```

- [ ] PDP container up

---

## 4) Backup and Rollback Preparedness

- [ ] Backed up:
  - [ ] `$HOME\.openclaw\openclaw.json`
  - [ ] `C:\dev\sde-enterprise\ops\entitlements.json`
  - [ ] `C:\dev\sde-enterprise\ops\tenant_variants.json`
  - [ ] `C:\dev\sde-enterprise\packs\openclaw_trusted_mode\policy_packs\*.json/.sig`
- [ ] Prior known-good policy variant identified
- [ ] Rollback owner + commands documented in ticket

---

## 5) Functional Validation (Must Pass)

### 5.1 PDP health

```powershell
curl -s http://localhost:8001/healthz
```

- [ ] Returns `{"status":"ok"}`

### 5.2 PDP authorize smoke

```powershell
curl -s -X POST http://localhost:8001/v1/authorize `
  -H "Content-Type: application/json" `
  -d "{\"decision_sku\":\"openclaw.trusted_mode.authorize.v1\",\"policy_variant\":\"guard-pro.v2026.02\",\"inputs\":{\"action_request\":{\"tool_name\":\"read_file\",\"params\":{\"path\":\"/tmp/x\"}}},\"tenant_id\":\"trial-tenant\"}"
```

- [ ] Returns JSON with `decision`

### 5.3 End-to-end enforcement checks

- [ ] Known allowed action succeeds
- [ ] Known denied action blocks
- [ ] Tool-name mapping validated (`exec` policy key if using shell exec)

### 5.4 Fail-closed test

1. Stop PDP temporarily.
2. Trigger blocked tool action from OpenClaw.

- [ ] Observed block message:
  - `[Trusted Mode BLOCKED] fetch failed`

3. Restart PDP and recheck normal operation.

---

## 6) Observability and Audit

- [ ] OpenClaw logs accessible (`/tmp/openclaw/openclaw-*.log` in WSL)
- [ ] PDP logs accessible (`docker compose logs`)
- [ ] If `AUDIT_EXPORT_PATH` is enabled:
  - [ ] File created/writable
  - [ ] New records present after requests

---

## 7) Incident and Support Readiness

- [ ] On-call assigned
- [ ] Escalation channel documented
- [ ] Primary + backup contacts set
- [ ] Team reviewed incident runbooks:
  - PDP down
  - Unexpected allow
  - Unexpected deny
  - Signature invalid
  - Plugin config invalid

---

## 8) Compliance and Change Control

- [ ] Policy change reviewed by peer
- [ ] Deny rules include `code` + `reason`
- [ ] Default action intentionally approved
- [ ] Approval captured for go-live

---

## 9) Performance and Capacity

- [ ] Baseline latency acceptable in environment
- [ ] `pdpTimeoutMs` tuned for network conditions
- [ ] No sustained PDP errors under normal load

---

## 10) Final Go / No-Go

- [ ] All critical sections complete
- [ ] No open P1/P2 issues
- [ ] Rollback readiness confirmed

Decision:
- [ ] GO
- [ ] NO-GO

Approver:
- Name: __________________
- Role: __________________
- Timestamp: __________________
