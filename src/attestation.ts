import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export type PackVerificationResult = {
  ok: boolean;
  packPath: string;
  signaturePath: string;
  packVersion: string;
  signatureVerified: boolean;
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
  const signaturePath =
    process.env.TRUSTED_MODE_ATTEST_SIG_PATH ||
    join(projectRoot, 'attestation', 'trusted_mode_attest_v1.sig');
  return { packPath, signaturePath };
}

export function verifyAttestationPack(
  packPath: string,
  signaturePath: string
): PackVerificationResult {
  if (!existsSync(packPath)) {
    return {
      ok: false,
      packPath,
      signaturePath,
      packVersion: 'unknown',
      signatureVerified: false,
      error: 'Attestation pack file not found',
    };
  }
  if (!existsSync(signaturePath)) {
    return {
      ok: false,
      packPath,
      signaturePath,
      packVersion: 'unknown',
      signatureVerified: false,
      error: 'Attestation signature file not found',
    };
  }

  try {
    const packRaw = readFileSync(packPath, 'utf8');
    const sigRaw = readFileSync(signaturePath, 'utf8').trim();
    const parsed = JSON.parse(packRaw) as TrustedModeAttestPack;
    const packVersion = parsed.pack_version || 'unknown';
    const expected = `sha256:${sha256Hex(packRaw)}`;

    if (sigRaw !== expected) {
      return {
        ok: false,
        packPath,
        signaturePath,
        packVersion,
        signatureVerified: false,
        error: 'Attestation signature mismatch',
      };
    }

    return {
      ok: true,
      packPath,
      signaturePath,
      packVersion,
      signatureVerified: true,
    };
  } catch (err: any) {
    return {
      ok: false,
      packPath,
      signaturePath,
      packVersion: 'unknown',
      signatureVerified: false,
      error: err?.message || 'Attestation verification failed',
    };
  }
}

export function verifyLocalAttestationPack(): PackVerificationResult {
  const { packPath, signaturePath } = resolveAttestationPaths();
  return verifyAttestationPack(packPath, signaturePath);
}
