export type ToolPolicyMode = 'PDP' | 'ALLOWLIST_ONLY';

export type HardeningConfig = {
  toolPolicyMode?: ToolPolicyMode;
  allowedTools?: string[];
  requireTenantId?: boolean;
  allowedTenantIds?: string[];
  tenantId?: string;
};

export type HardeningValidation = {
  ok: boolean;
  issues: string[];
};

export function normalizeToolPolicyMode(value: unknown): ToolPolicyMode {
  if (typeof value !== 'string') return 'ALLOWLIST_ONLY';
  const normalized = value.trim().toUpperCase();
  if (normalized === 'PDP') return 'PDP';
  return 'ALLOWLIST_ONLY';
}

export function validateHardeningConfig(config: HardeningConfig): HardeningValidation {
  const issues: string[] = [];
  const requireTenantId = config.requireTenantId === true;
  const tenantId = String(config.tenantId || '').trim();

  if (requireTenantId && tenantId.length === 0) {
    issues.push('requireTenantId is true but tenantId is missing');
  }

  if (Array.isArray(config.allowedTenantIds) && config.allowedTenantIds.length > 0) {
    if (tenantId.length === 0) {
      issues.push('allowedTenantIds configured but tenantId is missing');
    } else if (!config.allowedTenantIds.includes(tenantId)) {
      issues.push(`tenantId "${tenantId}" is not in allowedTenantIds`);
    }
  }

  const mode = normalizeToolPolicyMode(config.toolPolicyMode);
  if (mode === 'ALLOWLIST_ONLY') {
    if (!Array.isArray(config.allowedTools) || config.allowedTools.length === 0) {
      issues.push('toolPolicyMode=ALLOWLIST_ONLY requires non-empty allowedTools');
    }
  }

  return { ok: issues.length === 0, issues };
}

export function isToolAllowedByPolicyMode(
  toolName: string,
  mode: ToolPolicyMode,
  allowedTools?: string[]
): boolean {
  if (mode !== 'ALLOWLIST_ONLY') return true;
  if (!Array.isArray(allowedTools) || allowedTools.length === 0) return false;
  const normalized = toolName.trim().toLowerCase();
  const allowSet = new Set(allowedTools.map((t) => t.trim().toLowerCase()));
  return allowSet.has(normalized);
}
