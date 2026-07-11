import type { BeforeToolCallResult, PluginApi, ToolCallEvent } from '@openclaw/core';
import { hostname, platform, release } from 'node:os';
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
import { mergeDefinedConfig, readRuntimePluginConfig } from './runtimePluginConfig';
import { maybeAppendSdeRuntimeGuidance } from './sdeGuidance';
import { buildTelemetryConfig, sendTelemetryEvent } from './telemetry';
import { validatePdpPassport } from './passport';

function compactOrigin(origin: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(origin)) {
    if (typeof value === 'string' && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}

function buildOriginMetadata(event: ToolCallEvent, gatewayId?: string, environment?: string): Record<string, string> {
  const params = (event.params || {}) as Record<string, unknown>;
  const eventRecord = event as unknown as Record<string, unknown>;
  const workspace = String(params.cwd || params.workingDirectory || params.workspace || '');
  return compactOrigin({
    user: process.env.USERNAME || process.env.USER || '',
    machine_id: process.env.COMPUTERNAME || hostname(),
    hostname: hostname(),
    os: `${platform()} ${release()}`,
    repo_url: String(params.repoUrl || params.remoteUrl || ''),
    repo_path: String(params.repoPath || workspace || params.path || ''),
    branch: String(params.branch || ''),
    commit_sha: String(params.commitSha || params.sha || ''),
    github_pr_url: String(params.githubPrUrl || params.pullRequestUrl || params.prUrl || ''),
    github_pr_number: String(params.githubPrNumber || params.pullRequestNumber || params.prNumber || ''),
    github_check_url: String(params.githubCheckUrl || params.checkRunUrl || params.checkUrl || ''),
    github_check_run_id: String(params.githubCheckRunId || params.checkRunId || ''),
    github_workflow: String(params.githubWorkflow || params.workflow || ''),
    github_run_id: String(params.githubRunId || params.workflowRunId || params.runId || ''),
    deployment_url: String(params.deploymentUrl || ''),
    deployment_id: String(params.deploymentId || ''),
    deployment_environment: String(params.deploymentEnvironment || ''),
    workspace,
    agent: 'openclaw',
    agent_version: process.env.OPENCLAW_VERSION || '',
    adapter: 'openclaw-trusted-mode',
    adapter_version: process.env.OPENCLAW_TRUSTED_MODE_VERSION || '1.0.7',
    gateway_id: gatewayId || '',
    environment: environment || '',
    session_id: String(eventRecord.sessionId || eventRecord.threadId || eventRecord.conversationId || ''),
    idempotency_key: String(eventRecord.idempotencyKey || ''),
  });
}

export default function register(api: PluginApi) {
  const config = mergeDefinedConfig(readRuntimePluginConfig(), (api.config || {}) as Record<string, unknown>) as {
    pdpUrl?: string;
    pdpAuthToken?: string;
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
    telemetryOptIn?: boolean;
    telemetryUrl?: string;
    telemetryInstallId?: string;
    telemetryTimeoutMs?: number;
  };
  const pdpUrl = config.pdpUrl || 'http://localhost:8001/v1/authorize';
  const pdpAuthToken = typeof config.pdpAuthToken === 'string'
    ? config.pdpAuthToken
    : process.env.PDP_AUTH_TOKEN || process.env.DEXGATE_PDP_AUTH_TOKEN || '';
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
  const telemetryConfig = buildTelemetryConfig({
    ...config,
    toolPolicyMode,
    certificationStatus,
  });
  const hardeningValidation = validateHardeningConfig({
    toolPolicyMode,
    allowedTools,
    requireTenantId: config.requireTenantId,
    allowedTenantIds: config.allowedTenantIds,
    pdpUrl,
    pdpAuthToken,
    tenantId,
    gatewayId,
    environment,
  });

  if (!hardeningValidation.ok) {
    console.error(`[Trusted Mode ERROR] Hardening config invalid: ${hardeningValidation.issues.join('; ')}`);
  }

  const hook = 'before_tool_call';
  api.on(hook, async (event: ToolCallEvent): Promise<BeforeToolCallResult | void> => {
    const recordTelemetry = async (fields: Record<string, unknown>) => {
      await sendTelemetryEvent(telemetryConfig, 'adapter.evaluation', {
        mode: toolPolicyMode,
        ...fields,
      });
    };

    if (!hardeningValidation.ok) {
      await recordTelemetry({
        decision: 'deny',
        reasonCode: 'CONFIG_INVALID',
        source: 'local',
        governed: false,
      });
      return {
        block: true,
        blockReason: `[Trusted Mode BLOCKED] Hardening configuration invalid: ${hardeningValidation.issues.join(
          '; '
        )}`,
      };
    }

    if (!isToolAllowedByPolicyMode(event.toolName, toolPolicyMode, allowedTools)) {
      await recordTelemetry({
        decision: 'deny',
        reasonCode: 'LOCAL_ALLOWLIST_BLOCK',
        source: 'local',
        governed: false,
      });
      return {
        block: true,
        blockReason: `[Trusted Mode BLOCKED] Tool "${event.toolName}" denied by allowlist policy mode.`,
      };
    }

    if (shouldBlockToolForCertification(certificationStatus, event.toolName, highRiskTools)) {
      await recordTelemetry({
        decision: 'deny',
        reasonCode: 'CERT_LOCKDOWN_BLOCK',
        source: 'local',
        governed: false,
      });
      return {
        block: true,
        blockReason: certificationBlockReason(certificationStatus, event.toolName, event.params || {}),
      };
    }

    if (toolPolicyMode === 'ALLOWLIST_ONLY') {
      await recordTelemetry({
        decision: 'allow',
        reasonCode: 'LOCAL_ALLOWLIST_ALLOW',
        source: 'local',
        governed: false,
      });
      return;
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
          context_summary: contextSummary,
          origin: buildOriginMetadata(event, gatewayId, environment)
        }
      }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), pdpTimeoutMs);

    try {
      const res = await fetch(pdpUrl, {
        method: 'POST',
        headers: buildPdpHeaders(pdpAuthToken),
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!res.ok) throw new Error(`PDP unreachable (${res.status})`);

      let decision;
      try {
        decision = await res.json();
      } catch {
        // Do not prefix with [Trusted Mode ERROR]; outer catch already logs that tag.
        throw new Error('Invalid PDP response: malformed JSON');
      }

      if (!decision || typeof decision.decision !== 'string') {
        throw new Error('Invalid PDP response: missing decision');
      }
      const passportValidation = validatePdpPassport(decision);
      if (!passportValidation.ok) {
        throw new Error(`Invalid PDP response: ${passportValidation.error}`);
      }

      if (decision.decision === 'deny') {
        const reason = decision.deny_reason || decision.deny_code || 'Policy denied';
        await recordTelemetry({
          decision: 'deny',
          reasonCode: decision.deny_code || 'PDP_DENY',
          source: 'pdp',
          governed: decision.simulated === true ? false : true,
          simulated: decision.simulated === true,
        });
        return { block: true, blockReason: `[Trusted Mode BLOCKED] ${reason}` };
      }

      if (decision.constraints) {
        enforceConstraints(event.params, decision.constraints);
        await recordTelemetry({
          decision: decision.decision,
          reasonCode: decision.reasonCode || decision.deny_code || 'PDP_CONSTRAIN',
          source: 'pdp',
          governed: decision.simulated === true || decision.enforcement_bypassed === true ? false : true,
          simulated: decision.simulated === true,
          enforcementMode: decision.enforcement_mode || 'enforce',
          enforcementBypassed: decision.enforcement_bypassed === true,
          wouldHaveDecision: decision.would_have_decision || null,
          wouldHaveDenyCode: decision.would_have_deny_code || null,
        });
        return { params: event.params || {} };
      }
      await recordTelemetry({
        decision: decision.decision,
        reasonCode: decision.reasonCode || decision.deny_code || 'PDP_ALLOW',
        source: 'pdp',
        governed: decision.simulated === true || decision.enforcement_bypassed === true ? false : true,
        simulated: decision.simulated === true,
        enforcementMode: decision.enforcement_mode || 'enforce',
        enforcementBypassed: decision.enforcement_bypassed === true,
        wouldHaveDecision: decision.would_have_decision || null,
        wouldHaveDenyCode: decision.would_have_deny_code || null,
      });
    } catch (err: any) {
      const baseMsg = err?.name === 'AbortError' ? `PDP timeout after ${pdpTimeoutMs}ms` : err?.message || 'PDP authorization failed';
      const msg = maybeAppendSdeRuntimeGuidance(baseMsg, pdpUrl);
      console.error(`[Trusted Mode ERROR]`, msg);
      if (failClosed) {
        await recordTelemetry({
          decision: 'deny',
          reasonCode: 'PDP_UNAVAILABLE_FAIL_CLOSED',
          source: 'local',
          governed: false,
        });
        return { block: true, blockReason: `[Trusted Mode BLOCKED] ${msg}` };
      }
      console.warn(`[Trusted Mode WARN] Fail-open enabled; allowing tool call.`);
      await recordTelemetry({
        decision: 'allow',
        reasonCode: 'PDP_UNAVAILABLE_FAIL_OPEN',
        source: 'local',
        governed: false,
      });
    } finally {
      clearTimeout(timeout);
    }
  });
}

export function buildPdpHeaders(pdpAuthToken?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof pdpAuthToken === 'string' ? pdpAuthToken.trim() : '';
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}
