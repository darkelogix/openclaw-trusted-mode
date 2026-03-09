#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    skipPluginCheck: args.has('--skip-plugin-check'),
    skipPdpCheck: args.has('--skip-pdp-check'),
  };
}

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}

function pass(msg) {
  console.log(`PASS ${msg}`);
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function isAcceptableInvalidPackDeny(body) {
  const denyCode = String(body?.deny_code || '');
  const effectiveVariant = String(body?.trace?.policy_variant || body?.decision_proof?.policy_variant || '');
  return body?.decision === 'deny' && (
    denyCode.includes('SIGNATURE') ||
    denyCode === 'POLICY_VARIANT_IMMUTABLE' ||
    (denyCode === 'HIGH_BLAST' && effectiveVariant && effectiveVariant !== 'invalid-pack')
  );
}

function resolveOpenClawConfigPath() {
  if (process.env.OPENCLAW_CONFIG_PATH) return process.env.OPENCLAW_CONFIG_PATH;
  const home = os.homedir();
  return path.join(home, '.openclaw', 'openclaw.json');
}

function resolveExtensionsDir() {
  if (process.env.OPENCLAW_EXTENSIONS_DIR) return process.env.OPENCLAW_EXTENSIONS_DIR;
  const home = os.homedir();
  return path.join(home, '.openclaw', 'extensions');
}

function checkPluginConfigAndInstall() {
  const configPath = resolveOpenClawConfigPath();
  if (!fs.existsSync(configPath)) fail(`OpenClaw config not found: ${configPath}`);
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    fail(`failed to parse OpenClaw config: ${err?.message || String(err)}`);
  }

  const entry = cfg?.plugins?.entries?.['openclaw-trusted-mode'];
  if (!entry) fail('plugins.entries.openclaw-trusted-mode is missing in OpenClaw config');
  if (entry.enabled !== true) fail('openclaw-trusted-mode plugin is not enabled in OpenClaw config');

  const extensionDir = path.join(resolveExtensionsDir(), 'openclaw-trusted-mode');
  if (!fs.existsSync(extensionDir)) {
    fail(`plugin extension directory not found: ${extensionDir}`);
  }
  pass('plugin config/install check passed');
}

function checkAttestationIntegrity() {
  const root = process.cwd();
  const packPath =
    process.env.TRUSTED_MODE_ATTEST_PATH ||
    path.join(root, 'attestation', 'trusted_mode_attest_v1.json');
  const sigPath =
    process.env.TRUSTED_MODE_ATTEST_SIG_PATH ||
    path.join(root, 'attestation', 'trusted_mode_attest_v1.sig');
  if (!fs.existsSync(packPath)) fail(`missing attestation pack: ${packPath}`);
  if (!fs.existsSync(sigPath)) fail(`missing attestation signature: ${sigPath}`);

  const pack = fs.readFileSync(packPath, 'utf8');
  const sig = fs.readFileSync(sigPath, 'utf8').trim();
  const expected = `sha256:${sha256Hex(pack)}`;
  if (sig !== expected) fail('attestation signature mismatch');
  pass('attestation signature verification passed');
}

async function checkPdpHealth(pdpHealthUrl) {
  let res;
  try {
    res = await fetch(pdpHealthUrl);
  } catch (err) {
    fail(`PDP health request failed: ${err?.message || String(err)}`);
  }
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 404) {
      pass(`PDP health endpoint unavailable (${pdpHealthUrl}); falling back to authorize probe`);
      return;
    }
    fail(`PDP health check bad status ${res.status}: ${body}`);
  }
  pass(`PDP health check passed (${pdpHealthUrl})`);
}

async function checkTrustedModeStatus(pdpUrl, certificationStatus, expectedStatus) {
  const checks = [];
  const call = async (policyVariant, toolName) => {
    const payload = {
      decision_sku: 'openclaw.trusted_mode.authorize.v1',
      policy_variant: policyVariant,
      tenant_id: process.env.TENANT_ID || 'trial-tenant',
      inputs: { action_request: { tool_name: toolName, params: {} } },
    };
    try {
      const res = await fetch(pdpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return { ok: false, detail: `PDP unreachable (${res.status})`, body: null };
      return { ok: true, detail: 'ok', body: await res.json() };
    } catch (err) {
      return { ok: false, detail: err?.message || String(err), body: null };
    }
  };

  const deny = await call(process.env.POLICY_VARIANT || 'guard-pro.v2026.02', 'execute_shell');
  checks.push({
    id: 'deny_high_impact',
    ok: deny.ok && deny.body?.decision === 'deny',
    detail: deny.ok ? `decision=${deny.body?.decision || 'missing'}` : deny.detail,
  });

  const allow = await call(process.env.POLICY_VARIANT || 'guard-pro.v2026.02', 'read_file');
  checks.push({
    id: 'allow_low_impact',
    ok: allow.ok && allow.body?.decision === 'allow',
    detail: allow.ok ? `decision=${allow.body?.decision || 'missing'}` : allow.detail,
  });

  const sig = await call('invalid-pack', 'execute_shell');
  checks.push({
    id: 'signature_failure',
    ok: sig.ok && isAcceptableInvalidPackDeny(sig.body),
    detail: sig.ok ? `decision=${sig.body?.decision || 'missing'} code=${sig.body?.deny_code || 'missing'}` : sig.detail,
  });

  const allOk = checks.every((c) => c.ok);
  const connectivityFailure = checks.some((c) => c.detail.includes('fetch failed') || c.detail.includes('PDP unreachable'));
  let status = 'LOCKDOWN_ONLY';
  if (certificationStatus !== 'CERTIFIED_ENFORCED') status = 'LOCKDOWN_ONLY';
  else if (connectivityFailure) status = 'UNSAFE';
  else if (allOk) status = 'ENFORCED_OK';
  else status = 'LOCKDOWN_ONLY';

  if (status !== expectedStatus) {
    fail(`unexpected trusted-mode status: expected ${expectedStatus}, got ${status}`);
  }
  pass(`trusted-mode status check passed (${expectedStatus})`);
}

async function main() {
  const { skipPluginCheck, skipPdpCheck } = parseArgs(process.argv);
  const pdpUrl = process.env.PDP_URL || 'http://localhost:8001/v1/authorize';
  const pdpHealthUrl = process.env.PDP_HEALTH_URL || pdpUrl.replace(/\/v1\/authorize$/, '/healthz');
  const certificationStatus = process.env.CERTIFICATION_STATUS || 'CERTIFIED_ENFORCED';
  const expectedStatus = process.env.EXPECTED_STATUS || 'ENFORCED_OK';

  if (!skipPluginCheck) checkPluginConfigAndInstall();
  else console.log('INFO skipping plugin config/install check');

  checkAttestationIntegrity();
  if (!skipPdpCheck) await checkPdpHealth(pdpHealthUrl);
  else console.log('INFO skipping PDP health check');
  await checkTrustedModeStatus(pdpUrl, certificationStatus, expectedStatus);
  console.log('Startup health verification passed.');
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
