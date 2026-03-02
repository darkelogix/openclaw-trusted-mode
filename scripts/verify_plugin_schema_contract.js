#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function ensureProp(schemaProps, key) {
  if (!Object.prototype.hasOwnProperty.call(schemaProps, key)) {
    fail(`Schema missing required property: ${key}`);
  }
}

function main() {
  const root = process.cwd();
  const pluginPath = path.join(root, 'openclaw.plugin.json');
  const runtimePath = path.join(root, 'src', 'index.ts');
  if (!fs.existsSync(pluginPath)) fail('Missing openclaw.plugin.json');
  if (!fs.existsSync(runtimePath)) fail('Missing src/index.ts');

  const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
  const props = plugin?.configSchema?.properties;
  if (!props || typeof props !== 'object') {
    fail('openclaw.plugin.json missing configSchema.properties');
  }

  const requiredKeys = [
    'pdpUrl',
    'policyVariant',
    'pdpTimeoutMs',
    'failClosed',
    'tenantId',
    'certificationStatus',
    'openclawVersion',
    'certifiedOpenClawVersions',
    'highRiskTools',
    'toolPolicyMode',
    'allowedTools',
    'requireTenantId',
    'allowedTenantIds',
    'contextCurator',
  ];
  for (const key of requiredKeys) ensureProp(props, key);

  const runtime = fs.readFileSync(runtimePath, 'utf8');
  const runtimeUses = [
    'config.pdpUrl',
    'config.policyVariant',
    'config.pdpTimeoutMs',
    'config.failClosed',
    'config.tenantId',
    'config.certificationStatus',
    'config.openclawVersion',
    'config.certifiedOpenClawVersions',
    'config.highRiskTools',
    'config.toolPolicyMode',
    'config.allowedTools',
    'config.requireTenantId',
    'config.allowedTenantIds',
    'config.contextCurator',
  ];
  for (const use of runtimeUses) {
    if (!runtime.includes(use)) {
      fail(`Runtime config contract drift: missing usage reference "${use}" in src/index.ts`);
    }
  }

  if (props.toolPolicyMode.default !== 'PDP') {
    fail('Schema default drift: toolPolicyMode.default should be PDP');
  }
  if (!Array.isArray(props.highRiskTools.default) || props.highRiskTools.default.length < 4) {
    fail('Schema default drift: highRiskTools.default should include baseline high-risk tools');
  }
  if (props.failClosed.default !== true) {
    fail('Schema default drift: failClosed.default must be true');
  }
  if (props.certificationStatus.default !== 'LOCKDOWN_ONLY') {
    fail('Schema default drift: certificationStatus.default must be LOCKDOWN_ONLY');
  }

  console.log('Plugin schema/runtime contract check passed.');
}

main();
