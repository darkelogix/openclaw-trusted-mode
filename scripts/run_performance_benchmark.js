#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function toMs(n) {
  return Number(n.toFixed(3));
}

async function callAuthorize(pdpUrl) {
  const payload = {
    decision_sku: 'openclaw.trusted_mode.authorize.v1',
    policy_variant: process.env.POLICY_VARIANT || 'guard-pro.v2026.02',
    tenant_id: process.env.TENANT_ID || 'trial-tenant',
    inputs: { action_request: { tool_name: 'read_file', params: { path: '/tmp/x' } } },
  };
  const t0 = performance.now();
  const res = await fetch(pdpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const t1 = performance.now();
  if (!res.ok) {
    throw new Error(`PDP unreachable (${res.status})`);
  }
  await res.json();
  return t1 - t0;
}

async function benchmarkPdpLatency(pdpUrl, warmup, samples) {
  for (let i = 0; i < warmup; i += 1) {
    await callAuthorize(pdpUrl);
  }
  const durations = [];
  for (let i = 0; i < samples; i += 1) {
    durations.push(await callAuthorize(pdpUrl));
  }
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  return {
    sample_count: durations.length,
    avg_ms: toMs(avg),
    min_ms: toMs(Math.min(...durations)),
    p50_ms: toMs(percentile(durations, 50)),
    p95_ms: toMs(percentile(durations, 95)),
    max_ms: toMs(Math.max(...durations)),
  };
}

function benchmarkInterceptionOverhead(iterations) {
  const payload = { tool_name: 'read_file', params: { path: '/tmp/x', note: 'hello' } };
  const constraints = [{ key: 'path', allowed_prefixes: ['/tmp', '/safe'] }];
  const t0 = performance.now();
  let blocked = 0;
  for (let i = 0; i < iterations; i += 1) {
    const contextSummary = JSON.stringify(payload);
    const pathValue = payload.params.path;
    const allowed = constraints[0].allowed_prefixes.some((prefix) => pathValue.startsWith(prefix));
    if (!allowed) blocked += 1;
    JSON.stringify({
      decision_sku: 'openclaw.trusted_mode.authorize.v1',
      policy_variant: 'guard-pro.v2026.02',
      inputs: { action_request: { ...payload, context_summary: contextSummary } },
    });
  }
  const t1 = performance.now();
  const total = t1 - t0;
  return {
    iterations,
    total_ms: toMs(total),
    avg_ms_per_intercept: toMs(total / iterations),
    blocked_count: blocked,
  };
}

function writeArtifacts(result) {
  const root = process.cwd();
  const outDir = path.join(root, 'performance-artifacts');
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'performance-benchmark.json');
  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  const mdPath = path.join(root, 'PERFORMANCE_BASELINE.md');
  const md = [
    '# Performance Baseline',
    '',
    `Generated at: ${result.generated_at}`,
    '',
    '## PDP Latency',
    '',
    '| Metric | Value |',
    '|---|---|',
    `| Sample Count | ${result.pdp_latency.sample_count} |`,
    `| Avg (ms) | ${result.pdp_latency.avg_ms} |`,
    `| Min (ms) | ${result.pdp_latency.min_ms} |`,
    `| p50 (ms) | ${result.pdp_latency.p50_ms} |`,
    `| p95 (ms) | ${result.pdp_latency.p95_ms} |`,
    `| Max (ms) | ${result.pdp_latency.max_ms} |`,
    '',
    '## Interception Overhead',
    '',
    '| Metric | Value |',
    '|---|---|',
    `| Iterations | ${result.interception_overhead.iterations} |`,
    `| Total (ms) | ${result.interception_overhead.total_ms} |`,
    `| Avg per intercept (ms) | ${result.interception_overhead.avg_ms_per_intercept} |`,
    '',
    '## Recommended Timeout Review',
    '',
    `Configured timeout should remain above p95 with safety margin (current p95: ${result.pdp_latency.p95_ms} ms).`,
    '',
    '## Notes',
    '',
    '- Values are environment-specific and should be re-run per release candidate.',
    '- CI benchmark artifacts are published from `.github/workflows/performance-benchmark.yml`.',
  ].join('\n');
  fs.writeFileSync(mdPath, `${md}\n`, 'utf8');
  return { jsonPath, mdPath };
}

async function main() {
  const pdpUrl = process.env.PDP_URL || 'http://localhost:8001/v1/authorize';
  const warmup = Number(process.env.BENCH_WARMUP || 10);
  const samples = Number(process.env.BENCH_SAMPLES || 120);
  const interceptIterations = Number(process.env.BENCH_INTERCEPT_ITERS || 20000);

  const pdpLatency = await benchmarkPdpLatency(pdpUrl, warmup, samples);
  const interceptionOverhead = benchmarkInterceptionOverhead(interceptIterations);
  const result = {
    generated_at: new Date().toISOString(),
    pdp_url: pdpUrl,
    pdp_latency: pdpLatency,
    interception_overhead: interceptionOverhead,
  };

  const paths = writeArtifacts(result);
  console.log(JSON.stringify(result, null, 2));
  console.log(`Wrote ${paths.jsonPath}`);
  console.log(`Updated ${paths.mdPath}`);
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
