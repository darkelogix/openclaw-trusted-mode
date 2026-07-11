import { maybeAppendSdeRuntimeGuidance } from "./sdeGuidance";
import { hasPdpAuthToken, validatePdpPassport } from "./passport";

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

export function buildPdpHeaders(pdpAuthToken?: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = typeof pdpAuthToken === "string" ? pdpAuthToken.trim() : "";
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function postDecision(
  pdpUrl: string,
  payload: unknown,
  options: { pdpAuthToken?: string } = {}
): Promise<DecisionResponse> {
  if (!hasPdpAuthToken(options.pdpAuthToken)) {
    throw new Error("PDP_AUTH_TOKEN is required for paid dexgate PDP authorization");
  }
  try {
    const res = await fetch(pdpUrl, {
      method: "POST",
      headers: buildPdpHeaders(options.pdpAuthToken),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`PDP unreachable (${res.status})`);
    }

    const decision = (await res.json()) as DecisionResponse;
    const passportValidation = validatePdpPassport(decision);
    if (!passportValidation.ok) {
      throw new Error(`Invalid PDP response: ${passportValidation.error}`);
    }
    return decision;
  } catch (err: any) {
    const detail = err?.name === "AbortError" ? "PDP timeout" : err?.message || String(err);
    throw new Error(maybeAppendSdeRuntimeGuidance(detail, pdpUrl));
  }
}
