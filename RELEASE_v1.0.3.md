# RELEASE_v1.0.3

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point

## 1) Release Thesis

Correct the public npm package contents so Trusted Mode Check includes its signed local attestation pack by default.

## 2) Enforcement Changes

- The public npm package now ships `attestation/trusted_mode_attest_v1.json`.
- The public npm package now ships `attestation/trusted_mode_attest_v1.sig`.
- Runtime-check attestation verification now works from a normal npm install without extra local file copying.

## 3) Compatibility Declaration

See `COMPATIBILITY_MATRIX.md` for current declared status.

## 4) Blast Radius Changes

No policy-surface expansion. This release only corrects package contents for attestation verification.

## 5) Guard Pro Impact

- Removes the remaining false-negative `Attestation pack file not found` result from normal guarded-runtime validation.
- Keeps the public adapter install aligned with the Guard Pro customer guidance shown in the portal.

## 6) Rollback Plan

1. Reinstall `@darkelogix/openclaw-trusted-mode@1.0.2` if needed.
2. Copy attestation pack files into the package root manually only as a temporary workaround.
3. Reapply `1.0.3` once package verification succeeds.

## 7) Validation Summary

Validated in current environment:
- local test suite passes
- TypeScript build passes
- release-artifact checks pass
- public npm package expected to provide local attestation files required by Trusted Mode Check

## 8) Adversarial Results

No new policy semantics added. Existing deny/allow behavior remains unchanged.

## 9) Performance Metrics

No measured performance change expected. This release changes package contents only.

## 10) Post-Release Monitoring Plan

First 48 hours:
- confirm public npm installs no longer report `Attestation pack file not found`
- confirm Trusted Mode Check reaches `ENFORCED_OK` when the local runtime is otherwise healthy
