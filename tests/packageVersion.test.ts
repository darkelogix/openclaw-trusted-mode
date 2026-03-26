import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveOpenClawVersion } from '../src/packageVersion';

describe('package version resolution', () => {
  it('prefers an explicitly configured version', () => {
    expect(resolveOpenClawVersion('9.9.9-test')).toBe('9.9.9-test');
  });

  it('falls back to the package.json version when no override is set', () => {
    const packageVersion = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8')
    ).version as string;

    expect(resolveOpenClawVersion(undefined)).toBe(packageVersion);
  });
});
