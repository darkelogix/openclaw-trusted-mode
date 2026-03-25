import { describe, expect, it } from 'vitest';
import {
  isToolAllowedByPolicyMode,
  normalizeToolPolicyMode,
  validateHardeningConfig,
} from '../src/hardening';

describe('hardening config', () => {
  it('normalizes tool policy mode with ALLOWLIST_ONLY default', () => {
    expect(normalizeToolPolicyMode(undefined)).toBe('ALLOWLIST_ONLY');
    expect(normalizeToolPolicyMode('PDP')).toBe('PDP');
    expect(normalizeToolPolicyMode('ALLOWLIST_ONLY')).toBe('ALLOWLIST_ONLY');
  });

  it('requires allowedTools when ALLOWLIST_ONLY', () => {
    const v = validateHardeningConfig({ toolPolicyMode: 'ALLOWLIST_ONLY', allowedTools: [] });
    expect(v.ok).toBe(false);
    expect(v.issues.join(' ')).toMatch(/requires non-empty allowedTools/);
  });

  it('enforces tenant allowlist when configured', () => {
    const v = validateHardeningConfig({
      tenantId: 'trial-tenant',
      allowedTenantIds: ['enterprise-tenant'],
    });
    expect(v.ok).toBe(false);
    expect(v.issues.join(' ')).toMatch(/not in allowedTenantIds/);
  });

  it('allows only listed tools in allowlist mode', () => {
    expect(isToolAllowedByPolicyMode('read_file', 'ALLOWLIST_ONLY', ['read_file'])).toBe(true);
    expect(isToolAllowedByPolicyMode('exec', 'ALLOWLIST_ONLY', ['read_file'])).toBe(false);
    expect(isToolAllowedByPolicyMode('exec', 'PDP', ['read_file'])).toBe(true);
  });
});
