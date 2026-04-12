import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { parseConfigureCliArgs } from "../src/configureCli";

describe("configure CLI", () => {
  it("parses required governed-mode flags", () => {
    const configPath = join("C:", "tmp", "openclaw.json");
    const parsed = parseConfigureCliArgs([
      "--tenantId",
      "darkelogix",
      "--gatewayId",
      "gw-dev",
      "--environment",
      "dev",
      "--pdpUrl",
      "http://10.90.0.6:8001/v1/authorize",
      "--configPath",
      configPath,
      "--policyVariant",
      "guard-pro.v2026.02",
      "--certificationStatus",
      "LOCKDOWN_ONLY",
      "--pdpTimeoutMs",
      "8000",
      "--json",
    ]);

    expect(parsed).toEqual({
      tenantId: "darkelogix",
      gatewayId: "gw-dev",
      environment: "dev",
      pdpUrl: "http://10.90.0.6:8001/v1/authorize",
      policyVariant: "guard-pro.v2026.02",
      configPath,
      certificationStatus: "LOCKDOWN_ONLY",
      failClosed: true,
      pdpTimeoutMs: 8000,
      jsonMode: true,
    });
  });

  it("rejects missing required flags", () => {
    expect(() =>
      parseConfigureCliArgs([
        "--tenantId",
        "darkelogix",
        "--gatewayId",
        "gw-dev",
      ])
    ).toThrow(/Missing required flags/);
  });

  it("accepts fail-open override", () => {
    const parsed = parseConfigureCliArgs([
      "--tenantId",
      "darkelogix",
      "--gatewayId",
      "gw-dev",
      "--environment",
      "dev",
      "--pdpUrl",
      "http://10.90.0.6:8001/v1/authorize",
      "--failOpen",
    ]);

    expect(parsed.failClosed).toBe(false);
  });
});
