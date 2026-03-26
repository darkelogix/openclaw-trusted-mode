import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

function readPackageVersion(startDir: string): string | undefined {
  let current = startDir;

  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = join(current, 'package.json');
    if (existsSync(candidate)) {
      try {
        const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as { version?: unknown };
        if (typeof parsed.version === 'string' && parsed.version.trim() !== '') {
          return parsed.version.trim();
        }
      } catch {
        // Fall through to the next parent directory.
      }
    }

    const parent = dirname(current);
    if (parent == current) break;
    current = parent;
  }

  return undefined;
}

export function resolveOpenClawVersion(configuredVersion: unknown = process.env.OPENCLAW_VERSION): string {
  if (typeof configuredVersion === 'string' && configuredVersion.trim() !== '') {
    return configuredVersion.trim();
  }

  return readPackageVersion(__dirname) ?? 'unknown';
}
