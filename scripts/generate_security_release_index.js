#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

function main() {
  const root = process.cwd();
  const summaryPath = path.join(root, 'security-artifacts', 'security-summary.json');
  const outPath = path.join(root, 'security-artifacts', 'SECURITY_RELEASE_INDEX.md');
  let counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };

  if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    counts = { ...counts, ...(summary.vulnerabilities || {}) };
  }

  const lines = [
    '# Security Release Index',
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
    '## Vulnerability Summary',
    '',
    '| Severity | Count |',
    '|---|---|',
    `| critical | ${counts.critical} |`,
    `| high | ${counts.high} |`,
    `| moderate | ${counts.moderate} |`,
    `| low | ${counts.low} |`,
    `| info | ${counts.info} |`,
    `| total | ${counts.total} |`,
    '',
    '## Evidence Files',
    '',
    '- `security-artifacts/npm-audit.json`',
    '- `security-artifacts/security-summary.json`',
    '- `SECURITY_TRIAGE_LOG.md`',
    '- `THREAT_MODEL_SUMMARY.md`',
    '- `THIRD_PARTY_NOTICES.md`',
    '- `THIRD_PARTY_NOTICES_REVIEW.md`',
    '- `SECURITY_EVIDENCE_BUNDLE.md`',
  ];

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${outPath}`);
}

main();
