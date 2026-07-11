import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DEFAULT_TELEMETRY_URL = 'https://dexgate.ai/api/telemetry/adapter-events/';
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export type TelemetryConfig = {
  telemetryOptIn: boolean;
  telemetryUrl: string;
  telemetryInstallId: string;
  telemetryTimeoutMs: number;
  tenantId?: string;
  gatewayId?: string;
  environment?: string;
  toolPolicyMode?: string;
  certificationStatus?: string;
  openclawVersion?: string;
};

function isTruthy(value: unknown): boolean {
  return TRUE_VALUES.has(String(value || '').trim().toLowerCase());
}

function boundedString(value: unknown, maxLength = 128): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function hashIdentifier(value: unknown): string {
  const normalized = boundedString(value, 256);
  if (!normalized) return '';
  return createHash('sha256').update(normalized).digest('hex').slice(0, 24);
}

function readPackageVersion(startDir: string): string {
  let current = startDir;
  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = join(current, 'package.json');
    if (existsSync(candidate)) {
      try {
        const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as { version?: unknown };
        const version = boundedString(parsed.version, 32);
        if (version) return version;
      } catch {
        // Continue walking upward.
      }
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return '1.0.7';
}

export function telemetryEnabled(overrides: Record<string, unknown> = {}): boolean {
  if (typeof overrides.telemetryOptIn === 'boolean') return overrides.telemetryOptIn;
  return isTruthy(process.env.DEXGATE_TELEMETRY_OPT_IN || process.env.DEXGATE_TELEMETRY);
}

export function buildTelemetryConfig(overrides: Record<string, unknown> = {}): TelemetryConfig {
  return {
    telemetryOptIn: telemetryEnabled(overrides),
    telemetryUrl:
      boundedString(overrides.telemetryUrl, 512) ||
      boundedString(process.env.DEXGATE_TELEMETRY_URL, 512) ||
      DEFAULT_TELEMETRY_URL,
    telemetryInstallId:
      boundedString(overrides.telemetryInstallId, 128) ||
      boundedString(process.env.DEXGATE_TELEMETRY_INSTALL_ID, 128),
    telemetryTimeoutMs:
      typeof overrides.telemetryTimeoutMs === 'number' && Number.isFinite(overrides.telemetryTimeoutMs)
        ? Math.max(100, Math.min(overrides.telemetryTimeoutMs, 5000))
        : 1500,
    tenantId: boundedString(overrides.tenantId, 128),
    gatewayId: boundedString(overrides.gatewayId, 128),
    environment: boundedString(overrides.environment, 64),
    toolPolicyMode: boundedString(overrides.toolPolicyMode, 64),
    certificationStatus: boundedString(overrides.certificationStatus, 64),
    openclawVersion: boundedString(overrides.openclawVersion, 64),
  };
}

export function buildTelemetryPayload(config: TelemetryConfig, eventName: string, fields: Record<string, unknown> = {}) {
  return {
    eventName: boundedString(eventName, 96),
    packageName: '@dexgate/openclaw-trusted-mode',
    packageVersion: readPackageVersion(__dirname),
    adapter: 'openclaw',
    installId: boundedString(config.telemetryInstallId, 128),
    tenantHash: hashIdentifier(config.tenantId),
    gatewayHash: hashIdentifier(config.gatewayId),
    environment: boundedString(config.environment, 64),
    mode: boundedString(fields.mode || config.toolPolicyMode, 64),
    source: boundedString(fields.source, 64),
    decision: boundedString(fields.decision, 64),
    reasonCode: boundedString(fields.reasonCode, 96),
    governed: typeof fields.governed === 'boolean' ? fields.governed : null,
    simulated: fields.simulated === true,
    metadata: {
      status: boundedString(fields.status, 64),
      certificationStatus: boundedString(config.certificationStatus, 64),
      openclawVersion: boundedString(config.openclawVersion, 64),
      nodeVersion: boundedString(process.version, 32),
    },
  };
}

export async function sendTelemetryEvent(config: TelemetryConfig, eventName: string, fields: Record<string, unknown> = {}) {
  if (!config.telemetryOptIn) return { sent: false, reason: 'disabled' };
  if (typeof fetch !== 'function') return { sent: false, reason: 'fetch-unavailable' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.telemetryTimeoutMs || 1500);
  try {
    const response = await fetch(config.telemetryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dexgate-Telemetry-Opt-In': 'true',
      },
      body: JSON.stringify(buildTelemetryPayload(config, eventName, fields)),
      signal: controller.signal,
    });
    return { sent: response.ok, status: response.status };
  } catch (error: any) {
    return { sent: false, reason: error?.name === 'AbortError' ? 'timeout' : 'network-error' };
  } finally {
    clearTimeout(timeout);
  }
}
