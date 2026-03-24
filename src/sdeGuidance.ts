const LOCAL_PDP_HOSTS = new Set(['localhost', '127.0.0.1']);
const CONNECTIVITY_PATTERNS = [
  /fetch failed/i,
  /timeout/i,
  /aborted/i,
  /econnrefused/i,
  /ehostunreach/i,
  /etimedout/i,
  /network/i,
];

export function isLocalPdpUrl(pdpUrl: string): boolean {
  try {
    const url = new URL(pdpUrl);
    return LOCAL_PDP_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function buildSdeRuntimeGuidance(_pdpUrl: string): string {
  return [
    'Governed mode requires a licensed SDE runtime; the public npm package installs the adapter only.',
    'If you only need standalone hardening, switch toolPolicyMode to ALLOWLIST_ONLY.',
    'If you want governed mode, obtain SDE runtime and deployment instructions from https://darkelogix.ai/, then point pdpUrl/PDP_URL at your licensed SDE environment.',
  ].join(' ');
}

export function maybeAppendSdeRuntimeGuidance(detail: string, pdpUrl: string): string {
  const message = String(detail || '').trim();
  if (!message) return message;
  if (!isLocalPdpUrl(pdpUrl)) return message;
  if (message.includes('licensed SDE runtime')) return message;
  if (!CONNECTIVITY_PATTERNS.some((pattern) => pattern.test(message))) return message;
  const normalized = /[.!?]$/.test(message) ? message.slice(0, -1) : message;
  return `${normalized}. ${buildSdeRuntimeGuidance(pdpUrl)}`;
}
