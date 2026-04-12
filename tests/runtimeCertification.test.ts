import { describe, expect, it } from 'vitest';
import {
  certificationBlockReason,
  normalizeRuntimeCertificationStatus,
  resolveRuntimeCertificationStatus,
  shouldBlockToolForCertification,
} from '../src/runtimeCertification';

describe('runtime certification', () => {
  it('defaults unknown values to LOCKDOWN_ONLY', () => {
    expect(normalizeRuntimeCertificationStatus('unknown')).toBe('LOCKDOWN_ONLY');
  });

  it('resolves CERTIFIED_ENFORCED from certified version list', () => {
    expect(
      resolveRuntimeCertificationStatus(undefined, '2026.2.15', ['2026.2.15', '2026.2.16'])
    ).toBe('CERTIFIED_ENFORCED');
  });

  it('blocks high-risk shell tool when runtime is not certified', () => {
    expect(shouldBlockToolForCertification('LOCKDOWN_ONLY', 'exec')).toBe(true);
    expect(shouldBlockToolForCertification('UNSUPPORTED', 'exec')).toBe(true);
    expect(shouldBlockToolForCertification('CERTIFIED_ENFORCED', 'exec')).toBe(false);
    expect(shouldBlockToolForCertification('LOCKDOWN_ONLY', 'execute_shell')).toBe(true);
    expect(shouldBlockToolForCertification('UNSUPPORTED', 'execute_shell')).toBe(true);
    expect(shouldBlockToolForCertification('CERTIFIED_ENFORCED', 'execute_shell')).toBe(false);
  });

  it('returns a clearer certification block reason for UI-facing errors', () => {
    expect(certificationBlockReason('LOCKDOWN_ONLY', 'exec')).toContain('Readonly governed validation is working');
    expect(certificationBlockReason('LOCKDOWN_ONLY', 'exec')).toContain('CERTIFIED_ENFORCED');
    expect(certificationBlockReason('UNSUPPORTED', 'exec')).toContain('supported runtime');
  });
});
