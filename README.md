# DexGate OpenClaw Adapter Package

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `PEP`: Policy Enforcement Point
- `WSL`: Windows Subsystem for Linux
- `CI`: Continuous Integration

OpenClaw adapter package that can forward selected tool-call metadata to a configured DexGate policy service when connected to an authorized deployment.
Documentation index (by audience and task): [`docs/README.md`](./docs/README.md).

## npm Package

Install the public MIT adapter/plugin package with:

```bash
npm install @dexgate/openclaw-trusted-mode
```

## What `npm install` gives you

`npm install @dexgate/openclaw-trusted-mode` gives you the MIT adapter/plugin layer and standalone hardening flow only. It does not grant access to the proprietary SDE runtime, enterprise deployment packs, or governed tenant entitlements.

Public adapter availability does not by itself indicate:
- active protected execution
- active DexGate policy enforcement
- active customer entitlement
- active context curation
- deployment assurance, validation status, or approval of a deployment

## Need DexGate service-backed operation?

If you want DexGate service-backed operation, compare plans at <https://dexgate.ai/pricing/> or download your licensed runtime and deployment instructions from <https://dexgate.ai/console/downloads/>. Use the public npm package for adapter installation, then connect it to your licensed DexGate environment for policy decision requests, decision records, and rollout controls.

A configured licensed deployment may support:
- PDP-backed authorization before selected actions execute
- decision records and trace IDs
- tenant entitlements, gateway/environment limits, and rollout evidence
- licensed runtime bundles and supportable deployment instructions

The npm package contains the MIT plugin files and standalone hardening logic only.
It does not include the proprietary `sde-enterprise` runtime.

## Licensing

The adapter package is licensed under the MIT License.

`sde-enterprise`, including the SDE PDP runtime and related enterprise deployment assets, is proprietary software and is not covered by the plugin's MIT license. Use, copying, modification, distribution, or deployment of the SDE runtime requires separate commercial rights under counsel-approved terms.

First-time setup (download/install/configure/test/run): [`START_HERE.md`](./START_HERE.md).
Troubleshooting decision tree: [`SELF_SERVICE_FAQ.md`](./SELF_SERVICE_FAQ.md).
Org defaults and support metadata are delivered through the customer console and the licensed runtime configuration package.
One-command setup is generated per customer in the console Downloads page alongside the licensed runtime bundle.
For full install/reinstall/uninstall/startup/config/troubleshooting guidance across both plugin and SDE-PDP, see [`OPERATIONS_GUIDE.md`](./OPERATIONS_GUIDE.md).
For a simpler operator runbook, see [`RUNBOOK_NON_TECHNICAL.md`](./RUNBOOK_NON_TECHNICAL.md).
For go-live gating, use [`PRODUCTION_READINESS_CHECKLIST.md`](./PRODUCTION_READINESS_CHECKLIST.md).
For a pre-filled starting point, use [`PRODUCTION_READINESS_CHECKLIST_EXAMPLE.md`](./PRODUCTION_READINESS_CHECKLIST_EXAMPLE.md).
For alternate port deployments, use [`PRODUCTION_READINESS_CHECKLIST_EXAMPLE_ALT_PORTS.md`](./PRODUCTION_READINESS_CHECKLIST_EXAMPLE_ALT_PORTS.md).
For public launch readiness, use [`PUBLIC_RELEASE_READINESS_CHECKLIST.md`](./PUBLIC_RELEASE_READINESS_CHECKLIST.md).
For end-to-end public release execution steps (what/where/how), use [`PUBLIC_RELEASE_PROCESS_RUNBOOK.md`](./PUBLIC_RELEASE_PROCESS_RUNBOOK.md).
For runtime support status, see [`COMPATIBILITY_MATRIX.md`](./COMPATIBILITY_MATRIX.md).
For vulnerability reporting, see [`SECURITY.md`](./SECURITY.md).
For release hardening process, see [`RELEASE_OPERATIONS.md`](./RELEASE_OPERATIONS.md).
Internal release evidence is not part of the public adapter package unless separately approved.
For performance baseline evidence, see [`PERFORMANCE_BASELINE.md`](./PERFORMANCE_BASELINE.md).
For release declaration notes, see [`RELEASE_v1.0.0.md`](./RELEASE_v1.0.0.md).

## Capability Kernel role

This package is a **PEP adapter** for the SDE / DexGate Capability Kernel
(`PROPOSE → OBSERVE → UPDATE → BOUND → DECIDE → ACT → LEARN`). It normalizes
tool calls into **Proposals**, applies a free local hard gate or paid PDP
evaluation, and enforces decisions before side effects. It is not the kernel
runtime; `npm install` alone does not grant SDE or passport authority.

## What it does

- Free standalone mode defaults to local hardening with a minimal allowlist:
  - `read_file`
  - `list_files`
  - `search_files`
- Blocks high-risk tools such as `exec`, file writes/edits, and deletes unless you deliberately widen the policy.
- Can send selected tool-call context to a configured Policy Decision Point (PDP) endpoint (passport-schema evaluation).
- Can block execution when a configured PDP returns a deny decision.
- Can apply returned constraints when the runtime and deployment are configured for that behavior.
- Supports fail-closed (default) or fail-open behavior.
- Status depends on configured policy, entitlement, PDP availability, and runtime checks.

## Free vs Paid

The product boundary should be explicit at install time:

- `npm install` gets you the adapter/plugin and standalone hardening path
- DexGate service-backed operation requires a separately licensed deployment
- the customer console is the supported way to obtain runtime artifacts, PDP auth tokens, and deployment instructions


- Free standalone use:
  - useful as a local hardening layer (hard gate)
  - works without `sde-enterprise`
  - best for "read/search only" OpenClaw sessions
- Paid / enterprise use:
  - PDP-backed authorization and deny decisions (Capability Kernel DECIDE path)
  - local integrity-checked policy packs
  - tenant entitlements and controlled rollout
  - local integrity evidence and compatibility review
  - PEP fail-closed enforcement before tool side effects

## Build and test

```powershell
npm run build
npm run local-hardening-check
npm test
npm run adversarial-check
npm run performance-benchmark
npm run test-pack-matrix
```

## Service-Backed Status Path

```bash
npm run trusted-mode-check
npm run trusted-mode-check -- --json
```

`trusted-mode-check` is the existing command name for a PDP-backed status path. It is useful for SDE-integrated deployments, not for standalone free-mode validation. The command name is a technical compatibility label, not public assurance, approval, or guarantee wording.

For standalone free-mode validation, run:

```bash
npm run local-hardening-check
# or, after package install:
npx openclaw-local-hardening-check
```

Expected report fields include `governed: false` and `source: "local-hardening"`. That is intentional: free mode demonstrates local hardening behavior, not active DexGate service-backed operation.

## Optional telemetry

Telemetry is disabled by default. If you opt in, the adapter sends coarse usage events to dexgate so we can understand where free users succeed, where upgrade friction appears, and which runtime path needs better guidance.

Opt in with:

```bash
DEXGATE_TELEMETRY_OPT_IN=true npm run local-hardening-check
```

Telemetry does not include prompts, commands, file paths, tool parameters, PDP payloads, or policy contents. Tenant and gateway identifiers are hashed before transmission. You can set `DEXGATE_TELEMETRY_INSTALL_ID` to a non-secret identifier if you want repeated checks from the same environment grouped together.

JSON output status values:
- `ENFORCED_OK`
- `LOCKDOWN_ONLY`
- `UNSAFE`

These are technical status labels emitted by the local check path. They are not public assurance, guarantee, or approval wording.

The JSON output also includes the exact governed context it checked:
- `pdp_url`
- `tenant_id`
- `gateway_id`
- `environment`

Use those fields first when a service-backed check fails. If DexGate is reachable but denies the request, confirm the workspace is licensed and the tenant, gateway, environment, and PDP auth token match the runtime you installed.

Local integrity check inputs:
- `attestation/trusted_mode_attest_v1.json`
- `attestation/trusted_mode_attest_v1.sig` (SHA-256 checksum file; retained filename for compatibility)

Runtime status env vars:
- `CERTIFICATION_STATUS` (`LOCKDOWN_ONLY` | `UNSUPPORTED`; other values require counsel-approved evidence before public use)
- `OPENCLAW_VERSION`
- `EXPECTED_STATUS` (optional CI assertion override)
- `PDP_AUTH_TOKEN` or `DEXGATE_PDP_AUTH_TOKEN` (optional bearer token for licensed PDP authentication)

## Local install in OpenClaw (WSL)

```bash
openclaw plugins install /mnt/c/path/to/openclaw-trusted-mode
openclaw plugins info openclaw-trusted-mode
```

For a standalone free-mode config, start from [`openclaw.user-config.entry.example.json`](./openclaw.user-config.entry.example.json).

For DexGate service-backed mode, install/register the plugin first, then write the OpenClaw host config with:

```bash
openclaw-trusted-mode-configure \
  --tenantId dexgate \
  --gatewayId gw-dev \
  --environment dev \
  --pdpUrl http://10.90.0.6:8001/v1/authorize \
  --pdpAuthToken <runtime-token> \
  --certificationStatus LOCKDOWN_ONLY
```

This command updates `~/.openclaw/openclaw.json`, adds `openclaw-trusted-mode` to `plugins.allow`, and writes the service-backed plugin settings under `plugins.entries.openclaw-trusted-mode`.

## Plugin config

See [`openclaw.plugin.json`](./openclaw.plugin.json) for config schema and defaults, including:

- `pdpUrl`
- `pdpAuthToken`
- `policyVariant`
- `pdpTimeoutMs`
- `failClosed`
- `tenantId`
- `certificationStatus` (technical status field name retained for compatibility; public assurance wording requires separate approval)
- `openclawVersion`
- `certifiedOpenClawVersions` (compatibility field name retained for backward compatibility)
- `highRiskTools`
- `toolPolicyMode`
- `allowedTools`
- `requireTenantId`
- `allowedTenantIds`
- `contextCurator`

Recommended standalone free-mode baseline:

```json
{
  "toolPolicyMode": "ALLOWLIST_ONLY",
  "allowedTools": ["read_file", "list_files", "search_files"],
  "failClosed": true,
  "certificationStatus": "LOCKDOWN_ONLY"
}
```

Recommended licensed / PDP-backed baseline:

```json
{
  "toolPolicyMode": "PDP",
  "pdpUrl": "http://localhost:8001/v1/authorize",
  "pdpAuthToken": "<runtime-token>",
  "tenantId": "trial-tenant",
  "gatewayId": "gw-smoke-1",
  "environment": "prod",
  "failClosed": true,
  "certificationStatus": "LOCKDOWN_ONLY"
}
```

## Compatibility Matrix Automation

```bash
npm run update-compatibility-matrix
npm run verify-compatibility-matrix
```

## Internal Release Checks

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
