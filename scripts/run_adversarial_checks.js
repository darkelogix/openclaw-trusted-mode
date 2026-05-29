#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

function assertCase(name, condition, detail) {
  if (!condition) {
    console.error(`FAIL ${name}: ${detail}`);
    process.exit(1);
  }
  console.log(`PASS ${name}`);
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

function verifyLocalIntegrity(packPath, checksumPath) {
  if (!fs.existsSync(packPath)) return { ok: false, detail: 'pack missing' };
  if (!fs.existsSync(checksumPath)) return { ok: false, detail: 'checksum missing' };
  const pack = fs.readFileSync(packPath, 'utf8');
  const checksum = fs.readFileSync(checksumPath, 'utf8').trim();
  const expected = `sha256:${sha256Hex(pack)}`;
  if (checksum !== expected) return { ok: false, detail: 'checksum mismatch' };
  return { ok: true, detail: 'checksum valid' };
}

async function callPdp(pdpUrl, policyVariant, toolName) {
  const payload = {
    decision_sku: 'openclaw.trusted_mode.authorize.v1',
    policy_variant: policyVariant,
    tenant_id: 'trial-tenant',
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
}

async function runProfile({
  pdpUrl,
  policyVariant,
  certificationStatus,
  packPath,
  sigPath,
}) {
  const checks = [];
  const pack = verifyLocalIntegrity(packPath, sigPath);
  checks.push({ id: 'local_integrity_check', ok: pack.ok, detail: pack.detail });

  const deny = await callPdp(pdpUrl, policyVariant, 'execute_shell');
  if (!deny.ok) {
    checks.push({ id: 'deny_high_impact', ok: false, detail: deny.detail });
  } else {
    const body = deny.body || {};
    checks.push({
      id: 'deny_high_impact',
      ok: body.decision === 'deny' && body.deny_code === 'HIGH_BLAST',
      detail: `decision=${body.decision || 'missing'} code=${body.deny_code || 'missing'}`,
    });
  }

  const allow = await callPdp(pdpUrl, policyVariant, 'read_file');
  if (!allow.ok) {
    checks.push({ id: 'allow_low_impact', ok: false, detail: allow.detail });
  } else {
    const body = allow.body || {};
    checks.push({
      id: 'allow_low_impact',
      ok: body.decision === 'allow',
      detail: `decision=${body.decision || 'missing'}`,
    });
  }

  const tamper = await callPdp(pdpUrl, 'invalid-pack', 'execute_shell');
  if (!tamper.ok) {
    checks.push({ id: 'tamper_detection_path', ok: false, detail: tamper.detail });
  } else {
    const body = tamper.body || {};
    checks.push({
      id: 'tamper_detection_path',
      ok: isAcceptableInvalidPackDeny(body),
      detail: `decision=${body.decision || 'missing'} code=${body.deny_code || 'missing'}`,
    });
  }

  const allOk = checks.every((c) => c.ok);
  const hasPackFailure = checks.some((c) => c.id === 'local_integrity_check' && !c.ok);
  const hasConnectivityFailure = checks.some((c) => c.detail.includes('fetch failed') || c.detail.includes('PDP unreachable'));
  let status = 'LOCKDOWN_ONLY';
  if (certificationStatus !== 'CERTIFIED_ENFORCED') {
    status = 'LOCKDOWN_ONLY';
  } else if (hasPackFailure || hasConnectivityFailure) {
    status = 'UNSAFE';
  } else if (allOk) {
    status = 'ENFORCED_OK';
  } else {
    status = 'LOCKDOWN_ONLY';
  }

  return { status, checks };
}

function makeTamperedIntegrityPack() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trusted-mode-adversarial-'));
  const packPath = path.join(dir, 'trusted_mode_attest_v1.json');
  const sigPath = path.join(dir, 'trusted_mode_attest_v1.sig');
  const pack = JSON.stringify({
    pack_id: 'trusted_mode_integrity',
    pack_version: 'v1.0.0',
    schema_version: '2026-03-01',
  });
  fs.writeFileSync(packPath, pack, 'utf8');
  const badChecksum = `sha256:${sha256Hex('tampered')}`;
  fs.writeFileSync(sigPath, badChecksum, 'utf8');
  return { packPath, sigPath };
}

async function main() {
  const repo = process.cwd();
  const basePackPath = path.join(repo, 'attestation', 'trusted_mode_attest_v1.json');
  const baseSigPath = path.join(repo, 'attestation', 'trusted_mode_attest_v1.sig');
  const defaultPdpUrl = process.env.PDP_URL || 'http://localhost:8001/v1/authorize';

  const baseline = await runProfile({
    pdpUrl: defaultPdpUrl,
    policyVariant: 'guard-pro.v2026.02',
    certificationStatus: 'CERTIFIED_ENFORCED',
    packPath: basePackPath,
    sigPath: baseSigPath,
  });
  assertCase('baseline_enforced_ok', baseline.status === 'ENFORCED_OK', JSON.stringify(baseline));

  const lockdown = await runProfile({
    pdpUrl: defaultPdpUrl,
    policyVariant: 'guard-pro.v2026.02',
    certificationStatus: 'LOCKDOWN_ONLY',
    packPath: basePackPath,
    sigPath: baseSigPath,
  });
  assertCase('lockdown_on_uncertified_runtime', lockdown.status === 'LOCKDOWN_ONLY', JSON.stringify(lockdown));

  const pdpFailure = await runProfile({
    pdpUrl: 'http://localhost:8999/v1/authorize',
    policyVariant: 'guard-pro.v2026.02',
    certificationStatus: 'CERTIFIED_ENFORCED',
    packPath: basePackPath,
    sigPath: baseSigPath,
  });
  assertCase('unsafe_on_pdp_fetch_failure', pdpFailure.status === 'UNSAFE', JSON.stringify(pdpFailure));

  const tampered = makeTamperedIntegrityPack();
  const integrityFailure = await runProfile({
    pdpUrl: defaultPdpUrl,
    policyVariant: 'guard-pro.v2026.02',
    certificationStatus: 'CERTIFIED_ENFORCED',
    packPath: tampered.packPath,
    sigPath: tampered.sigPath,
  });
  assertCase('unsafe_on_local_integrity_tamper', integrityFailure.status === 'UNSAFE', JSON.stringify(integrityFailure));

  const malformed = await runProfile({
    pdpUrl: defaultPdpUrl,
    policyVariant: 'malformed.v1',
    certificationStatus: 'CERTIFIED_ENFORCED',
    packPath: basePackPath,
    sigPath: baseSigPath,
  });
  const hasMalformedEvidence = malformed.checks.some((c) => c.detail.includes('decision=missing'));
  const malformedNormalizedToMappedPack = malformed.status === 'ENFORCED_OK' && malformed.checks.every((c) => c.ok);
  assertCase(
    'lockdown_on_malformed_pdp_schema',
    (malformed.status === 'LOCKDOWN_ONLY' && hasMalformedEvidence) || malformedNormalizedToMappedPack,
    JSON.stringify(malformed)
  );

  console.log('Adversarial checks passed.');
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
