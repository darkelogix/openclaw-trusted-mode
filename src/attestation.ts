import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export type PackVerificationResult = {
  ok: boolean;
  packPath: string;
  checksumPath: string;
  packVersion: string;
  integrityVerified: boolean;
  error?: string;
};

type TrustedModeAttestPack = {
  pack_id?: string;
  pack_version?: string;
};

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function makeTraceId(): string {
  return `tmc-${randomUUID()}`;
}

export function resolveAttestationPaths() {
  const projectRoot = resolve(__dirname, '..');
  const packPath =
    process.env.TRUSTED_MODE_ATTEST_PATH ||
    join(projectRoot, 'attestation', 'trusted_mode_attest_v1.json');
  const checksumPath =
    process.env.TRUSTED_MODE_ATTEST_SIG_PATH ||
    join(projectRoot, 'attestation', 'trusted_mode_attest_v1.sig');
  return { packPath, checksumPath };
}

export function verifyIntegrityPack(
  packPath: string,
  checksumPath: string
): PackVerificationResult {
  if (!existsSync(packPath)) {
    return {
      ok: false,
      packPath,
      checksumPath,
      packVersion: 'unknown',
      integrityVerified: false,
      error: 'Local integrity pack file not found',
    };
  }
  if (!existsSync(checksumPath)) {
    return {
      ok: false,
      packPath,
      checksumPath,
      packVersion: 'unknown',
      integrityVerified: false,
      error: 'Local integrity checksum file not found',
    };
  }

  try {
    const packRaw = readFileSync(packPath, 'utf8');
    const checksumRaw = readFileSync(checksumPath, 'utf8').trim();
    const parsed = JSON.parse(packRaw) as TrustedModeAttestPack;
    const packVersion = parsed.pack_version || 'unknown';
    const expected = `sha256:${sha256Hex(packRaw)}`;

    if (checksumRaw !== expected) {
      return {
        ok: false,
        packPath,
        checksumPath,
        packVersion,
        integrityVerified: false,
        error: 'Local integrity checksum mismatch',
      };
    }

    return {
      ok: true,
      packPath,
      checksumPath,
      packVersion,
      integrityVerified: true,
    };
  } catch (err: any) {
    return {
      ok: false,
      packPath,
      checksumPath,
      packVersion: 'unknown',
      integrityVerified: false,
      error: err?.message || 'Local integrity verification failed',
    };
  }
}

export const verifyAttestationPack = verifyIntegrityPack;

export function verifyLocalAttestationPack(): PackVerificationResult {
  const { packPath, checksumPath } = resolveAttestationPaths();
  return verifyIntegrityPack(packPath, checksumPath);
}
