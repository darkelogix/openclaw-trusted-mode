# RELEASE_v1.0.0

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point

## 1) Release Thesis

Establish a provable governance baseline for OpenClaw Trusted Mode:
- deterministic authorization via SDE-PDP
- fail-closed blocking behavior in plugin interception path
- signed policy-pack enforcement

## 2) Enforcement Changes

- `before_tool_call` interception in plugin with explicit block return semantics.
- PDP decision integration (`allow`/`deny`) with constraint application.
- Fail-closed behavior blocks when PDP is unreachable or invalid in plugin config.

## 3) Compatibility Declaration

See `COMPATIBILITY_MATRIX.md` for certified status.

## 4) Blast Radius Changes

Initial deterministic blast-radius scoring in SDE authorize pack:
- high: shell/delete families
- medium: write/edit families
- low: read/list families

## 5) Guard Pro Impact

- Signed Guard Pro policy-pack verification path active.
- Entitlement-based deny (`ENTITLEMENT_DENIED`) integrated in PDP.

## 6) Rollback Plan

1. Restore previous plugin build and OpenClaw config backup.
2. Restore previous policy pack variant and signatures.
3. Restart PDP and OpenClaw gateway.
4. Re-run Trusted Mode Check.

## 7) Validation Summary

Validated in current environment:
- deny path blocks
- allow path passes
- bad signature path denies
- fail-closed blocks on PDP fetch failure

## 8) Adversarial Results

Basic negative-path adversarial checks included:
- high-impact tool deny test
- invalid policy pack signature deny test
- PDP unreachable fail-closed block

## 9) Performance Metrics

Benchmark baseline recorded in `PERFORMANCE_BASELINE.md` and `performance-artifacts/performance-benchmark.json`:
- PDP latency:
  - p50: `1.461 ms`
  - p95: `2.409 ms`
  - avg: `1.552 ms`
- Interception overhead:
  - avg per intercept: `0.004 ms` over `20,000` iterations

Timeout review:
- Current plugin default `pdpTimeoutMs=5000` remains far above measured p95.
- Keep timeout review as a release gate whenever environment/network profile changes.

## 10) Post-Release Monitoring Plan

First 48 hours:
- monitor install failures
- monitor enforcement regressions
- monitor PDP reachability errors and deny anomalies

Escalate immediately on:
- unexpected allow for known denied actions
- signature validation regressions
- fail-closed bypass behavior
