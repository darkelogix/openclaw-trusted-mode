# Release Operations

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `PDP`: Policy Decision Point
- `CI`: Continuous Integration

## 1) Reproducible Release Pipeline

CI workflow:
- `.github/workflows/release-operations.yml`

Required release commands:

```bash
npm ci
npm run build
npm run verify-release-artifacts
npm run verify-changelog-version
npm run verify-plugin-schema-contract
npm run generate-release-artifacts
npm run collect-security-evidence
npm run generate-security-release-index
npm run performance-benchmark
npm run test-pack-matrix
npm run bundle-release-evidence
```

Before running `performance-benchmark`, ensure PDP is reachable at `PDP_URL` (or run local `scripts/mock_pdp.js`).
Before running `test-pack-matrix`, ensure live PDP is running and reachable at `PDP_URL`.

Release evidence emitted:
- `release-artifacts/checksums.sha256`
- `release-artifacts/release-manifest.json`
- `release-evidence/v<version>/EVIDENCE_INDEX.md`
- `security-artifacts/SECURITY_RELEASE_INDEX.md`
- `performance-artifacts/performance-benchmark.json`

## 2) Artifact Publication

Minimum published files:
- `dist/index.js`
- `dist/cli.js`
- `openclaw.plugin.json`
- `attestation/trusted_mode_attest_v1.json`
- `attestation/trusted_mode_attest_v1.sig`
- `release-artifacts/checksums.sha256`
- `release-artifacts/release-manifest.json`

## 3) Checksum Verification

Consumers can verify integrity:

```bash
sha256sum -c checksums.sha256
```

PowerShell:

```powershell
Get-Content .\checksums.sha256
```

## 4) Dry-Run Release Execution

Perform before every public release:
1. Trigger `release-operations` workflow manually (`workflow_dispatch`).
2. Confirm workflow success.
3. Download and archive workflow artifacts.
4. Validate `checksums.sha256` and manifest contents.
5. Validate bundled evidence index under `release-evidence/v<version>/`.
6. Attach evidence links to release record.

## 5) Rollback Drill Standard

Run at least once per release train:
1. Deploy current release candidate to non-production.
2. Capture baseline allow/deny behavior and Trusted Mode Check output.
3. Roll back plugin and policy variant to known-good version.
4. Re-run functional checks and Trusted Mode Check.
5. Record timing, failure points, and operator actions.

Evidence file:
- `ROLLBACK_DRILL_RECORD.md`
