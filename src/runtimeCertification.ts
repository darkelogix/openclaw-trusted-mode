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

type ToolActionKind = 'shell' | 'delete' | 'write' | 'generic';

function classifyToolAction(toolName: string): ToolActionKind {
  const normalized = toolName.trim().toLowerCase();
  if (['exec', 'execute_shell', 'run_shell_command', 'shell'].includes(normalized)) {
    return 'shell';
  }
  if (['delete_file', 'remove_file'].includes(normalized)) {
    return 'delete';
  }
  if (['write_file', 'edit_file'].includes(normalized)) {
    return 'write';
  }
  return 'generic';
}

function lockDownActionMessage(kind: ToolActionKind): string {
  if (kind === 'shell') {
    return 'Shell execution is disabled until this runtime is certified and moved to CERTIFIED_ENFORCED.';
  }
  if (kind === 'delete') {
    return 'File deletion is disabled until this runtime is certified and moved to CERTIFIED_ENFORCED.';
  }
  if (kind === 'write') {
    return 'File write and edit actions are disabled until this runtime is certified and moved to CERTIFIED_ENFORCED.';
  }
  return 'This high-risk action is disabled until this runtime is certified and moved to CERTIFIED_ENFORCED.';
}

function unsupportedActionMessage(kind: ToolActionKind): string {
  if (kind === 'shell') {
    return 'Shell execution is disabled until you move to a supported runtime.';
  }
  if (kind === 'delete') {
    return 'File deletion is disabled until you move to a supported runtime.';
  }
  if (kind === 'write') {
    return 'File write and edit actions are disabled until you move to a supported runtime.';
  }
  return 'This high-risk action is disabled until you move to a supported runtime.';
}

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
  const kind = classifyToolAction(toolName);
  if (status === 'UNSUPPORTED') {
    return `[Trusted Mode BLOCKED] Guard Pro blocked tool "${toolName}" because this OpenClaw runtime is UNSUPPORTED. Readonly governed validation can continue, but ${unsupportedActionMessage(
      kind
    )}`;
  }
  return `[Trusted Mode BLOCKED] Guard Pro blocked tool "${toolName}" because this OpenClaw runtime is LOCKDOWN_ONLY (not certified). Readonly governed validation is working, but ${lockDownActionMessage(
    kind
  )}`;
}
