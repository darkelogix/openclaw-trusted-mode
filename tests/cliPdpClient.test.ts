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
});
