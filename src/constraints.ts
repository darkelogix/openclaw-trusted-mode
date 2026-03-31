import path from 'node:path';

type NormalizedPath = {
  normalized: string;
  root: string;
  separator: string;
  windows: boolean;
};

function normalizePathValue(value: string): NormalizedPath | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  const windows = /^[a-zA-Z]:[\\/]/.test(trimmed) || trimmed.includes('\\');
  const pathApi = windows ? path.win32 : path.posix;
  const separator = windows ? '\\' : '/';
  const root = pathApi.parse(trimmed).root;

  let normalized = pathApi.normalize(trimmed);
  if (windows) normalized = normalized.replace(/\//g, '\\');

  while (
    normalized.length > root.length &&
    (normalized.endsWith('/') || normalized.endsWith('\\'))
  ) {
    normalized = normalized.slice(0, -1);
  }

  return {
    normalized: normalized || root || separator,
    root,
    separator,
    windows,
  };
}

function isPathWithinPrefix(value: string, prefix: string): boolean {
  const normalizedValue = normalizePathValue(value);
  const normalizedPrefix = normalizePathValue(prefix);
  if (!normalizedValue || !normalizedPrefix) return false;
  if (normalizedValue.windows !== normalizedPrefix.windows) return false;

  const left = normalizedValue.windows
    ? normalizedValue.normalized.toLowerCase()
    : normalizedValue.normalized;
  const right = normalizedPrefix.windows
    ? normalizedPrefix.normalized.toLowerCase()
    : normalizedPrefix.normalized;

  if (left === right) return true;
  if (right === normalizedPrefix.root) {
    return left.startsWith(right);
  }

  return left.startsWith(`${right}${normalizedPrefix.separator}`);
}

function matchesAllowedPrefix(key: string, value: string, prefix: string): boolean {
  if (key.toLowerCase().includes('path')) {
    return isPathWithinPrefix(value, prefix);
  }
  return value.startsWith(prefix);
}

export function enforceConstraints(params: unknown, constraints: unknown) {
  if (!Array.isArray(constraints)) {
    throw new Error(`[Trusted Mode ERROR] Invalid constraints format`);
  }

  for (const constraint of constraints) {
    if (!constraint || typeof constraint !== 'object') continue;

    const key = (constraint as any).key;
    const allowedPrefixes = (constraint as any).allowed_prefixes;
    if (typeof key !== 'string' || !Array.isArray(allowedPrefixes)) continue;

    const value = (params as any)?.[key];
    if (typeof value !== 'string') continue;

    const ok = allowedPrefixes.some(
      (prefix: string) => typeof prefix === 'string' && matchesAllowedPrefix(key, value, prefix)
    );
    if (!ok) {
      throw new Error(
        `[Trusted Mode BLOCKED] Constraint violation for "${key}" (allowed prefixes: ${allowedPrefixes.join(
          ', '
        )})`
      );
    }
  }
}
