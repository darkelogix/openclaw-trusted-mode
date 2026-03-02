#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

function copyIfExists(root, sourceRel, outRoot) {
  const src = path.join(root, sourceRel);
  if (!fs.existsSync(src)) return false;
  const dst = path.join(outRoot, sourceRel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  return true;
}

function main() {
  const root = process.cwd();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const version = String(pkg.version || 'unknown').trim();
  const outRoot = path.join(root, 'release-evidence', `v${version}`);
  fs.mkdirSync(outRoot, { recursive: true });

  const wanted = [
    'release-artifacts/checksums.sha256',
    'release-artifacts/release-manifest.json',
    'security-artifacts/security-summary.json',
    'security-artifacts/SECURITY_RELEASE_INDEX.md',
    'performance-artifacts/performance-benchmark.json',
    'COMPATIBILITY_MATRIX.md',
    'PERFORMANCE_BASELINE.md',
    'SECURITY_EVIDENCE_BUNDLE.md',
    'SECURITY_TRIAGE_LOG.md',
    'THREAT_MODEL_SUMMARY.md',
    'THIRD_PARTY_NOTICES.md',
    'THIRD_PARTY_NOTICES_REVIEW.md',
    'RELEASE_OPERATIONS.md',
    'ROLLBACK_DRILL_RECORD.md',
    `RELEASE_v${version}.md`,
  ];

  const copied = [];
  const missing = [];
  for (const rel of wanted) {
    if (copyIfExists(root, rel, outRoot)) copied.push(rel);
    else missing.push(rel);
  }

  const indexPath = path.join(outRoot, 'EVIDENCE_INDEX.md');
  const lines = [
    '# Evidence Index',
    '',
    `Release version: ${version}`,
    `Generated at: ${new Date().toISOString()}`,
    '',
    '## Included files',
    ...copied.map((f) => `- ${f}`),
  ];
  if (missing.length > 0) {
    lines.push('', '## Missing files', ...missing.map((f) => `- ${f}`));
  }
  fs.writeFileSync(indexPath, `${lines.join('\n')}\n`, 'utf8');

  console.log(`Bundled release evidence to ${outRoot}`);
  console.log(`Included: ${copied.length}, Missing: ${missing.length}`);
  if (missing.length > 0) {
    process.exitCode = 1;
  }
}

main();
