import type { BeforeToolCallResult, PluginApi, ToolCallEvent } from '@openclaw/core';
import { enforceConstraints } from './constraints';
import { curateContext, ContextCuratorConfig } from './contextCurator';
import {
  certificationBlockReason,
  resolveRuntimeCertificationStatus,
  RuntimeCertificationStatus,
  shouldBlockToolForCertification,
} from './runtimeCertification';
import {
  isToolAllowedByPolicyMode,
  normalizeToolPolicyMode,
  validateHardeningConfig,
} from './hardening';

export default function register(api: PluginApi) {
  const config = api.config as {
    pdpUrl?: string;
    policyVariant?: string;
    pdpTimeoutMs?: number;
    failClosed?: boolean;
    contextCurator?: ContextCuratorConfig;
    tenantId?: string;
    gatewayId?: string;
    environment?: string;
    certificationStatus?: RuntimeCertificationStatus;
    openclawVersion?: string;
    certifiedOpenClawVersions?: string[];
    highRiskTools?: string[];
    toolPolicyMode?: 'PDP' | 'ALLOWLIST_ONLY';
    allowedTools?: string[];
    requireTenantId?: boolean;
    allowedTenantIds?: string[];
  };
  const pdpUrl = config.pdpUrl || 'http://localhost:8001/v1/authorize';
  const policyVariant = config.policyVariant || 'guard-pro.v2026.02';
  const pdpTimeoutMs = typeof config.pdpTimeoutMs === 'number' ? config.pdpTimeoutMs : 5000;
  const failClosed = config.failClosed !== false;
  const contextCurator = config.contextCurator || {};
  const tenantId = config.tenantId;
  const gatewayId = config.gatewayId;
  const environment = config.environment;
  const certificationStatus = resolveRuntimeCertificationStatus(
    config.certificationStatus,
    config.openclawVersion,
    config.certifiedOpenClawVersions
  );
  const highRiskTools = config.highRiskTools;
  const toolPolicyMode = normalizeToolPolicyMode(config.toolPolicyMode);
  const allowedTools = config.allowedTools;
  const hardeningValidation = validateHardeningConfig({
    toolPolicyMode,
    allowedTools,
    requireTenantId: config.requireTenantId,
    allowedTenantIds: config.allowedTenantIds,
    tenantId,
  });

  if (!hardeningValidation.ok) {
    console.error(`[Trusted Mode ERROR] Hardening config invalid: ${hardeningValidation.issues.join('; ')}`);
  }

  const hook = 'before_tool_call';
  api.on(hook, async (event: ToolCallEvent): Promise<BeforeToolCallResult | void> => {
    if (!hardeningValidation.ok) {
      return {
        block: true,
        blockReason: `[Trusted Mode BLOCKED] Hardening configuration invalid: ${hardeningValidation.issues.join(
          '; '
        )}`,
      };
    }

    if (!isToolAllowedByPolicyMode(event.toolName, toolPolicyMode, allowedTools)) {
      return {
        block: true,
        blockReason: `[Trusted Mode BLOCKED] Tool "${event.toolName}" denied by allowlist policy mode.`,
      };
    }

    if (shouldBlockToolForCertification(certificationStatus, event.toolName, highRiskTools)) {
      return { block: true, blockReason: certificationBlockReason(certificationStatus, event.toolName) };
    }

    const { summary: contextSummary } = curateContext(
      { tool_name: event.toolName, params: event.params || {} },
      contextCurator
    );

    const payload = {
      decision_sku: 'openclaw.trusted_mode.authorize.v1',
      policy_variant: policyVariant,
      tenant_id: tenantId,
      gateway_id: gatewayId,
      environment,
      inputs: {
        action_request: {
          tool_name: event.toolName,
          params: event.params || {},
          context_summary: contextSummary
        }
      }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), pdpTimeoutMs);

    try {
      const res = await fetch(pdpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!res.ok) throw new Error(`PDP unreachable (${res.status})`);

      const decision = await res.json();

      if (!decision || typeof decision.decision !== 'string') {
        throw new Error(`[Trusted Mode ERROR] Invalid PDP response: missing decision`);
      }

      if (decision.decision === 'deny') {
        const reason = decision.deny_reason || decision.deny_code || 'Policy denied';
        return { block: true, blockReason: `[Trusted Mode BLOCKED] ${reason}` };
      }

      if (decision.constraints) {
        enforceConstraints(event.params, decision.constraints);
        return { params: event.params || {} };
      }
    } catch (err: any) {
      const msg = err?.name === 'AbortError' ? `PDP timeout after ${pdpTimeoutMs}ms` : err?.message;
      console.error(`[Trusted Mode ERROR]`, msg);
      if (failClosed) {
        return { block: true, blockReason: `[Trusted Mode BLOCKED] ${msg || 'PDP authorization failed'}` };
      }
      console.warn(`[Trusted Mode WARN] Fail-open enabled; allowing tool call.`);
    } finally {
      clearTimeout(timeout);
    }
  });
}
