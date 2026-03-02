# Production Readiness Checklist (Example - Alternate Ports)

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `PDP`: Policy Decision Point
- `CLI`: Command Line Interface
- `WSL`: Windows Subsystem for Linux

## 0) Release Metadata

- [ ] Release ID assigned (`tm-<YYYYMMDD>-altports-<n>`)
- [ ] Change window approved
- [ ] Rollback owner assigned
- [ ] Version tuple recorded:
  - [ ] OpenClaw CLI version
  - [ ] Plugin version
  - [ ] PDP image/tag
  - [ ] Policy variant
  - [ ] Port map (`18001/18002/18003`)

---

## 1) Environment and Port Readiness

- [ ] Docker running
- [ ] OpenClaw CLI reachable in runtime shell
- [ ] Repos present:
  - [ ] `C:\dev\openclaw-trusted-mode`
  - [ ] `C:\dev\sde-enterprise`
- [ ] Confirm alternate ports free:
  - [ ] `18001`
  - [ ] `18002`
  - [ ] `18003`

Windows check:

```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 18001,18002,18003 } |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

---

## 2) Compose Port Override

- [ ] Create override file:
  - `C:\dev\sde-enterprise\ops\docker-compose.override.ports.yml`

Contents:

```yaml
services:
  sde-pdp:
    ports:
      - "18001:8001"
```

If using reference stack:

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

- [ ] Override file reviewed and committed (if applicable)

---

## 3) Install and Configure

### 3.1 Plugin build

```powershell
cd C:\dev\openclaw-trusted-mode
npm install
npm run build
```

- [ ] Build successful

### 3.2 Plugin install

```powershell
wsl bash -lc "/home/\$USER/.npm-global/bin/openclaw plugins install /mnt/c/dev/openclaw-trusted-mode --no-color"
wsl bash -lc "/home/\$USER/.npm-global/bin/openclaw plugins info openclaw-trusted-mode --no-color"
```

- [ ] Plugin status is `loaded`

### 3.3 Plugin config update for alt PDP port

- [ ] `~/.openclaw/openclaw.json` plugin config set:
  - `pdpUrl = http://localhost:18001/v1/authorize`
  - If needed in WSL: `http://host.docker.internal:18001/v1/authorize`

### 3.4 Start PDP with override

```powershell
cd C:\dev\sde-enterprise
docker compose -f ops/docker-compose.pdp.yml -f ops/docker-compose.override.ports.yml up --build -d
```

- [ ] PDP container up

---

## 4) Health and Functional Validation

### 4.1 Health

```powershell
curl -s http://localhost:18001/healthz
```

- [ ] Returns `{"status":"ok"}`

### 4.2 Authorize smoke

```powershell
curl -s -X POST http://localhost:18001/v1/authorize `
  -H "Content-Type: application/json" `
  -d "{\"decision_sku\":\"openclaw.trusted_mode.authorize.v1\",\"policy_variant\":\"guard-pro.v2026.02\",\"inputs\":{\"action_request\":{\"tool_name\":\"read_file\",\"params\":{\"path\":\"/tmp/x\"}}},\"tenant_id\":\"trial-tenant\"}"
```

- [ ] Returns JSON with `decision`

### 4.3 End-to-end checks

- [ ] Allowed action passes
- [ ] Denied action blocks
- [ ] Fail-closed behavior confirmed when PDP intentionally stopped

---

## 5) Backup and Rollback

- [ ] Backups captured (same set as default checklist)
- [ ] Rollback commands include port override file handling
- [ ] Team can revert to default port map if needed

Rollback command (alt stack down):

```powershell
cd C:\dev\sde-enterprise
docker compose -f ops/docker-compose.pdp.yml -f ops/docker-compose.override.ports.yml down
```

---

## 6) Observability

- [ ] OpenClaw logs accessible
- [ ] PDP logs accessible from alt-port deployment
- [ ] Audit path valid (if enabled)

---

## 7) Go / No-Go

- [ ] All checks complete
- [ ] No open P1/P2 issues
- [ ] Port mapping documented in release record

Decision:
- [ ] GO
- [ ] NO-GO

Approver:
- Name: __________________
- Role: __________________
- Timestamp: __________________
