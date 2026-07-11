import { describe, expect, it, vi } from 'vitest';
import { buildTelemetryConfig, buildTelemetryPayload, sendTelemetryEvent } from '../src/telemetry';

describe('adapter telemetry', () => {
  it('is disabled by default', () => {
    expect(buildTelemetryConfig().telemetryOptIn).toBe(false);
  });

  it('hashes tenant and gateway identifiers', () => {
    const config = buildTelemetryConfig({
      telemetryOptIn: true,
      telemetryInstallId: 'install-123',
      tenantId: 'tenant-secret',
      gatewayId: 'gateway-secret',
      environment: 'dev',
      toolPolicyMode: 'ALLOWLIST_ONLY',
    });
    const payload = buildTelemetryPayload(config, 'adapter.evaluation', {
      decision: 'deny',
      reasonCode: 'LOCAL_ALLOWLIST_BLOCK',
      source: 'local',
      governed: false,
    });

    expect(payload.packageName).toBe('@dexgate/openclaw-trusted-mode');
    expect(payload.adapter).toBe('openclaw');
    expect(payload.installId).toBe('install-123');
    expect(payload.governed).toBe(false);
    expect(payload.tenantHash).not.toBe('tenant-secret');
    expect(payload.gatewayHash).not.toBe('gateway-secret');
    expect(JSON.stringify(payload)).not.toContain('tenant-secret');
    expect(JSON.stringify(payload)).not.toContain('gateway-secret');
  });

  it('posts only when opted in', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal('fetch', fetchSpy);
    try {
      await expect(sendTelemetryEvent(buildTelemetryConfig(), 'adapter.evaluation')).resolves.toEqual({
        sent: false,
        reason: 'disabled',
      });
      expect(fetchSpy).not.toHaveBeenCalled();

      await expect(
        sendTelemetryEvent(
          buildTelemetryConfig({ telemetryOptIn: true, telemetryUrl: 'https://telemetry.test/events' }),
          'adapter.evaluation',
          { governed: false, source: 'local' }
        )
      ).resolves.toEqual({ sent: true, status: 202 });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy.mock.calls[0][0]).toBe('https://telemetry.test/events');
      expect(fetchSpy.mock.calls[0][1].headers['X-Dexgate-Telemetry-Opt-In']).toBe('true');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
