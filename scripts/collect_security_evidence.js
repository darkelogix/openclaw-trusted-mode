#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const root = process.cwd();
  const outDir = path.join(root, 'security-artifacts');
  fs.mkdirSync(outDir, { recursive: true });

  const auditPath = path.join(outDir, 'npm-audit.json');
  const summaryPath = path.join(outDir, 'security-summary.json');

  const audit = safeReadJson(auditPath);
  const vulns = audit?.metadata?.vulnerabilities || {};
  const summary = {
    generated_at: new Date().toISOString(),
    source: fs.existsSync(auditPath) ? 'npm-audit.json' : 'no-audit-input',
    vulnerabilities: {
      info: Number(vulns.info || 0),
      low: Number(vulns.low || 0),
      moderate: Number(vulns.moderate || 0),
      high: Number(vulns.high || 0),
      critical: Number(vulns.critical || 0),
      total: Number(vulns.total || 0),
    },
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Wrote ${summaryPath}`);
}

main();
