#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function parseMarkdownTableRows(md, title) {
  const idx = md.indexOf(title);
  if (idx === -1) return [];
  const slice = md.slice(idx);
  const lines = slice.split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    const cols = line.split('|').slice(1, -1).map((x) => x.trim());
    rows.push(cols);
  }
  return rows;
}

function main() {
  const root = process.cwd();
  const summaryPath = path.join(root, 'security-artifacts', 'security-summary.json');
  const triagePath = path.join(root, 'SECURITY_TRIAGE_LOG.md');

  if (!fs.existsSync(summaryPath)) fail(`Missing ${summaryPath}. Run collect-security-evidence first.`);
  if (!fs.existsSync(triagePath)) fail(`Missing ${triagePath}`);

  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const vulnerabilities = summary?.vulnerabilities || {};
  const high = Number(vulnerabilities.high || 0);
  const critical = Number(vulnerabilities.critical || 0);
  const allowFindings = String(process.env.ALLOW_SECURITY_FINDINGS || '').toLowerCase() === 'true';

  if (!allowFindings && (high > 0 || critical > 0)) {
    fail(
      `Security gate failed: high=${high}, critical=${critical}. ` +
        'Triage and fix findings or set ALLOW_SECURITY_FINDINGS=true for controlled override.'
    );
  }

  const triageText = fs.readFileSync(triagePath, 'utf8');
  const rows = parseMarkdownTableRows(triageText, '| Date | Source | Finding | Severity | Status | Owner | Target Fix Date | Evidence |');
  const dataRows = rows.filter((r) => r.length >= 8 && r[0] !== 'Date' && !r[0].startsWith('---'));
  const badRows = [];

  for (const row of dataRows) {
    const severity = String(row[3] || '').toLowerCase();
    const status = String(row[4] || '').toLowerCase();
    const owner = String(row[5] || '').trim();
    const due = String(row[6] || '').trim();
    const evidence = String(row[7] || '').trim();

    if ((severity === 'high' || severity === 'critical') && status !== 'closed') {
      if (!owner || owner.toLowerCase() === 'tbd') badRows.push(`Missing owner for ${severity} finding`);
      if (!due || due.toLowerCase() === 'tbd' || due.toLowerCase() === 'n/a') badRows.push(`Missing target date for ${severity} finding`);
      if (!evidence || evidence.toLowerCase() === 'tbd') badRows.push(`Missing evidence for ${severity} finding`);
    }
  }

  if (badRows.length > 0) {
    fail(`Security triage gate failed:\n- ${badRows.join('\n- ')}`);
  }

  console.log(`Security gate passed (high=${high}, critical=${critical}).`);
}

main();
