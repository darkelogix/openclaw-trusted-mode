# Performance Baseline

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `PDP`: Policy Decision Point
- `CI`: Continuous Integration

## PDP Latency

| Metric | Value |
|---|---|
| Sample Count | 120 |
| Avg (ms) | 1.643 |
| Min (ms) | 0.997 |
| p50 (ms) | 1.456 |
| p95 (ms) | 2.565 |
| Max (ms) | 3.791 |

## Interception Overhead

| Metric | Value |
|---|---|
| Iterations | 20000 |
| Total (ms) | 87.403 |
| Avg per intercept (ms) | 0.004 |

## Recommended Timeout Review

Configured timeout should remain above p95 with safety margin (current p95: 2.565 ms).

## Notes

- Values are environment-specific and should be re-run per release candidate.
- CI benchmark artifacts are published from `.github/workflows/performance-benchmark.yml`.
