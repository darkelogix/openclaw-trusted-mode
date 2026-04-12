import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PLUGIN_ID = "openclaw-trusted-mode";

type JsonObject = Record<string, unknown>;

function ensureObject(value: unknown): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
}

export function resolveOpenClawConfigPath(env: NodeJS.ProcessEnv = process.env): string {
  if (env.OPENCLAW_CONFIG_PATH) return env.OPENCLAW_CONFIG_PATH;
  return join(homedir(), ".openclaw", "openclaw.json");
}

export function readRuntimePluginConfig(env: NodeJS.ProcessEnv = process.env): JsonObject {
  const configPath = resolveOpenClawConfigPath(env);
  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const root = ensureObject(JSON.parse(readFileSync(configPath, "utf8")));
    const plugins = ensureObject(root.plugins);
    const entries = ensureObject(plugins.entries);
    const entry = ensureObject(entries[PLUGIN_ID]);
    return ensureObject(entry.config);
  } catch {
    return {};
  }
}

export function mergeDefinedConfig<T extends JsonObject>(
  base: T,
  override: JsonObject
): T {
  const merged: JsonObject = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged as T;
}
