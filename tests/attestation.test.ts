import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { verifyIntegrityPack } from '../src/attestation';

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

describe('local integrity pack verification', () => {
  it('verifies pack hash checksum', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tm-attest-'));
    const packPath = join(dir, 'pack.json');
    const sigPath = join(dir, 'pack.sig');
    const pack = JSON.stringify({ pack_id: 'trusted_mode_attest', pack_version: 'v1.0.0' });
    writeFileSync(packPath, pack, 'utf8');
    writeFileSync(sigPath, `sha256:${sha256(pack)}`, 'utf8');

    const result = verifyIntegrityPack(packPath, sigPath);
    expect(result.ok).toBe(true);
    expect(result.integrityVerified).toBe(true);
    expect(result.packVersion).toBe('v1.0.0');
  });

  it('fails on checksum mismatch', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tm-attest-'));
    const packPath = join(dir, 'pack.json');
    const sigPath = join(dir, 'pack.sig');
    writeFileSync(packPath, JSON.stringify({ pack_version: 'v1.0.0' }), 'utf8');
    writeFileSync(sigPath, 'sha256:deadbeef', 'utf8');

    const result = verifyIntegrityPack(packPath, sigPath);
    expect(result.ok).toBe(false);
    expect(result.integrityVerified).toBe(false);
  });
});
