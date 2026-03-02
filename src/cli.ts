#!/usr/bin/env node

import { exit } from 'node:process';
import {
  makeTraceId,
  verifyLocalAttestationPack,
} from './attestation';
import {
  normalizeRuntimeCertificationStatus,
  RuntimeCertificationStatus,
} from './runtimeCertification';

type DecisionResponse = {
  decision: 'allow' | 'deny';
  deny_code?: string;
  deny_reason?: string;
};

type AttestationStatus = 'ENFORCED_OK' | 'LOCKDOWN_ONLY' | 'UNSAFE';

type CheckResult = {
  id:
    | 'attestation_pack_signature'
    | 'deny_high_impact'
    | 'allow_low_impact'
    | 'signature_failure';
  ok: boolean;
  detail: string;
};

type AxisScores = {
  interception_proof: 'PASS' | 'FAIL';
  fail_safe_posture: 'PASS' | 'FAIL';
  integrity: 'PASS' | 'FAIL';
  certified_compatibility: 'PASS' | 'WARN' | 'FAIL';
};

type AttestationReport = {
  status: AttestationStatus;
  policy_variant: string;
  pdp_url: string;
  tenant_id: string;
  trace_id: string;
  openclaw_version: string;
  runtime_certification_status: RuntimeCertificationStatus;
  attestation_pack_version: string;
  attestation_signature_verified: boolean;
  axis_scores: AxisScores;
  checks: CheckResult[];
  remediation: string[];
  generated_at: string;
};

const PDP_URL = process.env.PDP_URL || 'http://localhost:8001/v1/authorize';
const POLICY_VARIANT = process.env.POLICY_VARIANT || 'guard-pro.v2026.02';
const TENANT_ID = process.env.TENANT_ID || 'trial-tenant';
const OPENCLAW_VERSION = process.env.OPENCLAW_VERSION || 'unknown';
const RUNTIME_CERTIFICATION_STATUS = normalizeRuntimeCertificationStatus(
  process.env.CERTIFICATION_STATUS || 'CERTIFIED_ENFORCED'
);
const JSON_MODE = process.argv.includes('--json');
const EXPECTED_STATUS = process.env.EXPECTED_STATUS;

async function post(payload: unknown): Promise<DecisionResponse> {
  const res = await fetch(PDP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`PDP unreachable (${res.status})`);
  }
  return (await res.json()) as DecisionResponse;
}

async function testDenyHighImpact(): Promise<CheckResult> {
  const payload = {
    decision_sku: 'openclaw.trusted_mode.authorize.v1',
    policy_variant: POLICY_VARIANT,
    tenant_id: TENANT_ID,
    inputs: { action_request: { tool_name: 'execute_shell', params: {} } },
  };
  try {
    const result = await post(payload);
    if (result.decision !== 'deny') {
      return { id: 'deny_high_impact', ok: false, detail: `Expected deny, got ${result.decision}` };
    }
    if (result.deny_code !== 'HIGH_BLAST') {
      return { id: 'deny_high_impact', ok: false, detail: `Expected deny_code=HIGH_BLAST, got ${result.deny_code}` };
    }
    if (!JSON_MODE) console.log('✅ HIGH-IMPACT TOOL BLOCKED (execute_shell)');
    return { id: 'deny_high_impact', ok: true, detail: 'HIGH_BLAST deny verified' };
  } catch (err: any) {
    return { id: 'deny_high_impact', ok: false, detail: err?.message || String(err) };
  }
}

async function testAllowLowImpact(): Promise<CheckResult> {
  const payload = {
    decision_sku: 'openclaw.trusted_mode.authorize.v1',
    policy_variant: POLICY_VARIANT,
    tenant_id: TENANT_ID,
    inputs: { action_request: { tool_name: 'read_file', params: {} } },
  };
  try {
    const result = await post(payload);
    if (result.decision !== 'allow') {
      return { id: 'allow_low_impact', ok: false, detail: `Expected allow, got ${result.decision}` };
    }
    if (!JSON_MODE) console.log('✅ LOW-IMPACT TOOL ALLOWED (read_file)');
    return { id: 'allow_low_impact', ok: true, detail: 'allow decision verified' };
  } catch (err: any) {
    return { id: 'allow_low_impact', ok: false, detail: err?.message || String(err) };
  }
}

async function testSignatureFailure(): Promise<CheckResult> {
  const payload = {
    decision_sku: 'openclaw.trusted_mode.authorize.v1',
    policy_variant: 'invalid-pack',
    tenant_id: TENANT_ID,
    inputs: { action_request: { tool_name: 'execute_shell', params: {} } },
  };
  try {
    const result = await post(payload);
    if (result.decision !== 'deny') {
      return { id: 'signature_failure', ok: false, detail: `Expected deny, got ${result.decision}` };
    }
    if (!String(result.deny_code || '').includes('SIGNATURE')) {
      return { id: 'signature_failure', ok: false, detail: `Expected deny_code to mention SIGNATURE, got ${result.deny_code}` };
    }
    if (!JSON_MODE) console.log('✅ FAIL-CLOSED ON BAD SIGNATURE');
    return { id: 'signature_failure', ok: true, detail: 'signature failure path denied' };
  } catch (err: any) {
    return { id: 'signature_failure', ok: false, detail: err?.message || String(err) };
  }
}

function deriveStatus(
  results: CheckResult[],
  runtimeCertificationStatus: RuntimeCertificationStatus
): AttestationStatus {
  const allOk = results.every((r) => r.ok);
  if (allOk) return 'ENFORCED_OK';
  const packIntegrityFailure = results.some((r) => r.id === 'attestation_pack_signature' && !r.ok);
  if (packIntegrityFailure) return 'UNSAFE';
  const anyConnectivityFailure = results.some((r) => r.detail.includes('PDP unreachable') || r.detail.includes('fetch failed'));
  if (anyConnectivityFailure) return 'UNSAFE';
  if (runtimeCertificationStatus !== 'CERTIFIED_ENFORCED') return 'LOCKDOWN_ONLY';
  return 'LOCKDOWN_ONLY';
}

function remediationFor(
  status: AttestationStatus,
  runtimeCertificationStatus: RuntimeCertificationStatus
): string[] {
  if (status === 'ENFORCED_OK') return ['No remediation required.'];
  if (runtimeCertificationStatus !== 'CERTIFIED_ENFORCED') {
    return [
      'Run in LOCKDOWN_ONLY posture and block high-risk tools by default.',
      'Certify this OpenClaw runtime version in COMPATIBILITY_MATRIX.md.',
      'Set CERTIFICATION_STATUS=CERTIFIED_ENFORCED only after certification evidence is complete.',
    ];
  }
  if (status === 'LOCKDOWN_ONLY') {
    return [
      'Review failing checks and update policy/tool-name mappings.',
      'Re-run trusted-mode-check after remediation.',
    ];
  }
  return [
    'Restore PDP reachability and verify /healthz.',
    'Confirm plugin pdpUrl and tenant configuration.',
    'Keep fail-closed enabled until ENFORCED_OK is restored.',
  ];
}

function computeAxisScores(
  checks: CheckResult[],
  runtimeCertificationStatus: RuntimeCertificationStatus
): AxisScores {
  const okById = new Map(checks.map((c) => [c.id, c.ok]));
  return {
    interception_proof:
      okById.get('deny_high_impact') && okById.get('allow_low_impact') ? 'PASS' : 'FAIL',
    fail_safe_posture: okById.get('signature_failure') ? 'PASS' : 'FAIL',
    integrity: okById.get('attestation_pack_signature') ? 'PASS' : 'FAIL',
    certified_compatibility:
      runtimeCertificationStatus === 'CERTIFIED_ENFORCED'
        ? 'PASS'
        : runtimeCertificationStatus === 'LOCKDOWN_ONLY'
          ? 'WARN'
          : 'FAIL',
  };
}

async function main() {
  if (!JSON_MODE) console.log('🔍 Running Trusted Mode Check...\n');
  const traceId = makeTraceId();
  const packVerification = verifyLocalAttestationPack();
  const packCheck: CheckResult = packVerification.ok
    ? {
        id: 'attestation_pack_signature',
        ok: true,
        detail: `verified (${packVerification.packVersion})`,
      }
    : {
        id: 'attestation_pack_signature',
        ok: false,
        detail: packVerification.error || 'attestation verification failed',
      };

  const checks = await Promise.all([
    Promise.resolve(packCheck),
    testDenyHighImpact(),
    testAllowLowImpact(),
    testSignatureFailure(),
  ]);

  const status =
    RUNTIME_CERTIFICATION_STATUS === 'CERTIFIED_ENFORCED'
      ? deriveStatus(checks, RUNTIME_CERTIFICATION_STATUS)
      : 'LOCKDOWN_ONLY';
  const axisScores = computeAxisScores(checks, RUNTIME_CERTIFICATION_STATUS);
  const report: AttestationReport = {
    status,
    policy_variant: POLICY_VARIANT,
    pdp_url: PDP_URL,
    tenant_id: TENANT_ID,
    trace_id: traceId,
    openclaw_version: OPENCLAW_VERSION,
    runtime_certification_status: RUNTIME_CERTIFICATION_STATUS,
    attestation_pack_version: packVerification.packVersion,
    attestation_signature_verified: packVerification.signatureVerified,
    axis_scores: axisScores,
    checks,
    remediation: remediationFor(status, RUNTIME_CERTIFICATION_STATUS),
    generated_at: new Date().toISOString(),
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    if (status === 'ENFORCED_OK') {
      console.log('\n🎉 ALL TESTS PASSED — Trusted Mode is LIVE and PROVABLE');
      console.log('   Your OpenClaw deployment is now governed.');
    } else {
      console.error(`\n❌ TRUSTED MODE CHECK STATUS: ${status}`);
      for (const check of checks) {
        if (!check.ok) console.error(`- ${check.id}: ${check.detail}`);
      }
      console.error('\nRemediation:');
      for (const step of report.remediation) console.error(`- ${step}`);
    }
    console.log('\nAttestation report (--json):');
    console.log(JSON.stringify(report, null, 2));
  }

  if (EXPECTED_STATUS) {
    if (status !== EXPECTED_STATUS) exit(1);
    return;
  }
  if (status !== 'ENFORCED_OK') exit(1);
}

main();
