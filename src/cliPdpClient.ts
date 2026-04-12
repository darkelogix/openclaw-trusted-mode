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

export async function postDecision(pdpUrl: string, payload: unknown): Promise<DecisionResponse> {
  try {
    const res = await fetch(pdpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
