import { describe, expect, it } from "vitest";
import {
  configureGovernedPlugin,
  parseOpenClawConfig,
} from "../src/openclawConfig";

describe("openclaw governed config writer", () => {
  it("adds plugins.allow and writes governed plugin settings", () => {
    const base = parseOpenClawConfig(
      JSON.stringify({
        plugins: {
          entries: {
            "openclaw-trusted-mode": {
              enabled: true,
              config: {
                toolPolicyMode: "ALLOWLIST_ONLY",
                allowedTools: ["read_file"],
              },
            },
            otherPlugin: {
              enabled: true,
            },
          },
        },
      })
    );

    const { config, pluginAllowAdded } = configureGovernedPlugin(base, {
      pdpUrl: "http://10.90.0.6:8001/v1/authorize",
      policyVariant: "guard-pro.v2026.02",
      tenantId: "darkelogix",
      gatewayId: "gw-dev",
      environment: "dev",
      certificationStatus: "LOCKDOWN_ONLY",
      failClosed: true,
      pdpTimeoutMs: 5000,
    });

    expect(pluginAllowAdded).toBe(true);
    expect(config).toMatchObject({
      plugins: {
        allow: ["openclaw-trusted-mode"],
        entries: {
          otherPlugin: { enabled: true },
          "openclaw-trusted-mode": {
            enabled: true,
            config: {
              pdpUrl: "http://10.90.0.6:8001/v1/authorize",
              policyVariant: "guard-pro.v2026.02",
              tenantId: "darkelogix",
              gatewayId: "gw-dev",
              environment: "dev",
              toolPolicyMode: "PDP",
              requireTenantId: true,
              allowedTenantIds: ["darkelogix"],
              failClosed: true,
              pdpTimeoutMs: 5000,
              certificationStatus: "LOCKDOWN_ONLY",
            },
          },
        },
      },
    });
    expect(
      (config.plugins as { entries: Record<string, { config: Record<string, unknown> }> }).entries[
        "openclaw-trusted-mode"
      ].config.allowedTools
    ).toBeUndefined();
  });

  it("preserves existing allow list members and reports when plugin was already allowed", () => {
    const base = parseOpenClawConfig(
      JSON.stringify({
        plugins: {
          allow: ["browser", "openclaw-trusted-mode"],
          entries: {},
        },
      })
    );

    const { config, pluginAllowAdded } = configureGovernedPlugin(base, {
      pdpUrl: "http://10.90.0.6:8001/v1/authorize",
      policyVariant: "guard-pro.v2026.02",
      tenantId: "darkelogix",
      gatewayId: "gw-dev",
      environment: "dev",
      certificationStatus: "LOCKDOWN_ONLY",
      failClosed: true,
      pdpTimeoutMs: 5000,
    });

    expect(pluginAllowAdded).toBe(false);
    expect((config.plugins as { allow: string[] }).allow).toEqual([
      "browser",
      "openclaw-trusted-mode",
    ]);
  });
});
