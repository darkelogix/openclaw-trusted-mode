#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function fail(msg, errors) {
  errors.push(msg);
}

function main() {
  const root = process.cwd();
  const errors = [];

  const packageJsonPath = path.join(root, 'package.json');
  if (!exists(packageJsonPath)) {
    console.error('Missing package.json');
    process.exit(1);
  }
  const pkg = JSON.parse(readText(packageJsonPath));
  const version = String(pkg.version || '').trim();
  if (!version) {
    console.error('package.json version is missing');
    process.exit(1);
  }

  const requiredFiles = [
    'SECURITY.md',
    'SECURITY_EVIDENCE_BUNDLE.md',
    'THREAT_MODEL_SUMMARY.md',
    'SECURITY_TRIAGE_LOG.md',
    'THIRD_PARTY_NOTICES.md',
    'THIRD_PARTY_NOTICES_REVIEW.md',
    'scripts/verify_security_gates.js',
    'scripts/generate_security_release_index.js',
    'scripts/verify_plugin_schema_contract.js',
    'scripts/bundle_release_evidence.js',
    'COMPATIBILITY_MATRIX.md',
    'README.md',
    'RELEASE_OPERATIONS.md',
    'ROLLBACK_DRILL_RECORD.md',
    'PERFORMANCE_BASELINE.md',
    'PUBLIC_RELEASE_READINESS_CHECKLIST.md',
    'attestation/trusted_mode_attest_v1.json',
    'attestation/trusted_mode_attest_v1.sig',
    '.github/workflows/compatibility-certification.yml',
    '.github/workflows/security-evidence.yml',
    '.github/workflows/release-operations.yml',
    '.github/workflows/performance-benchmark.yml',
  ];

  for (const rel of requiredFiles) {
    const p = path.join(root, rel);
    if (!exists(p)) fail(`Missing required file: ${rel}`, errors);
  }

  const releaseFile = `RELEASE_v${version}.md`;
  const releasePath = path.join(root, releaseFile);
  if (!exists(releasePath)) {
    fail(`Missing versioned release file for current package version: ${releaseFile}`, errors);
  }

  if (exists(path.join(root, 'COMPATIBILITY_MATRIX.md'))) {
    const matrix = readText(path.join(root, 'COMPATIBILITY_MATRIX.md'));
    if (!matrix.includes(version)) {
      fail(`COMPATIBILITY_MATRIX.md does not reference current plugin version: ${version}`, errors);
    }
  }

  if (exists(path.join(root, 'SECURITY.md'))) {
    const sec = readText(path.join(root, 'SECURITY.md')).toLowerCase();
    const requiredPhrases = ['enforcement bypass', 'signature bypass', 'fail-closed'];
    for (const phrase of requiredPhrases) {
      if (!sec.includes(phrase)) {
        fail(`SECURITY.md missing expected scope phrase: "${phrase}"`, errors);
      }
    }
  }

  if (exists(releasePath)) {
    const relText = readText(releasePath);
    const requiredSections = [
      '## 1) Release Thesis',
      '## 3) Compatibility Declaration',
      '## 6) Rollback Plan',
      '## 7) Validation Summary',
      '## 10) Post-Release Monitoring Plan',
    ];
    for (const section of requiredSections) {
      if (!relText.includes(section)) {
        fail(`${releaseFile} missing required section: ${section}`, errors);
      }
    }
  }

  if (errors.length > 0) {
    console.error('Release governance artifact check failed:');
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }

  console.log('Release governance artifact check passed.');
}

main();
