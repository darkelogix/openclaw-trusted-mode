#!/usr/bin/env node

import {
  isToolAllowedByPolicyMode,
  validateHardeningConfig,
} from './hardening';
import { buildTelemetryConfig, sendTelemetryEvent } from './telemetry';

type Check = {
  name: string;
  ok: boolean;
  expectedDecision: 'allow' | 'deny';
  decision: 'allow' | 'deny';
  reasonCode: string;
  governed: false;
  source: 'local-hardening';
};

const allowedTools = ['read_file', 'list_files', 'search_files'];
const validation = validateHardeningConfig({
  toolPolicyMode: 'ALLOWLIST_ONLY',
  allowedTools,
});

function evaluate(name: string, toolName: string, expectedDecision: 'allow' | 'deny'): Check {
  const allowed = isToolAllowedByPolicyMode(toolName, 'ALLOWLIST_ONLY', allowedTools);
  const decision = allowed ? 'allow' : 'deny';
  return {
    name,
    ok: decision === expectedDecision,
    expectedDecision,
    decision,
    reasonCode: allowed ? 'LOCAL_ALLOWLIST_ALLOW' : 'LOCAL_ALLOWLIST_BLOCK',
    governed: false,
    source: 'local-hardening',
  };
}

async function main() {
  const checks: Check[] = [
    evaluate('read_file_allowed', 'read_file', 'allow'),
    evaluate('list_files_allowed', 'list_files', 'allow'),
    evaluate('exec_blocked', 'exec', 'deny'),
    evaluate('write_file_blocked', 'write_file', 'deny'),
  ];

  const report = {
    status: validation.ok && checks.every((check) => check.ok) ? 'PASS' : 'FAIL',
    mode: 'ALLOWLIST_ONLY',
    governed: false,
    source: 'local-hardening',
    summary:
      'Free local hardening is active. This does not use the SDE PDP, does not create governed decision records, and does not prove paid dexgate enforcement.',
    upgrade:
      'Upgrade to dexgate when you need PDP-backed authorization, decision records, tenant entitlements, and rollout evidence.',
    validation,
    checks,
  };

  console.log(JSON.stringify(report, null, 2));
  await sendTelemetryEvent(
    buildTelemetryConfig({ toolPolicyMode: 'ALLOWLIST_ONLY', environment: 'local' }),
    'local-hardening-check',
    {
      mode: 'ALLOWLIST_ONLY',
      status: report.status,
      source: 'local-hardening',
      governed: false,
    }
  );
  process.exit(report.status === 'PASS' ? 0 : 1);
}

void main();
