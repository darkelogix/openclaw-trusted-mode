# Start Here: OpenClaw Trusted Mode

Use this guide to choose the right path:

- Free local hardening: install the public npm package and block high-risk OpenClaw actions locally.
- Paid dexgate governed mode: install the public npm package, then use the dexgate customer console to obtain the licensed SDE runtime, deployment bundle, PDP URL, and PDP auth token.

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## 1. Install The Public Adapter

Create a clean directory on the OpenClaw host:

```powershell
mkdir dexgate-openclaw-first-success
cd dexgate-openclaw-first-success
npm init -y
npm install @dexgate/openclaw-trusted-mode@1.0.7
openclaw plugins install ./node_modules/@dexgate/openclaw-trusted-mode
openclaw plugins info openclaw-trusted-mode
```

Expected: the plugin is loaded by OpenClaw.

## 2. Free Local Hardening

Run the local check:

```powershell
npx openclaw-trusted-mode-check --json
```

Expected free posture:

- `governed: false`
- local hardening source
- read/search/list workflows allowed
- shell, write, delete, and other mutating tools blocked unless explicitly configured

This is useful local protection, but it is not SDE-backed governance evidence.

Optional telemetry is off by default. To opt in to coarse product telemetry, set:

```powershell
$env:DEXGATE_TELEMETRY_OPT_IN='true'
```

Telemetry does not include prompts, commands, file paths, tool parameters, PDP payloads, or policy contents.

## 3. Paid dexgate Governed Mode

Use this path only after you have licensed access through dexgate.

1. Sign in to <https://dexgate.ai/console/downloads/>.
2. Download the SDE Runtime bundle, customer config package, runtime secrets package, checksums, and bootstrap script.
3. Install the runtime on the central Linux Docker host and confirm `http://<dexgate-host>:8001/healthz`.
4. Configure each OpenClaw environment host with the portal values.

Configure the plugin:

```powershell
npx --no-install openclaw-trusted-mode-configure `
  --tenantId <tenant-id> `
  --gatewayId <gateway-id> `
  --environment <environment> `
  --pdpUrl http://<dexgate-host>:8001/v1/authorize `
  --pdpAuthToken <PDP_AUTH_TOKEN from runtime-secrets.env> `
  --certificationStatus LOCKDOWN_ONLY
```

Run the governed check:

```powershell
$env:TENANT_ID='<tenant-id>'
$env:GATEWAY_ID='<gateway-id>'
$env:ENVIRONMENT='<environment>'
$env:PDP_URL='http://<dexgate-host>:8001/v1/authorize'
$env:PDP_HEALTH_URL='http://<dexgate-host>:8001/healthz'
$env:PDP_AUTH_TOKEN='<PDP_AUTH_TOKEN from runtime-secrets.env>'
npx --no-install openclaw-trusted-mode-check --json
```

Expected governed posture:

- the check reaches the licensed SDE PDP
- requests include the PDP bearer token
- results include a GateDecision and policy context
- production-bound allowed actions can include passport and verification fields

Do not commit `PDP_AUTH_TOKEN` or paste it into shared tickets.

## 4. Customer Setup Docs

Use the portal and customer docs for deployment work:

- dexgate customer quickstart: <https://dexgate.ai/docs/dexgate/quickstart/>
- full customer setup tutorial: <https://dexgate.ai/docs/dexgate/customer-setup/>
- compatibility matrix: <https://dexgate.ai/compatibility/>

## 5. Source Contributor Path

Use the source repo only when you are developing or validating the adapter itself:

```powershell
npm install
npm run build
npm test
npm run local-hardening-check
```

Repo-local mock PDP examples are simulated unless they point at a licensed dexgate SDE runtime with a valid PDP auth token. Treat mock output as adapter validation only, not production evidence.
