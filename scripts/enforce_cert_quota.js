#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

async function requestJson(url, options) {
  const res = await fetch(url, options);
  let body = {};
  try {
    body = await res.json();
  } catch (_) {
    body = {};
  }
  if (!res.ok) {
    const msg = body?.detail || body?.error || `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return body;
}

async function main() {
  const pdpBase = process.env.PDP_ADMIN_BASE_URL || 'http://localhost:8001';
  const token = process.env.PDP_ADMIN_BEARER_TOKEN || '';
  const tenantId = process.env.CERT_TENANT_ID || 'trial-tenant';
  const openclawVersion = process.env.OPENCLAW_VERSION || 'unknown';
  const pluginVersion = process.env.PLUGIN_VERSION || require('../package.json').version || 'unknown';
  const stackRef =
    process.env.CERT_STACK_REF ||
    `oc-${openclawVersion}+plugin-${pluginVersion}+${process.env.POLICY_VARIANT || 'guard-pro.v2026.02'}`;

  if (!token) {
    throw new Error('PDP_ADMIN_BEARER_TOKEN is required.');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const statusUrl = `${pdpBase}/v1/admin/certifications/status?tenant_id=${encodeURIComponent(tenantId)}`;
  const status = await requestJson(statusUrl, { method: 'GET', headers });

  const consumeUrl = `${pdpBase}/v1/admin/certifications/consume`;
  const consume = await requestJson(consumeUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      tenant_id: tenantId,
      openclaw_version: openclawVersion,
      plugin_version: pluginVersion,
      stack_ref: stackRef,
    }),
  });

  const out = {
    tenant_id: tenantId,
    openclaw_version: openclawVersion,
    plugin_version: pluginVersion,
    stack_ref: stackRef,
    before: status,
    after: consume,
    at: new Date().toISOString(),
  };

  const outDir = path.join(process.cwd(), 'compat-results');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'certification_usage.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

  console.log(`Wrote ${outPath}`);
  if (consume.overage_required) {
    console.log('Certification consumed as overage (outside included quarterly quota).');
  } else {
    console.log('Certification consumed within included quarterly quota.');
  }
}

main().catch((err) => {
  console.error(`certification quota check failed: ${err.message || err}`);
  process.exit(1);
});
