# openclaw-trusted-mode

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `WSL`: Windows Subsystem for Linux
- `CI`: Continuous Integration

OpenClaw plugin that enforces Trusted Mode policy checks on `before_tool_call`.

First-time setup (download/install/configure/test/run): [`START_HERE.md`](./START_HERE.md).
Troubleshooting decision tree: [`SELF_SERVICE_FAQ.md`](./SELF_SERVICE_FAQ.md).
Org defaults and support metadata: `C:\dev\ORG_VALUES.md`.
One-command setup: `powershell -ExecutionPolicy Bypass -File C:\dev\bootstrap_self_service.ps1`.
For full install/reinstall/uninstall/startup/config/troubleshooting guidance across both plugin and SDE-PDP, see [`OPERATIONS_GUIDE.md`](./OPERATIONS_GUIDE.md).
For a simpler operator runbook, see [`RUNBOOK_NON_TECHNICAL.md`](./RUNBOOK_NON_TECHNICAL.md).
For go-live gating, use [`PRODUCTION_READINESS_CHECKLIST.md`](./PRODUCTION_READINESS_CHECKLIST.md).
For a pre-filled starting point, use [`PRODUCTION_READINESS_CHECKLIST_EXAMPLE.md`](./PRODUCTION_READINESS_CHECKLIST_EXAMPLE.md).
For alternate port deployments, use [`PRODUCTION_READINESS_CHECKLIST_EXAMPLE_ALT_PORTS.md`](./PRODUCTION_READINESS_CHECKLIST_EXAMPLE_ALT_PORTS.md).
For public launch readiness, use [`PUBLIC_RELEASE_READINESS_CHECKLIST.md`](./PUBLIC_RELEASE_READINESS_CHECKLIST.md).
For end-to-end public release execution steps (what/where/how), use [`PUBLIC_RELEASE_PROCESS_RUNBOOK.md`](./PUBLIC_RELEASE_PROCESS_RUNBOOK.md).
For prioritized remaining work tracking, use [`ROADMAP_EXECUTION.md`](./ROADMAP_EXECUTION.md).
For certified runtime support status, see [`COMPATIBILITY_MATRIX.md`](./COMPATIBILITY_MATRIX.md).
For vulnerability reporting and security posture, see [`SECURITY.md`](./SECURITY.md).
For release hardening process, see [`RELEASE_OPERATIONS.md`](./RELEASE_OPERATIONS.md).
For security evidence indexing, see [`SECURITY_EVIDENCE_BUNDLE.md`](./SECURITY_EVIDENCE_BUNDLE.md).
For performance baseline evidence, see [`PERFORMANCE_BASELINE.md`](./PERFORMANCE_BASELINE.md).
For governed release declaration, see [`RELEASE_v1.0.0.md`](./RELEASE_v1.0.0.md).

## What it does

- Sends tool call context to a Policy Decision Point (PDP) endpoint.
- Denies execution when PDP returns a deny decision.
- Optionally enforces returned constraints.
- Supports fail-closed (default) or fail-open behavior.

## Build and test

```powershell
npm run build
npm test
npm run adversarial-check
npm run performance-benchmark
npm run test-pack-matrix
```

## Trusted Mode Check

```bash
npm run trusted-mode-check
npm run trusted-mode-check -- --json
```

JSON output status values:
- `ENFORCED_OK`
- `LOCKDOWN_ONLY`
- `UNSAFE`

Attestation pack inputs:
- `attestation/trusted_mode_attest_v1.json`
- `attestation/trusted_mode_attest_v1.sig`

Runtime/certification env vars:
- `CERTIFICATION_STATUS` (`CERTIFIED_ENFORCED` | `LOCKDOWN_ONLY` | `UNSUPPORTED`)
- `OPENCLAW_VERSION`
- `EXPECTED_STATUS` (optional CI assertion override)

## Local install in OpenClaw (WSL)

```bash
openclaw plugins install /mnt/c/dev/openclaw-trusted-mode
openclaw plugins info openclaw-trusted-mode
```

## Plugin config

See [`openclaw.plugin.json`](./openclaw.plugin.json) for config schema and defaults, including:

- `pdpUrl`
- `policyVariant`
- `pdpTimeoutMs`
- `failClosed`
- `tenantId`
- `certificationStatus`
- `openclawVersion`
- `certifiedOpenClawVersions`
- `highRiskTools`
- `toolPolicyMode`
- `allowedTools`
- `requireTenantId`
- `allowedTenantIds`
- `contextCurator`

## Compatibility Matrix Automation

```bash
npm run update-compatibility-matrix
npm run verify-compatibility-matrix
```

## Security Gates

```bash
npm run collect-security-evidence
npm run generate-security-release-index
npm run verify-security-gates
```

## Schema Contract and Evidence Bundle

```bash
npm run verify-plugin-schema-contract
npm run bundle-release-evidence
```

## Startup Health Verification

```bash
npm run startup-health-check -- --skip-plugin-check
```
