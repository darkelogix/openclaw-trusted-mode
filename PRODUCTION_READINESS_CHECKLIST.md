# Production Readiness Checklist (SDE-PDP + OpenClaw Trusted Mode Plugin)

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `SKU`: Stock Keeping Unit
- `CLI`: Command Line Interface
- `WSL`: Windows Subsystem for Linux

## 0) Release Metadata (required)

- [ ] Release ID assigned (`<release_id>`)
- [ ] Change window approved (`<date/time/timezone>`)
- [ ] Rollback owner assigned
- [ ] Release notes finalized
- [ ] Version tuple recorded:
  - [ ] OpenClaw CLI version
  - [ ] Plugin version (`package.json`)
  - [ ] PDP image/tag
  - [ ] Policy variant(s)

Evidence:
- [ ] Version tuple file or ticket comment attached

---

## 1) Environment and Platform Readiness

### 1.1 Runtime prerequisites

- [ ] Docker Engine/Desktop + Compose installed and working
- [ ] OpenClaw CLI available in runtime shell
- [ ] Node.js/npm available for plugin build
- [ ] Repo access validated:
  - [ ] `C:\dev\openclaw-trusted-mode`
  - [ ] `C:\dev\sde-enterprise`

### 1.2 Port and network readiness

- [ ] PDP host port selected (`8001` or override)
- [ ] Optional ports selected (`8002`, `8003` or overrides)
- [ ] Firewall/network path allows OpenClaw runtime -> PDP endpoint
- [ ] Final PDP URL confirmed: `<PDP_URL>`

### 1.3 Host/path mapping (if Windows + WSL)

- [ ] Path mapping validated (`C:\...` <-> `/mnt/c/...`)
- [ ] OpenClaw runtime can resolve PDP host (`localhost` or `host.docker.internal`)

Evidence:
- [ ] Screenshot/log of successful health check connectivity path

---

## 2) Security and Governance Baseline

### 2.1 OpenClaw controls

- [ ] Plugin entry exists and enabled:
  - `plugins.entries.openclaw-trusted-mode.enabled=true`
- [ ] `failClosed=true` for production
- [ ] `tenantId` explicitly configured for production tenant
- [ ] `plugins.allow` configured to explicit trusted plugin IDs (recommended)

### 2.2 PDP controls

- [ ] PDP exposed only on intended network boundary
- [ ] TLS/reverse proxy configured if PDP is not localhost-only
- [ ] Entitlement file access restricted
- [ ] Policy pack directory write access restricted
- [ ] Audit path access restricted (if enabled)

### 2.3 Policy integrity

- [ ] Active policy pack `.json` file present
- [ ] Matching `.sig` file present
- [ ] Signature verification succeeds at PDP startup

Evidence:
- [ ] Config snippet with sensitive data redacted
- [ ] PDP startup logs showing successful pack verification

---

## 3) Installation and Configuration

### 3.1 Plugin build/install

- [ ] Plugin build succeeds:
```bash
cd C:\dev\openclaw-trusted-mode
npm install
npm run build
```
- [ ] Plugin installed:
```bash
openclaw plugins install C:\dev\openclaw-trusted-mode --no-color
openclaw plugins info openclaw-trusted-mode --no-color
```
- [ ] Plugin status is `loaded`

### 3.2 SDE-PDP deployment

- [ ] PDP stack starts:
```bash
cd C:\dev\sde-enterprise
docker compose -f ops/docker-compose.pdp.yml up --build -d
```
- [ ] Health check passes:
```bash
curl -s <PDP_URL>/../healthz
```
Example:
```bash
curl -s http://localhost:8001/healthz
```

### 3.3 Entitlements and tenant mapping

- [ ] `ops/entitlements.json` contains `<TENANT_ID>` and required SKU
- [ ] `ops/tenant_variants.json` has intended variant (if tenant-specific mapping used)

Evidence:
- [ ] `plugins info` output captured
- [ ] PDP health output captured

---

## 4) Backup and Rollback Preparedness

### 4.1 Pre-cutover backups completed

- [ ] `~/.openclaw/openclaw.json` backup stored
- [ ] `ops/entitlements.json` backup stored
- [ ] `ops/tenant_variants.json` backup stored
- [ ] Policy pack `.json/.sig` backup stored

### 4.2 Rollback plan verified

- [ ] Previous known-good plugin build available
- [ ] Previous known-good policy variant identified
- [ ] Rollback commands documented in release ticket
- [ ] Rollback owner confirmed

Evidence:
- [ ] Backup artifact paths recorded
- [ ] Rollback drill completed in non-prod (recommended)

---

## 5) Functional Validation (must pass)

Run these tests after deployment and after any policy/plugin change.

### 5.1 PDP API validation

- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Allow case returns `decision=allow`
- [ ] Deny case returns `decision=deny`
- [ ] Unknown/unentitled tenant returns `ENTITLEMENT_DENIED`

### 5.2 Plugin enforcement validation

- [ ] Hook fires on tool calls (logs show `HOOK FIRED`)
- [ ] Denied action is blocked end-to-end in OpenClaw
- [ ] Allowed action proceeds successfully
- [ ] With PDP intentionally down, blocked result appears in fail-closed mode:
  - `[Trusted Mode BLOCKED] fetch failed`

### 5.3 Tool-name policy match validation

- [ ] Confirm policy keys match actual runtime tool names (example `exec`)
- [ ] No false allow caused by mismatched tool naming (`execute_shell` vs `exec`)

Evidence:
- [ ] Log excerpts attached for allow/deny/fail-closed cases

---

## 6) Observability and Audit Readiness

### 6.1 Logging

- [ ] OpenClaw logs accessible (`/tmp/openclaw/openclaw-*.log` or equivalent)
- [ ] PDP container logs accessible
- [ ] Operators know filter commands for:
  - hook fired
  - deny
  - fetch failed
  - entitlement denied
  - signature invalid

### 6.2 Audit export (if enabled)

- [ ] `AUDIT_EXPORT_PATH` configured
- [ ] Audit file created and writable
- [ ] New decision records appear after test requests
- [ ] Retention/rotation policy documented

Evidence:
- [ ] Sample sanitized log lines attached
- [ ] Sample sanitized audit record attached

---

## 7) Incident Response Readiness

- [ ] Incident runbooks reviewed by operators:
  - PDP down
  - Unexpected allow
  - Unexpected deny
  - Signature failure
  - Plugin config invalid
- [ ] On-call ownership finalized
- [ ] Escalation path finalized
- [ ] Contact details documented:
  - Primary: `<PRIMARY_ONCALL_CONTACT>`
  - Secondary: `<backup>`
  - Channel: `<chat channel>`
  - Email/ticket queue: `<queue>`

Evidence:
- [ ] Tabletop drill completed (recommended)

---

## 8) Compliance and Change Control

- [ ] Policy changes peer-reviewed
- [ ] Deny rules include `code` and `reason`
- [ ] Default policy action intentionally approved
- [ ] Change ticket links code/config changes to test evidence
- [ ] Approval record captured for go-live

Evidence:
- [ ] PR/review links
- [ ] Approval artifact (ticket/comment/sign-off)

---

## 9) Performance and Capacity (minimum baseline)

- [ ] PDP response time under expected load is acceptable
- [ ] `pdpTimeoutMs` set appropriately for environment latency
- [ ] No sustained error spikes in logs during soak window
- [ ] Resource limits/requests configured for deployment environment

Evidence:
- [ ] Basic latency/error summary attached

---

## 10) Final Go/No-Go

### Go criteria

- [ ] Sections 0 through 8 fully complete
- [ ] Section 9 complete or formally waived by approver
- [ ] No open P1/P2 issues
- [ ] Rollback plan tested or explicitly approved untested

### Decision

- [ ] GO
- [ ] NO-GO

Approver:
- Name: `ORG_SUPPORT_PRIMARY_OWNER`
- Role: `<role>`
- Timestamp: `<timestamp>`

---

## Appendix A: Quick Validation Commands

```bash
# Plugin status
openclaw plugins info openclaw-trusted-mode --no-color

# PDP health
curl -s http://localhost:8001/healthz

# PDP authorize smoke
curl -s -X POST http://localhost:8001/v1/authorize \
  -H "Content-Type: application/json" \
  -d '{"decision_sku":"openclaw.trusted_mode.authorize.v1","policy_variant":"guard-pro.v2026.02","inputs":{"action_request":{"tool_name":"read_file","params":{"path":"/tmp/x"}}},"tenant_id":"trial-tenant"}'
```

PowerShell:

```powershell
openclaw plugins info openclaw-trusted-mode --no-color
curl -s http://localhost:8001/healthz
curl -s -X POST http://localhost:8001/v1/authorize `
  -H "Content-Type: application/json" `
  -d "{\"decision_sku\":\"openclaw.trusted_mode.authorize.v1\",\"policy_variant\":\"guard-pro.v2026.02\",\"inputs\":{\"action_request\":{\"tool_name\":\"read_file\",\"params\":{\"path\":\"/tmp/x\"}}},\"tenant_id\":\"trial-tenant\"}"
```
