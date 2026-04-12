import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const PLUGIN_ID = "openclaw-trusted-mode";
export const DEFAULT_OPENCLAW_CONFIG_PATH = "~/.openclaw/openclaw.json";

export type GovernedConfigInput = {
  configPath: string;
  pdpUrl: string;
  policyVariant: string;
  tenantId: string;
  gatewayId: string;
  environment: string;
  certificationStatus: "CERTIFIED_ENFORCED" | "LOCKDOWN_ONLY" | "UNSUPPORTED";
  failClosed: boolean;
  pdpTimeoutMs: number;
};

type JsonObject = Record<string, unknown>;

export type ConfigWriteResult = {
  configPath: string;
  created: boolean;
  pluginAllowAdded: boolean;
};

function ensureObject(value: unknown): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
}

export function normalizeConfigText(text: string): string {
  return `${text.trimEnd()}\n`;
}

export function parseOpenClawConfig(raw: string): JsonObject {
  const parsed = JSON.parse(raw);
  return ensureObject(parsed);
}

export function configureGovernedPlugin(
  baseConfig: JsonObject,
  input: Omit<GovernedConfigInput, "configPath">
): { config: JsonObject; pluginAllowAdded: boolean } {
  const nextConfig = ensureObject(baseConfig);
  const plugins = ensureObject(nextConfig.plugins);
  const existingAllow = Array.isArray(plugins.allow) ? [...plugins.allow] : [];
  const allow = existingAllow.filter((item): item is string => typeof item === "string");
  const pluginAllowAdded = !allow.includes(PLUGIN_ID);
  if (pluginAllowAdded) {
    allow.push(PLUGIN_ID);
  }

  const entries = ensureObject(plugins.entries);
  const existingEntry = ensureObject(entries[PLUGIN_ID]);
  const existingPluginConfig = ensureObject(existingEntry.config);
  const nextPluginConfig: JsonObject = {
    ...existingPluginConfig,
    pdpUrl: input.pdpUrl,
    policyVariant: input.policyVariant,
    pdpTimeoutMs: input.pdpTimeoutMs,
    failClosed: input.failClosed,
    tenantId: input.tenantId,
    gatewayId: input.gatewayId,
    environment: input.environment,
    toolPolicyMode: "PDP",
    requireTenantId: true,
    allowedTenantIds: [input.tenantId],
    certificationStatus: input.certificationStatus,
  };

  delete nextPluginConfig.allowedTools;

  entries[PLUGIN_ID] = {
    ...existingEntry,
    enabled: true,
    config: nextPluginConfig,
  };

  plugins.allow = allow;
  plugins.entries = entries;
  nextConfig.plugins = plugins;

  return {
    config: nextConfig,
    pluginAllowAdded,
  };
}

export function writeGovernedConfig(input: GovernedConfigInput): ConfigWriteResult {
  let parsed: JsonObject = {};
  let created = false;

  try {
    parsed = parseOpenClawConfig(readFileSync(input.configPath, "utf8"));
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      created = true;
    } else {
      throw error;
    }
  }

  const { config, pluginAllowAdded } = configureGovernedPlugin(parsed, input);
  mkdirSync(dirname(input.configPath), { recursive: true });
  writeFileSync(input.configPath, normalizeConfigText(JSON.stringify(config, null, 2)), "utf8");

  return {
    configPath: input.configPath,
    created,
    pluginAllowAdded,
  };
}
