import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { verifyAttestationPack } from '../src/attestation';

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

describe('attestation pack verification', () => {
  it('verifies pack hash signature', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tm-attest-'));
    const packPath = join(dir, 'pack.json');
    const sigPath = join(dir, 'pack.sig');
    const pack = JSON.stringify({ pack_id: 'trusted_mode_attest', pack_version: 'v1.0.0' });
    writeFileSync(packPath, pack, 'utf8');
    writeFileSync(sigPath, `sha256:${sha256(pack)}`, 'utf8');

    const result = verifyAttestationPack(packPath, sigPath);
    expect(result.ok).toBe(true);
    expect(result.signatureVerified).toBe(true);
    expect(result.packVersion).toBe('v1.0.0');
  });

  it('fails on signature mismatch', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tm-attest-'));
    const packPath = join(dir, 'pack.json');
    const sigPath = join(dir, 'pack.sig');
    writeFileSync(packPath, JSON.stringify({ pack_version: 'v1.0.0' }), 'utf8');
    writeFileSync(sigPath, 'sha256:deadbeef', 'utf8');

    const result = verifyAttestationPack(packPath, sigPath);
    expect(result.ok).toBe(false);
    expect(result.signatureVerified).toBe(false);
  });
});
