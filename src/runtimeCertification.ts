export type RuntimeCertificationStatus = 'CERTIFIED_ENFORCED' | 'LOCKDOWN_ONLY' | 'UNSUPPORTED';

const HIGH_RISK_TOOLS = new Set([
  'exec',
  'execute_shell',
  'run_shell_command',
  'shell',
  'delete_file',
  'remove_file',
  'write_file',
  'edit_file',
]);

export function normalizeRuntimeCertificationStatus(
  value: unknown
): RuntimeCertificationStatus {
  if (typeof value !== 'string') return 'LOCKDOWN_ONLY';
  const normalized = value.trim().toUpperCase();
  if (normalized === 'CERTIFIED_ENFORCED') return 'CERTIFIED_ENFORCED';
  if (normalized === 'LOCKDOWN_ONLY') return 'LOCKDOWN_ONLY';
  if (normalized === 'UNSUPPORTED') return 'UNSUPPORTED';
  return 'LOCKDOWN_ONLY';
}

export function resolveRuntimeCertificationStatus(
  configuredStatus: unknown,
  openclawVersion?: string,
  certifiedOpenClawVersions?: string[]
): RuntimeCertificationStatus {
  if (configuredStatus !== undefined && configuredStatus !== null && configuredStatus !== '') {
    return normalizeRuntimeCertificationStatus(configuredStatus);
  }
  if (openclawVersion && Array.isArray(certifiedOpenClawVersions)) {
    return certifiedOpenClawVersions.includes(openclawVersion)
      ? 'CERTIFIED_ENFORCED'
      : 'LOCKDOWN_ONLY';
  }
  return 'LOCKDOWN_ONLY';
}

export function isHighRiskTool(toolName: string, configuredHighRiskTools?: string[]): boolean {
  const normalized = toolName.trim().toLowerCase();
  if (Array.isArray(configuredHighRiskTools) && configuredHighRiskTools.length > 0) {
    const configured = new Set(configuredHighRiskTools.map((item) => item.trim().toLowerCase()));
    return configured.has(normalized);
  }
  return HIGH_RISK_TOOLS.has(normalized);
}

export function shouldBlockToolForCertification(
  status: RuntimeCertificationStatus,
  toolName: string,
  configuredHighRiskTools?: string[]
): boolean {
  if (status === 'CERTIFIED_ENFORCED') return false;
  return isHighRiskTool(toolName, configuredHighRiskTools);
}

export function certificationBlockReason(
  status: RuntimeCertificationStatus,
  toolName: string
): string {
  if (status === 'UNSUPPORTED') {
    return `[Trusted Mode BLOCKED] Tool "${toolName}" blocked: runtime is UNSUPPORTED.`;
  }
  return `[Trusted Mode BLOCKED] Tool "${toolName}" blocked: runtime is LOCKDOWN_ONLY (not certified).`;
}
