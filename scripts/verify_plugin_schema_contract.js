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
  const packagePath = path.join(root, 'package.json');
  const runtimePath = path.join(root, 'src', 'index.ts');
  const cliPath = path.join(root, 'src', 'cli.ts');
  const configureCliPath = path.join(root, 'src', 'configureCli.ts');
  const openclawConfigPath = path.join(root, 'src', 'openclawConfig.ts');
  if (!fs.existsSync(pluginPath)) fail('Missing openclaw.plugin.json');
  if (!fs.existsSync(packagePath)) fail('Missing package.json');
  if (!fs.existsSync(runtimePath)) fail('Missing src/index.ts');
  if (!fs.existsSync(cliPath)) fail('Missing src/cli.ts');
  if (!fs.existsSync(configureCliPath)) fail('Missing src/configureCli.ts');
  if (!fs.existsSync(openclawConfigPath)) fail('Missing src/openclawConfig.ts');

  const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
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

  if (!pkg.openclaw || !Array.isArray(pkg.openclaw.extensions) || !pkg.openclaw.extensions.includes('dist/index.js')) {
    fail('package.json missing openclaw.extensions entry for dist/index.js');
  }
  const publishedFiles = Array.isArray(pkg.files) ? pkg.files : [];
  for (const requiredFile of ['dist/cli.js', 'dist/cliConfig.js', 'dist/cliPdpClient.js', 'dist/configureCli.js', 'dist/openclawConfig.js']) {
    if (!publishedFiles.includes(requiredFile)) {
      fail(`package.json files missing required published artifact: ${requiredFile}`);
    }
  }
  if (!pkg.bin || pkg.bin['openclaw-trusted-mode-configure'] !== './dist/configureCli.js') {
    fail('package.json missing openclaw-trusted-mode-configure bin entry');
  }
  if (plugin.version !== pkg.version) {
    fail(`Version drift: openclaw.plugin.json version ${plugin.version} does not match package.json version ${pkg.version}`);
  }

  const runtime = fs.readFileSync(runtimePath, 'utf8');
  const cli = fs.readFileSync(cliPath, 'utf8');
  const configureCli = fs.readFileSync(configureCliPath, 'utf8');
  const openclawConfig = fs.readFileSync(openclawConfigPath, 'utf8');
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

  if (props.toolPolicyMode.default !== 'ALLOWLIST_ONLY') {
    fail('Schema default drift: toolPolicyMode.default should be ALLOWLIST_ONLY for standalone safety');
  }
  if (
    !Array.isArray(props.allowedTools.default) ||
    props.allowedTools.default.join(',') !== 'read_file,list_files,search_files'
  ) {
    fail('Schema default drift: allowedTools.default should define the standalone free allowlist');
  }
  if (!Array.isArray(props.highRiskTools.default) || props.highRiskTools.default.length < 4) {
    fail('Schema default drift: highRiskTools.default should include baseline high-risk tools');
  }
  if (!props.highRiskTools.default.includes('exec')) {
    fail('Schema default drift: highRiskTools.default must include exec');
  }
  if (props.failClosed.default !== true) {
    fail('Schema default drift: failClosed.default must be true');
  }
  if (props.certificationStatus.default !== 'LOCKDOWN_ONLY') {
    fail('Schema default drift: certificationStatus.default must be LOCKDOWN_ONLY');
  }

  if (cli.includes('process.env')) {
    fail('Install-safety drift: src/cli.ts must not read process.env directly');
  }
  if (cli.includes('fetch(')) {
    fail('Install-safety drift: src/cli.ts must not perform network calls directly');
  }
  if (!configureCli.includes('writeGovernedConfig')) {
    fail('CLI drift: src/configureCli.ts must invoke writeGovernedConfig');
  }
  if (!openclawConfig.includes('plugins.allow')) {
    fail('Config writer drift: src/openclawConfig.ts must update plugins.allow');
  }
  if (!openclawConfig.includes('toolPolicyMode: "PDP"')) {
    fail('Config writer drift: src/openclawConfig.ts must force governed mode toolPolicyMode=PDP');
  }

  console.log('Plugin schema/runtime contract check passed.');
}

main();
