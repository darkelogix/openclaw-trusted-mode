#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function fileSize(filePath) {
  return fs.statSync(filePath).size;
}

function main() {
  const root = process.cwd();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const version = String(pkg.version || '').trim();
  if (!version) {
    console.error('package.json version is missing');
    process.exit(1);
  }

  const outputs = [
    'dist/index.js',
    'dist/cli.js',
    'openclaw.plugin.json',
    'attestation/trusted_mode_attest_v1.json',
    'attestation/trusted_mode_attest_v1.sig',
    `RELEASE_v${version}.md`,
    'COMPATIBILITY_MATRIX.md',
  ];

  const releaseDir = path.join(root, 'release-artifacts');
  fs.mkdirSync(releaseDir, { recursive: true });
  const checksumsPath = path.join(releaseDir, 'checksums.sha256');
  const manifestPath = path.join(releaseDir, 'release-manifest.json');

  const checksums = [];
  const manifestFiles = [];
  for (const relPath of outputs) {
    const abs = path.join(root, relPath);
    if (!fs.existsSync(abs)) {
      console.error(`Missing artifact file: ${relPath}`);
      process.exit(1);
    }
    const digest = sha256File(abs);
    checksums.push(`${digest}  ${relPath}`);
    manifestFiles.push({
      path: relPath,
      sha256: digest,
      bytes: fileSize(abs),
    });
  }

  fs.writeFileSync(checksumsPath, `${checksums.join('\n')}\n`, 'utf8');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        release_version: version,
        generated_at: new Date().toISOString(),
        files: manifestFiles,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`Wrote ${checksumsPath}`);
  console.log(`Wrote ${manifestPath}`);
}

main();
