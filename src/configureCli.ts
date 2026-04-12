#!/usr/bin/env node

import { exit } from "node:process";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_OPENCLAW_CONFIG_PATH,
  PLUGIN_ID,
  writeGovernedConfig,
} from "./openclawConfig";
import { normalizeRuntimeCertificationStatus } from "./runtimeCertification";

type ConfigureCliOptions = {
  tenantId: string;
  gatewayId: string;
  environment: string;
  pdpUrl: string;
  policyVariant: string;
  configPath: string;
  certificationStatus: "CERTIFIED_ENFORCED" | "LOCKDOWN_ONLY" | "UNSUPPORTED";
  failClosed: boolean;
  pdpTimeoutMs: number;
  jsonMode: boolean;
};

function printHelp(): void {
  console.log(`Configure ${PLUGIN_ID} governed mode in OpenClaw.

Usage:
  openclaw-trusted-mode-configure --tenantId <tenant> --gatewayId <gateway> --environment <environment> --pdpUrl <url> [options]

Options:
  --policyVariant <variant>         Policy variant to store in plugin config.
                                   Default: guard-pro.v2026.02
  --configPath <path>              OpenClaw config path.
                                   Default: ${DEFAULT_OPENCLAW_CONFIG_PATH}
  --certificationStatus <status>   CERTIFIED_ENFORCED | LOCKDOWN_ONLY | UNSUPPORTED
                                   Default: LOCKDOWN_ONLY
  --pdpTimeoutMs <ms>              PDP timeout to store in plugin config.
                                   Default: 5000
  --failOpen                       Write failClosed=false instead of true.
  --json                           Print a JSON summary instead of prose.
  --help                           Show this help text.
`);
}

function expandHomePath(value: string): string {
  if (value === "~") return homedir();
  if (value.startsWith("~/") || value.startsWith("~\\")) {
    return join(homedir(), value.slice(2));
  }
  return value;
}

function readFlagValue(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

export function parseConfigureCliArgs(argv: string[]): ConfigureCliOptions {
  if (argv.includes("--help")) {
    printHelp();
    exit(0);
  }

  const tenantId = readFlagValue(argv, "--tenantId");
  const gatewayId = readFlagValue(argv, "--gatewayId");
  const environment = readFlagValue(argv, "--environment");
  const pdpUrl = readFlagValue(argv, "--pdpUrl");
  const policyVariant = readFlagValue(argv, "--policyVariant") || "guard-pro.v2026.02";
  const configPath = expandHomePath(
    readFlagValue(argv, "--configPath") || join(homedir(), ".openclaw", "openclaw.json")
  );
  const certificationStatus = normalizeRuntimeCertificationStatus(
    readFlagValue(argv, "--certificationStatus") || "LOCKDOWN_ONLY"
  );
  const timeoutRaw = readFlagValue(argv, "--pdpTimeoutMs");
  const pdpTimeoutMs = timeoutRaw ? Number(timeoutRaw) : 5000;
  const failClosed = !argv.includes("--failOpen");
  const jsonMode = argv.includes("--json");

  const missing = [
    ["--tenantId", tenantId],
    ["--gatewayId", gatewayId],
    ["--environment", environment],
    ["--pdpUrl", pdpUrl],
  ].filter(([, value]) => !value);
  if (missing.length > 0) {
    throw new Error(`Missing required flags: ${missing.map(([flag]) => flag).join(", ")}`);
  }
  if (!Number.isFinite(pdpTimeoutMs) || pdpTimeoutMs <= 0) {
    throw new Error("--pdpTimeoutMs must be a positive number");
  }

  return {
    tenantId: tenantId as string,
    gatewayId: gatewayId as string,
    environment: environment as string,
    pdpUrl: pdpUrl as string,
    policyVariant,
    configPath,
    certificationStatus,
    failClosed,
    pdpTimeoutMs,
    jsonMode,
  };
}

export function runConfigureCli(argv: string[] = process.argv.slice(2)): void {
  try {
    const options = parseConfigureCliArgs(argv);
    const result = writeGovernedConfig(options);
    const output = {
      pluginId: PLUGIN_ID,
      configPath: result.configPath,
      created: result.created,
      pluginAllowAdded: result.pluginAllowAdded,
      mode: "governed",
      values: {
        tenantId: options.tenantId,
        gatewayId: options.gatewayId,
        environment: options.environment,
        pdpUrl: options.pdpUrl,
        policyVariant: options.policyVariant,
        certificationStatus: options.certificationStatus,
        failClosed: options.failClosed,
        pdpTimeoutMs: options.pdpTimeoutMs,
      },
    };

    if (options.jsonMode) {
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    console.log(`Configured ${PLUGIN_ID} governed mode at ${result.configPath}`);
    console.log(`- plugins.allow includes ${PLUGIN_ID}`);
    console.log(`- tenantId=${options.tenantId}`);
    console.log(`- gatewayId=${options.gatewayId}`);
    console.log(`- environment=${options.environment}`);
    console.log(`- pdpUrl=${options.pdpUrl}`);
    console.log(`- toolPolicyMode=PDP`);
    console.log(`- failClosed=${options.failClosed}`);
    console.log(`- certificationStatus=${options.certificationStatus}`);
  } catch (error: unknown) {
    console.error((error as Error).message);
    console.error(`Run "openclaw-trusted-mode-configure --help" for usage.`);
    exit(1);
  }
}

if (require.main === module) {
  runConfigureCli();
}
