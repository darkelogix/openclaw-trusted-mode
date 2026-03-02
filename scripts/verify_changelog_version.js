#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function hasVersionSection(changelog, version) {
  const patterns = [
    new RegExp(`^##\\s+v${version}\\b`, 'm'),
    new RegExp(`^##\\s+${version}\\b`, 'm'),
    new RegExp(`^##\\s+\\[v?${version}\\]\\b`, 'm'),
  ];
  return patterns.some((p) => p.test(changelog));
}

function main() {
  const root = process.cwd();
  const pkgPath = path.join(root, 'package.json');
  const changelogPath = path.join(root, 'CHANGELOG.md');

  if (!fs.existsSync(pkgPath)) {
    console.error('Missing package.json');
    process.exit(1);
  }
  if (!fs.existsSync(changelogPath)) {
    console.error('Missing CHANGELOG.md');
    process.exit(1);
  }

  const pkg = JSON.parse(read(pkgPath));
  const version = String(pkg.version || '').trim();
  if (!version) {
    console.error('package.json version is missing');
    process.exit(1);
  }

  const changelog = read(changelogPath);
  if (!hasVersionSection(changelog, version)) {
    console.error(`CHANGELOG.md is missing a section for current version ${version}`);
    console.error('Expected heading like:');
    console.error(`- ## v${version}`);
    console.error(`- ## ${version}`);
    process.exit(1);
  }

  console.log(`Changelog version check passed for ${version}.`);
}

main();
