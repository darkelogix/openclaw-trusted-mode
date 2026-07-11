import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPdpHeaders, postDecision } from "../src/cliPdpClient";

describe("CLI PDP client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds bearer auth when pdpAuthToken is configured", () => {
    expect(buildPdpHeaders(" runtime-token ")).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer runtime-token",
    });
  });

  it("omits bearer auth when pdpAuthToken is absent", () => {
    expect(buildPdpHeaders()).toEqual({ "Content-Type": "application/json" });
  });

  it("requires pdpAuthToken before posting paid decisions", async () => {
    await expect(postDecision("http://127.0.0.1:9/v1/authorize", {})).rejects.toThrow(/PDP_AUTH_TOKEN/);
  });

  it("rejects PDP allow responses without a Passport", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ decision: "allow" }),
    }));

    await expect(
      postDecision("http://127.0.0.1:9/v1/authorize", {}, { pdpAuthToken: "test-token" })
    ).rejects.toThrow(/passport/);
  });

  it("accepts explicit monitor-mode allow responses without a Passport", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        decision: "allow",
        reasonCode: "MONITOR_MODE_ALLOW",
        enforcement_mode: "monitor",
        enforcement_bypassed: true,
        would_have_decision: "deny",
        would_have_deny_code: "CHANGE_CONTROL_REQUIRED",
        passport: { status: "not_issued", reason: "monitor_mode_bypass_no_passport" },
      }),
    }));

    const result = await postDecision("http://127.0.0.1:9/v1/authorize", {}, { pdpAuthToken: "test-token" });

    expect(result.decision).toBe("allow");
    expect(result.enforcement_mode).toBe("monitor");
    expect(result.enforcement_bypassed).toBe(true);
    expect(result.would_have_deny_code).toBe("CHANGE_CONTROL_REQUIRED");
  });
});
