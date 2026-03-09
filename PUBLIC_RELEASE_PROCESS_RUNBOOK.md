# Public Release Process Runbook (OpenClaw Trusted Mode + SDE Enterprise)

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `CI`: Continuous Integration

## 1) Release Units (What Is Being Released)

Every release has 4 units:

1. Plugin code release (`openclaw-trusted-mode`):
- Source at tag `v<plugin_version>`
- Build outputs:
  - `dist/index.js`
  - `dist/cli.js`
  - `openclaw.plugin.json`
  - `attestation/trusted_mode_attest_v1.json`
  - `attestation/trusted_mode_attest_v1.sig`
  - `RELEASE_v<plugin_version>.md`
  - `COMPATIBILITY_MATRIX.md`
  - `CHANGELOG.md`

2. Plugin integrity and evidence release:
- `release-artifacts/checksums.sha256`
- `release-artifacts/release-manifest.json`
- `security-artifacts/security-summary.json`
- `security-artifacts/SECURITY_RELEASE_INDEX.md`
- `performance-artifacts/performance-benchmark.json`
- `release-evidence/v<plugin_version>/` bundle

3. SDE runtime release (`sde-enterprise`):
- PDP container image
- Hardening container image
- License server runtime path (same codebase, command variant)
- Compose/deployment assets:
  - `ops/docker-compose.pdp.yml`
  - `ops/docker-compose.reference.yml`
  - `ops/Dockerfile.pdp`
  - `ops/Dockerfile.hardening`
  - `ops/entitlements.json`

4. Signed policy pack bundle release:
- `pack.json`
- `pack.sig`
- `manifest.json`
- Verified with `ops/verify_pack_bundle.py`

## 2) Publication Targets (Where To Release)

Release each unit to explicit destinations:

1. Public source + release notes:
- `openclaw-trusted-mode` Git repository
- Tag: `v<plugin_version>` (matches `package.json`)
- Release notes source: `CHANGELOG.md` + `RELEASE_v<plugin_version>.md`

2. Public downloadable artifacts:
- GitHub Release assets for the same tag
- Attach at minimum:
  - `dist/index.js`
  - `dist/cli.js`
  - `openclaw.plugin.json`
  - `attestation/trusted_mode_attest_v1.json`
  - `attestation/trusted_mode_attest_v1.sig`
  - `release-artifacts/checksums.sha256`
  - `release-artifacts/release-manifest.json`
  - `COMPATIBILITY_MATRIX.md`

3. Enterprise runtime distribution:
- Private container registry for `sde-pdp` and `sde-hardening` images (tag with same release ID)
- Offline customers: deliver `sde-pdp.tar` and `sde-hardening.tar` plus compose/config files

4. Private policy distribution:
- Signed bundle delivered through enterprise channel (customer secure file delivery or private artifact store)
- Install destination on target systems:
  - `packs/openclaw_trusted_mode/policy_packs/`

## 3) Versioning Rules (Must Pass Before Cut)

1. `openclaw-trusted-mode/package.json` version is final.
2. `CHANGELOG.md` contains that exact version heading (validated by `verify-changelog-version`).
3. `RELEASE_v<plugin_version>.md` exists and includes required sections.
4. `COMPATIBILITY_MATRIX.md` references the exact plugin version.
5. SDE image tags, pack version (`manifest.json` and `pack.json`), and release ticket ID are aligned.

## 4) Execution Procedure (How To Release)

Run all commands from PowerShell unless noted.

### Phase A - Pre-Release Freeze (T-7 to T-2 days)

1. Freeze scope and identify exclusions.
2. Confirm deployment modes:
- Plugin only
- Plugin + PDP (recommended)
- Reference stack
3. Confirm support baseline:
- OpenClaw versions in `COMPATIBILITY_MATRIX.md`
- Node 22.x for plugin build/runtime (CI workflows may pin Node 20 where explicitly configured)
- Docker/Compose for PDP stack
4. Confirm release owner, rollback owner, and on-call schedule.

Exit criteria:
- `PUBLIC_RELEASE_READINESS_CHECKLIST.md` sections 0-4 are complete.

### Phase B - Build and Verify Plugin Release Candidate

From `<openclaw-trusted-mode-path>`:

```powershell
npm ci
npm run build
npm test
npm run verify-release-artifacts
npm run verify-changelog-version
npm run verify-plugin-schema-contract
npm run generate-release-artifacts
```

Expected outputs:
- `release-artifacts/checksums.sha256`
- `release-artifacts/release-manifest.json`

### Phase C - Security, Compatibility, and Performance Gates

From `<openclaw-trusted-mode-path>`:

```powershell
mkdir security-artifacts -ErrorAction SilentlyContinue | Out-Null
npm audit --json > security-artifacts/npm-audit.json
npm run collect-security-evidence
npm run generate-third-party-notices
npm run generate-security-release-index
npm run verify-security-gates
npm run performance-benchmark
npm run test-pack-matrix
npm run bundle-release-evidence
```

Notes:
- If running benchmark without a live PDP, start mock PDP:
```powershell
node scripts/mock_pdp.js
```
- Security gate fails if high/critical findings are open (unless explicitly overridden with `ALLOW_SECURITY_FINDINGS=true`).

Expected outputs:
- `security-artifacts/SECURITY_RELEASE_INDEX.md`
- `performance-artifacts/performance-benchmark.json`
- test-pack matrix report with TCTP/EVTP status from `npm run test-pack-matrix`
- `release-evidence/v<plugin_version>/EVIDENCE_INDEX.md`

### Phase D - Validate SDE Enterprise Runtime Bundle

From `<sde-enterprise-path>`:

1. Validate artifact contract tests:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/run_artifacts.ps1
```

2. Build runtime images:
```powershell
docker build -f ops/Dockerfile.pdp -t sde-pdp:<release_id> .
docker build -f ops/Dockerfile.hardening -t sde-hardening:<release_id> .
```

3. Smoke-test deployment:
```powershell
docker compose -f ops/docker-compose.reference.yml up --build -d
curl -s http://localhost:8001/healthz
curl -s http://localhost:8002/assess
```

Recommended PDP enforcement env vars for enterprise certification behavior:
- `ENFORCE_TENANT_POLICY_VARIANT_LOCK=true`
- `REQUIRE_TENANT_VARIANT_MAPPING=true` (recommended for strict multi-tenant governance)
- `OUTCOME_SIGNING_PRIVATE_KEY=<ed25519_private_key_hex>` (enables signed `outcome_event`)

Artifact distinction for evidence:
- `outcome_event`: operational event artifact (timestamped, audit-oriented).
- `decision_proof`: deterministic certification artifact (stable signed proof for identical decisions).

4. Verify signed pack bundle before shipment:
```powershell
python ops/verify_pack_bundle.py <bundle_dir>
```

5. Prepare offline distribution (if required):
```powershell
docker save -o sde-pdp.tar sde-pdp:<release_id>
docker save -o sde-hardening.tar sde-hardening:<release_id>
```

Exit criteria:
- Health and assess endpoints return successful responses.
- Pack verification prints `OK: bundle verified`.

### Phase E - Publish

1. Tag plugin repo:
- `git tag v<plugin_version>`
- `git push origin v<plugin_version>`

2. Execute/confirm GitHub Actions release pipeline:
- Workflow: `.github/workflows/release-operations.yml`
- Verify uploaded artifact `release-evidence-bundle`

3. Create GitHub Release for `v<plugin_version>` and attach required assets.

4. Push SDE images to private registry:
- `sde-pdp:<release_id>`
- `sde-hardening:<release_id>`

5. Distribute signed pack bundle to entitled enterprise customers and include install instructions from `docs/private_pack_distribution.md`.

### Phase F - Post-Release Monitoring (0-48h)

1. Monitor:
- Plugin install failures
- PDP reachability/fail-closed errors
- Unexpected allow/deny behavior
- Signature verification failures
- Missing/invalid `decision_hash`, `decision_proof`, or `outcome_event` in PDP responses

2. Confirm audit export behavior where enabled (`AUDIT_EXPORT_PATH`).

3. Hold 24h and 7-day checkpoints with:
- open issues
- hotfix decisions
- support escalations

## 5) Mandatory Release Record (Create Per Release)

Create one release record in your tracking system containing:

1. Release ID and timestamps.
2. Version tuple:
- Plugin version
- OpenClaw certified versions
- SDE image tags
- Policy pack version/variant
3. Links/paths to evidence:
- `release-artifacts/checksums.sha256`
- `release-artifacts/release-manifest.json`
- `release-evidence/v<plugin_version>/EVIDENCE_INDEX.md`
- `security-artifacts/SECURITY_RELEASE_INDEX.md`
- `performance-artifacts/performance-benchmark.json`
4. Go/No-Go approver name and time.
5. Rollback owner and rollback commands tested.

## 6) Rollback Standard (If Release Is Bad)

1. Revert plugin to previous known-good tag/build.
2. Restore previous policy pack `.json` and `.sig`.
3. Revert SDE runtime images to previous known-good tags.
4. Restart runtime and rerun:
- Trusted Mode check
- `/healthz` and `/assess`
5. Record incident timeline in `ROLLBACK_DRILL_RECORD.md` format.

## 7) Definition Of Done

Release is complete only when all are true:

1. Public plugin tag + release assets are published.
2. Checksums and manifest are published and reproducible.
3. Security, compatibility, and performance evidence is bundled and linked.
4. Enterprise runtime images and signed policy packs are distributed to intended channels.
5. On-call/support window is active and first-day review completed.

