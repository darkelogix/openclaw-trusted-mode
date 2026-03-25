import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import register from '../src/index';
import { startLiveSdePdp } from './liveSdeHarness';

type RegisteredHook = (event: { toolName: string; params?: Record<string, unknown> }) => Promise<unknown>;

const runLiveSdeIntegration = process.env.RUN_LIVE_SDE_INTEGRATION === '1';
const liveSdeDescribe = runLiveSdeIntegration ? describe : describe.skip;

function createApi(config: Record<string, unknown>) {
  let handler: RegisteredHook | undefined;

  return {
    api: {
      config,
      on(hook: string, fn: RegisteredHook) {
        if (hook === 'before_tool_call') {
          handler = fn;
        }
      },
    },
    getHandler() {
      if (!handler) {
        throw new Error('before_tool_call handler was not registered');
      }
      return handler;
    },
  };
}

liveSdeDescribe('live SDE integration', () => {
  const servers: Array<{ stop: () => Promise<void> }> = [];
  const tempDirs: string[] = [];

  // These tests require a locally runnable SDE repo and Python runtime.
  afterEach(async () => {
    while (servers.length > 0) {
      await servers.pop()!.stop();
    }
    while (tempDirs.length > 0) {
      await rm(tempDirs.pop()!, { recursive: true, force: true });
    }
  });

  it('allows entitled OpenClaw read-only traffic through the live PDP', async () => {
    const server = await startLiveSdePdp({
      entitlements: {
        'trial-tenant': ['openclaw.trusted_mode.authorize.v1'],
      },
      tenantVariants: {
        'trial-tenant': {
          variants: {
            'openclaw.trusted_mode.authorize.v1': 'guard-pro.v2026.02',
          },
        },
      },
      env: {
        ENFORCE_TENANT_POLICY_VARIANT_LOCK: 'true',
        REQUIRE_TENANT_VARIANT_MAPPING: 'true',
      },
    });
    servers.push(server);

    const { api, getHandler } = createApi({
      toolPolicyMode: 'PDP',
      pdpUrl: server.pdpUrl,
      failClosed: true,
      tenantId: 'trial-tenant',
      policyVariant: 'guard-pro.v2026.02',
      certificationStatus: 'CERTIFIED_ENFORCED',
    });

    register(api as never);
    const result = await getHandler()({ toolName: 'read_file', params: { path: 'README.md' } });

    expect(result).not.toEqual(
      expect.objectContaining({
        block: true,
      })
    );
  });

  it('blocks high-impact OpenClaw tools through the live PDP', async () => {
    const server = await startLiveSdePdp({
      entitlements: {
        'trial-tenant': ['openclaw.trusted_mode.authorize.v1'],
      },
    });
    servers.push(server);

    const { api, getHandler } = createApi({
      toolPolicyMode: 'PDP',
      pdpUrl: server.pdpUrl,
      failClosed: true,
      tenantId: 'trial-tenant',
      policyVariant: 'guard-pro.v2026.02',
      certificationStatus: 'CERTIFIED_ENFORCED',
    });

    register(api as never);
    const result = await getHandler()({ toolName: 'execute_shell', params: {} });

    expect(result).toEqual({
      block: true,
      blockReason: expect.stringContaining('Shell execution blocked by default policy'),
    });
  });

  it('blocks OpenClaw traffic when the live PDP entitlement gate denies the tenant', async () => {
    const server = await startLiveSdePdp({
      entitlements: {},
    });
    servers.push(server);

    const { api, getHandler } = createApi({
      toolPolicyMode: 'PDP',
      pdpUrl: server.pdpUrl,
      failClosed: true,
      tenantId: 'trial-tenant',
      policyVariant: 'guard-pro.v2026.02',
      certificationStatus: 'CERTIFIED_ENFORCED',
    });

    register(api as never);
    const result = await getHandler()({ toolName: 'read_file', params: { path: 'README.md' } });

    expect(result).toEqual({
      block: true,
      blockReason: expect.stringContaining('Tenant not entitled for this decision_sku'),
    });
  });

  it('requires gateway_id through the live PDP when license gateway limits are enforced', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'openclaw-gateway-limit-'));
    tempDirs.push(tempDir);
    const server = await startLiveSdePdp({
      entitlements: {
        'trial-tenant': ['openclaw.trusted_mode.authorize.v1'],
      },
      license: {
        license_id: 'L-openclaw-gateway',
        max_gateways: 1,
      },
      env: {
        SDE_LICENSE_TOKEN: 'present',
        DECISION_USAGE_STORE_PATH: path.join(tempDir, 'decision_usage.json'),
      },
    });
    servers.push(server);

    const { api, getHandler } = createApi({
      toolPolicyMode: 'PDP',
      pdpUrl: server.pdpUrl,
      failClosed: true,
      tenantId: 'trial-tenant',
      policyVariant: 'guard-pro.v2026.02',
      certificationStatus: 'CERTIFIED_ENFORCED',
    });

    register(api as never);
    const result = await getHandler()({ toolName: 'read_file', params: { path: 'README.md' } });

    expect(result).toEqual({
      block: true,
      blockReason: expect.stringContaining('gateway_id is required when max_gateways is enforced by license'),
    });
  });

  it('requires environment through the live PDP when license environment limits are enforced', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'openclaw-environment-limit-'));
    tempDirs.push(tempDir);
    const server = await startLiveSdePdp({
      entitlements: {
        'trial-tenant': ['openclaw.trusted_mode.authorize.v1'],
      },
      license: {
        license_id: 'L-openclaw-environment',
        max_environments: 1,
      },
      env: {
        SDE_LICENSE_TOKEN: 'present',
        DECISION_USAGE_STORE_PATH: path.join(tempDir, 'decision_usage.json'),
      },
    });
    servers.push(server);

    const { api, getHandler } = createApi({
      toolPolicyMode: 'PDP',
      pdpUrl: server.pdpUrl,
      failClosed: true,
      tenantId: 'trial-tenant',
      policyVariant: 'guard-pro.v2026.02',
      certificationStatus: 'CERTIFIED_ENFORCED',
    });

    register(api as never);
    const result = await getHandler()({ toolName: 'read_file', params: { path: 'README.md' } });

    expect(result).toEqual({
      block: true,
      blockReason: expect.stringContaining('environment is required when max_environments is enforced by license'),
    });
  });
});
