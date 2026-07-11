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
    expect(shouldBlockToolForCertification('LOCKDOWN_ONLY', 'apply_patch')).toBe(true);
    expect(shouldBlockToolForCertification('LOCKDOWN_ONLY', 'git_push')).toBe(true);
    expect(shouldBlockToolForCertification('LOCKDOWN_ONLY', 'deploy_class')).toBe(true);
  });

  it('returns a clearer compatibility block reason for UI-facing errors', () => {
    expect(certificationBlockReason('LOCKDOWN_ONLY', 'exec')).toContain('Readonly governed validation is working');
    expect(certificationBlockReason('LOCKDOWN_ONLY', 'exec')).toContain('CERTIFIED_ENFORCED');
    expect(certificationBlockReason('LOCKDOWN_ONLY', 'exec')).toContain('validated compatibility row');
    expect(certificationBlockReason('UNSUPPORTED', 'exec')).toContain('supported runtime');
  });

  it('uses action-specific wording for shell, delete, and write blocks', () => {
    expect(certificationBlockReason('LOCKDOWN_ONLY', 'exec')).toContain('Shell execution is disabled');
    expect(certificationBlockReason('LOCKDOWN_ONLY', 'delete_file')).toContain(
      'File deletion is disabled'
    );
    expect(certificationBlockReason('LOCKDOWN_ONLY', 'write_file')).toContain(
      'File write and edit actions are disabled'
    );
    expect(certificationBlockReason('LOCKDOWN_ONLY', 'git_push')).toContain(
      'Git-changing actions are disabled'
    );
    expect(certificationBlockReason('LOCKDOWN_ONLY', 'deploy_class')).toContain(
      'Deploy-class actions are disabled'
    );
  });

  it('uses supported-runtime wording for unsupported shell, delete, and write blocks', () => {
    expect(certificationBlockReason('UNSUPPORTED', 'exec')).toContain(
      'Shell execution is disabled until you move to a supported runtime'
    );
    expect(certificationBlockReason('UNSUPPORTED', 'delete_file')).toContain(
      'File deletion is disabled until you move to a supported runtime'
    );
    expect(certificationBlockReason('UNSUPPORTED', 'write_file')).toContain(
      'File write and edit actions are disabled until you move to a supported runtime'
    );
  });

  it('infers delete and write intent from exec command payloads', () => {
    expect(
      certificationBlockReason('LOCKDOWN_ONLY', 'exec', {
        command:
          'Remove-Item -Path "C:\\Users\\darkelogixadmin\\.openclaw\\workspace\\guard-pro-ui-smoke.txt" -Force',
      })
    ).toContain('File deletion is disabled');
    expect(
      certificationBlockReason('LOCKDOWN_ONLY', 'exec', {
        command:
          'Set-Content -Path "C:\\Users\\darkelogixadmin\\.openclaw\\workspace\\guard-pro-ui-smoke.txt" -Value "x"',
      })
    ).toContain('File write and edit actions are disabled');
  });
});
