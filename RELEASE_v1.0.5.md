# RELEASE_v1.0.5

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `CLI`: Command Line Interface

## 1) Release Thesis

Remove the remaining governed-mode setup ambiguity by shipping a dedicated OpenClaw config writer that updates the host config with the required Guard Pro values after plugin install.

## 2) Enforcement Changes

- Add `openclaw-trusted-mode-configure` as a public npm binary.
- Write governed-mode plugin settings into `~/.openclaw/openclaw.json`, including `plugins.allow`, `tenantId`, `gatewayId`, `environment`, `pdpUrl`, `toolPolicyMode=PDP`, `failClosed=true`, and `allowedTenantIds=[tenantId]`.
- Remove stale standalone `allowedTools` config when the helper rewrites the governed plugin entry.

## 3) Compatibility Declaration

See `COMPATIBILITY_MATRIX.md` for current declared status.

This release does not newly certify rolling OpenClaw builds. It improves install-to-configure handoff only.

## 4) Blast Radius Changes

Low functional blast radius. Policy enforcement semantics are unchanged after startup; the release adds a supported configuration path and publishes its CLI artifacts.

## 5) Guard Pro Impact

- Reduces customer confusion after `npm install` and `openclaw plugins install`.
- Gives the Guard Pro portal a concrete setup command for governed OpenClaw hosts.
- Fixes the specific install path where the plugin loads but OpenClaw keeps incomplete standalone defaults in `openclaw.json`.

## 6) Rollback Plan

1. Reinstall `@darkelogix/openclaw-trusted-mode@1.0.4` if the configure helper must be backed out.
2. Edit `~/.openclaw/openclaw.json` manually using the documented governed values as a temporary workaround.
3. Reapply `1.0.5` once the helper validation path succeeds.

## 7) Validation Summary

Validated in current environment:
- TypeScript build passes
- local test suite passes
- plugin schema contract check passes
- dry-run npm pack includes the new configure CLI and config-writer module

## 8) Adversarial Results

No new policy semantics added. Existing allow/deny behavior remains unchanged.

## 9) Performance Metrics

No runtime decision-path performance change expected. The release adds a setup helper only.

## 10) Post-Release Monitoring Plan

First 48 hours:
- confirm `openclaw-trusted-mode-configure` is present after `npm install`
- confirm governed-mode config writes remove the `ALLOWLIST_ONLY` startup error on the current Windows VM path
- confirm Guard Pro validation still reaches `LOCKDOWN_ONLY` on uncertified OpenClaw builds after helper-driven setup
