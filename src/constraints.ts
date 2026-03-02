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

    const ok = allowedPrefixes.some((prefix: string) => value.startsWith(prefix));
    if (!ok) {
      throw new Error(
        `[Trusted Mode BLOCKED] Constraint violation for "${key}" (allowed prefixes: ${allowedPrefixes.join(
          ', '
        )})`
      );
    }
  }
}
