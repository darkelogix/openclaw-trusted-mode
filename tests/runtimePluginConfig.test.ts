import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  mergeDefinedConfig,
  readRuntimePluginConfig,
  resolveOpenClawConfigPath,
} from "../src/runtimePluginConfig";

describe("runtime plugin config fallback", () => {
  afterEach(() => {
    delete process.env.OPENCLAW_CONFIG_PATH;
  });

  it("resolves OPENCLAW_CONFIG_PATH when present", () => {
    process.env.OPENCLAW_CONFIG_PATH = join("C:", "tmp", "openclaw.json");
    expect(resolveOpenClawConfigPath()).toBe(join("C:", "tmp", "openclaw.json"));
  });

  it("reads plugin config from the OpenClaw config file", () => {
    const dir = mkdtempSync(join(tmpdir(), "openclaw-config-"));
    const configPath = join(dir, "openclaw.json");
    process.env.OPENCLAW_CONFIG_PATH = configPath;
    writeFileSync(
      configPath,
      JSON.stringify({
        plugins: {
          entries: {
            "openclaw-trusted-mode": {
              enabled: true,
              config: {
                toolPolicyMode: "PDP",
                tenantId: "darkelogix",
                gatewayId: "gw-dev",
              },
            },
          },
        },
      })
    );

    try {
      expect(readRuntimePluginConfig()).toEqual({
        toolPolicyMode: "PDP",
        tenantId: "darkelogix",
        gatewayId: "gw-dev",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps fallback values when override contains undefined fields", () => {
    expect(
      mergeDefinedConfig(
        { toolPolicyMode: "PDP", tenantId: "darkelogix" },
        { toolPolicyMode: undefined, gatewayId: "gw-dev" }
      )
    ).toEqual({
      toolPolicyMode: "PDP",
      tenantId: "darkelogix",
      gatewayId: "gw-dev",
    });
  });
});
