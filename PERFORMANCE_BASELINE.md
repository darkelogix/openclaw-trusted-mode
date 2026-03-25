# Performance Baseline

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

Generated at: 2026-03-09T21:18:58.559Z

## Acronym Expansions

- `PDP`: Policy Decision Point
- `CI`: Continuous Integration

## PDP Latency

| Metric | Value |
|---|---|
| Sample Count | 120 |
| Avg (ms) | 15.201 |
| Min (ms) | 6.784 |
| p50 (ms) | 14.604 |
| p95 (ms) | 36.05 |
| Max (ms) | 52.386 |

## Interception Overhead

| Metric | Value |
|---|---|
| Iterations | 20000 |
| Total (ms) | 238.854 |
| Avg per intercept (ms) | 0.012 |

## Recommended Timeout Review

Configured timeout should remain above p95 with safety margin (current p95: 36.05 ms).

## Notes

- Values are environment-specific and should be re-run per release candidate.
- CI benchmark artifacts are published from `.github/workflows/performance-benchmark.yml`.
