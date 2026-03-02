export type ContextCuratorConfig = {
  enabled?: boolean;
  redactKeys?: string[];
  dropPaths?: string[];
  maxStringLength?: number;
};

const REDACTED = '[REDACTED]';
const TRUNCATED_SUFFIX = '...[TRUNCATED]';

export function curateContext(payload: Record<string, unknown>, config: ContextCuratorConfig) {
  if (!config?.enabled) {
    return { curated: payload, summary: canonicalJson(payload) };
  }

  const curated = curateNode(payload, config, '');
  return { curated, summary: canonicalJson(curated) };
}

function curateNode(node: unknown, config: ContextCuratorConfig, path: string): unknown {
  if (shouldDrop(path, config.dropPaths || [])) {
    return null;
  }

  if (Array.isArray(node)) {
    return node.map((v, i) => curateNode(v, config, `${path}[${i}]`));
  }

  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    const keys = Object.keys(node).sort();
    for (const key of keys) {
      const nextPath = path ? `${path}.${key}` : key;
      if (config.redactKeys && config.redactKeys.includes(key)) {
        out[key] = REDACTED;
      } else {
        out[key] = curateNode((node as Record<string, unknown>)[key], config, nextPath);
      }
    }
    return out;
  }

  if (typeof node === 'string') {
    return truncate(node, config.maxStringLength || 0);
  }

  return node;
}

function truncate(value: string, maxLen: number): string {
  if (maxLen <= 0 || value.length <= maxLen) return value;
  const keep = Math.max(0, maxLen - TRUNCATED_SUFFIX.length);
  return value.slice(0, keep) + TRUNCATED_SUFFIX;
}

function shouldDrop(path: string, dropPaths: string[]): boolean {
  if (!path) return false;
  for (const p of dropPaths) {
    if (path === p || path.startsWith(`${p}.`)) return true;
  }
  return false;
}

function canonicalJson(data: unknown): string {
  return JSON.stringify(sortKeys(data));
}

function sortKeys(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(sortKeys);
  if (data && typeof data === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(data).sort()) {
      out[key] = sortKeys((data as Record<string, unknown>)[key]);
    }
    return out;
  }
  return data;
}
