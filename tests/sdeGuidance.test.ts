import { describe, expect, it } from 'vitest';
import { maybeAppendSdeRuntimeGuidance } from '../src/sdeGuidance';

describe('SDE runtime guidance', () => {
  it('adds guidance for local connectivity failures', () => {
    const result = maybeAppendSdeRuntimeGuidance('fetch failed', 'http://localhost:8001/v1/authorize');
    expect(result).toMatch(/licensed SDE runtime/);
    expect(result).toMatch(/ALLOWLIST_ONLY/);
  });

  it('does not add guidance for non-connectivity errors', () => {
    const result = maybeAppendSdeRuntimeGuidance('PDP unreachable (403)', 'http://localhost:8001/v1/authorize');
    expect(result).toBe('PDP unreachable (403)');
  });
});
