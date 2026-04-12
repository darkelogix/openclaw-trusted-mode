import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveOpenClawVersion } from '../src/packageVersion';

describe('package version resolution', () => {
  const originalOpenClawVersion = process.env.OPENCLAW_VERSION;

  afterEach(() => {
    if (originalOpenClawVersion === undefined) {
      delete process.env.OPENCLAW_VERSION;
    } else {
      process.env.OPENCLAW_VERSION = originalOpenClawVersion;
    }
  });

  it('prefers an explicitly configured version', () => {
    expect(resolveOpenClawVersion('9.9.9-test')).toBe('9.9.9-test');
  });

  it('falls back to the package.json version when no override is set', () => {
    delete process.env.OPENCLAW_VERSION;
    const packageVersion = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8')
    ).version as string;

    expect(resolveOpenClawVersion(undefined)).toBe(packageVersion);
  });
});
