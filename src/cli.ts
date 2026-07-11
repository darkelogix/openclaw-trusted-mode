#!/usr/bin/env node

import { exit } from "node:process";
import { makeTraceId, verifyLocalAttestationPack } from "./attestation";
import { readCliConfig } from "./cliConfig";
import { postDecision } from "./cliPdpClient";
import { isLocalPdpUrl } from "./sdeGuidance";
import { RuntimeCertificationStatus } from "./runtimeCertification";

type DecisionResponse = {
  decision: "allow" | "constrain" | "deny";
  deny_code?: string;
  deny_reason?: string;
  passport?: unknown;
  constraints?: unknown;
  trace?: {
    policy_variant?: string;
  };
  decision_proof?: {
    policy_variant?: string;
  };
};

type AttestationStatus = "ENFORCED_OK" | "LOCKDOWN_ONLY" | "UNSAFE";

type CheckResult = {
  id:
    | "local_integrity_check"
    | "deny_high_impact"
    | "allow_low_impact"
    | "tamper_detection_path";
  ok: boolean;
  detail: string;
};

type AxisScores = {
  interception_proof: "PASS" | "FAIL";
  fail_safe_posture: "PASS" | "FAIL";
  integrity: "PASS" | "FAIL";
  certified_compatibility: "PASS" | "WARN" | "FAIL";
};

type AttestationReport = {
  status: AttestationStatus;
  policy_variant: string;
  pdp_url: string;
  tenant_id: string;
  gateway_id: string;
  environment: string;
  trace_id: string;
  openclaw_version: string;
  runtime_certification_status: RuntimeCertificationStatus;
  integrity_pack_version: string;
  local_integrity_verified: boolean;
  axis_scores: AxisScores;
  checks: CheckResult[];
  remediation: string[];
  generated_at: string;
};

const CONFIG = readCliConfig();

async function post(payload: unknown): Promise<DecisionResponse> {
  return postDecision(CONFIG.pdpUrl, payload, { pdpAuthToken: CONFIG.pdpAuthToken });
}

async function testDenyHighImpact(): Promise<CheckResult> {
  const payload = {
    decision_sku: "openclaw.trusted_mode.authorize.v1",
    policy_variant: CONFIG.policyVariant,
    tenant_id: CONFIG.tenantId,
    gateway_id: CONFIG.gatewayId,
    environment: CONFIG.environment,
    inputs: { action_request: { tool_name: "exec", params: {} } },
  };
  try {
    const result = await post(payload);
    if (result.decision !== "deny") {
      return { id: "deny_high_impact", ok: false, detail: `Expected deny, got ${result.decision}` };
    }
    if (result.deny_code !== "HIGH_BLAST") {
      return { id: "deny_high_impact", ok: false, detail: `Expected deny_code=HIGH_BLAST, got ${result.deny_code}` };
    }
    if (!CONFIG.jsonMode) console.log("✅ HIGH-IMPACT TOOL BLOCKED (exec)");
    return { id: "deny_high_impact", ok: true, detail: "HIGH_BLAST deny verified" };
  } catch (err: any) {
    return { id: "deny_high_impact", ok: false, detail: err?.message || String(err) };
  }
}

async function testAllowLowImpact(): Promise<CheckResult> {
  const payload = {
    decision_sku: "openclaw.trusted_mode.authorize.v1",
    policy_variant: CONFIG.policyVariant,
    tenant_id: CONFIG.tenantId,
    gateway_id: CONFIG.gatewayId,
    environment: CONFIG.environment,
    inputs: { action_request: { tool_name: "read_file", params: {} } },
  };
  try {
    const result = await post(payload);
    if (result.decision !== "allow") {
      return { id: "allow_low_impact", ok: false, detail: `Expected allow, got ${result.decision}` };
    }
    if (!CONFIG.jsonMode) console.log("✅ LOW-IMPACT TOOL ALLOWED (read_file)");
    return { id: "allow_low_impact", ok: true, detail: "allow decision verified" };
  } catch (err: any) {
    return { id: "allow_low_impact", ok: false, detail: err?.message || String(err) };
  }
}

async function testTamperDetectionPath(): Promise<CheckResult> {
  const payload = {
    decision_sku: "openclaw.trusted_mode.authorize.v1",
    policy_variant: "invalid-pack",
    tenant_id: CONFIG.tenantId,
    gateway_id: CONFIG.gatewayId,
    environment: CONFIG.environment,
    inputs: { action_request: { tool_name: "exec", params: {} } },
  };
  try {
    const result = await post(payload);
    if (result.decision !== "deny") {
      return { id: "tamper_detection_path", ok: false, detail: `Expected deny, got ${result.decision}` };
    }
    const denyCode = String(result.deny_code || "");
    const effectiveVariant = String(result.trace?.policy_variant || result.decision_proof?.policy_variant || "");
    const acceptable =
      denyCode.includes("SIGNATURE") ||
      denyCode === "POLICY_VARIANT_IMMUTABLE" ||
      (denyCode === "HIGH_BLAST" && effectiveVariant && effectiveVariant !== "invalid-pack");
    if (!acceptable) {
      return {
        id: "tamper_detection_path",
        ok: false,
        detail: `Expected integrity/immutability deny or mapped-pack fail-closed result, got ${result.deny_code}`,
      };
    }
    if (!CONFIG.jsonMode) console.log("✅ FAIL-CLOSED ON TAMPERED OR UNKNOWN PACK");
    return { id: "tamper_detection_path", ok: true, detail: "tamper detection path denied" };
  } catch (err: any) {
    return { id: "tamper_detection_path", ok: false, detail: err?.message || String(err) };
  }
}

function deriveStatus(
  results: CheckResult[],
  runtimeCertificationStatus: RuntimeCertificationStatus
): AttestationStatus {
  const allOk = results.every((r) => r.ok);
  if (allOk) return "ENFORCED_OK";
  const packIntegrityFailure = results.some((r) => r.id === "local_integrity_check" && !r.ok);
  if (packIntegrityFailure) return "UNSAFE";
  const anyConnectivityFailure = results.some((r) => r.detail.includes("PDP unreachable") || r.detail.includes("fetch failed"));
  if (anyConnectivityFailure) return "UNSAFE";
  if (runtimeCertificationStatus !== "CERTIFIED_ENFORCED") return "LOCKDOWN_ONLY";
  return "LOCKDOWN_ONLY";
}

function remediationFor(
  status: AttestationStatus,
  runtimeCertificationStatus: RuntimeCertificationStatus,
  hasConnectivityFailure: boolean
): string[] {
  if (status === "ENFORCED_OK") return ["No remediation required."];
  if (runtimeCertificationStatus !== "CERTIFIED_ENFORCED") {
    return [
      "Run in LOCKDOWN_ONLY posture and block high-risk tools by default.",
      "Add or confirm the validated OpenClaw runtime row in COMPATIBILITY_MATRIX.md.",
      "Use CERTIFICATION_STATUS=CERTIFIED_ENFORCED only after approved compatibility and rollout evidence is present.",
    ];
  }
  if (status === "LOCKDOWN_ONLY") {
    return [
      "Review failing checks and update policy/tool-name mappings.",
      "Re-run trusted-mode-check after remediation.",
    ];
  }
  const steps = [
    "Restore PDP reachability and verify /healthz.",
    "Confirm plugin pdpUrl and tenant configuration.",
    "Keep fail-closed enabled until ENFORCED_OK is restored.",
  ];
  if (hasConnectivityFailure && isLocalPdpUrl(CONFIG.pdpUrl)) {
    steps.unshift(
      "If you only need standalone hardening, switch the plugin to ALLOWLIST_ONLY.",
      "If you want governed mode, compare plans at https://dexgate.ai/pricing/ or download your licensed runtime materials from https://dexgate.ai/console/downloads/, then point PDP_URL at that environment and configure PDP_AUTH_TOKEN."
    );
  }
  return steps;
}

function computeAxisScores(
  checks: CheckResult[],
  runtimeCertificationStatus: RuntimeCertificationStatus
): AxisScores {
  const okById = new Map(checks.map((c) => [c.id, c.ok]));
  return {
    interception_proof:
      okById.get("deny_high_impact") && okById.get("allow_low_impact") ? "PASS" : "FAIL",
    fail_safe_posture: okById.get("tamper_detection_path") ? "PASS" : "FAIL",
    integrity: okById.get("local_integrity_check") ? "PASS" : "FAIL",
    certified_compatibility:
      runtimeCertificationStatus === "CERTIFIED_ENFORCED"
        ? "PASS"
        : runtimeCertificationStatus === "LOCKDOWN_ONLY"
          ? "WARN"
          : "FAIL",
  };
}

async function main() {
  if (!CONFIG.jsonMode) console.log("🔍 Running Trusted Mode Check...\n");
  const traceId = makeTraceId();
  const packVerification = verifyLocalAttestationPack();
  const packCheck: CheckResult = packVerification.ok
    ? {
        id: "local_integrity_check",
        ok: true,
        detail: `verified (${packVerification.packVersion})`,
      }
    : {
        id: "local_integrity_check",
        ok: false,
        detail: packVerification.error || "local integrity verification failed",
      };

  const checks = await Promise.all([
    Promise.resolve(packCheck),
    testDenyHighImpact(),
    testAllowLowImpact(),
    testTamperDetectionPath(),
  ]);

  const anyConnectivityFailure = checks.some((r) => r.detail.includes("PDP unreachable") || r.detail.includes("fetch failed") || r.detail.includes("timeout") || r.detail.includes("aborted"));
  const status =
    CONFIG.runtimeCertificationStatus === "CERTIFIED_ENFORCED"
      ? deriveStatus(checks, CONFIG.runtimeCertificationStatus)
      : "LOCKDOWN_ONLY";
  const axisScores = computeAxisScores(checks, CONFIG.runtimeCertificationStatus);
  const report: AttestationReport = {
    status,
    policy_variant: CONFIG.policyVariant,
    pdp_url: CONFIG.pdpUrl,
    tenant_id: CONFIG.tenantId,
    gateway_id: CONFIG.gatewayId,
    environment: CONFIG.environment,
    trace_id: traceId,
    openclaw_version: CONFIG.openclawVersion,
    runtime_certification_status: CONFIG.runtimeCertificationStatus,
    integrity_pack_version: packVerification.packVersion,
    local_integrity_verified: packVerification.integrityVerified,
    axis_scores: axisScores,
    checks,
    remediation: remediationFor(status, CONFIG.runtimeCertificationStatus, anyConnectivityFailure),
    generated_at: new Date().toISOString(),
  };

  if (CONFIG.jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    if (status === "ENFORCED_OK") {
      console.log("\n🎉 ALL TESTS PASSED — Trusted Mode is LIVE and PROVABLE");
      console.log("   Your OpenClaw deployment is now governed.");
    } else {
      console.error(`\n❌ TRUSTED MODE CHECK STATUS: ${status}`);
      for (const check of checks) {
        if (!check.ok) console.error(`- ${check.id}: ${check.detail}`);
      }
      console.error("\nRemediation:");
      for (const step of report.remediation) console.error(`- ${step}`);
    }
    console.log("\nTrusted Mode check report (--json):");
    console.log(JSON.stringify(report, null, 2));
  }

  if (CONFIG.expectedStatus) {
    if (status !== CONFIG.expectedStatus) exit(1);
    return;
  }
  if (status !== "ENFORCED_OK") exit(1);
}

main();
