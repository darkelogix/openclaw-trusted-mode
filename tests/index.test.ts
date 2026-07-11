import { afterEach, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import register, { buildPdpHeaders } from '../src/index';

type RegisteredHook = (event: { toolName: string; params?: Record<string, unknown> }) => Promise<unknown>;

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

function startMockPdpServer(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void
): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        server,
        url: `http://127.0.0.1:${port}/v1/authorize`,
      });
    });
  });
}

function validPassport(overrides: Record<string, unknown> = {}) {
  return {
    status: 'issued',
    passport_id: 'pass-test-openclaw',
    schema_id: 'passport.schema.coding.prod_change.v1',
    decision_sku: 'openclaw.trusted_mode.authorize.v1',
    tenant_id: 'trial-tenant',
    authority: { authorized_action: 'read_file' },
    scope: { target: 'README.md', environment: 'test' },
    expires_at: '2999-01-01T00:00:00Z',
    revocation_status: 'not_revoked',
    proof: { signature_status: 'unsigned' },
    verify_contract: { failure_behavior: 'refuse' },
    ...overrides,
  };
}

describe('trusted mode plugin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENCLAW_CONFIG_PATH;
  });

  it('allows standalone allowlist mode without calling the PDP', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { api, getHandler } = createApi({
      toolPolicyMode: 'ALLOWLIST_ONLY',
      allowedTools: ['read_file', 'list_files', 'search_files'],
      failClosed: true,
    });

    register(api as never);
    const result = await getHandler()({ toolName: 'read_file', params: { path: 'README.md' } });

    expect(result).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('builds PDP headers with bearer auth when configured', () => {
    expect(buildPdpHeaders(' runtime-token ')).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer runtime-token',
    });
    expect(buildPdpHeaders()).toEqual({ 'Content-Type': 'application/json' });
  });

  it('blocks denied tools locally in allowlist mode', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { api, getHandler } = createApi({
      toolPolicyMode: 'ALLOWLIST_ONLY',
      allowedTools: ['read_file'],
      failClosed: true,
    });

    register(api as never);
    const result = await getHandler()({ toolName: 'exec', params: {} });

    expect(result).toEqual({
      block: true,
      blockReason: '[Trusted Mode BLOCKED] Tool "exec" denied by allowlist policy mode.',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('surfaces delete-specific certification wording for exec delete commands', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { api, getHandler } = createApi({
      toolPolicyMode: 'PDP',
      failClosed: true,
      certificationStatus: 'LOCKDOWN_ONLY',
      pdpAuthToken: 'test-token',
      tenantId: 'darkelogix',
      gatewayId: 'gw-dev',
      environment: 'dev',
    });

    register(api as never);
    const result = await getHandler()({
      toolName: 'exec',
      params: {
        command:
          'Remove-Item -Path "C:\\Users\\darkelogixadmin\\.openclaw\\workspace\\guard-pro-ui-smoke.txt" -Force',
      },
    });

    expect(result).toEqual({
      block: true,
      blockReason: expect.stringContaining('File deletion is disabled'),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('surfaces write-specific certification wording for exec write commands', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { api, getHandler } = createApi({
      toolPolicyMode: 'PDP',
      failClosed: true,
      certificationStatus: 'LOCKDOWN_ONLY',
      pdpAuthToken: 'test-token',
      tenantId: 'darkelogix',
      gatewayId: 'gw-dev',
      environment: 'dev',
    });

    register(api as never);
    const result = await getHandler()({
      toolName: 'exec',
      params: {
        command:
          'Set-Content -Path "C:\\Users\\darkelogixadmin\\.openclaw\\workspace\\guard-pro-ui-smoke.txt" -Value "updated"',
      },
    });

    expect(result).toEqual({
      block: true,
      blockReason: expect.stringContaining('File write and edit actions are disabled'),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('surfaces SDE guidance when governed mode points at a missing local PDP', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));

    const { api, getHandler } = createApi({
      toolPolicyMode: 'PDP',
      failClosed: true,
      certificationStatus: 'CERTIFIED_ENFORCED',
      pdpAuthToken: 'test-token',
      tenantId: 'trial-tenant',
      gatewayId: 'gw-test',
      environment: 'test',
    });

    register(api as never);
    const result = await getHandler()({ toolName: 'read_file', params: { path: 'README.md' } });

    expect(result).toEqual({
      block: true,
      blockReason: expect.stringContaining('licensed SDE runtime'),
    });
    expect((result as { blockReason: string }).blockReason).toContain('ALLOWLIST_ONLY');
  });

  it('fails closed before PDP call when auth token is missing', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { api, getHandler } = createApi({
      toolPolicyMode: 'PDP',
      failClosed: true,
      certificationStatus: 'CERTIFIED_ENFORCED',
      tenantId: 'trial-tenant',
      gatewayId: 'gw-test',
      environment: 'test',
    });

    register(api as never);
    const result = await getHandler()({ toolName: 'read_file', params: { path: 'README.md' } });

    expect(result).toEqual({
      block: true,
      blockReason: expect.stringContaining('pdpAuthToken'),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails closed when the PDP returns malformed JSON', async () => {
    const { server, url } = await startMockPdpServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{not-valid-json');
    });

    try {
      const { api, getHandler } = createApi({
        toolPolicyMode: 'PDP',
        pdpUrl: url,
        failClosed: true,
        certificationStatus: 'CERTIFIED_ENFORCED',
        pdpAuthToken: 'test-token',
        tenantId: 'trial-tenant',
        gatewayId: 'gw-test',
        environment: 'test',
      });

      register(api as never);
      const result = await getHandler()({ toolName: 'read_file', params: { path: 'README.md' } });

      expect(result).toEqual({
        block: true,
        blockReason: expect.stringContaining('Invalid PDP response: malformed JSON'),
      });
      // Regression: outer catch already prefixes [Trusted Mode ERROR]/message must not double-tag.
      expect(String(result.blockReason)).not.toMatch(/\[Trusted Mode ERROR\].*\[Trusted Mode ERROR\]/);
      expect(String(result.blockReason).match(/Invalid PDP response/g)?.length || 0).toBe(1);
    } finally {
      server.close();
    }
  });

  it('fails closed when PDP allow omits Passport without double error tags', async () => {
    const { server, url } = await startMockPdpServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ decision: 'allow', trace: { traceId: 'trace-missing-passport' } }));
    });

    try {
      const { api, getHandler } = createApi({
        toolPolicyMode: 'PDP',
        pdpUrl: url,
        failClosed: true,
        certificationStatus: 'CERTIFIED_ENFORCED',
        pdpAuthToken: 'test-token',
        tenantId: 'trial-tenant',
        gatewayId: 'gw-test',
        environment: 'test',
      });

      register(api as never);
      const result = await getHandler()({ toolName: 'read_file', params: { path: 'README.md' } });

      expect(result.block).toBe(true);
      expect(String(result.blockReason)).toContain('passport');
      expect(String(result.blockReason)).not.toMatch(/\[Trusted Mode ERROR\].*\[Trusted Mode ERROR\]/);
    } finally {
      server.close();
    }
  });

  it('allows when PDP allow includes a valid Passport', async () => {
    const { server, url } = await startMockPdpServer((req, res) => {
      expect(req.headers.authorization).toBe('Bearer test-token');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        decision: 'allow',
        passport: validPassport(),
        trace: { traceId: 'trace-allow' },
      }));
    });

    try {
      const { api, getHandler } = createApi({
        toolPolicyMode: 'PDP',
        pdpUrl: url,
        failClosed: true,
        certificationStatus: 'CERTIFIED_ENFORCED',
        pdpAuthToken: 'test-token',
        tenantId: 'trial-tenant',
        gatewayId: 'gw-test',
        environment: 'test',
      });

      register(api as never);
      const result = await getHandler()({ toolName: 'read_file', params: { path: 'README.md' } });

      expect(result).toBeUndefined();
    } finally {
      server.close();
    }
  });

  it('sends origin metadata to the PDP for request tracking', async () => {
    let captured: any = null;
    const { server, url } = await startMockPdpServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        captured = JSON.parse(body);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          decision: 'allow',
          passport: validPassport(),
          trace: { traceId: 'trace-origin' },
        }));
      });
    });

    try {
      const { api, getHandler } = createApi({
        toolPolicyMode: 'PDP',
        pdpUrl: url,
        failClosed: true,
        certificationStatus: 'CERTIFIED_ENFORCED',
        pdpAuthToken: 'test-token',
        tenantId: 'trial-tenant',
        gatewayId: 'gw-test',
        environment: 'test',
      });

      register(api as never);
      const result = await getHandler()({
        toolName: 'read_file',
        params: {
          path: 'README.md',
          cwd: 'C:\\dev\\repo',
          repoUrl: 'https://github.com/example/repo',
          branch: 'main',
          commitSha: 'abc123',
          githubPrUrl: 'https://github.com/example/repo/pull/42',
          githubPrNumber: 42,
          checkRunUrl: 'https://github.com/example/repo/actions/runs/99',
          githubWorkflow: 'deploy',
          githubRunId: 99,
          deploymentEnvironment: 'prod',
        },
      });

      expect(result).toBeUndefined();
      expect(captured.inputs.action_request.origin.adapter).toBe('openclaw-trusted-mode');
      expect(captured.inputs.action_request.origin.gateway_id).toBe('gw-test');
      expect(captured.inputs.action_request.origin.environment).toBe('test');
      expect(captured.inputs.action_request.origin.repo_url).toBe('https://github.com/example/repo');
      expect(captured.inputs.action_request.origin.branch).toBe('main');
      expect(captured.inputs.action_request.origin.commit_sha).toBe('abc123');
      expect(captured.inputs.action_request.origin.github_pr_url).toBe('https://github.com/example/repo/pull/42');
      expect(captured.inputs.action_request.origin.github_pr_number).toBe('42');
      expect(captured.inputs.action_request.origin.github_check_url).toBe('https://github.com/example/repo/actions/runs/99');
      expect(captured.inputs.action_request.origin.github_workflow).toBe('deploy');
      expect(captured.inputs.action_request.origin.github_run_id).toBe('99');
      expect(captured.inputs.action_request.origin.deployment_environment).toBe('prod');
    } finally {
      server.close();
    }
  });

  it('fails closed when PDP allow omits Passport', async () => {
    const { server, url } = await startMockPdpServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ decision: 'allow', trace: { traceId: 'trace-missing-passport' } }));
    });

    try {
      const { api, getHandler } = createApi({
        toolPolicyMode: 'PDP',
        pdpUrl: url,
        failClosed: true,
        certificationStatus: 'CERTIFIED_ENFORCED',
        pdpAuthToken: 'test-token',
        tenantId: 'trial-tenant',
        gatewayId: 'gw-test',
        environment: 'test',
      });

      register(api as never);
      const result = await getHandler()({ toolName: 'read_file', params: { path: 'README.md' } });

      expect(result).toEqual({
        block: true,
        blockReason: expect.stringContaining('passport'),
      });
    } finally {
      server.close();
    }
  });

  it('allows explicit monitor-mode bypass without Passport', async () => {
    const { server, url } = await startMockPdpServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        decision: 'allow',
        reasonCode: 'MONITOR_MODE_ALLOW',
        enforcement_mode: 'monitor',
        enforcement_bypassed: true,
        would_have_decision: 'deny',
        would_have_deny_code: 'CHANGE_CONTROL_REQUIRED',
        monitor_mode: { scope_id: 'trusted-dev-workstation', status: 'active' },
        passport: {
          status: 'not_issued',
          reason: 'monitor_mode_bypass_no_passport',
        },
        trace: { traceId: 'trace-monitor' },
      }));
    });

    try {
      const { api, getHandler } = createApi({
        toolPolicyMode: 'PDP',
        pdpUrl: url,
        failClosed: true,
        certificationStatus: 'CERTIFIED_ENFORCED',
        pdpAuthToken: 'test-token',
        tenantId: 'trial-tenant',
        gatewayId: 'gw-test',
        environment: 'test',
      });

      register(api as never);
      const result = await getHandler()({ toolName: 'deploy_service', params: { service: 'api' } });

      expect(result).toBeUndefined();
    } finally {
      server.close();
    }
  });

  it('fails open on PDP timeout when configured', async () => {
    const { server, url } = await startMockPdpServer(() => {
      // Intentionally never respond so AbortController drives the timeout path.
    });

    try {
      const { api, getHandler } = createApi({
        toolPolicyMode: 'PDP',
        pdpUrl: url,
        failClosed: false,
        pdpTimeoutMs: 25,
        certificationStatus: 'CERTIFIED_ENFORCED',
        pdpAuthToken: 'test-token',
        tenantId: 'trial-tenant',
        gatewayId: 'gw-test',
        environment: 'test',
      });

      register(api as never);
      const result = await getHandler()({ toolName: 'read_file', params: { path: 'README.md' } });

      expect(result).toBeUndefined();
    } finally {
      server.close();
    }
  });

  it('falls back to the OpenClaw config file when api.config is empty', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'openclaw-runtime-'));
    const configPath = join(dir, 'openclaw.json');
    process.env.OPENCLAW_CONFIG_PATH = configPath;
    writeFileSync(
      configPath,
      JSON.stringify({
        plugins: {
          entries: {
            'openclaw-trusted-mode': {
              enabled: true,
              config: {
                toolPolicyMode: 'PDP',
                pdpUrl: 'http://127.0.0.1:9/v1/authorize',
                pdpAuthToken: 'test-token',
                tenantId: 'darkelogix',
                gatewayId: 'gw-dev',
                environment: 'dev',
                failClosed: true,
                certificationStatus: 'LOCKDOWN_ONLY',
                requireTenantId: true,
                allowedTenantIds: ['darkelogix'],
              },
            },
          },
        },
      })
    );

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));

    try {
      const { api, getHandler } = createApi({});

      register(api as never);
      const result = await getHandler()({ toolName: 'read_file', params: { path: 'README.md' } });

      expect(result).toEqual({
        block: true,
        blockReason: expect.stringContaining('licensed SDE runtime'),
      });
      expect((result as { blockReason: string }).blockReason).not.toContain('Hardening configuration invalid');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
