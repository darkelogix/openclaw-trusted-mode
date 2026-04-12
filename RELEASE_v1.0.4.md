# RELEASE_v1.0.4

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `CLI`: Command Line Interface

## 1) Release Thesis

Correct the public npm package so current OpenClaw builds can install the governed adapter without the package being blocked by the CLI safety scan.

## 2) Enforcement Changes

- Split Trusted Mode Check CLI configuration loading from PDP network execution so the shipped CLI entrypoint no longer mixes environment-variable reads with outbound network calls.
- Keep the helper CLI modules in the published npm package so the refactored entrypoint works after a normal `npm install`.
- Align `openclaw.plugin.json` versioning with the npm package version published to customers.

## 3) Compatibility Declaration

See `COMPATIBILITY_MATRIX.md` for current declared status.

This release does not newly certify rolling OpenClaw builds. It only fixes the published package/install contract.

## 4) Blast Radius Changes

Low functional blast radius. The plugin enforcement behavior is unchanged; this release only adjusts packaging and CLI module boundaries to satisfy current OpenClaw installation checks.

## 5) Guard Pro Impact

- Restores the self-serve adapter install path needed by the Guard Pro portal guidance.
- Keeps the runtime-facing PDP request behavior unchanged after install.
- Reduces the risk of customers seeing installer blocks on current OpenClaw builds before runtime validation even begins.

## 6) Rollback Plan

1. Reinstall `@darkelogix/openclaw-trusted-mode@1.0.3` if package-install troubleshooting requires the prior published build.
2. Use a source checkout of the fixed repo only as a temporary workaround.
3. Reapply `1.0.4` once public npm install validation succeeds.

## 7) Validation Summary

Validated in current environment:
- TypeScript build passes
- local test suite passes
- plugin schema contract check passes
- dry-run npm pack includes the required refactored CLI helper files

## 8) Adversarial Results

No new policy semantics added. Existing allow/deny behavior remains unchanged.

## 9) Performance Metrics

No measured runtime decision overhead change expected. The release changes packaging and CLI code organization only.

## 10) Post-Release Monitoring Plan

First 48 hours:
- confirm `npm install @darkelogix/openclaw-trusted-mode@1.0.4` succeeds on the Windows VM path
- confirm `openclaw plugins install` no longer blocks the package on the current CLI safety scan path
- confirm Guard Pro validation still reaches the expected runtime checks after plugin install
