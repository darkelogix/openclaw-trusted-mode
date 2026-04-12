# RELEASE_v1.0.2

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `CLI`: Command Line Interface

## 1) Release Thesis

Correct the public npm package so Trusted Mode Check sends gateway and environment context to quota-aware Guard Pro runtimes.

## 2) Enforcement Changes

- Trusted Mode Check now includes `gateway_id` and `environment` in all PDP validation requests.
- Governed runtime validation now aligns with customer runtime quota and tenant routing expectations.

## 3) Compatibility Declaration

See `COMPATIBILITY_MATRIX.md` for current declared status.

## 4) Blast Radius Changes

No policy-surface expansion. This release only corrects request context in the published validation CLI.

## 5) Guard Pro Impact

- Fixes false-negative runtime checks against quota-aware Guard Pro bundles.
- Keeps the public npm adapter aligned with the current SDE delivery path.

## 6) Rollback Plan

1. Reinstall `@darkelogix/openclaw-trusted-mode@1.0.1` if needed.
2. Use manual PDP curl validation while the package is rolled back.
3. Republish a corrected package before re-enabling customer guidance that depends on runtime-check parity.

## 7) Validation Summary

Validated in current environment:
- local test suite passes
- TypeScript build passes
- live Guard Pro runtime bootstrap succeeds from the portal-delivered bundle
- latest source runtime check succeeds against the live SDE runtime with gateway/environment context

## 8) Adversarial Results

No new policy semantics added. Existing deny/allow behavior remains unchanged.

## 9) Performance Metrics

No measured performance change expected. This release adds request context fields only.

## 10) Post-Release Monitoring Plan

First 48 hours:
- confirm public npm installs report successful governed runtime checks
- watch for any unexpected `GATEWAY_ID_REQUIRED` or `ENVIRONMENT_REQUIRED` runtime-check failures
