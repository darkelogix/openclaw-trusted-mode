import { describe, expect, it } from "vitest";
import { buildPdpHeaders } from "../src/cliPdpClient";

describe("CLI PDP client", () => {
  it("adds bearer auth when pdpAuthToken is configured", () => {
    expect(buildPdpHeaders(" runtime-token ")).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer runtime-token",
    });
  });

  it("omits bearer auth when pdpAuthToken is absent", () => {
    expect(buildPdpHeaders()).toEqual({ "Content-Type": "application/json" });
  });
});
