import { afterEach, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import register from '../src/index';

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

describe('trusted mode plugin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
        tenantId: 'trial-tenant',
      });

      register(api as never);
      const result = await getHandler()({ toolName: 'read_file', params: { path: 'README.md' } });

      expect(result).toEqual({
        block: true,
        blockReason: expect.stringContaining('Invalid PDP response: malformed JSON'),
      });
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
        tenantId: 'trial-tenant',
      });

      register(api as never);
      const result = await getHandler()({ toolName: 'read_file', params: { path: 'README.md' } });

      expect(result).toBeUndefined();
    } finally {
      server.close();
    }
  });
});
