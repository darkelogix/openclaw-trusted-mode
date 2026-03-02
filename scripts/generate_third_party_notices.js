#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

function main() {
  const root = process.cwd();
  const lockPath = path.join(root, 'package-lock.json');
  if (!fs.existsSync(lockPath)) {
    console.error('Missing package-lock.json');
    process.exit(1);
  }

  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const packages = lock.packages || {};
  const names = Object.keys(packages)
    .filter((k) => k.startsWith('node_modules/'))
    .map((k) => k.replace(/^node_modules\//, ''))
    .sort((a, b) => a.localeCompare(b));

  const lines = [
    '# Third-Party Notices',
    '',
    'Generated from `package-lock.json`.',
    'License values should be validated before public release.',
    '',
    '| Package | License |',
    '|---|---|',
  ];
  for (const name of names) {
    const meta = packages[`node_modules/${name}`] || {};
    const license = meta.license || 'UNKNOWN';
    lines.push(`| ${name} | ${license} |`);
  }

  const outPath = path.join(root, 'THIRD_PARTY_NOTICES.md');
  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${outPath}`);
}

main();
