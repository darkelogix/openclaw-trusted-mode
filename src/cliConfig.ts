import { resolveOpenClawVersion } from "./packageVersion";
import { normalizeRuntimeCertificationStatus, RuntimeCertificationStatus } from "./runtimeCertification";

export type CliConfig = {
  pdpUrl: string;
  policyVariant: string;
  tenantId: string;
  gatewayId: string;
  environment: string;
  openclawVersion: string;
  runtimeCertificationStatus: RuntimeCertificationStatus;
  jsonMode: boolean;
  expectedStatus?: string;
};

export function readCliConfig(argv: string[] = process.argv): CliConfig {
  const env = process.env;

  return {
    pdpUrl: env.PDP_URL || "http://localhost:8001/v1/authorize",
    policyVariant: env.POLICY_VARIANT || "guard-pro.v2026.02",
    tenantId: env.TENANT_ID || "trial-tenant",
    gatewayId: env.GATEWAY_ID || env.OPENCLAW_GATEWAY_ID || "gw-smoke-1",
    environment: env.ENVIRONMENT || env.OPENCLAW_ENVIRONMENT || "prod",
    openclawVersion: resolveOpenClawVersion(env.OPENCLAW_VERSION),
    runtimeCertificationStatus: normalizeRuntimeCertificationStatus(
      env.CERTIFICATION_STATUS || "CERTIFIED_ENFORCED"
    ),
    jsonMode: argv.includes("--json"),
    expectedStatus: env.EXPECTED_STATUS,
  };
}
