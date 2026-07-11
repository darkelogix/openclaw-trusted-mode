#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const CHECK_ONLY = process.argv.includes('--check');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, '\n');
}

function adapterInstallFromTarget(target) {
  if (target.adapter_install) return target.adapter_install;
  return target.certification_status === 'UNSUPPORTED' ? 'Unverified' : 'Available';
}

function evidenceFromTarget(target, result) {
  if (target.pdp_passport_evidence) return target.pdp_passport_evidence;
  if (!result) return 'Not promoted';
  if (result.runtime_certification_status === 'CERTIFIED_ENFORCED' && result.status === 'ENFORCED_OK') {
    return 'Internal evidence only; requires configured paid PDP, tenant entitlement, PDP auth token, and scoped Passport response';
  }
  return 'Not promoted';
}

function publicClaimStatusFromTarget(target) {
  return target.public_claim_status || 'Do not claim certified/enforced';
}

function buildRow(target, result, pluginVersion) {
  const notes = result
    ? `${target.notes} (last check ${result.generated_at || 'n/a'})`
    : target.notes;
  return `| ${target.openclaw_version} | ${pluginVersion} | ${adapterInstallFromTarget(target)} | ${evidenceFromTarget(target, result)} | ${publicClaimStatusFromTarget(target)} | ${notes} |`;
}

function replaceMatrixTable(content, rows) {
  content = normalizeLineEndings(content);
  const header =
    '| OpenClaw Version | Plugin Version | Adapter Install | PDP / Passport Evidence | Public Claim Status | Notes |';
  const divider = '|---|---|---|---|---|---|';
  const start = content.indexOf(header);
  if (start === -1) throw new Error('Compatibility table header not found.');
  const dividerIndex = content.indexOf(divider, start);
  if (dividerIndex === -1) throw new Error('Compatibility table divider not found.');

  const afterDivider = dividerIndex + divider.length;
  const tailStart = content.indexOf('\n\n## ', afterDivider);
  const tail = tailStart === -1 ? '' : content.slice(tailStart);
  const prefix = content.slice(0, start);
  const next = `${prefix}${header}\n${divider}\n${rows.join('\n')}${tail}`;
  return next.endsWith('\n') ? next : `${next}\n`;
}

function main() {
  const root = process.cwd();
  const targetsPath = path.join(root, 'scripts', 'compatibility_targets.json');
  const matrixPath = path.join(root, 'COMPATIBILITY_MATRIX.md');
  const resultsDir = path.join(root, 'compat-results');
  const pkgPath = path.join(root, 'package.json');

  const targets = readJson(targetsPath);
  const pkg = readJson(pkgPath);
  const pluginVersion = String(pkg.version || '').trim();
  const resultByVersion = new Map();

  if (fs.existsSync(resultsDir)) {
    const files = fs.readdirSync(resultsDir).filter((name) => name.endsWith('.json'));
    for (const file of files) {
      const version = file.replace(/\.json$/, '');
      const fullPath = path.join(resultsDir, file);
      try {
        resultByVersion.set(version, readJson(fullPath));
      } catch (err) {
        console.warn(`Skipping unreadable result file: ${fullPath}`);
      }
    }
  }

  const rows = targets.map((target) =>
    buildRow(target, resultByVersion.get(target.openclaw_version), pluginVersion)
  );
  const current = fs.readFileSync(matrixPath, 'utf8');
  const next = replaceMatrixTable(current, rows);

  if (CHECK_ONLY) {
    if (normalizeLineEndings(current) !== normalizeLineEndings(next)) {
      console.error('COMPATIBILITY_MATRIX.md is out of date. Run: npm run update-compatibility-matrix');
      process.exit(1);
    }
    console.log('Compatibility matrix check passed.');
    return;
  }

  fs.writeFileSync(matrixPath, next, 'utf8');
  console.log('Updated COMPATIBILITY_MATRIX.md');
}

main();
