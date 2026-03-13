import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SDE_REPO = fileURLToPath(new URL('../../sde-enterprise/', import.meta.url));
const SERVER_SCRIPT = fileURLToPath(new URL('../../sde-enterprise/scripts/run_test_pdp_server.py', import.meta.url));

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

async function waitForHealthz(baseUrl: string, child: ReturnType<typeof spawn>) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`SDE PDP exited early with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for live SDE PDP server');
}

export async function startLiveSdePdp(options?: {
  entitlements?: Record<string, string[]>;
  tenantVariants?: Record<string, unknown>;
  license?: Record<string, unknown> | null;
  env?: Record<string, string>;
}) {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn('python', [SERVER_SCRIPT], {
    cwd: SDE_REPO,
    env: {
      ...process.env,
      ...options?.env,
      TEST_PDP_PORT: String(port),
      TEST_PDP_ENTITLEMENTS_JSON: JSON.stringify(options?.entitlements || {}),
      TEST_PDP_TENANT_VARIANTS_JSON: JSON.stringify(options?.tenantVariants || {}),
      TEST_PDP_LICENSE_JSON: JSON.stringify(options?.license || {}),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });

  try {
    await waitForHealthz(baseUrl, child);
  } catch (error) {
    child.kill();
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}${stderr ? `\n${stderr}` : ''}`);
  }

  return {
    pdpUrl: `${baseUrl}/v1/authorize`,
    async stop() {
      if (child.exitCode !== null) return;
      child.kill();
      await new Promise((resolve) => child.once('exit', resolve));
    },
  };
}
