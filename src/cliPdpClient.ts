import { maybeAppendSdeRuntimeGuidance } from "./sdeGuidance";

type DecisionResponse = {
  decision: "allow" | "deny";
  deny_code?: string;
  deny_reason?: string;
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
  try {
    const res = await fetch(pdpUrl, {
      method: "POST",
      headers: buildPdpHeaders(options.pdpAuthToken),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`PDP unreachable (${res.status})`);
    }

    return (await res.json()) as DecisionResponse;
  } catch (err: any) {
    const detail = err?.name === "AbortError" ? "PDP timeout" : err?.message || String(err);
    throw new Error(maybeAppendSdeRuntimeGuidance(detail, pdpUrl));
  }
}
